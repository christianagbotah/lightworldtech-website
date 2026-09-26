import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { notifyClientOfSupportReply } from '@/lib/support-ticket';

const schema = z.object({ message: z.string().trim().min(1).max(8000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getActiveAdminContext(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid reply' }, { status: 400 });

  const ticket = await db.clientSupportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      firstRespondedAt: true,
      createdBy: { select: { name: true, email: true } },
      organization: { select: { primaryPhone: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });

  const now = new Date();
  const message = await db.clientTicketMessage.create({
    data: {
      ticketId: id,
      authorType: 'admin',
      authorName: session.name || session.email,
      message: parsed.data.message,
    },
  });

  const nextStatus =
    ticket.status === 'closed' || ticket.status === 'resolved'
      ? 'in_progress'
      : 'awaiting_client';

  await db.clientSupportTicket.update({
    where: { id },
    data: {
      status: nextStatus,
      firstRespondedAt: ticket.firstRespondedAt || now,
      resolvedAt: null,
      lastActivityAt: now,
      unreadByAdmin: false,
      unreadByClient: true,
    },
  });

  await db.clientTicketEvent.create({
    data: {
      ticketId: ticket.id,
      type: 'admin_reply',
      actorType: 'admin',
      actorName: session.name || session.email,
      details: JSON.stringify({ messageId: message.id, status: nextStatus }),
    },
  });

  await notifyClientOfSupportReply({
    to: ticket.createdBy.email,
    customerName: ticket.createdBy.name,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    message: parsed.data.message,
    authorName: session.name || session.email,
    phone: ticket.organization.primaryPhone,
    status: nextStatus,
  });

  await recordAdminAudit({
    admin: session,
    action: 'admin.support_ticket_replied',
    entity: 'ClientSupportTicket',
    entityId: ticket.id,
    details: {
      ticketNumber: ticket.ticketNumber,
      status: nextStatus,
      firstResponseRecorded: !ticket.firstRespondedAt,
    },
  });

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
