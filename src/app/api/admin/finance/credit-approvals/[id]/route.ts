import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
  notes: z.string().trim().max(4000).optional().default(''),
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
    return NextResponse.json({ success: false, error: 'Invalid approval decision' }, { status: 400 });
  }

  const { id } = await params;
  const approval = await db.financeCreditPolicyApproval.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!approval) return NextResponse.json({ success: false, error: 'Credit approval request not found' }, { status: 404 });
  if (approval.status !== 'pending') {
    return NextResponse.json({ success: false, error: 'Credit approval request has already been decided' }, { status: 409 });
  }
  if (parsed.data.action === 'cancel') {
    if (approval.requestedByAdminId !== actor.id && actor.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Only the requester or a super admin can cancel this request' }, { status: 403 });
    }
    const updated = await db.financeCreditPolicyApproval.update({
      where: { id },
      data: {
        status: 'cancelled',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Cancelled before approval',
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_credit_policy_approval_cancelled',
      entity: 'FinanceCreditPolicyApproval',
      entityId: id,
      details: { organizationId: approval.organizationId, organizationName: approval.organization.name },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  if (!hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
    return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
  }
  if (approval.requestedByAdminId === actor.id) {
    return NextResponse.json({ success: false, error: 'Maker-checker prevents you from approving your own credit policy request' }, { status: 409 });
  }
  if (parsed.data.action === 'reject') {
    const updated = await db.financeCreditPolicyApproval.update({
      where: { id },
      data: {
        status: 'rejected',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Rejected',
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_credit_policy_approval_rejected',
      entity: 'FinanceCreditPolicyApproval',
      entityId: id,
      details: { organizationId: approval.organizationId, organizationName: approval.organization.name },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  const result = await db.$transaction(async (tx) => {
    const organization = await tx.clientOrganization.update({
      where: { id: approval.organizationId },
      data: {
        paymentTermsDays: approval.paymentTermsDays,
        creditLimitCurrency: approval.creditLimitCurrency,
        creditLimit: approval.creditLimit,
        creditHold: approval.creditHold,
        creditHoldReason: approval.creditHold ? approval.creditHoldReason : '',
      },
    });
    const updated = await tx.financeCreditPolicyApproval.update({
      where: { id },
      data: {
        status: 'approved',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes,
      },
    });
    return { organization, approval: updated };
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_credit_policy_approval_approved',
    entity: 'FinanceCreditPolicyApproval',
    entityId: id,
    details: {
      organizationId: approval.organizationId,
      organizationName: approval.organization.name,
      creditLimitCurrency: result.organization.creditLimitCurrency,
      creditLimit: result.organization.creditLimit.toFixed(2),
      creditHold: result.organization.creditHold,
    },
  });

  return NextResponse.json({ success: true, data: result });
}