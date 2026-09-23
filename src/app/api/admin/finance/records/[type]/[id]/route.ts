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
  vendorBillStatusFromBalance,
} from '@/lib/finance';

type RecordType = 'invoice' | 'receipt' | 'bill' | 'expense';

function parseAuditDetails(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

async function auditTrail(entity: string, entityId: string) {
  const rows = await db.adminAuditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      action: true,
      adminName: true,
      adminEmail: true,
      details: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    details: parseAuditDetails(row.details),
  }));
}

async function clientPosition(organizationId: string) {
  const [invoices, payments] = await Promise.all([
    db.clientInvoice.findMany({
      where: {
        organizationId,
        status: { notIn: ['draft', 'void'] },
      },
      include: {
        allocations: true,
        creditNotes: {
          where: { status: 'posted' },
          include: { refunds: true },
        },
      },
      orderBy: { issueDate: 'desc' },
      take: 3000,
    }),
    db.clientPayment.findMany({
      where: { organizationId },
      include: { allocations: true },
      orderBy: { paidAt: 'desc' },
      take: 3000,
    }),
  ]);

  const values = new Map<string, { outstanding: Prisma.Decimal; credit: Prisma.Decimal }>();
  const ensure = (currency: string) => {
    if (!values.has(currency)) {
      values.set(currency, {
        outstanding: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      });
    }
    return values.get(currency)!;
  };

  for (const invoice of invoices) {
    const bucket = ensure(invoice.currency);
    bucket.outstanding = bucket.outstanding.plus(
      invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes),
    );
    const refundable = invoice.creditNotes.reduce((sum, note) => {
      const refunded = note.refunds.reduce(
        (refundTotal, refund) => refundTotal.plus(refund.amount),
        new Prisma.Decimal(0),
      );
      return sum.plus(
        Prisma.Decimal.max(
          new Prisma.Decimal(0),
          note.total.minus(note.appliedAmount).minus(refunded),
        ),
      );
    }, new Prisma.Decimal(0));
    bucket.credit = bucket.credit.plus(refundable);
  }
  for (const payment of payments) {
    const bucket = ensure(payment.currency);
    bucket.credit = bucket.credit.plus(paymentUnallocated(payment.amount, payment.allocations));
  }

  return Object.fromEntries(
    [...values.entries()].map(([currency, value]) => [
      currency,
      {
        outstanding: value.outstanding.toFixed(2),
        unappliedCredit: value.credit.toFixed(2),
        netDue: Prisma.Decimal.max(0, value.outstanding.minus(value.credit)).toFixed(2),
      },
    ]),
  );
}

