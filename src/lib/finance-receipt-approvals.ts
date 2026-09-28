import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { ActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  nextReceiptApprovalNumber,
  nextReceiptNumber,
  normalizeCurrency,
  paymentUnallocated,
} from '@/lib/finance';
import { postCustomerPaymentJournal } from '@/lib/finance-ledger';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notification';

export type ReceiptApprovalAllocation = {
  invoiceId: string;
  amount: number;
};

export type CustomerReceiptInput = {
  organizationId: string;
  currency: string;
  amount: number;
  paidAt: Date;
  method: string;
  reference: string;
  notes: string;
  allocations: ReceiptApprovalAllocation[];
};

export function parseReceiptApprovalAllocations(value: string): ReceiptApprovalAllocation[] {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.invoiceId === 'string' && Number(item.amount) > 0)
      .map((item) => ({ invoiceId: String(item.invoiceId), amount: Number(item.amount) }));
  } catch {
    return [];
  }
}

export function serializeReceiptApproval(approval: any) {
  return {
    ...approval,
    amount: approval.amount.toFixed(2),
    allocations: parseReceiptApprovalAllocations(approval.allocationsJson),
    allocationsJson: undefined,
  };
}

export async function createReceiptApproval(actor: ActiveAdminContext, input: CustomerReceiptInput) {
  const requestNumber = await nextReceiptApprovalNumber(input.paidAt);
  return db.financeReceiptApproval.create({
    data: {
      requestNumber,
      status: 'pending',
      organizationId: input.organizationId,
      currency: normalizeCurrency(input.currency),
      amount: new Prisma.Decimal(input.amount).toDecimalPlaces(2),
      paidAt: input.paidAt,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
      allocationsJson: JSON.stringify(input.allocations),
      requestedByAdminId: actor.id,
      requestedByName: actor.name || 'Admin',
      requestedByEmail: actor.email,
    },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });
}

export function canApproveCustomerReceipt(actor: ActiveAdminContext): boolean {
  return (
    hasAdminPermission(actor.role, actor.permissions, 'finance.manage') &&
    hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  );
}

async function createPostedReceipt(
  actor: ActiveAdminContext,
  input: CustomerReceiptInput,
) {
  const currency = normalizeCurrency(input.currency);
  const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
  if (amount.lte(0)) throw new Error('Receipt amount must be greater than zero');

  const allocated = input.allocations.reduce(
    (sum, item) => sum.plus(new Prisma.Decimal(item.amount)),
    new Prisma.Decimal(0),
  );
  if (allocated.gt(amount)) throw new Error('Allocated amount cannot exceed receipt amount');

  const ids = input.allocations.map((item) => item.invoiceId);
  if (new Set(ids).size !== ids.length) throw new Error('Each invoice can be allocated only once per receipt');

  const paymentNumber = await nextReceiptNumber(input.paidAt);

  return db.$transaction(async (tx) => {
    const organization = await tx.clientOrganization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, name: true },
    });
    if (!organization) throw new Error('Client organization not found');

    for (const invoiceId of [...ids].sort()) {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'lightworld-customer-receipt:' + invoiceId,
      );
    }

    const invoices = ids.length
      ? await tx.clientInvoice.findMany({
          where: { id: { in: ids }, organizationId: input.organizationId },
          include: { allocations: true, creditNotes: { where: { status: 'posted' } } },
        })
      : [];

    if (invoices.length !== ids.length) {
      throw new Error('One or more invoices do not belong to this client');
    }

    for (const allocation of input.allocations) {
      const invoice = invoices.find((item) => item.id === allocation.invoiceId)!;
      if (invoice.currency !== currency) throw new Error('Receipt and invoice currencies must match');
      if (invoice.status === 'draft' || invoice.status === 'void') {
        throw new Error('Payments cannot be allocated to draft or void invoices');
      }
      const available = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      if (new Prisma.Decimal(allocation.amount).gt(available)) {
        throw new Error('Allocation exceeds the outstanding balance on ' + invoice.invoiceNumber);
      }
    }

    const now = new Date();
    const created = await tx.clientPayment.create({
      data: {
        paymentNumber,
        organizationId: input.organizationId,
        currency,
        amount,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference,
        source: 'manual',
        notes: input.notes,
        receivedBy: actor.name || actor.email,
        allocations: {
          create: input.allocations.map((item) => ({
            invoiceId: item.invoiceId,
            amount: item.amount,
          })),
        },
      },
      include: {
        organization: { select: { id: true, name: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true } },
          },
        },
      },
    });

    for (const allocation of input.allocations) {
      const invoice = invoices.find((item) => item.id === allocation.invoiceId)!;
      const combined = [...invoice.allocations, { amount: new Prisma.Decimal(allocation.amount) }];
      const nextStatus = invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: combined,
        credits: invoice.creditNotes,
        dueDate: invoice.dueDate,
        now,
      });
      await tx.clientInvoice.update({ where: { id: invoice.id }, data: { status: nextStatus } });
    }

    await postCustomerPaymentJournal(tx, {
      paymentId: created.id,
      paymentNumber: created.paymentNumber,
      paidAt: created.paidAt,
      currency: created.currency,
      amount: created.amount,
      allocatedAmount: allocated,
      method: created.method,
      postedBy: actor.name || actor.email,
    });

    return created;
  });
}

