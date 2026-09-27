import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { ActiveAdminContext } from '@/lib/admin-governance';
import {
  invoiceBalance,
  nextSupplierPaymentNumber,
  normalizeCurrency,
  vendorBillStatusFromBalance,
} from '@/lib/finance';
import { cashSystemKey, postVendorPaymentJournal } from '@/lib/finance-ledger';

export type TreasuryAllocation = {
  billId: string;
  amount: number;
};

export function parseTreasuryAllocations(value: string): TreasuryAllocation[] {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.billId === 'string' && Number(item.amount) > 0)
      .map((item) => ({ billId: String(item.billId), amount: Number(item.amount) }));
  } catch {
    return [];
  }
}

export function serializeTreasuryPlan(plan: any) {
  return {
    ...plan,
    amount: plan.amount.toFixed(2),
    allocations: parseTreasuryAllocations(plan.allocationsJson),
    allocationsJson: undefined,
  };
}

export function treasuryAccountKind(method: string): 'cash' | 'bank' | 'mobile_money' {
  return cashSystemKey(method) as 'cash' | 'bank' | 'mobile_money';
}

export async function getTreasurySourceAccount(accountId: string, method: string) {
  const account = await db.financeAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      subtype: true,
      systemKey: true,
      active: true,
      allowPosting: true,
    },
  });
  if (!account || !account.active || !account.allowPosting) {
    throw new Error('Selected treasury source account is unavailable');
  }
  if (account.type !== 'asset') {
    throw new Error('Treasury payments must use an asset cash, bank, or mobile-money account');
  }
  const expected = treasuryAccountKind(method);
  if (account.systemKey !== expected && account.subtype !== expected) {
    throw new Error(
      'Selected source account does not match the payment method (' + expected.replaceAll('_', ' ') + ')',
    );
  }
  return account;
}

export async function treasuryAccountBalance(accountId: string, currency: string): Promise<Prisma.Decimal> {
  const result = await db.financeJournalLine.aggregate({
    where: {
      accountId,
      entry: {
        status: 'posted',
        currency: normalizeCurrency(currency),
      },
    },
    _sum: { debit: true, credit: true },
  });
  return new Prisma.Decimal(result._sum.debit || 0)
    .minus(new Prisma.Decimal(result._sum.credit || 0))
    .toDecimalPlaces(2);
}

export async function validateTreasuryAllocations(input: {
  vendorId: string;
  currency: string;
  allocations: TreasuryAllocation[];
  excludePlanId?: string;
  requireEvidence?: boolean;
  includeReservations?: boolean;
}) {
  const currency = normalizeCurrency(input.currency);
  if (!input.allocations.length) return [];

  const ids = input.allocations.map((item) => item.billId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Each supplier bill can be allocated only once in a treasury plan');
  }

  const bills = await db.financeVendorBill.findMany({
    where: { id: { in: ids }, vendorId: input.vendorId },
    include: {
      allocations: true,
      attachments: { select: { id: true }, take: 1 },
    },
  });
  if (bills.length !== ids.length) {
    throw new Error('One or more supplier bills do not belong to the selected supplier');
  }

  let directReserved: Array<{ billId: string; amount: number }> = [];
  let treasuryReserved: Array<{ billId: string; amount: number }> = [];

  if (input.includeReservations) {
    const [pendingApprovals, otherPlans] = await Promise.all([
      db.financeOutflowApproval.findMany({
        where: {
          outflowType: 'vendor_payment',
          status: 'pending',
          counterpartyId: input.vendorId,
          currency,
        },
        select: { allocationsJson: true },
      }),
      db.financeTreasuryPaymentPlan.findMany({
        where: {
          id: input.excludePlanId ? { not: input.excludePlanId } : undefined,
          vendorId: input.vendorId,
          currency,
          status: { in: ['pending_approval', 'approved'] },
        },
        select: { allocationsJson: true },
      }),
    ]);
    directReserved = pendingApprovals.flatMap((item) => parseTreasuryAllocations(item.allocationsJson));
    treasuryReserved = otherPlans.flatMap((item) => parseTreasuryAllocations(item.allocationsJson));
  }

  for (const allocation of input.allocations) {
    const bill = bills.find((item) => item.id === allocation.billId)!;
    if (bill.currency !== currency) {
      throw new Error('Treasury plan and supplier bill currencies must match');
    }
    if (bill.status === 'void') {
      throw new Error('Void supplier bills cannot be included in treasury plans');
    }
    if (input.requireEvidence && !bill.attachments.length) {
      throw new Error('Supplier invoice evidence is required before planning payment for ' + bill.payableNumber);
    }

    const reserved = [...directReserved, ...treasuryReserved]
      .filter((item) => item.billId === bill.id)
      .reduce((sum, item) => sum.plus(new Prisma.Decimal(item.amount)), new Prisma.Decimal(0));
    const available = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoiceBalance(bill.total, bill.allocations).minus(reserved),
    );

    if (new Prisma.Decimal(allocation.amount).gt(available)) {
      throw new Error(
        'Treasury allocation exceeds the unreserved outstanding balance on ' + bill.payableNumber,
      );
    }
  }

  return bills;
}

