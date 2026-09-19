import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  message: z.string().trim().min(2).max(5000).optional(),
  active: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid announcement update' }, { status: 400 });
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.publishedAt !== undefined) data.publishedAt = new Date(parsed.data.publishedAt);
  try {
    const announcement = await db.clientAnnouncement.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: announcement });
  } catch {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  }
}
