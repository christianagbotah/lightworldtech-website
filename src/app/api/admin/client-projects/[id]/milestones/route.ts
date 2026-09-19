import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  dueDate: z.string().datetime().nullable().optional(),
  order: z.number().int().min(0).max(10000).default(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: projectId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 });

  const project = await db.clientProject.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const milestone = await db.clientMilestone.create({
    data: {
      projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      order: parsed.data.order,
    },
  });
  return NextResponse.json({ success: true, data: milestone }, { status: 201 });
}
