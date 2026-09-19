import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(220).optional(),
  description: z.string().trim().max(3000).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'blocked']).optional(),
  order: z.number().int().min(0).max(10000).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid milestone update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientMilestone.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.status !== undefined) {
    data.completedAt = parsed.data.status === 'completed' ? (existing.completedAt || new Date()) : null;
  }

  const milestone = await db.clientMilestone.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: milestone });
}
