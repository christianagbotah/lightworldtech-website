import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { ActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  invoiceStatusFromBalance,
  nextReceiptReversalNumber,
  sumAmounts,
} from '@/lib/finance';
import { postCustomerPaymentReversalJournal } from '@/lib/finance-ledger';

export type ReceiptReversalRequestInput = {
  paymentId: string;
  reversalDate: Date;
  reason: string;
};

export function canApproveReceiptReversal(actor: ActiveAdminContext): boolean {
  return (
    hasAdminPermission(actor.role, actor.permissions, 'finance.manage') &&
    hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  );
}

export function serializeReceiptReversalRequest(request: any) {
  return {
    ...request,
    payment: request.payment
      ? {
          ...request.payment,
          amount: request.payment.amount.toFixed(2),
        }
      : undefined,
  };
}

export function serializeReceiptReversalRequest(request: any) {
  return {
    ...request,
    payment: request.payment ? {
      ...request.payment,
      amount: request.payment.amount.toFixed(2),
    } : undefined,
  };
}

export async function createReceiptReversalRequest(
  actor: ActiveAdminContext,
  input: ReceiptReversalRequestInput,
) {
  const requestNumber = await nextReceiptReversalNumber(input.reversalDate);

  return db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-customer-receipt-reversal-request:' + input.paymentId,
    );

    const payment = await tx.clientPayment.findUnique({
      where: { id: input.paymentId },
      include: {
        reversalPayment: { select: { id: true, paymentNumber: true } },
      },
    });
    if (!payment) throw new Error('Customer receipt not found');
    if (payment.source !== 'manual' || payment.amount.lte(0)) {
      throw new Error('Only positive manually recorded customer receipts can use this reversal workflow');
    }
    if (payment.reversalPayment) {
      throw new Error('This customer receipt has already been reversed');
    }
    if (input.reversalDate.getTime() < payment.paidAt.getTime()) {
      throw new Error('Reversal date cannot be earlier than the original receipt date');
    }
    if (input.reversalDate.getTime() > Date.now() + 60_000) {
      throw new Error('Receipt reversals cannot be future-dated');
    }

    const pending = await tx.financeReceiptReversalRequest.findFirst({
      where: {
        paymentId: payment.id,
        status: { in: ['pending', 'processing'] },
      },
      select: { id: true, requestNumber: true },
    });
    if (pending) {
      throw new Error('A receipt reversal request is already pending: ' + pending.requestNumber);
    }

    return tx.financeReceiptReversalRequest.create({
      data: {
        requestNumber,
        status: 'pending',
        organizationId: payment.organizationId,
        paymentId: payment.id,
        reversalDate: input.reversalDate,
        reason: input.reason,
        requestedByAdminId: actor.id,
        requestedByName: actor.name || 'Admin',
        requestedByEmail: actor.email,
      },
      include: {
        organization: { select: { id: true, name: true } },
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
            paidAt: true,
            method: true,
            source: true,
          },
        },
      },
    });
  });
}

