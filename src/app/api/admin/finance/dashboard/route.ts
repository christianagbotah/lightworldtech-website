import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance, invoiceStatusFromBalance, vendorBillStatusFromBalance } from '@/lib/finance';

type Totals = Record<string, Prisma.Decimal>;

function add(total: Totals, currency: string, value: Prisma.Decimal | number | string) {
  total[currency] = (total[currency] || new Prisma.Decimal(0)).plus(value);
}

function jsonTotals(total: Totals): Record<string, string> {
  return Object.fromEntries(Object.entries(total).map(([currency, value]) => [currency, value.toFixed(2)]));
}

function ageBucket(dueDate: Date, now: Date): 'current' | '1_30' | '31_60' | '61_90' | '90_plus' {
  const days = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '90_plus';
}

function parseDateBoundary(value: string | null, fallback: Date, endOfDay = false): Date {
  if (!value) return fallback;
  return new Date(
    value.length === 10
      ? value + (endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z')
      : value,
  );
}

function monthKey(value: Date): string {
  return value.getUTCFullYear() + '-' + String(value.getUTCMonth() + 1).padStart(2, '0');
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GH', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthKeys(from: Date, to: Date): string[] {
  const result: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end && result.length < 120) {
    result.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const from = parseDateBoundary(searchParams.get('from'), defaultFrom);
  const to = parseDateBoundary(searchParams.get('to'), now, true);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ success: false, error: 'Invalid reporting period' }, { status: 400 });
  }

  const renewalWindow = new Date(now.getTime() + 60 * 86400000);
  const dueWindow = renewalWindow;

  const [
    services,
    invoices,
    payments,
    bills,
    vendorPayments,
    expenses,
    creditNotes,
    refunds,
    vendors,
    cashLedgerLines,
    collectionActivities,
  ] = await Promise.all([
    db.clientServiceAccount.findMany({
      where: {
        status: { in: ['active', 'pending', 'suspended'] },
        OR: [
          { expiryDate: { lte: renewalWindow } },
          { nextDueDate: { lte: dueWindow } },
        ],
      },
      include: {
        organization: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { nextDueDate: 'asc' }],
      take: 500,
    }),
    db.clientInvoice.findMany({
      where: { status: { notIn: ['draft', 'void'] } },
      include: {
        organization: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        allocations: true,
        creditNotes: { where: { status: 'posted' }, include: { refunds: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5000,
    }),
    db.clientPayment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      include: { allocations: true, organization: { select: { id: true, name: true } } },
      orderBy: { paidAt: 'desc' },
      take: 5000,
    }),
    db.financeVendorBill.findMany({
      where: { status: { not: 'void' } },
      include: { vendor: { select: { id: true, name: true } }, allocations: true },
      orderBy: { dueDate: 'asc' },
      take: 5000,
    }),
    db.financeVendorPayment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      include: { vendor: { select: { id: true, name: true } }, allocations: true },
      orderBy: { paidAt: 'desc' },
      take: 5000,
    }),
    db.financeExpense.findMany({
      where: { incurredAt: { gte: from, lte: to } },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { incurredAt: 'desc' },
      take: 5000,
    }),
    db.financeCreditNote.findMany({
      where: {
        status: 'posted',
        issueDate: { gte: from, lte: to },
      },
      select: { currency: true, total: true, issueDate: true },
      take: 5000,
    }),
    db.financeCustomerRefund.findMany({
      where: { refundedAt: { gte: from, lte: to } },
      select: { currency: true, amount: true, refundedAt: true },
      take: 5000,
    }),
    db.financeVendor.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: { in: ['cash', 'bank', 'mobile_money'] } },
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: { lte: to },
        },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { systemKey: true } },
        entry: { select: { currency: true } },
      },
      take: 20000,
    }),
    db.financeCollectionActivity.findMany({
      where: {
        OR: [
          { type: 'promise_to_pay' },
          { nextFollowUpAt: { not: null }, completedAt: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    }),
  ]);

  const receivables: Totals = {};
  const payables: Totals = {};
  const cashIn: Totals = {};
  const cashOut: Totals = {};
  const accrualRevenue: Totals = {};
  const accrualExpenses: Totals = {};
  const agedDebtors: Record<string, Totals> = { current: {}, '1_30': {}, '31_60': {}, '61_90': {}, '90_plus': {} };
  const agedCreditors: Record<string, Totals> = { current: {}, '1_30': {}, '31_60': {}, '61_90': {}, '90_plus': {} };
  const cashPositionRaw: Record<string, {
    cash: Prisma.Decimal;
    bank: Prisma.Decimal;
    mobileMoney: Prisma.Decimal;
  }> = {};
  const renewalExposureRaw: Record<string, {
    amount: Prisma.Decimal;
    count: number;
    overdueCount: number;
  }> = {};
  const promiseAmounts: Totals = {};
  const trendRaw = new Map<string, Map<string, {
    revenue: Prisma.Decimal;
    expenses: Prisma.Decimal;
    cashIn: Prisma.Decimal;
    cashOut: Prisma.Decimal;
  }>>();

  const trendBucket = (currency: string, date: Date) => {
    if (date < from || date > to) return null;
    if (!trendRaw.has(currency)) trendRaw.set(currency, new Map());
    const currencyTrend = trendRaw.get(currency)!;
    const key = monthKey(date);
    if (!currencyTrend.has(key)) {
      currencyTrend.set(key, {
        revenue: new Prisma.Decimal(0),
        expenses: new Prisma.Decimal(0),
        cashIn: new Prisma.Decimal(0),
        cashOut: new Prisma.Decimal(0),
      });
    }
    return currencyTrend.get(key)!;
  };

  const allDebtors = invoices
    .map((invoice) => {
      const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      const status = invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: invoice.allocations,
        credits: invoice.creditNotes,
        dueDate: invoice.dueDate,
        now,
      });
      if (balance.gt(0)) {
        add(receivables, invoice.currency, balance);
        add(agedDebtors[ageBucket(invoice.dueDate, now)], invoice.currency, balance);
      }
      if (invoice.issueDate >= from && invoice.issueDate <= to) {
        add(accrualRevenue, invoice.currency, invoice.total);
      }
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.organization.name,
        organizationId: invoice.organizationId,
        service: invoice.service?.name || '',
        currency: invoice.currency,
        total: invoice.total.toFixed(2),
        balance: balance.toFixed(2),
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status,
      };
    })
    .filter((item) => Number(item.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance));

  const debtors = allDebtors.slice(0, 500);

  const allCreditors = bills
    .map((bill) => {
      const balance = invoiceBalance(bill.total, bill.allocations);
      const status = vendorBillStatusFromBalance({
        storedStatus: bill.status,
        total: bill.total,
        allocations: bill.allocations,
        dueDate: bill.dueDate,
        now,
      });
      if (balance.gt(0)) {
        add(payables, bill.currency, balance);
        add(agedCreditors[ageBucket(bill.dueDate, now)], bill.currency, balance);
      }
      if (bill.issueDate >= from && bill.issueDate <= to) {
        add(accrualExpenses, bill.currency, bill.total);
      }
      return {
        id: bill.id,
        payableNumber: bill.payableNumber,
        vendor: bill.vendor.name,
        vendorId: bill.vendorId,
        category: bill.category,
        currency: bill.currency,
        total: bill.total.toFixed(2),
        balance: balance.toFixed(2),
        issueDate: bill.issueDate,
        dueDate: bill.dueDate,
        status,
      };
    })
    .filter((item) => Number(item.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance));

  const creditors = allCreditors.slice(0, 500);

  for (const payment of payments) {
    add(cashIn, payment.currency, payment.amount);
    const bucket = trendBucket(payment.currency, payment.paidAt);
    if (bucket) bucket.cashIn = bucket.cashIn.plus(payment.amount);
  }
  for (const invoice of invoices) {
    if (invoice.issueDate >= from && invoice.issueDate <= to) {
      const bucket = trendBucket(invoice.currency, invoice.issueDate);
      if (bucket) bucket.revenue = bucket.revenue.plus(invoice.total);
    }
  }
  for (const note of creditNotes) {
    add(accrualRevenue, note.currency, note.total.negated());
    const bucket = trendBucket(note.currency, note.issueDate);
    if (bucket) bucket.revenue = bucket.revenue.minus(note.total);
  }
  for (const bill of bills) {
    if (bill.issueDate >= from && bill.issueDate <= to) {
      const bucket = trendBucket(bill.currency, bill.issueDate);
      if (bucket) bucket.expenses = bucket.expenses.plus(bill.total);
    }
  }
  for (const payment of vendorPayments) {
    add(cashOut, payment.currency, payment.amount);
    const bucket = trendBucket(payment.currency, payment.paidAt);
    if (bucket) bucket.cashOut = bucket.cashOut.plus(payment.amount);
  }
  for (const refund of refunds) {
    add(cashOut, refund.currency, refund.amount);
    const bucket = trendBucket(refund.currency, refund.refundedAt);
    if (bucket) bucket.cashOut = bucket.cashOut.plus(refund.amount);
  }
  for (const expense of expenses) {
    add(accrualExpenses, expense.currency, expense.amount);
    const accrualBucket = trendBucket(expense.currency, expense.incurredAt);
    if (accrualBucket) accrualBucket.expenses = accrualBucket.expenses.plus(expense.amount);
    if (expense.paidAt && expense.paidAt >= from && expense.paidAt <= to) {
      add(cashOut, expense.currency, expense.amount);
      const bucket = trendBucket(expense.currency, expense.paidAt);
      if (bucket) bucket.cashOut = bucket.cashOut.plus(expense.amount);
    }
  }

  for (const line of cashLedgerLines) {
    const currency = line.entry.currency;
    if (!cashPositionRaw[currency]) {
      cashPositionRaw[currency] = {
        cash: new Prisma.Decimal(0),
        bank: new Prisma.Decimal(0),
        mobileMoney: new Prisma.Decimal(0),
      };
    }
    const movement = line.debit.minus(line.credit);
    const systemKey = line.account.systemKey;
    if (systemKey === 'cash') cashPositionRaw[currency].cash = cashPositionRaw[currency].cash.plus(movement);
    if (systemKey === 'bank') cashPositionRaw[currency].bank = cashPositionRaw[currency].bank.plus(movement);
    if (systemKey === 'mobile_money') cashPositionRaw[currency].mobileMoney = cashPositionRaw[currency].mobileMoney.plus(movement);
  }

  for (const service of services) {
    if (!renewalExposureRaw[service.currency]) {
      renewalExposureRaw[service.currency] = {
        amount: new Prisma.Decimal(0),
        count: 0,
        overdueCount: 0,
      };
    }
    const billingDate = service.nextDueDate || service.expiryDate;
    if (!billingDate || billingDate > renewalWindow) continue;
    renewalExposureRaw[service.currency].amount =
      renewalExposureRaw[service.currency].amount.plus(service.recurringAmount);
    renewalExposureRaw[service.currency].count += 1;
    if (billingDate < now) renewalExposureRaw[service.currency].overdueCount += 1;
  }

  const debtorById = new Map(allDebtors.map((item) => [item.id, item]));
  const latestPromiseByInvoice = new Map<string, typeof collectionActivities[number]>();
  const followUpDueInvoices = new Set<string>();
  for (const activity of collectionActivities) {
    if (!debtorById.has(activity.invoiceId)) continue;
    if (
      activity.nextFollowUpAt &&
      !activity.completedAt &&
      activity.nextFollowUpAt.getTime() <= now.getTime()
    ) {
      followUpDueInvoices.add(activity.invoiceId);
    }
    if (activity.type === 'promise_to_pay' && !latestPromiseByInvoice.has(activity.invoiceId)) {
      latestPromiseByInvoice.set(activity.invoiceId, activity);
    }
  }

  let brokenPromises = 0;
  let activePromises = 0;
  for (const [invoiceId, activity] of latestPromiseByInvoice.entries()) {
    const debtor = debtorById.get(invoiceId);
    if (!debtor || !activity.promisedDate) continue;
    if (activity.promisedDate.getTime() < now.getTime()) {
      brokenPromises += 1;
      continue;
    }
    activePromises += 1;
    if (activity.promisedAmount) {
      const promised = Prisma.Decimal.min(
        new Prisma.Decimal(debtor.balance),
        activity.promisedAmount,
      );
      add(promiseAmounts, debtor.currency, promised);
    }
  }

  const currencies = new Set([
    ...Object.keys(receivables),
    ...Object.keys(payables),
    ...Object.keys(cashIn),
    ...Object.keys(cashOut),
    ...Object.keys(accrualRevenue),
    ...Object.keys(accrualExpenses),
    ...Object.keys(cashPositionRaw),
    ...Object.keys(renewalExposureRaw),
    ...Object.keys(promiseAmounts),
    ...trendRaw.keys(),
  ]);

  const byCurrency = Object.fromEntries([...currencies].sort().map((currency) => {
    const revenue = accrualRevenue[currency] || new Prisma.Decimal(0);
    const expensesTotal = accrualExpenses[currency] || new Prisma.Decimal(0);
    const incoming = cashIn[currency] || new Prisma.Decimal(0);
    const outgoing = cashOut[currency] || new Prisma.Decimal(0);
    return [currency, {
      receivables: (receivables[currency] || new Prisma.Decimal(0)).toFixed(2),
      payables: (payables[currency] || new Prisma.Decimal(0)).toFixed(2),
      cashIn: incoming.toFixed(2),
      cashOut: outgoing.toFixed(2),
      netCashflow: incoming.minus(outgoing).toFixed(2),
      revenue: revenue.toFixed(2),
      expenses: expensesTotal.toFixed(2),
      netProfit: revenue.minus(expensesTotal).toFixed(2),
    }];
  }));

  const cashPosition = Object.fromEntries(
    Object.entries(cashPositionRaw)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]) => [currency, {
        cash: value.cash.toFixed(2),
        bank: value.bank.toFixed(2),
        mobileMoney: value.mobileMoney.toFixed(2),
        total: value.cash.plus(value.bank).plus(value.mobileMoney).toFixed(2),
      }]),
  );

  const renewalExposure = Object.fromEntries(
    Object.entries(renewalExposureRaw)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]) => [currency, {
        amount: value.amount.toFixed(2),
        count: value.count,
        overdueCount: value.overdueCount,
      }]),
  );

  const trendPeriods = monthKeys(from, to);
  const trends = Object.fromEntries(
    [...currencies].sort().map((currency) => {
      const currencyTrend = trendRaw.get(currency) || new Map();
      return [currency, trendPeriods.map((period) => {
        const bucket = currencyTrend.get(period) || {
          revenue: new Prisma.Decimal(0),
          expenses: new Prisma.Decimal(0),
          cashIn: new Prisma.Decimal(0),
          cashOut: new Prisma.Decimal(0),
        };
        return {
          period,
          label: monthLabel(period),
          revenue: bucket.revenue.toFixed(2),
          expenses: bucket.expenses.toFixed(2),
          netProfit: bucket.revenue.minus(bucket.expenses).toFixed(2),
          cashIn: bucket.cashIn.toFixed(2),
          cashOut: bucket.cashOut.toFixed(2),
          netCashflow: bucket.cashIn.minus(bucket.cashOut).toFixed(2),
        };
      })];
    }),
  );

  const serviceAlerts = services.map((service) => {
    const expiryDays = service.expiryDate
      ? Math.ceil((service.expiryDate.getTime() - now.getTime()) / 86400000)
      : null;
    const dueDays = service.nextDueDate
      ? Math.ceil((service.nextDueDate.getTime() - now.getTime()) / 86400000)
      : null;
    return {
      id: service.id,
      customer: service.organization.name,
      organizationId: service.organizationId,
      project: service.project?.name || '',
      name: service.name,
      planName: service.planName,
      status: service.status,
      billingCycle: service.billingCycle,
      currency: service.currency,
      recurringAmount: service.recurringAmount.toFixed(2),
      expiryDate: service.expiryDate,
      nextDueDate: service.nextDueDate,
      expiryDays,
      dueDays,
      alert: expiryDays !== null && expiryDays < 0
        ? 'expired'
        : dueDays !== null && dueDays < 0
          ? 'payment_overdue'
          : expiryDays !== null && expiryDays <= service.renewalNoticeDays
            ? 'renewal_due'
            : dueDays !== null && dueDays <= 30
              ? 'payment_due'
              : 'upcoming',
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      period: { from, to },
      byCurrency,
      cashPosition,
      renewalExposure,
      collections: {
        followUpDue: followUpDueInvoices.size,
        brokenPromises,
        activePromises,
        promiseAmounts: jsonTotals(promiseAmounts),
        overdueInvoices: allDebtors.filter((item) => item.status === 'overdue').length,
      },
      trends,
      debtors,
      creditors,
      aging: {
        debtors: Object.fromEntries(Object.entries(agedDebtors).map(([bucket, totals]) => [bucket, jsonTotals(totals)])),
        creditors: Object.fromEntries(Object.entries(agedCreditors).map(([bucket, totals]) => [bucket, jsonTotals(totals)])),
      },
      serviceAlerts,
      recentReceipts: payments.slice(0, 50).map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        customer: payment.organization.name,
        currency: payment.currency,
        amount: payment.amount.toFixed(2),
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference,
      })),
      recentSupplierPayments: vendorPayments.slice(0, 50).map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        vendor: payment.vendor.name,
        currency: payment.currency,
        amount: payment.amount.toFixed(2),
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference,
      })),
      recentExpenses: expenses.slice(0, 50).map((expense) => ({
        id: expense.id,
        expenseNumber: expense.expenseNumber,
        vendor: expense.vendor?.name || '',
        category: expense.category,
        description: expense.description,
        currency: expense.currency,
        amount: expense.amount.toFixed(2),
        incurredAt: expense.incurredAt,
        paidAt: expense.paidAt,
      })),
      counts: {
        customersWithDebt: new Set(allDebtors.map((item) => item.organizationId)).size,
        creditors: new Set(allCreditors.map((item) => item.vendorId)).size,
        activeVendors: vendors.length,
        serviceAlerts: serviceAlerts.length,
      },
    },
  });
}
