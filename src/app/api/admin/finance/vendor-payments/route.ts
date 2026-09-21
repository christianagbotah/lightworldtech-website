import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance, nextSupplierPaymentNumber, normalizeCurrency, paymentUnallocated, vendorBillStatusFromBalance } from '@/lib/finance';

const schema = z.object({
  vendorId: z.string().min(1),
  currency: z.string().trim().max(3).default('GHS'),
  amount: z.coerce.number().positive().max(999999999999),
  paidAt: z.coerce.date(),
  method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other']).default('bank_transfer'),
  reference: z.string().trim().max(200).default(''),
  notes: z.string().trim().max(8000).default(''),
  allocations: z.array(z.object({
    billId: z.string().min(1),
    amount: z.coerce.number().positive().max(999999999999),
  })).max(100).default([]),
}).superRefine((value, ctx) => {
  const allocated = value.allocations.reduce((sum, item) => sum + item.amount, 0);
  if (allocated - value.amount > 0.001) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allocations'], message: 'Allocated amount cannot exceed supplier payment amount' });
  }
  const ids = value.allocations.map((item) => item.billId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allocations'], message: 'Each bill can be allocated only once per payment' });
  }
});

function serialize(payment: any) {
  return {
    ...payment,
    amount: payment.amount.toFixed(2),
    unallocatedAmount: paymentUnallocated(payment.amount, payment.allocations || []).toFixed(2),
    allocations: (payment.allocations || []).map((item: any) => ({
      ...item,
      amount: item.amount.toFixed(2),
      bill: item.bill ? { ...item.bill, total: item.bill.total.toFixed(2) } : undefined,
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const payments = await db.financeVendorPayment.findMany({
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      vendor: { select: { id: true, name: true } },
      allocations: { include: { bill: { select: { id: true, payableNumber: true, total: true, dueDate: true, status: true } } } },
    },
    take: 1000,
  });
  return NextResponse.json({ success: true, data: payments.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid supplier payment', details: parsed.error.flatten() }, { status: 400 });

  const currency = normalizeCurrency(parsed.data.currency);
  const vendor = await db.financeVendor.findUnique({ where: { id: parsed.data.vendorId }, select: { id: true, active: true } });
  if (!vendor || !vendor.active) return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 404 });

  const bills = parsed.data.allocations.length
    ? await db.financeVendorBill.findMany({
        where: { id: { in: parsed.data.allocations.map((item) => item.billId) }, vendorId: parsed.data.vendorId },
        include: { allocations: true },
      })
    : [];
  if (bills.length !== parsed.data.allocations.length) {
    return NextResponse.json({ success: false, error: 'One or more bills do not belong to this supplier' }, { status: 400 });
  }

  for (const allocation of parsed.data.allocations) {
    const bill = bills.find((item) => item.id === allocation.billId)!;
    if (bill.currency !== currency) return NextResponse.json({ success: false, error: 'Supplier payment and bill currencies must match' }, { status: 400 });
    if (bill.status === 'void') return NextResponse.json({ success: false, error: 'Payments cannot be allocated to void bills' }, { status: 409 });
    if (new Prisma.Decimal(allocation.amount).gt(invoiceBalance(bill.total, bill.allocations))) {
      return NextResponse.json({ success: false, error: 'Allocation exceeds outstanding balance on ' + bill.payableNumber }, { status: 409 });
    }
  }

  const paymentNumber = await nextSupplierPaymentNumber(parsed.data.paidAt);
  const now = new Date();
  const payment = await db.$transaction(async (tx) => {
    const created = await tx.financeVendorPayment.create({
      data: {
        paymentNumber,
        vendorId: parsed.data.vendorId,
        currency,
        amount: parsed.data.amount,
        paidAt: parsed.data.paidAt,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        paidBy: actor.name || actor.email,
        allocations: { create: parsed.data.allocations.map((item) => ({ billId: item.billId, amount: item.amount })) },
      },
      include: {
        vendor: { select: { id: true, name: true } },
        allocations: { include: { bill: { select: { id: true, payableNumber: true, total: true, dueDate: true, status: true } } } },
      },
    });

    for (const allocation of parsed.data.allocations) {
      const bill = bills.find((item) => item.id === allocation.billId)!;
      const combined = [...bill.allocations, { amount: new Prisma.Decimal(allocation.amount) }];
      const status = vendorBillStatusFromBalance({ storedStatus: bill.status, total: bill.total, allocations: combined, dueDate: bill.dueDate, now });
      await tx.financeVendorBill.update({ where: { id: bill.id }, data: { status } });
    }
    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_payment_recorded',
    entity: 'FinanceVendorPayment',
    entityId: payment.id,
    details: { paymentNumber, vendorId: payment.vendorId, amount: payment.amount.toFixed(2), currency, allocationCount: payment.allocations.length },
  });

  return NextResponse.json({ success: true, data: serialize(payment) }, { status: 201 });
}
