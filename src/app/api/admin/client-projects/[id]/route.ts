import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  name: z.string().trim().min(2).max(220).optional(),
  summary: z.string().trim().max(4000).optional(),
  status: z.enum(['planned', 'active', 'on_hold', 'completed']).optional(),
  health: z.enum(['on_track', 'attention', 'at_risk']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  manager: z.string().trim().max(180).optional(),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid project update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientProject.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  if (parsed.data.targetDate !== undefined) data.targetDate = parsed.data.targetDate ? new Date(parsed.data.targetDate) : null;
  const project = await db.clientProject.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: project });
}
