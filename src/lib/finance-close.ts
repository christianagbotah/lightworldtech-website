import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export type FinanceCloseControl = {
  key: string;
  label: string;
  status: 'pass' | 'block' | 'warn';
  count: number;
  detail: string;
};

type DateRange = {
  from: Date;
  to: Date;
};

async function missingSourceCount(
  sourceType: string,
  ids: string[],
): Promise<number> {
  if (!ids.length) return 0;
  const journals = await db.financeJournalEntry.findMany({
    where: {
      sourceType,
      sourceId: { in: ids },
    },
    select: { sourceId: true },
  });
  const posted = new Set(journals.map((item) => item.sourceId));
  return ids.filter((id) => !posted.has(id)).length;
}

export async function assessFinanceClose(range: DateRange) {
  const { from, to } = range;

  const [
    invoiceRows,
    clientPayments,
    vendorBills,
    vendorPayments,
    expenses,
    creditNotes,
    refunds,
    trialRows,
    openReconciliations,
    cashLines,
    reconciliationCoverage,
    pendingHubtel,
  ] = await Promise.all([
    db.clientInvoice.findMany({
      where: {
        status: { notIn: ['draft', 'void'] },
        issueDate: { gte: from, lte: to },
      },
      select: { id: true },
    }),
    db.clientPayment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      select: { id: true },
    }),
    db.financeVendorBill.findMany({
      where: {
        status: { not: 'void' },
        issueDate: { gte: from, lte: to },
      },
      select: { id: true },
    }),
    db.financeVendorPayment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      select: { id: true },
    }),
    db.financeExpense.findMany({
      where: {
        OR: [
          { incurredAt: { gte: from, lte: to } },
          { paidAt: { gte: from, lte: to } },
        ],
      },
      select: { id: true, incurredAt: true, paidAt: true },
    }),
    db.financeCreditNote.findMany({
      where: {
        status: 'posted',
        issueDate: { gte: from, lte: to },
      },
      select: { id: true },
    }),
    db.financeCustomerRefund.findMany({
      where: { refundedAt: { gte: from, lte: to } },
      select: { id: true },
    }),
    db.$queryRawUnsafe<Array<{ currency: string; debit: Prisma.Decimal; credit: Prisma.Decimal }>>(
      'SELECT e."currency" AS "currency", ' +
      'COALESCE(SUM(l."debit"), 0) AS "debit", ' +
      'COALESCE(SUM(l."credit"), 0) AS "credit" ' +
      'FROM "FinanceJournalLine" l ' +
      'JOIN "FinanceJournalEntry" e ON e."id" = l."entryId" ' +
      'WHERE e."status" IN (\'posted\', \'reversed\') ' +
      'AND e."entryDate" <= $1 ' +
      'GROUP BY e."currency" ORDER BY e."currency"',
      to,
    ),
    db.financeReconciliationBatch.findMany({
      where: {
        status: 'open',
        statementFrom: { lte: to },
        statementTo: { gte: from },
      },
      select: {
        id: true,
        batchNumber: true,
        accountSystemKey: true,
        currency: true,
        statementFrom: true,
        statementTo: true,
      },
    }),
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: { in: ['bank', 'mobile_money'] } },
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: { gte: from, lte: to },
        },
      },
      select: {
        account: { select: { systemKey: true } },
        entry: { select: { currency: true, entryDate: true } },
      },
      take: 100000,
    }),
    db.financeReconciliationBatch.findMany({
      where: {
        status: 'reconciled',
        statementFrom: { lte: to },
        statementTo: { gte: from },
      },
      select: {
        accountSystemKey: true,
        currency: true,
        statementFrom: true,
        statementTo: true,
      },
    }),
    db.hubtelPaymentIntent.count({
      where: {
        createdAt: { lte: to },
        status: {
          in: ['initiating', 'pending', 'recording', 'amount_mismatch', 'currency_mismatch', 'reference_mismatch'],
        },
      },
    }),
  ]);

  const [
    missingInvoices,
    missingClientPayments,
    missingVendorBills,
    missingVendorPayments,
    missingExpenseRecognition,
    missingExpenseSettlement,
    missingCreditNotes,
    missingRefunds,
  ] = await Promise.all([
    missingSourceCount('client_invoice', invoiceRows.map((item) => item.id)),
    missingSourceCount('client_payment', clientPayments.map((item) => item.id)),
    missingSourceCount('vendor_bill', vendorBills.map((item) => item.id)),
    missingSourceCount('vendor_payment', vendorPayments.map((item) => item.id)),
    missingSourceCount(
      'finance_expense',
      expenses.filter((item) => item.incurredAt >= from && item.incurredAt <= to).map((item) => item.id),
    ),
    missingSourceCount(
      'finance_expense_payment',
      expenses
        .filter((item) =>
          item.paidAt &&
          item.paidAt >= from &&
          item.paidAt <= to &&
          item.paidAt.toISOString().slice(0, 10) !== item.incurredAt.toISOString().slice(0, 10),
        )
        .map((item) => item.id),
    ),
    missingSourceCount('credit_note', creditNotes.map((item) => item.id)),
    missingSourceCount('customer_refund', refunds.map((item) => item.id)),
  ]);

  const sourceMissing =
    missingInvoices +
    missingClientPayments +
    missingVendorBills +
    missingVendorPayments +
    missingExpenseRecognition +
    missingExpenseSettlement +
    missingCreditNotes +
    missingRefunds;

  const unbalancedCurrencies = trialRows.filter((row) =>
    new Prisma.Decimal(row.debit).minus(row.credit).abs().gt('0.01'),
  );

  const cashActivityKeys = new Set(
    cashLines.map((line) =>
      (line.account.systemKey || '') +
      '|' +
      line.entry.currency +
      '|' +
      line.entry.entryDate.toISOString().slice(0, 7),
    ),
  );

  const uncoveredCashLines = cashLines.filter((line) => {
    const systemKey = line.account.systemKey || '';
    return !reconciliationCoverage.some((batch) =>
      batch.accountSystemKey === systemKey &&
      batch.currency === line.entry.currency &&
      batch.statementFrom.getTime() <= line.entry.entryDate.getTime() &&
      batch.statementTo.getTime() >= line.entry.entryDate.getTime(),
    );
  });

  const uncoveredCashAccounts = [...new Set(
    uncoveredCashLines.map((line) =>
      (line.account.systemKey || '') +
      '|' +
      line.entry.currency +
      '|' +
      line.entry.entryDate.toISOString().slice(0, 7),
    ),
  )];

  const controls: FinanceCloseControl[] = [
    {
      key: 'trial_balance',
      label: 'Trial balance control',
      status: unbalancedCurrencies.length ? 'block' : 'pass',
      count: unbalancedCurrencies.length,
      detail: unbalancedCurrencies.length
        ? 'One or more currencies are out of balance.'
        : 'Posted and reversed journals balance by currency.',
    },
    {
      key: 'source_journals',
      label: 'Operational records posted to ledger',
      status: sourceMissing ? 'block' : 'pass',
      count: sourceMissing,
      detail: sourceMissing
        ? 'Operational finance records are missing source-linked journals.'
        : 'All operational finance records in the close period are represented in the ledger.',
    },
    {
      key: 'open_reconciliations',
      label: 'Reconciliation batches completed',
      status: openReconciliations.length ? 'block' : 'pass',
      count: openReconciliations.length,
      detail: openReconciliations.length
        ? 'One or more bank/mobile-money reconciliation batches overlapping the period remain open.'
        : 'No overlapping reconciliation batch remains open.',
    },
    {
      key: 'cash_reconciliation_coverage',
      label: 'Bank and mobile-money activity reconciled through period end',
      status: uncoveredCashAccounts.length ? 'block' : 'pass',
      count: uncoveredCashAccounts.length,
      detail: uncoveredCashAccounts.length
        ? 'Bank/mobile-money ledger activity exists in one or more months without a reconciled statement covering the posting date.'
        : cashActivityKeys.size
          ? 'Every bank/mobile-money ledger posting date is covered by a finalized reconciliation statement.'
          : 'No bank/mobile-money ledger activity occurred in this period.',
    },
    {
      key: 'hubtel_pending',
      label: 'Hubtel settlement exceptions cleared',
      status: pendingHubtel ? 'warn' : 'pass',
      count: pendingHubtel,
      detail: pendingHubtel
        ? 'Hubtel payment intents remain pending or in an exception state; review before signing off.'
        : 'No unresolved Hubtel settlement exceptions exist through the close date.',
    },
  ];

  return {
    from,
    to,
    controls,
    blockingCount: controls.filter((item) => item.status === 'block').length,
    warningCount: controls.filter((item) => item.status === 'warn').length,
    ready: controls.every((item) => item.status !== 'block'),
    details: {
      missingSourceJournals: {
        invoices: missingInvoices,
        clientPayments: missingClientPayments,
        vendorBills: missingVendorBills,
        vendorPayments: missingVendorPayments,
        expenseRecognition: missingExpenseRecognition,
        expenseSettlement: missingExpenseSettlement,
        creditNotes: missingCreditNotes,
        refunds: missingRefunds,
      },
      openReconciliationBatches: openReconciliations,
      uncoveredCashAccounts,
      uncoveredCashLineCount: uncoveredCashLines.length,
      reconciliationCoverage: reconciliationCoverage.map((batch) => ({
        accountSystemKey: batch.accountSystemKey,
        currency: batch.currency,
        statementFrom: batch.statementFrom,
        statementTo: batch.statementTo,
      })),
      trialBalance: trialRows.map((row) => ({
        currency: row.currency,
        debit: new Prisma.Decimal(row.debit).toFixed(2),
        credit: new Prisma.Decimal(row.credit).toFixed(2),
        difference: new Prisma.Decimal(row.debit).minus(row.credit).toFixed(2),
      })),
    },
  };
}
