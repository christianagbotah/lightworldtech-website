import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(8000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid supplier update', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.financeVendor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });

  const updated = await db.financeVendor.update({ where: { id }, data: parsed.data });
  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_vendor_updated',
    entity: 'FinanceVendor',
    entityId: updated.id,
    details: {
      beforePaymentTermsDays: existing.paymentTermsDays,
      afterPaymentTermsDays: updated.paymentTermsDays,
      active: updated.active,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}