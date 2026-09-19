import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  accountId: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(200),
  message: z.string().trim().min(2).max(5000),
  active: z.boolean().default(true),
  publishedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await db.clientAnnouncement.findMany({
    include: { account: { select: { id: true, name: true, organization: true } } },
    orderBy: { publishedAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid announcement' }, { status: 400 });

  if (parsed.data.accountId) {
    const account = await db.clientPortalAccount.findUnique({ where: { id: parsed.data.accountId }, select: { id: true } });
    if (!account) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const announcement = await db.clientAnnouncement.create({
    data: {
      accountId: parsed.data.accountId || null,
      title: parsed.data.title,
      message: parsed.data.message,
      active: parsed.data.active,
      publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date(),
    },
  });
  return NextResponse.json({ success: true, data: announcement }, { status: 201 });
}