export async function approveTreasuryPlanFromApproval(
  approval: any,
  actor: ActiveAdminContext,
  decisionNotes = '',
) {
  const plan = await db.financeTreasuryPaymentPlan.findUnique({
    where: { id: approval.sourceId },
  });
  if (!plan) throw new Error('Treasury payment plan not found');
  if (plan.status !== 'pending_approval') {
    throw new Error('Treasury payment plan is no longer awaiting approval');
  }
  if (plan.approvalId !== approval.id) {
    throw new Error('Treasury payment plan approval reference is inconsistent');
  }
  if (
    plan.vendorId !== approval.counterpartyId ||
    plan.currency !== approval.currency ||
    !plan.amount.eq(approval.amount)
  ) {
    throw new Error('Treasury plan no longer matches the approval request');
  }

  return db.$transaction(async (tx) => {
    const updatedPlan = await tx.financeTreasuryPaymentPlan.update({
      where: { id: plan.id },
      data: {
        status: 'approved',
        approvedByAdminId: actor.id,
        approvedByName: actor.name || 'Admin',
        approvedByEmail: actor.email,
        approvedAt: new Date(),
        decisionNotes,
      },
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
        resultId: updatedPlan.id,
        resultNumber: updatedPlan.planNumber,
      },
    });

    return {
      outflowType: 'treasury_vendor_payment' as const,
      resultId: updatedPlan.id,
      resultNumber: updatedPlan.planNumber,
    };
  });
}

export async function executeTreasuryPlanPayment(planId: string, actor: ActiveAdminContext) {
  const paymentNumber = await nextSupplierPaymentNumber(new Date());

  return db.$transaction(async (tx) => {
    const plan = await tx.financeTreasuryPaymentPlan.findUnique({
      where: { id: planId },
      include: {
        vendor: { select: { id: true, name: true, active: true } },
        sourceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            subtype: true,
            systemKey: true,
            active: true,
            allowPosting: true,
          },
        },
      },
    });
    if (!plan) throw new Error('Treasury payment plan not found');
    if (plan.status !== 'approved') throw new Error('Only approved treasury plans can be executed');
    if (!plan.vendor.active) throw new Error('Supplier is no longer active');

    const now = new Date();
    if (plan.scheduledFor.getTime() > now.getTime()) {
      throw new Error(
        'This treasury plan is scheduled for ' + plan.scheduledFor.toISOString().slice(0, 10) + ' and cannot be executed early',
      );
    }

    const expected = treasuryAccountKind(plan.method);
    if (
      !plan.sourceAccount.active ||
      !plan.sourceAccount.allowPosting ||
      plan.sourceAccount.type !== 'asset' ||
      (plan.sourceAccount.systemKey !== expected && plan.sourceAccount.subtype !== expected)
    ) {
      throw new Error('Selected treasury source account is not valid for this payment method');
    }

    const balanceAggregate = await tx.financeJournalLine.aggregate({
      where: {
        accountId: plan.sourceAccountId,
        entry: { status: 'posted', currency: plan.currency },
      },
      _sum: { debit: true, credit: true },
    });
    const postedBalance = new Prisma.Decimal(balanceAggregate._sum.debit || 0)
      .minus(new Prisma.Decimal(balanceAggregate._sum.credit || 0))
      .toDecimalPlaces(2);
    if (postedBalance.lt(plan.amount)) {
      throw new Error(
        'Insufficient posted liquidity in ' + plan.sourceAccount.code + ' · ' + plan.sourceAccount.name +
        '. Available ' + postedBalance.toFixed(2) + ' ' + plan.currency +
        ', required ' + plan.amount.toFixed(2) + ' ' + plan.currency,
      );
    }

    const allocations = parseTreasuryAllocations(plan.allocationsJson);
    const bills = allocations.length
      ? await tx.financeVendorBill.findMany({
          where: { id: { in: allocations.map((item) => item.billId) }, vendorId: plan.vendorId },
          include: { allocations: true, attachments: { select: { id: true }, take: 1 } },
        })
      : [];
    if (bills.length !== allocations.length) {
      throw new Error('One or more supplier bills are no longer available');
    }

    for (const allocation of allocations) {
      const bill = bills.find((item) => item.id === allocation.billId)!;
      if (bill.currency !== plan.currency) throw new Error('Supplier bill currency changed since approval');
      if (bill.status === 'void') throw new Error('A planned supplier bill has been voided');
      if (!bill.attachments.length) {
        throw new Error('Supplier invoice evidence is missing for ' + bill.payableNumber);
      }
      const available = invoiceBalance(bill.total, bill.allocations);
      if (new Prisma.Decimal(allocation.amount).gt(available)) {
        throw new Error('Planned amount now exceeds the outstanding balance on ' + bill.payableNumber);
      }
    }

    const paidAt = new Date();
    const created = await tx.financeVendorPayment.create({
      data: {
        paymentNumber,
        vendorId: plan.vendorId,
        sourceAccountId: plan.sourceAccountId,
        currency: plan.currency,
        amount: plan.amount,
        paidAt,
        method: plan.method,
        reference: plan.reference,
        notes: plan.notes || ('Executed from treasury plan ' + plan.planNumber),
        paidBy: actor.name || actor.email,
        allocations: {
          create: allocations.map((item) => ({ billId: item.billId, amount: item.amount })),
        },
      },
      include: {
        vendor: { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, code: true, name: true } },
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
      await tx.financeVendorBill.update({
        where: { id: bill.id },
        data: {
          status: vendorBillStatusFromBalance({
            storedStatus: bill.status,
            total: bill.total,
            allocations: combined,
            dueDate: bill.dueDate,
            now: paidAt,
          }),
        },
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
      sourceAccountId: plan.sourceAccountId,
      postedBy: actor.name || actor.email,
    });

    await tx.financeTreasuryPaymentPlan.update({
      where: { id: plan.id },
      data: {
        status: 'executed',
        executedByAdminId: actor.id,
        executedByName: actor.name || 'Admin',
        executedAt: paidAt,
        resultPaymentId: created.id,
        resultPaymentNumber: created.paymentNumber,
      },
    });

    return {
      paymentId: created.id,
      paymentNumber: created.paymentNumber,
      planNumber: plan.planNumber,
      sourceAccount: created.sourceAccount,
      amount: created.amount.toFixed(2),
      currency: created.currency,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}