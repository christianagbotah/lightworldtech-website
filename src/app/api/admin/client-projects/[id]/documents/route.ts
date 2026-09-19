import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(2000).optional().default(''),
  url: z.string().trim().min(1).max(2000).refine(
    (value) => value.startsWith('https://') || value.startsWith('/'),
    'Use an HTTPS or site-relative URL',
  ),
  category: z.string().trim().min(1).max(80).optional().default('document'),
  visibleToClient: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid document', details: parsed.error.flatten() }, { status: 400 });
  }

  const project = await db.clientProject.findUnique({ where: { id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Client project not found' }, { status: 404 });

  const document = await db.clientDocument.create({
    data: { projectId: id, ...parsed.data },
  });
  return NextResponse.json({ success: true, data: document }, { status: 201 });
}
