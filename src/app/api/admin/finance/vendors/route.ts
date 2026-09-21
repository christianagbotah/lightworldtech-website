import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().email().or(z.literal('')).default(''),
  phone: z.string().trim().max(80).default(''),
  taxId: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(8000).default(''),
});

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const vendors = await db.financeVendor.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { bills: true, payments: true, expenses: true } } },
    take: 1000,
  });
  return NextResponse.json({ success: true, data: vendors });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid supplier', details: parsed.error.flatten() }, { status: 400 });

  const vendor = await db.financeVendor.create({ data: parsed.data });
  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_vendor_created',
    entity: 'FinanceVendor',
    entityId: vendor.id,
    details: { vendorName: vendor.name },
  });
  return NextResponse.json({ success: true, data: vendor }, { status: 201 });
}
