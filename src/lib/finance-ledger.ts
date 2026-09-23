import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { isBalancedJournal, normalizeCurrency } from '@/lib/finance';

type Tx = Prisma.TransactionClient;

type LedgerLineInput = {
  systemKey: string;
  description?: string;
  debit?: Prisma.Decimal | string | number;
  credit?: Prisma.Decimal | string | number;
};

type SourceJournalInput = {
  sourceType: string;
  sourceId: string;
  entryDate: Date;
  currency: string;
  description: string;
  reference?: string;
  postedBy: string;
  lines: LedgerLineInput[];
};

function decimal(value: Prisma.Decimal | string | number | undefined): Prisma.Decimal {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2);
}

async function nextJournalNumber(tx: Tx, now: Date): Promise<string> {
  const rows = await tx.$queryRawUnsafe<Array<{ value: bigint }>>(
    'SELECT nextval(\'finance_journal_number_seq\') AS value',
  );
  const value = Number(rows[0]?.value || 0);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Unable to allocate journal number');
  }
  return 'JRN-' + now.getUTCFullYear() + '-' + String(value).padStart(6, '0');
}

async function ensureOpenPeriod(tx: Tx, date: Date) {
  const period = await tx.financeAccountingPeriod.findFirst({
    where: {
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: { startDate: 'desc' },
  });
  if (!period) {
    throw new Error('No accounting period covers ' + date.toISOString().slice(0, 10));
  }
  if (period.status !== 'open') {
    throw new Error('The accounting period for ' + date.toISOString().slice(0, 10) + ' is closed');
  }

  const monthLock = await tx.financeMonthClose.findFirst({
    where: {
      status: 'closed',
      monthStart: { lte: date },
      monthEnd: { gte: date },
    },
    select: { id: true, monthStart: true, monthEnd: true },
  });
  if (monthLock) {
    throw new Error(
      'The month containing ' + date.toISOString().slice(0, 10) + ' is closed for accounting postings',
    );
  }

  return period;
}

async function resolveAccounts(tx: Tx, keys: string[]) {
  const uniqueKeys = [...new Set(keys)];
  const accounts = await tx.financeAccount.findMany({
    where: { systemKey: { in: uniqueKeys } },
    select: {
      id: true,
      code: true,
      name: true,
      systemKey: true,
      active: true,
      allowPosting: true,
    },
  });

  const map = new Map(accounts.map((account) => [account.systemKey!, account]));
  for (const key of uniqueKeys) {
    const account = map.get(key);
    if (!account) throw new Error('Required system ledger account is missing: ' + key);
    if (!account.active || !account.allowPosting) {
      throw new Error('Posting is disabled for system ledger account ' + account.code + ' · ' + account.name);
    }
  }
  return map;
}

export function cashSystemKey(method: string): string {
  if (method === 'cash') return 'cash';
  if (method === 'mobile_money') return 'mobile_money';
  return 'bank';
}

export function expenseSystemKey(category: string): string {
  const value = category.trim().toLowerCase();
  if (
    value.includes('hosting') ||
    value.includes('infrastructure') ||
    value.includes('vps') ||
    value.includes('cloud') ||
    value.includes('domain')
  ) return 'hosting_expense';

  if (
    value.includes('communication') ||
    value.includes('sms') ||
    value.includes('telecom') ||
    value.includes('airtime')
  ) return 'communications_expense';

  if (
    value.includes('payment') ||
    value.includes('gateway') ||
    value.includes('merchant') ||
    value.includes('transaction fee')
  ) return 'payment_fees';

  if (
    value.includes('cost_of_service') ||
    value.includes('cost of service') ||
    value.includes('direct service')
  ) return 'cost_of_services';

  if (
    value === 'operating_expense' ||
    value.includes('operating expense')
  ) return 'operating_expense';

  return 'uncategorized_expense';
}

export async function postSourceJournal(
  tx: Tx,
  input: SourceJournalInput,
) {
  if (!input.sourceId.trim()) throw new Error('Automatic journal sourceId is required');

  const existing = await tx.financeJournalEntry.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    include: {
      lines: true,
    },
  });
  if (existing) return existing;

  await ensureOpenPeriod(tx, input.entryDate);

  const prepared = input.lines
    .map((line) => ({
      ...line,
      debit: decimal(line.debit),
      credit: decimal(line.credit),
    }))
    .filter((line) => line.debit.gt(0) || line.credit.gt(0));

  if (prepared.length < 2 || !isBalancedJournal(prepared)) {
    throw new Error('Automatic journal is not balanced');
  }

  const accounts = await resolveAccounts(tx, prepared.map((line) => line.systemKey));
  const journalNumber = await nextJournalNumber(tx, input.entryDate);

  return tx.financeJournalEntry.create({
    data: {
      journalNumber,
      entryDate: input.entryDate,
      currency: normalizeCurrency(input.currency),
      description: input.description,
      reference: input.reference || '',
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: 'posted',
      postedAt: new Date(),
      postedBy: input.postedBy,
      lines: {
        create: prepared.map((line) => ({
          accountId: accounts.get(line.systemKey)!.id,
          description: line.description || input.description,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    },
    include: { lines: true },
  });
}

export async function postInvoiceJournal(tx: Tx, input: {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  currency: string;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  vatAmount?: Prisma.Decimal;
  nhilAmount?: Prisma.Decimal;
  getfundAmount?: Prisma.Decimal;
  total: Prisma.Decimal;
  postedBy: string;
}) {
  const revenue = input.subtotal.minus(input.discount).toDecimalPlaces(2);
  const vat = input.vatAmount || new Prisma.Decimal(0);
  const nhil = input.nhilAmount || new Prisma.Decimal(0);
  const getfund = input.getfundAmount || new Prisma.Decimal(0);
  const componentTax = vat.plus(nhil).plus(getfund);
  const legacyTax = Prisma.Decimal.max(new Prisma.Decimal(0), input.tax.minus(componentTax));

  return postSourceJournal(tx, {
    sourceType: 'client_invoice',
    sourceId: input.invoiceId,
    entryDate: input.issueDate,
    currency: input.currency,
    description: 'Customer invoice ' + input.invoiceNumber,
    reference: input.invoiceNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: 'accounts_receivable',
        description: 'Customer receivable',
        debit: input.total,
      },
      {
        systemKey: 'service_revenue',
        description: 'Service revenue',
        credit: revenue,
      },
      {
        systemKey: 'vat_payable',
        description: 'VAT output tax',
        credit: vat,
      },
      {
        systemKey: 'nhil_payable',
        description: 'NHIL output levy',
        credit: nhil,
      },
      {
        systemKey: 'getfund_payable',
        description: 'GETFund output levy',
        credit: getfund,
      },
      {
        systemKey: 'tax_payable',
        description: 'Legacy tax payable',
        credit: legacyTax,
      },
    ],
  });
}

export async function postInvoiceVoidJournal(tx: Tx, input: {
  invoiceId: string;
  invoiceNumber: string;
  voidDate: Date;
  currency: string;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  vatAmount?: Prisma.Decimal;
  nhilAmount?: Prisma.Decimal;
  getfundAmount?: Prisma.Decimal;
  total: Prisma.Decimal;
  postedBy: string;
}) {
  const revenue = input.subtotal.minus(input.discount).toDecimalPlaces(2);
  const vat = input.vatAmount || new Prisma.Decimal(0);
  const nhil = input.nhilAmount || new Prisma.Decimal(0);
  const getfund = input.getfundAmount || new Prisma.Decimal(0);
  const componentTax = vat.plus(nhil).plus(getfund);
  const legacyTax = Prisma.Decimal.max(new Prisma.Decimal(0), input.tax.minus(componentTax));

  return postSourceJournal(tx, {
    sourceType: 'client_invoice_void',
    sourceId: input.invoiceId,
    entryDate: input.voidDate,
    currency: input.currency,
    description: 'Void customer invoice ' + input.invoiceNumber,
    reference: input.invoiceNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: 'service_revenue',
        description: 'Reverse service revenue',
        debit: revenue,
      },
      {
        systemKey: 'vat_payable',
        description: 'Reverse VAT output tax',
        debit: vat,
      },
      {
        systemKey: 'nhil_payable',
        description: 'Reverse NHIL output levy',
        debit: nhil,
      },
      {
        systemKey: 'getfund_payable',
        description: 'Reverse GETFund output levy',
        debit: getfund,
      },
      {
        systemKey: 'tax_payable',
        description: 'Reverse legacy tax payable',
        debit: legacyTax,
      },
      {
        systemKey: 'accounts_receivable',
        description: 'Reverse customer receivable',
        credit: input.total,
      },
    ],
  });
}

