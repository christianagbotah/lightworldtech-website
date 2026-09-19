import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(240).optional(),
  description: z.string().trim().max(2000).optional(),
  url: z.string().trim().min(1).max(2000).refine(
    (value) => value.startsWith('https://') || value.startsWith('/'),
    'Use an HTTPS or site-relative URL',
  ).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  visibleToClient: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid document update' }, { status: 400 });
  const existing = await db.clientDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  const document = await db.clientDocument.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: document });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await db.clientDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  await db.clientDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
