import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

const schema = z.object({ message: z.string().trim().min(1).max(5000) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: ticketId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });

  const ticket = await db.clientTicket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const message = await db.clientTicketMessage.create({
    data: {
      ticketId,
      authorType: 'admin',
      authorName: session.name || session.email,
      message: parsed.data.message,
    },
  });
  await db.clientTicket.update({
    where: { id: ticketId },
    data: { status: 'waiting_client', updatedAt: new Date() },
  });
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