export async function postCustomerPaymentJournal(tx: Tx, input: {
  paymentId: string;
  paymentNumber: string;
  paidAt: Date;
  currency: string;
  amount: Prisma.Decimal;
  allocatedAmount: Prisma.Decimal;
  method: string;
  postedBy: string;
}) {
  const unallocated = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    input.amount.minus(input.allocatedAmount),
  );
  return postSourceJournal(tx, {
    sourceType: 'client_payment',
    sourceId: input.paymentId,
    entryDate: input.paidAt,
    currency: input.currency,
    description: 'Customer receipt ' + input.paymentNumber,
    reference: input.paymentNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: cashSystemKey(input.method),
        description: 'Receipt into ' + input.method.replaceAll('_', ' '),
        debit: input.amount,
      },
      {
        systemKey: 'accounts_receivable',
        description: 'Settle customer receivables',
        credit: input.allocatedAmount,
      },
      {
        systemKey: 'customer_deposits',
        description: 'Unapplied customer credit',
        credit: unallocated,
      },
    ],
  });
}

export async function postVendorBillJournal(tx: Tx, input: {
  billId: string;
  payableNumber: string;
  issueDate: Date;
  currency: string;
  total: Prisma.Decimal;
  category: string;
  postedBy: string;
}) {
  return postSourceJournal(tx, {
    sourceType: 'vendor_bill',
    sourceId: input.billId,
    entryDate: input.issueDate,
    currency: input.currency,
    description: 'Supplier bill ' + input.payableNumber,
    reference: input.payableNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: expenseSystemKey(input.category),
        description: 'Supplier cost · ' + input.category.replaceAll('_', ' '),
        debit: input.total,
      },
      {
        systemKey: 'accounts_payable',
        description: 'Supplier payable',
        credit: input.total,
      },
    ],
  });
}

