import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  order: z.number().int().min(0).max(10000).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid milestone update' }, { status: 400 });
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  try {
    const milestone = await db.clientMilestone.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: milestone });
  } catch {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }
}