export async function executeReceiptReversal(
  requestId: string,
  actor: ActiveAdminContext,
  decisionNotes = '',
) {
  const request = await db.financeReceiptReversalRequest.findUnique({
    where: { id: requestId },
    include: {
      organization: { select: { id: true, name: true } },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          currency: true,
          paidAt: true,
          method: true,
          source: true,
        },
      },
    },
  });
  if (!request) throw new Error('Receipt reversal request not found');
  if (request.status !== 'pending') throw new Error('Receipt reversal request has already been decided');
  if (!canApproveReceiptReversal(actor)) throw new Error('Finance approval permission is required');

  const claimed = await db.financeReceiptReversalRequest.updateMany({
    where: { id: request.id, status: 'pending' },
    data: { status: 'processing' },
  });
  if (claimed.count !== 1) throw new Error('Receipt reversal request has already been decided');

  try {
    const reversal = await db.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'lightworld-customer-receipt-reversal:' + request.paymentId,
      );

      const original = await tx.clientPayment.findUnique({
        where: { id: request.paymentId },
        include: {
          allocations: true,
          reversalPayment: { select: { id: true, paymentNumber: true } },
        },
      });
      if (!original) throw new Error('Original customer receipt no longer exists');
      if (original.source !== 'manual' || original.amount.lte(0)) {
        throw new Error('Only positive manually recorded customer receipts can be reversed');
      }
      if (original.reversalPayment) {
        throw new Error('This customer receipt has already been reversed');
      }
      if (request.reversalDate.getTime() < original.paidAt.getTime()) {
        throw new Error('Reversal date cannot be earlier than the original receipt date');
      }
      if (request.reversalDate.getTime() > Date.now() + 60_000) {
        throw new Error('Receipt reversals cannot be future-dated');
      }

      const sourceJournal = await tx.financeJournalEntry.findFirst({
        where: {
          sourceType: 'client_payment',
          sourceId: original.id,
          status: 'posted',
        },
        select: { id: true, journalNumber: true, status: true },
      });
      if (!sourceJournal) {
        throw new Error('The original receipt has no posted source journal. Repair ledger integrity before reversal.');
      }

      const allocatedAmount = sumAmounts(original.allocations);
      if (allocatedAmount.lt(0) || allocatedAmount.gt(original.amount)) {
        throw new Error('Original receipt allocation state is invalid');
      }

      const reversed = await tx.clientPayment.create({
        data: {
          paymentNumber: request.requestNumber,
          organizationId: original.organizationId,
          currency: original.currency,
          amount: original.amount.negated(),
          paidAt: request.reversalDate,
          method: original.method,
          reference: original.paymentNumber,
          source: 'reversal',
          providerReference: original.id,
          notes: 'Reversal of ' + original.paymentNumber + ' · ' + request.reason,
          receivedBy: actor.name || actor.email,
          reversesPaymentId: original.id,
          reversalReason: request.reason,
          customerNotificationStatus: 'skipped',
          customerNotificationCompletedAt: new Date(),
          customerNotificationError: 'Payment-received notification is not sent for a reversal record.',
          allocations: {
            create: original.allocations.map((allocation) => ({
              invoiceId: allocation.invoiceId,
              amount: allocation.amount.negated(),
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
          reversesPayment: { select: { id: true, paymentNumber: true, amount: true, paidAt: true } },
        },
      });

      const affectedInvoiceIds = [...new Set(original.allocations.map((item) => item.invoiceId))];
      for (const invoiceId of affectedInvoiceIds) {
        const invoice = await tx.clientInvoice.findUnique({
          where: { id: invoiceId },
          include: {
            allocations: true,
            creditNotes: { where: { status: 'posted' } },
          },
        });
        if (!invoice) throw new Error('An allocated invoice no longer exists');

        const nextStatus = invoiceStatusFromBalance({
          storedStatus: invoice.status,
          total: invoice.total,
          allocations: invoice.allocations,
          credits: invoice.creditNotes,
          dueDate: invoice.dueDate,
          now: request.reversalDate,
        });
        await tx.clientInvoice.update({
          where: { id: invoice.id },
          data: { status: nextStatus },
        });
      }

      await postCustomerPaymentReversalJournal(tx, {
        reversalPaymentId: reversed.id,
        originalPaymentNumber: original.paymentNumber,
        reversalPaymentNumber: reversed.paymentNumber,
        reversalDate: request.reversalDate,
        currency: original.currency,
        amount: original.amount,
        allocatedAmount,
        method: original.method,
        reason: request.reason,
        postedBy: actor.name || actor.email,
      });

      return reversed;
    });

    const updatedRequest = await db.financeReceiptReversalRequest.update({
      where: { id: request.id },
      data: {
        status: 'approved',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes,
        resultPaymentId: reversal.id,
        resultPaymentNumber: reversal.paymentNumber,
      },
      include: {
        organization: { select: { id: true, name: true } },
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
            paidAt: true,
            method: true,
            source: true,
          },
        },
      },
    });

    return { request: updatedRequest, reversal };
  } catch (error) {
    await db.financeReceiptReversalRequest.updateMany({
      where: { id: request.id, status: 'processing' },
      data: { status: 'pending' },
    });
    throw error;
  }
}
