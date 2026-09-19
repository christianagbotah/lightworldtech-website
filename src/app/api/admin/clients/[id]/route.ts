import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { hashClientPassword } from '@/lib/client-auth';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  organization: z.string().trim().max(160).optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
  temporaryPassword: z.string().min(12).max(200).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const account = await db.clientPortalAccount.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, summary: true, status: true } },
      projects: {
        include: {
          milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
          documents: { orderBy: { updatedAt: 'desc' } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      tickets: {
        include: {
          project: { select: { id: true, title: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      announcements: { orderBy: { publishedAt: 'desc' } },
    },
  });

  if (!account) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  const { password: _password, ...safeAccount } = account;
  return NextResponse.json({ success: true, data: safeAccount });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid client update' }, { status: 400 });
    }

    const existing = await db.clientPortalAccount.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.organization !== undefined) data.organization = parsed.data.organization;
    if (parsed.data.email !== undefined) data.email = parsed.data.email.trim().toLowerCase();
    if (parsed.data.active !== undefined) data.active = parsed.data.active;
    if (parsed.data.temporaryPassword !== undefined) {
      data.password = hashClientPassword(parsed.data.temporaryPassword);
      data.mustChangePassword = true;
      data.sessionVersion = { increment: 1 };
    }

    const account = await db.clientPortalAccount.update({
      where: { id },
      data,
      select: {
        id: true,
        leadId: true,
        email: true,
        name: true,
        organization: true,
        active: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Admin client update failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to update client account' }, { status: 500 });
  }
}
