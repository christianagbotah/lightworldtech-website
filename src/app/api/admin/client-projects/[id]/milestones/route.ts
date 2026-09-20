import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(3000).optional().default(''),
  status: z.enum(['planned', 'in_progress', 'completed', 'blocked']).default('planned'),
  order: z.number().int().min(0).max(10000).default(0),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid milestone', details: parsed.error.flatten() }, { status: 400 });

  const project = await db.clientProject.findUnique({ where: { id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const milestone = await db.clientMilestone.create({
    data: {
      projectId: id,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      order: parsed.data.order,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      completedAt: parsed.data.status === 'completed' ? new Date() : null,
    },
  });
  return NextResponse.json({ success: true, data: milestone }, { status: 201 });
}
