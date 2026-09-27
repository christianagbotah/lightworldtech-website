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
  const creditLimitCurrency = normalizeCurrency(parsed.data.creditLimitCurrency || 'GHS');
  if (parsed.data.creditHold && creditHoldReason.length < 5) {
    return NextResponse.json({ success: false, error: 'A credit hold requires a reason' }, { status: 400 });
  }

  const sensitiveCreditChanged =
    creditLimitCurrency !== existing.creditLimitCurrency ||
    !existing.creditLimit.eq(parsed.data.creditLimit) ||
    parsed.data.creditHold !== existing.creditHold ||
    creditHoldReason !== existing.creditHoldReason;

  if (sensitiveCreditChanged) {
    const pending = await db.financeCreditPolicyApproval.findFirst({
      where: { organizationId: id, status: 'pending' },
      orderBy: { requestedAt: 'desc' },
    });
    if (pending) {
      return NextResponse.json(
        { success: false, error: 'A credit policy change is already awaiting approval', approvalId: pending.id },
        { status: 409 },
      );
    }
    const result = await db.$transaction(async (tx) => {
      const organization = parsed.data.paymentTermsDays !== existing.paymentTermsDays
        ? await tx.clientOrganization.update({
            where: { id },
            data: { paymentTermsDays: parsed.data.paymentTermsDays },
          })
        : existing;

      const approval = await tx.financeCreditPolicyApproval.create({
        data: {
          organizationId: id,
          paymentTermsDays: parsed.data.paymentTermsDays,
          creditLimitCurrency,
          creditLimit: parsed.data.creditLimit,
          creditHold: parsed.data.creditHold,
          creditHoldReason,
          previousPolicyJson: JSON.stringify({
            paymentTermsDays: existing.paymentTermsDays,
            creditLimitCurrency: existing.creditLimitCurrency,
            creditLimit: existing.creditLimit.toFixed(2),
            creditHold: existing.creditHold,
            creditHoldReason: existing.creditHoldReason,
          }),
          requestedByAdminId: actor.id,
          requestedByName: actor.name || 'Admin',
          requestedByEmail: actor.email,
        },
      });
      return { organization, approval };
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_credit_policy_approval_requested',
      entity: 'FinanceCreditPolicyApproval',
      entityId: result.approval.id,
      details: {
        organizationId: id,
        organizationName: existing.name,
        paymentTermsAppliedImmediately: parsed.data.paymentTermsDays !== existing.paymentTermsDays,
        proposed: {
          creditLimitCurrency,
          creditLimit: Number(parsed.data.creditLimit).toFixed(2),
          creditHold: parsed.data.creditHold,
          creditHoldReason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      approvalRequired: true,
      message: 'Payment terms saved. Sensitive credit changes were submitted for independent approval.',
      data: {
        ...existing,
        paymentTermsDays: parsed.data.paymentTermsDays,
        creditLimit: existing.creditLimit.toFixed(2),
      },
      approval: {
        id: result.approval.id,
        status: result.approval.status,
        requestedAt: result.approval.requestedAt,
      },
    }, { status: 202 });
  }
  const updated = await db.clientOrganization.update({
    where: { id },
    data: { paymentTermsDays: parsed.data.paymentTermsDays },
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
    action: 'admin.client_credit_terms_updated',
    entity: 'ClientOrganization',
    entityId: id,
    details: {
      beforePaymentTermsDays: existing.paymentTermsDays,
      afterPaymentTermsDays: updated.paymentTermsDays,
    },
  });

  return NextResponse.json({
    success: true,
    approvalRequired: false,
    data: { ...updated, creditLimit: updated.creditLimit.toFixed(2) },
  });
}