import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(240).optional(),
  body: z.string().trim().min(2).max(8000).optional(),
  active: z.boolean().optional(),
  publishAt: z.string().datetime().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid announcement update' }, { status: 400 });
  const existing = await db.clientAnnouncement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.publishAt) data.publishAt = new Date(parsed.data.publishAt);
  const announcement = await db.clientAnnouncement.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: announcement });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await db.clientAnnouncement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  await db.clientAnnouncement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
