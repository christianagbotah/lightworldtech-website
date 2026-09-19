import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const updateSchema = z.object({
  active: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid subscriber update' }, { status: 400 });
  }

  const { id } = await params;
  const existing = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Subscriber not found' }, { status: 404 });
  }

  const subscriber = await db.newsletterSubscriber.update({
    where: { id },
    data: { active: parsed.data.active },
  });

  return NextResponse.json({ success: true, data: subscriber });
}
