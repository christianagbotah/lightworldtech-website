import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';

const schema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });

    const { id } = await params;
    const account = await db.clientPortalAccount.findUnique({
      where: { id: session.sub },
      select: { id: true, name: true, active: true, mustChangePassword: true },
    });
    if (!account?.active) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (account.mustChangePassword) {
      return NextResponse.json({ error: 'Password change required' }, { status: 403 });
    }

    const ticket = await db.clientTicket.findFirst({
      where: { id, accountId: account.id },
      select: { id: true },
    });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const message = await db.clientTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorType: 'client',
        authorName: account.name,
        message: parsed.data.message,
      },
    });

    await db.clientTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error('Client ticket reply failed:', error);
    return NextResponse.json({ success: false, error: 'Could not add reply' }, { status: 500 });
  }
}
