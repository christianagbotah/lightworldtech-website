import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';

const schema = z.object({ message: z.string().trim().min(1).max(8000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid reply' }, { status: 400 });

  const ticket = await db.clientSupportTicket.findFirst({
    where: { id, organizationId: context.user.organizationId },
    select: { id: true, status: true },
  });
  if (!ticket) return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
  if (ticket.status === 'closed') {
    return NextResponse.json({ success: false, error: 'This support ticket is closed' }, { status: 409 });
  }

  const message = await db.clientTicketMessage.create({
    data: {
      ticketId: id,
      authorType: 'client',
      authorName: context.user.name,
      message: parsed.data.message,
    },
  });
  if (ticket.status === 'resolved') {
    await db.clientSupportTicket.update({ where: { id }, data: { status: 'open' } });
  }
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
