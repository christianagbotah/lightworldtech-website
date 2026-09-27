import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  canApproveFinanceOutflow,
  getFinanceApprovalPolicy,
  serializeOutflowApproval,
} from '@/lib/finance-approvals';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status')?.trim();
  const approvals = await db.financeOutflowApproval.findMany({
    where: status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)
      ? { status }
      : undefined,
    include: {
      attachments: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    take: 1000,
  });
  const [policy, creditApprovals] = await Promise.all([
    getFinanceApprovalPolicy(),
    db.financeCreditPolicyApproval.findMany({
      include: {
        organization: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      take: 1000,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      policy: {
        enabled: policy?.enabled || false,
        requireSecondApprover: true,
      },
      canApprove: canApproveFinanceOutflow(actor),
      currentAdminId: actor.id,
      approvals: approvals.map(serializeOutflowApproval),
      creditApprovals: creditApprovals.map((item) => ({
        ...item,
        creditLimit: item.creditLimit.toFixed(2),
      })),
    },
  });
}