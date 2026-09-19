import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword, isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['client_admin', 'client_member']).optional(),
  password: z.string().min(10).max(256).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid portal user update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.clientPortalUser.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Portal user not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.password !== undefined) data.password = hashAdminPassword(parsed.data.password);

  const user = await db.clientPortalUser.update({
    where: { id },
    data,
    select: {
      id: true,
      organizationId: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLogin: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: user });
}
