import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { ActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission, normalizeAdminPermissions } from '@/lib/admin-permissions';
import { nextOutflowApprovalNumber, normalizeCurrency } from '@/lib/finance';

export type OutflowType = 'vendor_payment' | 'customer_refund';

export type VendorPaymentApprovalAllocation = {
  billId: string;
  amount: number;
};

export type CreateOutflowApprovalInput = {
  outflowType: OutflowType;
  counterpartyId: string;
  counterpartyName: string;
  sourceReference?: string;
  currency: string;
  amount: Prisma.Decimal | number | string;
  effectiveDate: Date;
  method: string;
  reference?: string;
  reason?: string;
  allocations?: VendorPaymentApprovalAllocation[];
};

export async function getFinanceApprovalPolicy() {
  return db.financeApprovalPolicy.findUnique({ where: { id: 'default' } });
}

export async function countEligibleFinanceApprovers(): Promise<number> {
  const admins = await db.admin.findMany({
    where: { active: true },
    select: { role: true, permissions: true },
  });

  return admins.filter((admin) =>
    hasAdminPermission(
      admin.role,
      normalizeAdminPermissions(admin.permissions),
      'finance.approve',
    ),
  ).length;
}

export function canApproveFinanceOutflow(actor: ActiveAdminContext): boolean {
  return hasAdminPermission(actor.role, actor.permissions, 'finance.approve');
}

export async function createOutflowApproval(
  actor: ActiveAdminContext,
  input: CreateOutflowApprovalInput,
) {
  const requestNumber = await nextOutflowApprovalNumber(input.effectiveDate);

  return db.financeOutflowApproval.create({
    data: {
      requestNumber,
      outflowType: input.outflowType,
      status: 'pending',
      counterpartyId: input.counterpartyId,
      counterpartyName: input.counterpartyName,
      sourceReference: input.sourceReference || '',
      currency: normalizeCurrency(input.currency),
      amount: new Prisma.Decimal(input.amount).toDecimalPlaces(2),
      effectiveDate: input.effectiveDate,
      method: input.method,
      reference: input.reference || '',
      reason: input.reason || '',
      allocationsJson: JSON.stringify(input.allocations || []),
      requestedByAdminId: actor.id,
      requestedByName: actor.name || 'Admin',
      requestedByEmail: actor.email,
      requestedAt: new Date(),
    },
  });
}

export function serializeOutflowApproval(approval: any) {
  let allocations: VendorPaymentApprovalAllocation[] = [];
  try {
    const parsed = JSON.parse(approval.allocationsJson || '[]');
    allocations = Array.isArray(parsed) ? parsed : [];
  } catch {
    allocations = [];
  }

  return {
    ...approval,
    amount: approval.amount.toFixed(2),
    allocations,
    allocationsJson: undefined,
  };
}

export function parseApprovalAllocations(value: string): VendorPaymentApprovalAllocation[] {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.billId === 'string' && Number(item.amount) > 0)
      .map((item) => ({
        billId: String(item.billId),
        amount: Number(item.amount),
      }));
  } catch {
    return [];
  }
}
