import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { toCsv } from '@/lib/csv';
import { vendorBillStatusFromBalance } from '@/lib/finance';

function fileSlug(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || 'supplier';
}

export async function buildSupplierAccountStatement(
  vendorId: string,
  options: { from?: Date | null; to?: Date | null } = {},
) {
  const vendor = await db.financeVendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      taxId: true,
      bills: {
        where: { status: { not: 'void' } },
        orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
        include: { allocations: true },
      },
      payments: {
        orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        include: { allocations: true },
      },
    },
  });
  if (!vendor) return null;

  type Entry = {
    date: Date;
    order: number;
    type: 'Supplier Bill' | 'Supplier Payment';
    reference: string;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    currency: string;
    status: string;
  };
  const entries: Entry[] = [
    ...vendor.bills.map((bill): Entry => ({
      date: bill.issueDate,
      order: 0,
      type: 'Supplier Bill',
      reference: bill.payableNumber,
      description: bill.vendorReference
        ? 'Supplier invoice · Ref ' + bill.vendorReference
        : 'Supplier invoice',
      debit: new Prisma.Decimal(0),
      credit: bill.total,
      currency: bill.currency,
      status: vendorBillStatusFromBalance({
        storedStatus: bill.status,
        total: bill.total,
        allocations: bill.allocations,
        dueDate: bill.dueDate,
      }),
    })),
    ...vendor.payments.map((payment): Entry => ({
      date: payment.paidAt,
      order: 1,
      type: 'Supplier Payment',
      reference: payment.paymentNumber,
      description: 'Payment · ' + payment.method.replaceAll('_', ' ') +
        (payment.reference ? ' · Ref ' + payment.reference : ''),
      debit: payment.amount,
      credit: new Prisma.Decimal(0),
      currency: payment.currency,
      status: 'paid',
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order || a.reference.localeCompare(b.reference));

  const from = options.from || null;
  const to = options.to || null;
  const opening = new Map<string, Prisma.Decimal>();
  for (const entry of entries) {
    if (!from || entry.date >= from) continue;
    const current = opening.get(entry.currency) || new Prisma.Decimal(0);
    opening.set(entry.currency, current.plus(entry.credit).minus(entry.debit));
  }

  const running = new Map(opening);
  const periodEntries = entries.filter((entry) =>
    (!from || entry.date >= from) && (!to || entry.date <= to)
  );
  const transactionRows = periodEntries.map((entry) => {
    const balance = (running.get(entry.currency) || new Prisma.Decimal(0))
      .plus(entry.credit)
      .minus(entry.debit);
    running.set(entry.currency, balance);
    return [
      entry.date.toISOString().slice(0, 10),
      entry.type,
      entry.reference,
      entry.description,
      entry.debit.eq(0) ? '' : entry.debit.toFixed(2),
      entry.credit.eq(0) ? '' : entry.credit.toFixed(2),
      entry.currency,
      balance.toFixed(2),
      entry.status,
    ];
  });

  const periodLabel = [
    from ? from.toISOString().slice(0, 10) : 'Beginning',
    to ? to.toISOString().slice(0, 10) : 'Current',
  ];

  const rows: unknown[][] = [
    ['Lightworld Technologies Ltd', 'Supplier Account Statement'],
    ['Supplier', vendor.name],
    ['Email', vendor.email],
    ['Phone', vendor.phone],
    ['Tax ID', vendor.taxId],
    ['Period', periodLabel[0], 'to', periodLabel[1]],
    ['Generated', new Date().toISOString()],
    [],
    ['Opening balances'],
    ...[...opening.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, balance]) => [currency, balance.toFixed(2)]),
    [],
    ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Currency', 'Running payable', 'Status'],
    ...transactionRows,
    [],
    ['Closing balances'],
    ...[...running.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, balance]) => [currency, balance.toFixed(2)]),
  ];

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    csv: toCsv(rows),
    filename: 'lightworld-supplier-statement-' + fileSlug(vendor.name) + '-' + new Date().toISOString().slice(0, 10) + '.csv',
  };
}