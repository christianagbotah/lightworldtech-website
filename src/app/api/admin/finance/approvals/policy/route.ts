import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  getActiveAdminContext,
  getSuperAdminContext,
  recordAdminAudit,
} from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  countEligibleFinanceApprovers,
  getFinanceApprovalPolicy,
} from '@/lib/finance-approvals';

const schema = z.object({
  enabled: z.boolean(),
});

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [policy, eligibleApprovers] = await Promise.all([
    getFinanceApprovalPolicy(),
    countEligibleFinanceApprovers(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      enabled: policy?.enabled || false,
      requireSecondApprover: true,
      eligibleApprovers,
      canManagePolicy: actor.role === 'super_admin',
      canApprove: hasAdminPermission(actor.role, actor.permissions, 'finance.approve'),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) {
    return NextResponse.json(
      { success: false, error: 'Only a super admin can change finance approval policy' },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid finance approval policy' },
      { status: 400 },
    );
  }

  const eligibleApprovers = await countEligibleFinanceApprovers();
  if (parsed.data.enabled && eligibleApprovers < 2) {
    return NextResponse.json(
      {
        success: false,
        error: 'Maker-checker requires at least two active finance approvers before it can be enabled',
        eligibleApprovers,
      },
      { status: 409 },
    );
  }

  const policy = await db.financeApprovalPolicy.upsert({
    where: { id: 'default' },
    update: {
      enabled: parsed.data.enabled,
      requireSecondApprover: true,
      updatedBy: actor.name || actor.email,
    },
    create: {
      id: 'default',
      enabled: parsed.data.enabled,
      requireSecondApprover: true,
      updatedBy: actor.name || actor.email,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_approval_policy_updated',
    entity: 'FinanceApprovalPolicy',
    entityId: policy.id,
    details: {
      enabled: policy.enabled,
      requireSecondApprover: true,
      eligibleApprovers,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      enabled: policy.enabled,
      requireSecondApprover: true,
      eligibleApprovers,
      canManagePolicy: true,
      canApprove: true,
    },
  });
}
