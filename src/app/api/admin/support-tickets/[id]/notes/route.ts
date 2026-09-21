import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';

const schema = z.object({
  note: z.string().trim().min(1).max(8000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const actor = await getActiveAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid internal note', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ticket = await db.clientSupportTicket.findUnique({
    where: { id },
    select: { id: true, ticketNumber: true },
  });
  if (!ticket) {
    return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });
  }

  const note = await db.clientTicketInternalNote.create({
    data: {
      ticketId: ticket.id,
      authorAdminId: actor.id,
      authorName: actor.name || actor.email,
      note: parsed.data.note,
    },
  });

  await db.clientTicketEvent.create({
    data: {
      ticketId: ticket.id,
      type: 'internal_note_added',
      actorType: 'admin',
      actorName: actor.name || actor.email,
      details: JSON.stringify({ noteId: note.id }),
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.support_ticket_internal_note_added',
    entity: 'ClientSupportTicket',
    entityId: ticket.id,
    details: { ticketNumber: ticket.ticketNumber },
  });

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}