export async function postManualCustomerReceipt(actor: ActiveAdminContext, input: CustomerReceiptInput) {
  const payment = await createPostedReceipt(actor, input);
  const notification = await notifyCustomerPaymentReceived(payment.id).catch(() => null);
  return { payment, notification };
}

export async function executeReceiptApproval(
  approvalId: string,
  actor: ActiveAdminContext,
  decisionNotes = '',
) {
  const approval = await db.financeReceiptApproval.findUnique({
    where: { id: approvalId },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!approval) throw new Error('Receipt approval request not found');
  if (approval.status !== 'pending') throw new Error('Receipt approval request has already been decided');
  if (!canApproveCustomerReceipt(actor)) throw new Error('Finance approval permission is required');
  if (approval.requestedByAdminId === actor.id) {
    throw new Error('Maker-checker prevents the requester from approving their own receipt');
  }

  const claimed = await db.financeReceiptApproval.updateMany({
    where: { id: approval.id, status: 'pending' },
    data: { status: 'processing' },
  });
  if (claimed.count !== 1) throw new Error('Receipt approval request has already been decided');

  const allocations = parseReceiptApprovalAllocations(approval.allocationsJson);
  let result;
  try {
    result = await postManualCustomerReceipt(actor, {
    organizationId: approval.organizationId,
    currency: approval.currency,
    amount: Number(approval.amount),
    paidAt: approval.paidAt,
    method: approval.method,
    reference: approval.reference,
    notes: approval.notes,
      allocations,
    });
  } catch (error) {
    await db.financeReceiptApproval.updateMany({
      where: { id: approval.id, status: 'processing' },
      data: { status: 'pending' },
    });
    throw error;
  }

  const updated = await db.financeReceiptApproval.update({
    where: { id: approval.id },
    data: {
      status: 'approved',
      decidedByAdminId: actor.id,
      decidedByName: actor.name || 'Admin',
      decidedByEmail: actor.email,
      decidedAt: new Date(),
      decisionNotes,
      resultPaymentId: result.payment.id,
      resultReceiptNumber: result.payment.paymentNumber,
    },
    include: { organization: { select: { id: true, name: true } } },
  });

  return {
    approval: updated,
    payment: result.payment,
    notification: result.notification,
  };
}

export function serializePostedPayment(payment: any) {
  return {
    ...payment,
    amount: payment.amount.toFixed(2),
    allocatedAmount: payment.allocations.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    ).toFixed(2),
    unallocatedAmount: paymentUnallocated(payment.amount, payment.allocations).toFixed(2),
    allocations: payment.allocations.map((allocation: any) => ({
      ...allocation,
      amount: allocation.amount.toFixed(2),
      invoice: allocation.invoice ? {
        ...allocation.invoice,
        total: allocation.invoice.total.toFixed(2),
      } : undefined,
    })),
  };
}
