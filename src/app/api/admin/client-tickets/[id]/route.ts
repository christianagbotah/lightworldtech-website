import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid ticket update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientSupportTicket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const ticket = await db.clientSupportTicket.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: ticket });
}
