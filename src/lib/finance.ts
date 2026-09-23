import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type AllocationLike = { amount: Prisma.Decimal | number | string };

const ZERO = new Prisma.Decimal(0);

export function money(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return new Prisma.Decimal(value);
}

export function sumAmounts(items: AllocationLike[]): Prisma.Decimal {
  return items.reduce((sum, item) => sum.plus(money(item.amount)), ZERO);
}

export function invoiceBalance(
  total: Prisma.Decimal | number | string,
  allocations: AllocationLike[],
): Prisma.Decimal {
  return Prisma.Decimal.max(ZERO, money(total).minus(sumAmounts(allocations)));
}

export function paymentUnallocated(
  amount: Prisma.Decimal | number | string,
  allocations: AllocationLike[],
): Prisma.Decimal {
  return Prisma.Decimal.max(ZERO, money(amount).minus(sumAmounts(allocations)));
}

export function invoiceStatusFromBalance(input: {
  storedStatus: string;
  total: Prisma.Decimal | number | string;
  allocations: AllocationLike[];
  dueDate: Date;
  now?: Date;
}): string {
  if (input.storedStatus === 'void' || input.storedStatus === 'draft') {
    return input.storedStatus;
  }
  const balance = invoiceBalance(input.total, input.allocations);
  if (balance.lte(0)) return 'paid';
  if (sumAmounts(input.allocations).gt(0)) {
    return input.dueDate.getTime() < (input.now || new Date()).getTime()
      ? 'overdue'
      : 'partially_paid';
  }
  return input.dueDate.getTime() < (input.now || new Date()).getTime()
    ? 'overdue'
    : 'issued';
}

export function vendorBillStatusFromBalance(input: {
  storedStatus: string;
  total: Prisma.Decimal | number | string;
  allocations: AllocationLike[];
  dueDate: Date;
  now?: Date;
}): string {
  if (input.storedStatus === 'void') return 'void';
  const balance = invoiceBalance(input.total, input.allocations);
  if (balance.lte(0)) return 'paid';
  if (sumAmounts(input.allocations).gt(0)) {
    return input.dueDate.getTime() < (input.now || new Date()).getTime()
      ? 'overdue'
      : 'partially_paid';
  }
  return input.dueDate.getTime() < (input.now || new Date()).getTime()
    ? 'overdue'
    : 'unpaid';
}

async function nextSequence(sequence: string): Promise<number> {
  const safe = new Set([
    'client_invoice_number_seq',
    'client_payment_number_seq',
    'finance_payable_number_seq',
    'finance_vendor_payment_number_seq',
    'finance_expense_number_seq',
    'finance_journal_number_seq',
  ]);
  if (!safe.has(sequence)) throw new Error('Unsupported finance number sequence');

  const rows = await db.$queryRawUnsafe<Array<{ value: bigint }>>(
    'SELECT nextval(\'' + sequence.replaceAll("'", "''") + '\') AS value',
  );
  const value = Number(rows[0]?.value || 0);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Unable to allocate finance number');
  return value;
}

function formatNumber(prefix: string, sequence: number, date = new Date()): string {
  return prefix + '-' + date.getUTCFullYear() + '-' + String(sequence).padStart(6, '0');
}

export async function nextInvoiceNumber(now = new Date()): Promise<string> {
  return formatNumber('INV', await nextSequence('client_invoice_number_seq'), now);
}

export async function nextReceiptNumber(now = new Date()): Promise<string> {
  return formatNumber('RCT', await nextSequence('client_payment_number_seq'), now);
}

export async function nextPayableNumber(now = new Date()): Promise<string> {
  return formatNumber('BILL', await nextSequence('finance_payable_number_seq'), now);
}

export async function nextSupplierPaymentNumber(now = new Date()): Promise<string> {
  return formatNumber('PAY', await nextSequence('finance_vendor_payment_number_seq'), now);
}

export async function nextExpenseNumber(now = new Date()): Promise<string> {
  return formatNumber('EXP', await nextSequence('finance_expense_number_seq'), now);
}

export async function nextJournalNumber(now = new Date()): Promise<string> {
  return formatNumber('JRN', await nextSequence('finance_journal_number_seq'), now);
}

export function accountNormalSide(type: string): 'debit' | 'credit' {
  return ['asset', 'expense'].includes(type) ? 'debit' : 'credit';
}

export function decimalJson(value: Prisma.Decimal | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toFixed(2);
}

export function normalizeCurrency(value: string | null | undefined): string {
  const currency = (value || 'GHS').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'GHS';
}
