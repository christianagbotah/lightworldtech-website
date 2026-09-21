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

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : defaultFrom;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ success: false, error: 'Invalid reporting period' }, { status: 400 });
  }

  const renewalWindow = new Date(now.getTime() + 60 * 86400000);
  const dueWindow = new Date(now.getTime() + 30 * 86400000);

  const [
    services,
    invoices,
    payments,
    bills,
    vendorPayments,
    expenses,
    vendors,
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
    db.financeVendor.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const receivables: Totals = {};
  const payables: Totals = {};
  const cashIn: Totals = {};
  const cashOut: Totals = {};
  const accrualRevenue: Totals = {};
  const accrualExpenses: Totals = {};
  const agedDebtors: Record<string, Totals> = { current: {}, '1_30': {}, '31_60': {}, '61_90': {}, '90_plus': {} };
  const agedCreditors: Record<string, Totals> = { current: {}, '1_30': {}, '31_60': {}, '61_90': {}, '90_plus': {} };

  const debtors = invoices
    .map((invoice) => {
      const balance = invoiceBalance(invoice.total, invoice.allocations);
      const status = invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: invoice.allocations,
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
    .sort((a, b) => b.balance.localeCompare(a.balance))
    .slice(0, 500);

  const creditors = bills
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
    .sort((a, b) => b.balance.localeCompare(a.balance))
    .slice(0, 500);

  for (const payment of payments) add(cashIn, payment.currency, payment.amount);
  for (const payment of vendorPayments) add(cashOut, payment.currency, payment.amount);
  for (const expense of expenses) {
    add(accrualExpenses, expense.currency, expense.amount);
    if (expense.paidAt && expense.paidAt >= from && expense.paidAt <= to) {
      add(cashOut, expense.currency, expense.amount);
    }
  }

  const currencies = new Set([
    ...Object.keys(receivables),
    ...Object.keys(payables),
    ...Object.keys(cashIn),
    ...Object.keys(cashOut),
    ...Object.keys(accrualRevenue),
    ...Object.keys(accrualExpenses),
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
        customersWithDebt: new Set(debtors.map((item) => item.organizationId)).size,
        creditors: new Set(creditors.map((item) => item.vendorId)).size,
        activeVendors: vendors.length,
        serviceAlerts: serviceAlerts.length,
      },
    },
  });
}
