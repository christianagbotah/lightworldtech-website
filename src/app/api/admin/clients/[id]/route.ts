import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(180).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  primaryContactName: z.string().trim().max(180).optional(),
  primaryEmail: z.string().trim().email().or(z.literal('')).optional(),
  primaryPhone: z.string().trim().max(80).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientOrganization.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });

  const organization = await db.clientOrganization.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: organization });
}
