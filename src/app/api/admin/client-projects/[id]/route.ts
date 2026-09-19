import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  summary: z.string().trim().max(4000).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid project update' }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  if (parsed.data.targetDate !== undefined) data.targetDate = parsed.data.targetDate ? new Date(parsed.data.targetDate) : null;

  try {
    const project = await db.clientProject.update({
      where: { id },
      data,
      include: {
        milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
        documents: { orderBy: { updatedAt: 'desc' } },
      },
    });
    return NextResponse.json({ success: true, data: project });
  } catch {
    return NextResponse.json({ error: 'Project not found or update failed' }, { status: 404 });
  }
}
