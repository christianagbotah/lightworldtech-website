import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { checkHubtelPaymentStatus } from '@/lib/hubtel';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notification';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  nextReceiptNumber,
} from '@/lib/finance';

export async function finalizeHubtelPayment(clientReference: string, hubtelTransactionId?: string) {
  const intent = await db.hubtelPaymentIntent.findUnique({
    where: { clientReference },
    include: {
      recordedPayment: true,
      invoice: {
        include: { allocations: true, creditNotes: { where: { status: 'posted' } } },
      },
    },
  });
  if (!intent) throw new Error('Hubtel payment reference was not found');
  if (intent.recordedPayment) {
    await notifyCustomerPaymentReceived(intent.recordedPayment.id).catch(() => null);
    return {
      intent,
      payment: intent.recordedPayment,
      verifiedStatus: intent.status,
      alreadyRecorded: true,
    };
  }

  const provider = await checkHubtelPaymentStatus({
    clientReference,
    hubtelTransactionId: hubtelTransactionId || intent.hubtelTransactionId || undefined,
  });

  if (provider.clientReference && provider.clientReference !== intent.clientReference) {
    await db.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'reference_mismatch',
        providerResponse: JSON.stringify(provider.raw),
        lastStatusCheckAt: new Date(),
      },
    });
    throw new Error('Hubtel transaction reference did not match the payment intent');
  }

  const providerAmount = provider.amount === null ? null : new Prisma.Decimal(provider.amount);
  if (provider.paid && (!providerAmount || providerAmount.minus(intent.amount).abs().gt('0.01'))) {
    await db.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'amount_mismatch',
        providerResponse: JSON.stringify(provider.raw),
        lastStatusCheckAt: new Date(),
        hubtelTransactionId: provider.transactionId,
        externalTransactionId: provider.externalTransactionId,
        paymentMethod: provider.paymentMethod,
      },
    });
    throw new Error('Hubtel payment amount did not match the expected invoice amount');
  }

  if (
    provider.paid &&
    provider.currencyCode &&
    intent.currency &&
    provider.currencyCode !== intent.currency
  ) {
    await db.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'currency_mismatch',
        providerResponse: JSON.stringify(provider.raw),
        lastStatusCheckAt: new Date(),
      },
    });
    throw new Error('Hubtel payment currency did not match the invoice currency');
  }

  const paidAt = provider.date && !Number.isNaN(new Date(provider.date).getTime())
    ? new Date(provider.date)
    : provider.paid
      ? new Date()
      : null;

  if (!provider.paid) {
    const updated = await db.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: provider.status.toLowerCase() || 'unpaid',
        hubtelTransactionId: provider.transactionId,
        externalTransactionId: provider.externalTransactionId,
        paymentMethod: provider.paymentMethod,
        providerResponse: JSON.stringify(provider.raw),
        lastStatusCheckAt: new Date(),
      },
    });
    return { intent: updated, payment: null, verifiedStatus: provider.status, alreadyRecorded: false };
  }

  const receiptNumber = await nextReceiptNumber(paidAt || new Date());

  const result = await db.$transaction(async (tx) => {
    const claimed = await tx.hubtelPaymentIntent.updateMany({
      where: {
        id: intent.id,
        recordedPaymentId: null,
        status: { not: 'recording' },
      },
      data: {
        status: 'recording',
        hubtelTransactionId: provider.transactionId,
        externalTransactionId: provider.externalTransactionId,
        paymentMethod: provider.paymentMethod,
        providerResponse: JSON.stringify(provider.raw),
        lastStatusCheckAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      const existing = await tx.hubtelPaymentIntent.findUnique({
        where: { id: intent.id },
        include: { recordedPayment: true },
      });
      return { intent: existing!, payment: existing?.recordedPayment || null, alreadyRecorded: true };
    }

    const invoice = await tx.clientInvoice.findUnique({
      where: { id: intent.invoiceId },
      include: { allocations: true, creditNotes: { where: { status: 'posted' } } },
    });
    if (!invoice) throw new Error('Invoice linked to Hubtel payment no longer exists');

    const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    const allocationAmount = Prisma.Decimal.min(intent.amount, balance);

    const payment = await tx.clientPayment.create({
      data: {
        paymentNumber: receiptNumber,
        organizationId: intent.organizationId,
        currency: intent.currency,
        amount: intent.amount,
        paidAt: paidAt || new Date(),
        method: provider.paymentMethod ? 'hubtel_' + provider.paymentMethod : 'hubtel_online',
        reference: provider.externalTransactionId || provider.transactionId || intent.clientReference,
        source: 'hubtel',
        providerReference: provider.transactionId || intent.clientReference,
        notes: 'Verified Hubtel payment for ' + invoice.invoiceNumber,
        receivedBy: 'Hubtel',
        ...(allocationAmount.gt(0)
          ? {
              allocations: {
                create: {
                  invoiceId: invoice.id,
                  amount: allocationAmount,
                },
              },
            }
          : {}),
      },
    });

    if (allocationAmount.gt(0)) {
      const nextStatus = invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: [...invoice.allocations, { amount: allocationAmount }],
        credits: invoice.creditNotes,
        dueDate: invoice.dueDate,
        now: new Date(),
      });
      await tx.clientInvoice.update({
        where: { id: invoice.id },
        data: { status: nextStatus },
      });
    }

    const updatedIntent = await tx.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        recordedPaymentId: payment.id,
        status: 'paid',
        paidAt: paidAt || new Date(),
      },
    });

    return { intent: updatedIntent, payment, alreadyRecorded: false };
  });

  if (result.payment) {
    await notifyCustomerPaymentReceived(result.payment.id).catch(() => null);
  }

  return {
    ...result,
    verifiedStatus: 'Paid',
  };
}
