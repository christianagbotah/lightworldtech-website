import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(240),
  body: z.string().trim().min(2).max(8000),
  projectId: z.string().trim().min(1).nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid announcement', details: parsed.error.flatten() }, { status: 400 });
  }

  const organization = await db.clientOrganization.findUnique({ where: { id }, select: { id: true } });
  if (!organization) return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Project not found for organization' }, { status: 404 });
  }

  const announcement = await db.clientAnnouncement.create({
    data: {
      organizationId: id,
      projectId: parsed.data.projectId || null,
      title: parsed.data.title,
      body: parsed.data.body,
      publishAt: parsed.data.publishAt ? new Date(parsed.data.publishAt) : new Date(),
    },
  });
  return NextResponse.json({ success: true, data: announcement }, { status: 201 });
}