export async function postVendorPaymentJournal(tx: Tx, input: {
  paymentId: string;
  paymentNumber: string;
  paidAt: Date;
  currency: string;
  amount: Prisma.Decimal;
  allocatedAmount: Prisma.Decimal;
  method: string;
  postedBy: string;
}) {
  const unallocated = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    input.amount.minus(input.allocatedAmount),
  );
  return postSourceJournal(tx, {
    sourceType: 'vendor_payment',
    sourceId: input.paymentId,
    entryDate: input.paidAt,
    currency: input.currency,
    description: 'Supplier payment ' + input.paymentNumber,
    reference: input.paymentNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: 'accounts_payable',
        description: 'Settle supplier payables',
        debit: input.allocatedAmount,
      },
      {
        systemKey: 'prepaid_expenses',
        description: 'Supplier prepayment',
        debit: unallocated,
      },
      {
        systemKey: cashSystemKey(input.method),
        description: 'Payment from ' + input.method.replaceAll('_', ' '),
        credit: input.amount,
      },
    ],
  });
}

export async function postExpenseJournal(tx: Tx, input: {
  expenseId: string;
  expenseNumber: string;
  incurredAt: Date;
  paidAt: Date | null;
  currency: string;
  amount: Prisma.Decimal;
  category: string;
  method: string;
  postedBy: string;
}) {
  const paidSameDay =
    input.paidAt &&
    input.paidAt.toISOString().slice(0, 10) === input.incurredAt.toISOString().slice(0, 10);

  const recognition = await postSourceJournal(tx, {
    sourceType: 'finance_expense',
    sourceId: input.expenseId,
    entryDate: input.incurredAt,
    currency: input.currency,
    description: 'Direct expense ' + input.expenseNumber,
    reference: input.expenseNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: expenseSystemKey(input.category),
        description: 'Expense · ' + input.category.replaceAll('_', ' '),
        debit: input.amount,
      },
      {
        systemKey: paidSameDay ? cashSystemKey(input.method) : 'accrued_expenses',
        description: paidSameDay ? 'Paid expense' : 'Accrued expense',
        credit: input.amount,
      },
    ],
  });

  if (input.paidAt && !paidSameDay) {
    const settlement = await postSourceJournal(tx, {
      sourceType: 'finance_expense_payment',
      sourceId: input.expenseId,
      entryDate: input.paidAt,
      currency: input.currency,
      description: 'Settle direct expense ' + input.expenseNumber,
      reference: input.expenseNumber,
      postedBy: input.postedBy,
      lines: [
        {
          systemKey: 'accrued_expenses',
          description: 'Settle accrued expense',
          debit: input.amount,
        },
        {
          systemKey: cashSystemKey(input.method),
          description: 'Expense payment from ' + input.method.replaceAll('_', ' '),
          credit: input.amount,
        },
      ],
    });
    return { recognition, settlement };
  }

  return { recognition, settlement: null };
}

