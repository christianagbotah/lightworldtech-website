import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';

const schema = z.object({ message: z.string().trim().min(1).max(8000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getActiveAdminContext(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid reply' }, { status: 400 });

  const ticket = await db.clientSupportTicket.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!ticket) return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });

  const message = await db.clientTicketMessage.create({
    data: {
      ticketId: id,
      authorType: 'admin',
      authorName: session.name || session.email,
      message: parsed.data.message,
    },
  });
  await db.clientSupportTicket.update({
    where: { id },
    data: { status: ticket.status === 'closed' ? 'in_progress' : ticket.status },
  });
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
