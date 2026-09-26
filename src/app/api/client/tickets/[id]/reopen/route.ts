import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { notifySupportDesk, supportSla } from '@/lib/support-ticket';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ticket = await db.clientSupportTicket.findFirst({
    where: { id, organizationId: context.user.organizationId },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      message: true,
      status: true,
      priority: true,
      category: true,
      projectId: true,
    },
  });
  if (!ticket) return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });
  if (ticket.status !== 'closed') {
    return NextResponse.json(
      { success: false, error: 'Only a closed support ticket can be reopened' },
      { status: 409 },
    );
  }

  const now = new Date();
  const priority = ticket.priority === 'high' || ticket.priority === 'low' ? ticket.priority : 'normal';
  const sla = supportSla(priority, now);

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.clientSupportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'open',
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        firstRespondedAt: null,
        resolvedAt: null,
        escalatedAt: null,
        lastActivityAt: now,
        unreadByAdmin: true,
        unreadByClient: false,
        clientRating: null,
        clientFeedback: '',
        ratedAt: null,
      },
    });

    await tx.clientTicketEvent.create({
      data: {
        ticketId: ticket.id,
        type: 'ticket_reopened',
        actorType: 'client',
        actorName: context.user.name,
        details: JSON.stringify({
          previousStatus: ticket.status,
          nextStatus: 'open',
          firstResponseDueAt: sla.firstResponseDueAt.toISOString(),
          resolutionDueAt: sla.resolutionDueAt.toISOString(),
        }),
      },
    });

    return next;
  });

  await notifySupportDesk({
    ticketNumber: ticket.ticketNumber,
    organizationName: context.organization.name,
    customerName: context.user.name,
    customerEmail: context.user.email,
    subject: ticket.subject,
    message: 'The client reopened this closed support ticket from the Client Portal.',
    priority: ticket.priority,
    category: ticket.category,
    kind: 'reopened',
  });

  return NextResponse.json({ success: true, data: updated });
}
