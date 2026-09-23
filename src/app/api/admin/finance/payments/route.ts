import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postCustomerPaymentJournal } from '@/lib/finance-ledger';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  nextReceiptNumber,
  normalizeCurrency,
  paymentUnallocated,
} from '@/lib/finance';

const allocationSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive().max(999999999999),
});

const schema = z.object({
  organizationId: z.string().min(1),
  currency: z.string().trim().max(3).default('GHS'),
  amount: z.coerce.number().positive().max(999999999999),
  paidAt: z.coerce.date(),
  method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other']).default('bank_transfer'),
  reference: z.string().trim().max(200).default(''),
  notes: z.string().trim().max(8000).default(''),
  allocations: z.array(allocationSchema).max(100).default([]),
}).superRefine((value, ctx) => {
  const allocated = value.allocations.reduce((sum, item) => sum + item.amount, 0);
  if (allocated - value.amount > 0.001) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allocations'], message: 'Allocated amount cannot exceed receipt amount' });
  }
  const ids = value.allocations.map((item) => item.invoiceId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allocations'], message: 'Each invoice can be allocated only once per receipt' });
  }
});

function serializePayment(payment: any) {
  return {
    ...payment,
    amount: payment.amount.toFixed(2),
    allocatedAmount: payment.allocations.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    ).toFixed(2),
    unallocatedAmount: paymentUnallocated(payment.amount, payment.allocations).toFixed(2),
    allocations: payment.allocations.map((allocation: any) => ({
      ...allocation,
      amount: allocation.amount.toFixed(2),
      invoice: allocation.invoice ? {
        ...allocation.invoice,
        total: allocation.invoice.total.toFixed(2),
      } : undefined,
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId') || undefined;
  const q = searchParams.get('q')?.trim();

  const payments = await db.clientPayment.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(q ? {
        OR: [
          { paymentNumber: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } },
          { organization: { name: { contains: q, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    take: 1000,
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      organization: { select: { id: true, name: true } },
      allocations: {
        include: {
          invoice: { select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true } },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: payments.map(serializePayment) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid customer receipt', details: parsed.error.flatten() }, { status: 400 });
  }

  const currency = normalizeCurrency(parsed.data.currency);
  const organization = await db.clientOrganization.findUnique({ where: { id: parsed.data.organizationId }, select: { id: true } });
  if (!organization) return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });

  const invoices = parsed.data.allocations.length
    ? await db.clientInvoice.findMany({
        where: { id: { in: parsed.data.allocations.map((item) => item.invoiceId) }, organizationId: parsed.data.organizationId },
        include: { allocations: true },
      })
    : [];

  if (invoices.length !== parsed.data.allocations.length) {
    return NextResponse.json({ success: false, error: 'One or more invoices do not belong to this client' }, { status: 400 });
  }

  for (const allocation of parsed.data.allocations) {
    const invoice = invoices.find((item) => item.id === allocation.invoiceId)!;
    if (invoice.currency !== currency) {
      return NextResponse.json({ success: false, error: 'Receipt and invoice currencies must match' }, { status: 400 });
    }
    if (invoice.status === 'draft' || invoice.status === 'void') {
      return NextResponse.json({ success: false, error: 'Payments cannot be allocated to draft or void invoices' }, { status: 409 });
    }
    const available = invoiceBalance(invoice.total, invoice.allocations);
    if (new Prisma.Decimal(allocation.amount).gt(available)) {
      return NextResponse.json({
        success: false,
        error: 'Allocation exceeds the outstanding balance on ' + invoice.invoiceNumber,
      }, { status: 409 });
    }
  }

  const paymentNumber = await nextReceiptNumber(parsed.data.paidAt);
  const now = new Date();

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.clientPayment.create({
      data: {
        paymentNumber,
        organizationId: parsed.data.organizationId,
        currency,
        amount: parsed.data.amount,
        paidAt: parsed.data.paidAt,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        receivedBy: actor.name || actor.email,
        allocations: {
          create: parsed.data.allocations.map((item) => ({
            invoiceId: item.invoiceId,
            amount: item.amount,
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
      },
    });

    for (const allocation of parsed.data.allocations) {
      const invoice = invoices.find((item) => item.id === allocation.invoiceId)!;
      const combined = [...invoice.allocations, { amount: new Prisma.Decimal(allocation.amount) }];
      const nextStatus = invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: combined,
        dueDate: invoice.dueDate,
        now,
      });
      await tx.clientInvoice.update({ where: { id: invoice.id }, data: { status: nextStatus } });
    }

    const allocatedAmount = parsed.data.allocations.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.amount)),
      new Prisma.Decimal(0),
    );
    await postCustomerPaymentJournal(tx, {
      paymentId: created.id,
      paymentNumber: created.paymentNumber,
      paidAt: created.paidAt,
      currency: created.currency,
      amount: created.amount,
      allocatedAmount,
      method: created.method,
      postedBy: actor.name || actor.email,
    });

    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_customer_payment_recorded',
    entity: 'ClientPayment',
    entityId: payment.id,
    details: {
      paymentNumber,
      organizationId: payment.organizationId,
      amount: payment.amount.toFixed(2),
      currency,
      allocationCount: payment.allocations.length,
    },
  });

  return NextResponse.json({ success: true, data: serializePayment(payment) }, { status: 201 });
}
