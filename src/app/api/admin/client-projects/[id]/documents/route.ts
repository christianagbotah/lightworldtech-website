import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  url: z.string().url().refine((value) => value.startsWith('https://'), 'Document URL must use HTTPS'),
  category: z.string().trim().max(80).default('general'),
  visible: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: projectId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid document link', details: parsed.error.flatten() }, { status: 400 });
  }
  const project = await db.clientProject.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const document = await db.clientDocument.create({ data: { projectId, ...parsed.data } });
  return NextResponse.json({ success: true, data: document }, { status: 201 });
}