async function vendorPosition(vendorId: string) {
  const [bills, payments] = await Promise.all([
    db.financeVendorBill.findMany({
      where: { vendorId, status: { not: 'void' } },
      include: { allocations: true },
      orderBy: { issueDate: 'desc' },
      take: 3000,
    }),
    db.financeVendorPayment.findMany({
      where: { vendorId },
      include: { allocations: true },
      orderBy: { paidAt: 'desc' },
      take: 3000,
    }),
  ]);

  const values = new Map<string, { outstanding: Prisma.Decimal; credit: Prisma.Decimal }>();
  const ensure = (currency: string) => {
    if (!values.has(currency)) {
      values.set(currency, {
        outstanding: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      });
    }
    return values.get(currency)!;
  };

  for (const bill of bills) {
    const bucket = ensure(bill.currency);
    bucket.outstanding = bucket.outstanding.plus(invoiceBalance(bill.total, bill.allocations));
  }
  for (const payment of payments) {
    const bucket = ensure(payment.currency);
    bucket.credit = bucket.credit.plus(paymentUnallocated(payment.amount, payment.allocations));
  }

  return Object.fromEntries(
    [...values.entries()].map(([currency, value]) => [
      currency,
      {
        outstanding: value.outstanding.toFixed(2),
        unappliedCredit: value.credit.toFixed(2),
        netDue: Prisma.Decimal.max(0, value.outstanding.minus(value.credit)).toFixed(2),
      },
    ]),
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { type, id } = await params;
  if (!['invoice', 'receipt', 'bill', 'expense'].includes(type)) {
    return NextResponse.json({ success: false, error: 'Unsupported finance record type' }, { status: 400 });
  }

  if (type === 'invoice') {
    const invoice = await db.clientInvoice.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            primaryContactName: true,
            primaryEmail: true,
            primaryPhone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            planName: true,
            status: true,
            billingCycle: true,
            recurringAmount: true,
            expiryDate: true,
            nextDueDate: true,
          },
        },
        project: { select: { id: true, name: true, status: true, manager: true } },
        lines: { orderBy: { order: 'asc' } },
        creditNotes: {
          where: { status: 'posted' },
          orderBy: { issueDate: 'asc' },
          include: { refunds: { orderBy: { refundedAt: 'asc' } } },
        },
        allocations: {
          orderBy: { createdAt: 'asc' },
          include: {
            payment: {
              select: {
                id: true,
                paymentNumber: true,
                amount: true,
                paidAt: true,
                method: true,
                reference: true,
                source: true,
                providerReference: true,
                receivedBy: true,
                createdAt: true,
              },
            },
          },
        },
        paymentIntents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            clientReference: true,
            status: true,
            amount: true,
            paymentMethod: true,
            hubtelTransactionId: true,
            externalTransactionId: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });

    const amountPaid = sumAmounts(invoice.allocations);
    const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    const [position, audit, related] = await Promise.all([
      clientPosition(invoice.organizationId),
      auditTrail('ClientInvoice', invoice.id),
      db.clientInvoice.findMany({
        where: {
          organizationId: invoice.organizationId,
          id: { not: invoice.id },
          status: { notIn: ['draft', 'void'] },
        },
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          allocations: true,
          creditNotes: { where: { status: 'posted' } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        type: 'invoice' satisfies RecordType,
        invoice: {
          ...invoice,
          subtotal: invoice.subtotal.toFixed(2),
          discount: invoice.discount.toFixed(2),
          tax: invoice.tax.toFixed(2),
          total: invoice.total.toFixed(2),
          amountPaid: amountPaid.toFixed(2),
          balance: balance.toFixed(2),
          derivedStatus: invoiceStatusFromBalance({
            storedStatus: invoice.status,
            total: invoice.total,
            allocations: invoice.allocations,
            credits: invoice.creditNotes,
            dueDate: invoice.dueDate,
          }),
          service: invoice.service ? {
            ...invoice.service,
            recurringAmount: invoice.service.recurringAmount.toFixed(2),
          } : null,
          lines: invoice.lines.map((line) => ({
            ...line,
            quantity: line.quantity.toFixed(2),
            unitPrice: line.unitPrice.toFixed(2),
            amount: line.amount.toFixed(2),
          })),
          creditNotes: invoice.creditNotes.map((note) => {
            const refunded = note.refunds.reduce(
              (sum, refund) => sum.plus(refund.amount),
              new Prisma.Decimal(0),
            );
            return {
              ...note,
              subtotal: note.subtotal.toFixed(2),
              tax: note.tax.toFixed(2),
              total: note.total.toFixed(2),
              appliedAmount: note.appliedAmount.toFixed(2),
              refundedAmount: refunded.toFixed(2),
              refundableBalance: Prisma.Decimal.max(
                new Prisma.Decimal(0),
                note.total.minus(note.appliedAmount).minus(refunded),
              ).toFixed(2),
              refunds: note.refunds.map((refund) => ({
                ...refund,
                amount: refund.amount.toFixed(2),
              })),
            };
          }),
          allocations: invoice.allocations.map((allocation) => ({
            ...allocation,
            amount: allocation.amount.toFixed(2),
            payment: {
              ...allocation.payment,
              amount: allocation.payment.amount.toFixed(2),
            },
          })),
          paymentIntents: invoice.paymentIntents.map((intent) => ({
            ...intent,
            amount: intent.amount.toFixed(2),
          })),
        },
        accountPosition: position,
        related: related.map((item) => ({
          id: item.id,
          type: 'invoice',
          reference: item.invoiceNumber,
          date: item.issueDate,
          dueDate: item.dueDate,
          status: invoiceStatusFromBalance({
            storedStatus: item.status,
            total: item.total,
            allocations: item.allocations,
            credits: item.creditNotes,
            dueDate: item.dueDate,
          }),
          currency: item.currency,
          amount: item.total.toFixed(2),
          balance: invoiceBalance(item.total, item.allocations, item.creditNotes).toFixed(2),
        })),
        audit,
      },
    });
  }

  if (type === 'receipt') {
    const payment = await db.clientPayment.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            primaryContactName: true,
            primaryEmail: true,
            primaryPhone: true,
          },
        },
        allocations: {
          orderBy: { createdAt: 'asc' },
          include: {
            invoice: {
              include: {
                allocations: true,
                creditNotes: { where: { status: 'posted' } },
                service: { select: { id: true, name: true, planName: true } },
              },
            },
          },
        },
        hubtelIntent: {
          select: {
            id: true,
            clientReference: true,
            status: true,
            checkoutId: true,
            hubtelTransactionId: true,
            externalTransactionId: true,
            paymentMethod: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!payment) return NextResponse.json({ success: false, error: 'Customer receipt not found' }, { status: 404 });

    const [position, audit] = await Promise.all([
      clientPosition(payment.organizationId),
      auditTrail('ClientPayment', payment.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        type: 'receipt' satisfies RecordType,
        payment: {
          ...payment,
          amount: payment.amount.toFixed(2),
          allocatedAmount: sumAmounts(payment.allocations).toFixed(2),
          unallocatedAmount: paymentUnallocated(payment.amount, payment.allocations).toFixed(2),
          allocations: payment.allocations.map((allocation) => ({
            ...allocation,
            amount: allocation.amount.toFixed(2),
            invoice: {
              ...allocation.invoice,
              subtotal: allocation.invoice.subtotal.toFixed(2),
              discount: allocation.invoice.discount.toFixed(2),
              tax: allocation.invoice.tax.toFixed(2),
              total: allocation.invoice.total.toFixed(2),
              balance: invoiceBalance(
                allocation.invoice.total,
                allocation.invoice.allocations,
                allocation.invoice.creditNotes,
              ).toFixed(2),
              derivedStatus: invoiceStatusFromBalance({
                storedStatus: allocation.invoice.status,
                total: allocation.invoice.total,
                allocations: allocation.invoice.allocations,
                credits: allocation.invoice.creditNotes,
                dueDate: allocation.invoice.dueDate,
              }),
              allocations: undefined,
            },
          })),
        },
        accountPosition: position,
        audit,
      },
    });
  }

  if (type === 'bill') {
    const bill = await db.financeVendorBill.findUnique({
      where: { id },
      include: {
        vendor: true,
        allocations: {
          orderBy: { createdAt: 'asc' },
          include: {
            payment: {
              select: {
                id: true,
                paymentNumber: true,
                amount: true,
                paidAt: true,
                method: true,
                reference: true,
                paidBy: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!bill) return NextResponse.json({ success: false, error: 'Supplier bill not found' }, { status: 404 });

    const balance = invoiceBalance(bill.total, bill.allocations);
    const [position, audit, related] = await Promise.all([
      vendorPosition(bill.vendorId),
      auditTrail('FinanceVendorBill', bill.id),
      db.financeVendorBill.findMany({
        where: { vendorId: bill.vendorId, id: { not: bill.id }, status: { not: 'void' } },
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: { allocations: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        type: 'bill' satisfies RecordType,
        bill: {
          ...bill,
          total: bill.total.toFixed(2),
          amountPaid: sumAmounts(bill.allocations).toFixed(2),
          balance: balance.toFixed(2),
          derivedStatus: vendorBillStatusFromBalance({
            storedStatus: bill.status,
            total: bill.total,
            allocations: bill.allocations,
            dueDate: bill.dueDate,
          }),
          allocations: bill.allocations.map((allocation) => ({
            ...allocation,
            amount: allocation.amount.toFixed(2),
            payment: {
              ...allocation.payment,
              amount: allocation.payment.amount.toFixed(2),
            },
          })),
        },
        accountPosition: position,
        related: related.map((item) => ({
          id: item.id,
          type: 'bill',
          reference: item.payableNumber,
          date: item.issueDate,
          dueDate: item.dueDate,
          status: vendorBillStatusFromBalance({
            storedStatus: item.status,
            total: item.total,
            allocations: item.allocations,
            dueDate: item.dueDate,
          }),
          currency: item.currency,
          amount: item.total.toFixed(2),
          balance: invoiceBalance(item.total, item.allocations).toFixed(2),
        })),
        audit,
      },
    });
  }

  if (type === 'expense') {
    const expense = await db.financeExpense.findUnique({
      where: { id },
      include: { vendor: true },
    });
  if (!expense) return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });

  const [audit, related] = await Promise.all([
    auditTrail('FinanceExpense', expense.id),
    db.financeExpense.findMany({
      where: {
        id: { not: expense.id },
        ...(expense.vendorId ? { vendorId: expense.vendorId } : { vendorId: null }),
      },
      orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: { vendor: { select: { id: true, name: true } } },
    }),
  ]);

    return NextResponse.json({
      success: true,
      data: {
        type: 'expense' satisfies RecordType,
        expense: { ...expense, amount: expense.amount.toFixed(2) },
        related: related.map((item) => ({
          id: item.id,
          type: 'expense',
          reference: item.expenseNumber,
          date: item.incurredAt,
          status: item.paidAt ? 'paid' : 'unpaid',
          currency: item.currency,
          amount: item.amount.toFixed(2),
          vendor: item.vendor?.name || '',
          description: item.description,
        })),
        audit,
      },
    });
  }

  return NextResponse.json({ success: false, error: 'Unsupported finance record type' }, { status: 400 });
}
