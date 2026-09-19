import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_client', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid ticket update' }, { status: 400 });
  try {
    const ticket = await db.clientTicket.update({
      where: { id },
      data: parsed.data,
      include: {
        account: { select: { id: true, name: true, organization: true, email: true } },
        project: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return NextResponse.json({ success: true, data: ticket });
  } catch {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
}
