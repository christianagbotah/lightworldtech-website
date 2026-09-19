import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  url: z.string().url().refine((value) => value.startsWith('https://'), 'Document URL must use HTTPS').optional(),
  category: z.string().trim().max(80).optional(),
  visible: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid document update' }, { status: 400 });
  try {
    const document = await db.clientDocument.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: document });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}
