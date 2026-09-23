import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  paymentUnallocated,
  sumAmounts,
} from '@/lib/finance';

type CurrencySummary = {
  invoiced: Prisma.Decimal;
  paid: Prisma.Decimal;
  outstanding: Prisma.Decimal;
  unapplied: Prisma.Decimal;
};

function freshSummary(): CurrencySummary {
  return {
    invoiced: new Prisma.Decimal(0),
    paid: new Prisma.Decimal(0),
    outstanding: new Prisma.Decimal(0),
    unapplied: new Prisma.Decimal(0),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }

  const { id } = await params;
  const organization = await db.clientOrganization.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!organization) {
    return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });
  }

  const [services, invoices, payments] = await Promise.all([
    db.clientServiceAccount.findMany({
      where: { organizationId: id },
      orderBy: [{ status: 'asc' }, { nextDueDate: 'asc' }, { expiryDate: 'asc' }],
      take: 500,
      include: {
        project: { select: { id: true, name: true } },
        changes: { orderBy: { effectiveAt: 'desc' }, take: 8 },
        _count: { select: { invoices: true } },
      },
    }),
    db.clientInvoice.findMany({
      where: { organizationId: id },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      include: {
        project: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, planName: true } },
        allocations: true,
        creditNotes: { where: { status: 'posted' } },
      },
    }),
    db.clientPayment.findMany({
      where: { organizationId: id },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      include: {
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
    }),
  ]);

  const summary = new Map<string, CurrencySummary>();
  const bucket = (currency: string) => {
    if (!summary.has(currency)) summary.set(currency, freshSummary());
    return summary.get(currency)!;
  };

  for (const invoice of invoices) {
    if (invoice.status === 'draft' || invoice.status === 'void') continue;
    const row = bucket(invoice.currency);
    row.invoiced = row.invoiced.plus(invoice.total);
    row.outstanding = row.outstanding.plus(
      invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes),
    );
  }

  for (const payment of payments) {
    const row = bucket(payment.currency);
    row.paid = row.paid.plus(payment.amount);
    row.unapplied = row.unapplied.plus(paymentUnallocated(payment.amount, payment.allocations));
  }

  return NextResponse.json({
    success: true,
    data: {
      organization,
      byCurrency: Object.fromEntries(
        [...summary.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, row]) => [
          currency,
          {
            invoiced: row.invoiced.toFixed(2),
            paid: row.paid.toFixed(2),
            outstanding: row.outstanding.toFixed(2),
            unapplied: row.unapplied.toFixed(2),
          },
        ]),
      ),
      services: services.map((service) => ({
        ...service,
        recurringAmount: service.recurringAmount.toFixed(2),
        changes: service.changes.map((change) => ({
          ...change,
          previousAmount: change.previousAmount?.toFixed(2) ?? null,
          newAmount: change.newAmount?.toFixed(2) ?? null,
        })),
      })),
      invoices: invoices.map((invoice) => {
        const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          projectId: invoice.projectId,
          project: invoice.project,
          serviceId: invoice.serviceId,
          service: invoice.service,
          currency: invoice.currency,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: invoice.total.toFixed(2),
          amountPaid: sumAmounts(invoice.allocations).toFixed(2),
          balance: balance.toFixed(2),
          status: invoice.status,
          derivedStatus: invoiceStatusFromBalance({
            storedStatus: invoice.status,
            total: invoice.total,
            allocations: invoice.allocations,
            credits: invoice.creditNotes,
            dueDate: invoice.dueDate,
          }),
        };
      }),
      payments: payments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        currency: payment.currency,
        amount: payment.amount.toFixed(2),
        allocatedAmount: sumAmounts(payment.allocations).toFixed(2),
        unallocatedAmount: paymentUnallocated(payment.amount, payment.allocations).toFixed(2),
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference,
        notes: payment.notes,
        receivedBy: payment.receivedBy,
        allocations: payment.allocations.map((allocation) => ({
          id: allocation.id,
          invoiceId: allocation.invoiceId,
          invoiceNumber: allocation.invoice.invoiceNumber,
          amount: allocation.amount.toFixed(2),
        })),
      })),
    },
  });
}
