import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword, isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().email(),
  password: z.string().min(10).max(256),
  role: z.enum(['client_admin', 'client_member']).default('client_admin'),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid portal user', details: parsed.error.flatten() }, { status: 400 });

    const organization = await db.clientOrganization.findUnique({ where: { id }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });

    const user = await db.clientPortalUser.create({
      data: {
        organizationId: id,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        password: hashAdminPassword(parsed.data.password),
        role: parsed.data.role,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2002') return NextResponse.json({ success: false, error: 'That email already has a portal account' }, { status: 409 });
    console.error('Create client portal user error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create portal user' }, { status: 500 });
  }
}
