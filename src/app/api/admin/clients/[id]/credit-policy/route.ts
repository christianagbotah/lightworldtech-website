import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  paymentTermsDays: z.coerce.number().int().min(0).max(365),
  creditLimitCurrency: z.string().trim().max(3),
  creditLimit: z.coerce.number().min(0).max(999999999999),
  creditHold: z.boolean(),
  creditHoldReason: z.string().trim().max(2000).optional().default(''),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid credit policy', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const existing = await db.clientOrganization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      paymentTermsDays: true,
      creditLimitCurrency: true,
      creditLimit: true,
      creditHold: true,
      creditHoldReason: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });
  }

  const creditHoldReason = parsed.data.creditHold ? parsed.data.creditHoldReason : '';
  if (parsed.data.creditHold && creditHoldReason.length < 5) {
    return NextResponse.json({ success: false, error: 'A credit hold requires a reason' }, { status: 400 });
  }

  const updated = await db.clientOrganization.update({
    where: { id },
    data: {
      paymentTermsDays: parsed.data.paymentTermsDays,
      creditLimitCurrency: normalizeCurrency(parsed.data.creditLimitCurrency || 'GHS'),
      creditLimit: parsed.data.creditLimit,
      creditHold: parsed.data.creditHold,
      creditHoldReason,
    },
    select: {
      id: true,
      name: true,
      paymentTermsDays: true,
      creditLimitCurrency: true,
      creditLimit: true,
      creditHold: true,
      creditHoldReason: true,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_credit_policy_updated',
    entity: 'ClientOrganization',
    entityId: id,
    details: {
      before: {
        paymentTermsDays: existing.paymentTermsDays,
        creditLimitCurrency: existing.creditLimitCurrency,
        creditLimit: existing.creditLimit.toFixed(2),
        creditHold: existing.creditHold,
        creditHoldReason: existing.creditHoldReason,
      },
      after: {
        paymentTermsDays: updated.paymentTermsDays,
        creditLimitCurrency: updated.creditLimitCurrency,
        creditLimit: updated.creditLimit.toFixed(2),
        creditHold: updated.creditHold,
        creditHoldReason: updated.creditHoldReason,
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      creditLimit: updated.creditLimit.toFixed(2),
    },
  });
}
