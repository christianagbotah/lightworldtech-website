import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { notifySupportDesk } from '@/lib/support-ticket';

const schema = z.object({ message: z.string().trim().min(1).max(8000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid reply' }, { status: 400 });

  const ticket = await db.clientSupportTicket.findFirst({
    where: { id, organizationId: context.user.organizationId },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
    },
  });
  if (!ticket) return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
  if (ticket.status === 'closed') {
    return NextResponse.json({ success: false, error: 'This support ticket is closed' }, { status: 409 });
  }

  const now = new Date();
  const message = await db.clientTicketMessage.create({
    data: {
      ticketId: id,
      authorType: 'client',
      authorName: context.user.name,
      message: parsed.data.message,
    },
  });

  const nextStatus =
    ticket.status === 'resolved'
      ? 'open'
      : ticket.status === 'awaiting_client'
        ? 'in_progress'
        : ticket.status;

  await db.clientSupportTicket.update({
    where: { id },
    data: {
      status: nextStatus,
      ...(ticket.status === 'resolved' ? { resolvedAt: null } : {}),
      lastActivityAt: now,
      unreadByAdmin: true,
      unreadByClient: false,
    },
  });

  await notifySupportDesk({
    ticketNumber: ticket.ticketNumber,
    organizationName: context.organization.name,
    customerName: context.user.name,
    customerEmail: context.user.email,
    subject: ticket.subject,
    message: parsed.data.message,
    priority: ticket.priority,
    category: ticket.category,
    kind: 'client_reply',
  });

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
