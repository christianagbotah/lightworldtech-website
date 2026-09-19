import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { hashClientPassword } from '@/lib/client-auth';

const updateSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(),
  contactName: z.string().trim().min(2).max(160).optional(),
  email: z.string().email().optional(),
  password: z.string().min(12).max(200).optional(),
  active: z.boolean().optional(),
});

const clientSelect = {
  id: true,
  companyName: true,
  contactName: true,
  email: true,
  active: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  projects: {
    orderBy: [{ updatedAt: 'desc' as const }],
    include: {
      milestones: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
      deliverables: { orderBy: { createdAt: 'desc' as const } },
      tickets: { orderBy: { updatedAt: 'desc' as const } },
    },
  },
  tickets: {
    where: { projectId: null },
    orderBy: { updatedAt: 'desc' as const },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const client = await db.portalClient.findUnique({ where: { id }, select: clientSelect });
  if (!client) return NextResponse.json({ success: false, error: 'Client not found.' }, { status: 404 });
  return NextResponse.json({ success: true, data: client });
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
      return NextResponse.json({ success: false, error: 'Invalid client update.', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await db.portalClient.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Client not found.' }, { status: 404 });

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.email) data.email = parsed.data.email.trim().toLowerCase();
    if (parsed.data.password) data.password = hashClientPassword(parsed.data.password);

    const client = await db.portalClient.update({
      where: { id },
      data,
      select: clientSelect,
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('Admin client update error:', error);
    return NextResponse.json({ success: false, error: 'Could not update portal client.' }, { status: 500 });
  }
}
