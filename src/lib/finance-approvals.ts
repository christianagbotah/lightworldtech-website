import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { ActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission, normalizeAdminPermissions } from '@/lib/admin-permissions';
import {
  invoiceBalance,
  nextCustomerRefundNumber,
  nextOutflowApprovalNumber,
  nextSupplierPaymentNumber,
  normalizeCurrency,
  vendorBillStatusFromBalance,
} from '@/lib/finance';
import {
  postCustomerRefundJournal,
  postVendorPaymentJournal,
} from '@/lib/finance-ledger';

export type OutflowType = 'vendor_payment' | 'customer_refund';

export type VendorPaymentApprovalAllocation = {
  billId: string;
  amount: number;
};

export type CreateOutflowApprovalInput = {
  outflowType: OutflowType;
  counterpartyId: string;
  counterpartyName: string;
  sourceId: string;
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
      sourceId: input.sourceId,
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


export async function executeOutflowApproval(
  approvalId: string,
  actor: ActiveAdminContext,
  decisionNotes = '',
) {
  const approval = await db.financeOutflowApproval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new Error('Approval request not found');
  if (approval.status !== 'pending') throw new Error('Approval request has already been decided');

  if (approval.requestedByAdminId === actor.id) {
    throw new Error('Maker-checker prevents the requester from approving their own outflow');
  }
  if (!canApproveFinanceOutflow(actor)) {
    throw new Error('Finance approval permission is required');
  }

  if (approval.outflowType === 'vendor_payment') {
    const allocations = parseApprovalAllocations(approval.allocationsJson);
    const vendor = await db.financeVendor.findUnique({
      where: { id: approval.counterpartyId },
      select: { id: true, name: true, active: true },
    });
    if (!vendor || !vendor.active) throw new Error('Active supplier not found');

    const bills = allocations.length
      ? await db.financeVendorBill.findMany({
          where: {
            id: { in: allocations.map((item) => item.billId) },
            vendorId: vendor.id,
          },
          include: { allocations: true },
        })
      : [];

    if (bills.length !== allocations.length) {
      throw new Error('One or more supplier bills are no longer available for this payment');
    }

    for (const allocation of allocations) {
      const bill = bills.find((item) => item.id === allocation.billId)!;
      if (bill.currency !== approval.currency) {
        throw new Error('Supplier payment and bill currencies must match');
      }
      if (bill.status === 'void') {
        throw new Error('Payments cannot be allocated to void supplier bills');
      }
      const available = invoiceBalance(bill.total, bill.allocations);
      if (new Prisma.Decimal(allocation.amount).gt(available)) {
        throw new Error('Allocation now exceeds the outstanding balance on ' + bill.payableNumber);
      }
    }

    const paymentNumber = await nextSupplierPaymentNumber(approval.effectiveDate);
    const now = new Date();

    return db.$transaction(async (tx) => {
      const created = await tx.financeVendorPayment.create({
        data: {
          paymentNumber,
          vendorId: vendor.id,
          currency: approval.currency,
          amount: approval.amount,
          paidAt: approval.effectiveDate,
          method: approval.method,
          reference: approval.reference,
          notes: approval.reason,
          paidBy: actor.name || actor.email,
          allocations: {
            create: allocations.map((item) => ({
              billId: item.billId,
              amount: item.amount,
            })),
          },
        },
        include: {
          vendor: { select: { id: true, name: true } },
          allocations: {
            include: {
              bill: {
                select: {
                  id: true,
                  payableNumber: true,
                  total: true,
                  dueDate: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      for (const allocation of allocations) {
        const bill = bills.find((item) => item.id === allocation.billId)!;
        const combined = [...bill.allocations, { amount: new Prisma.Decimal(allocation.amount) }];
        const status = vendorBillStatusFromBalance({
          storedStatus: bill.status,
          total: bill.total,
          allocations: combined,
          dueDate: bill.dueDate,
          now,
        });
        await tx.financeVendorBill.update({
          where: { id: bill.id },
          data: { status },
        });
      }

      const allocatedAmount = allocations.reduce(
        (sum, item) => sum.plus(new Prisma.Decimal(item.amount)),
        new Prisma.Decimal(0),
      );
      await postVendorPaymentJournal(tx, {
        paymentId: created.id,
        paymentNumber: created.paymentNumber,
        paidAt: created.paidAt,
        currency: created.currency,
        amount: created.amount,
        allocatedAmount,
        method: created.method,
        postedBy: actor.name || actor.email,
      });

      await tx.financeOutflowApproval.update({
        where: { id: approval.id },
        data: {
          status: 'approved',
          decidedByAdminId: actor.id,
          decidedByName: actor.name || 'Admin',
          decidedByEmail: actor.email,
          decidedAt: new Date(),
          decisionNotes,
          resultId: created.id,
          resultNumber: created.paymentNumber,
        },
      });

      return {
        outflowType: approval.outflowType,
        resultId: created.id,
        resultNumber: created.paymentNumber,
      };
    });
  }

  if (approval.outflowType === 'customer_refund') {
    const note = await db.financeCreditNote.findUnique({
      where: { id: approval.sourceId },
      include: {
        organization: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        refunds: true,
      },
    });

    if (!note) throw new Error('Credit note not found');
    if (note.status !== 'posted') throw new Error('Refunds require a posted credit note');
    if (approval.effectiveDate.getTime() < note.issueDate.getTime()) {
      throw new Error('Refund date cannot be earlier than the credit note date');
    }
    if (note.currency !== approval.currency) {
      throw new Error('Refund currency no longer matches the credit note');
    }

    const alreadyRefunded = note.refunds.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const refundableBalance = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      note.total.minus(note.appliedAmount).minus(alreadyRefunded),
    );
    if (approval.amount.gt(refundableBalance)) {
      throw new Error('Refund now exceeds the remaining refundable credit balance');
    }

    const refundNumber = await nextCustomerRefundNumber(approval.effectiveDate);

    return db.$transaction(async (tx) => {
      const created = await tx.financeCustomerRefund.create({
        data: {
          refundNumber,
          organizationId: note.organizationId,
          creditNoteId: note.id,
          currency: note.currency,
          amount: approval.amount,
          refundedAt: approval.effectiveDate,
          method: approval.method,
          reference: approval.reference,
          reason: approval.reason,
          refundedBy: actor.name || actor.email,
        },
      });

      await postCustomerRefundJournal(tx, {
        refundId: created.id,
        refundNumber: created.refundNumber,
        refundedAt: created.refundedAt,
        currency: created.currency,
        amount: created.amount,
        method: created.method,
        postedBy: actor.name || actor.email,
      });

      await tx.financeOutflowApproval.update({
        where: { id: approval.id },
        data: {
          status: 'approved',
          decidedByAdminId: actor.id,
          decidedByName: actor.name || 'Admin',
          decidedByEmail: actor.email,
          decidedAt: new Date(),
          decisionNotes,
          resultId: created.id,
          resultNumber: created.refundNumber,
        },
      });

      return {
        outflowType: approval.outflowType,
        resultId: created.id,
        resultNumber: created.refundNumber,
      };
    });
  }

  throw new Error('Unsupported finance outflow approval type');
}