export async function postCreditNoteJournal(tx: Tx, input: {
  creditNoteId: string;
  creditNoteNumber: string;
  issueDate: Date;
  currency: string;
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  vatAmount?: Prisma.Decimal;
  nhilAmount?: Prisma.Decimal;
  getfundAmount?: Prisma.Decimal;
  total: Prisma.Decimal;
  appliedAmount: Prisma.Decimal;
  postedBy: string;
}) {
  const customerCredit = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    input.total.minus(input.appliedAmount),
  );
  const vat = input.vatAmount || new Prisma.Decimal(0);
  const nhil = input.nhilAmount || new Prisma.Decimal(0);
  const getfund = input.getfundAmount || new Prisma.Decimal(0);
  const componentTax = vat.plus(nhil).plus(getfund);
  const legacyTax = Prisma.Decimal.max(new Prisma.Decimal(0), input.tax.minus(componentTax));

  return postSourceJournal(tx, {
    sourceType: 'credit_note',
    sourceId: input.creditNoteId,
    entryDate: input.issueDate,
    currency: input.currency,
    description: 'Customer credit note ' + input.creditNoteNumber,
    reference: input.creditNoteNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: 'service_revenue',
        description: 'Reverse service revenue',
        debit: input.subtotal,
      },
      {
        systemKey: 'vat_payable',
        description: 'Reverse VAT output tax',
        debit: vat,
      },
      {
        systemKey: 'nhil_payable',
        description: 'Reverse NHIL output levy',
        debit: nhil,
      },
      {
        systemKey: 'getfund_payable',
        description: 'Reverse GETFund output levy',
        debit: getfund,
      },
      {
        systemKey: 'tax_payable',
        description: 'Reverse legacy tax payable',
        debit: legacyTax,
      },
      {
        systemKey: 'accounts_receivable',
        description: 'Reduce customer receivable',
        credit: input.appliedAmount,
      },
      {
        systemKey: 'customer_deposits',
        description: 'Customer credit available for refund or future allocation',
        credit: customerCredit,
      },
    ],
  });
}

export async function postCustomerRefundJournal(tx: Tx, input: {
  refundId: string;
  refundNumber: string;
  refundedAt: Date;
  currency: string;
  amount: Prisma.Decimal;
  method: string;
  postedBy: string;
}) {
  return postSourceJournal(tx, {
    sourceType: 'customer_refund',
    sourceId: input.refundId,
    entryDate: input.refundedAt,
    currency: input.currency,
    description: 'Customer refund ' + input.refundNumber,
    reference: input.refundNumber,
    postedBy: input.postedBy,
    lines: [
      {
        systemKey: 'customer_deposits',
        description: 'Release customer credit',
        debit: input.amount,
      },
      {
        systemKey: cashSystemKey(input.method),
        description: 'Refund from ' + input.method.replaceAll('_', ' '),
        credit: input.amount,
      },
    ],
  });
}

