import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postVendorBillJournal } from '@/lib/finance-ledger';
import { invoiceBalance, nextPayableNumber, normalizeCurrency, sumAmounts, vendorBillStatusFromBalance } from '@/lib/finance';

const schema = z.object({
  vendorId: z.string().min(1),
  vendorReference: z.string().trim().max(180).default(''),
  category: z.string().trim().min(2).max(120).default('operating_expense'),
  currency: z.string().trim().max(3).default('GHS'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxableAmount: z.coerce.number().positive().max(999999999999).optional(),
  total: z.coerce.number().positive().max(999999999999).optional(),
  taxTreatment: z.enum(['none', 'standard', 'zero', 'exempt']).default('none'),
  notes: z.string().trim().max(8000).default(''),
}).refine((value) => value.dueDate.getTime() >= value.issueDate.getTime(), {
  message: 'Due date cannot be earlier than issue date',
  path: ['dueDate'],
}).refine((value) => Number(value.taxableAmount || value.total || 0) > 0, {
  message: 'Supplier bill amount must be greater than zero',
  path: ['taxableAmount'],
});

function serialize(bill: any) {
  const balance = invoiceBalance(bill.total, bill.allocations || []);
  return {
    ...bill,
    taxableAmount: bill.taxableAmount.toFixed(2),
    vatRate: bill.vatRate.toFixed(2),
    vatAmount: bill.vatAmount.toFixed(2),
    nhilRate: bill.nhilRate.toFixed(2),
    nhilAmount: bill.nhilAmount.toFixed(2),
    getfundRate: bill.getfundRate.toFixed(2),
    getfundAmount: bill.getfundAmount.toFixed(2),
    total: bill.total.toFixed(2),
    amountPaid: sumAmounts(bill.allocations || []).toFixed(2),
    balance: balance.toFixed(2),
    derivedStatus: vendorBillStatusFromBalance({
      storedStatus: bill.status,
      total: bill.total,
      allocations: bill.allocations || [],
      dueDate: bill.dueDate,
    }),
    allocations: (bill.allocations || []).map((item: any) => ({
      ...item,
      amount: item.amount.toFixed(2),
      payment: item.payment ? { ...item.payment, amount: item.payment.amount.toFixed(2) } : undefined,
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;
  const bills = await db.financeVendorBill.findMany({
    where: vendorId ? { vendorId } : undefined,
    orderBy: [{ dueDate: 'asc' }, { issueDate: 'desc' }],
    include: {
      vendor: { select: { id: true, name: true } },
      allocations: {
        include: {
          payment: { select: { id: true, paymentNumber: true, amount: true, paidAt: true, method: true, reference: true } },
        },
      },
    },
    take: 1000,
  });
  return NextResponse.json({ success: true, data: bills.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid supplier bill', details: parsed.error.flatten() }, { status: 400 });

  const vendor = await db.financeVendor.findUnique({ where: { id: parsed.data.vendorId }, select: { id: true, active: true } });
  if (!vendor || !vendor.active) return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 404 });

  const taxableAmount = new Prisma.Decimal(
    parsed.data.taxableAmount ?? parsed.data.total ?? 0,
  ).toDecimalPlaces(2);
  let vatRate = new Prisma.Decimal(0);
  let nhilRate = new Prisma.Decimal(0);
  let getfundRate = new Prisma.Decimal(0);
  let vatAmount = new Prisma.Decimal(0);
  let nhilAmount = new Prisma.Decimal(0);
  let getfundAmount = new Prisma.Decimal(0);

  if (parsed.data.taxTreatment === 'standard') {
    const profile = await db.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
    if (!profile || !profile.enabled) {
      return NextResponse.json(
        { success: false, error: 'Standard Ghana VAT is disabled. Enable the statutory tax profile first.' },
        { status: 409 },
      );
    }
    if (parsed.data.issueDate.getTime() < profile.effectiveFrom.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: 'The configured Ghana VAT profile is not effective on this supplier bill date',
          effectiveFrom: profile.effectiveFrom,
        },
        { status: 409 },
      );
    }
    vatRate = profile.vatRate;
    nhilRate = profile.nhilRate;
    getfundRate = profile.getfundRate;
    vatAmount = taxableAmount.mul(vatRate).div(100).toDecimalPlaces(2);
    nhilAmount = taxableAmount.mul(nhilRate).div(100).toDecimalPlaces(2);
    getfundAmount = taxableAmount.mul(getfundRate).div(100).toDecimalPlaces(2);
  }

  const total = taxableAmount.plus(vatAmount).plus(nhilAmount).plus(getfundAmount).toDecimalPlaces(2);
  const payableNumber = await nextPayableNumber(parsed.data.issueDate);
  const currency = normalizeCurrency(parsed.data.currency);
  const bill = await db.$transaction(async (tx) => {
    const created = await tx.financeVendorBill.create({
      data: {
        payableNumber,
        vendorId: parsed.data.vendorId,
        vendorReference: parsed.data.vendorReference,
        category: parsed.data.category,
        currency,
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
        taxTreatment: parsed.data.taxTreatment,
        taxableAmount,
        vatRate,
        vatAmount,
        nhilRate,
        nhilAmount,
        getfundRate,
        getfundAmount,
        total,
        notes: parsed.data.notes,
        status: 'unpaid',
      },
      include: { vendor: { select: { id: true, name: true } }, allocations: true },
    });

    await postVendorBillJournal(tx, {
      billId: created.id,
      payableNumber: created.payableNumber,
      issueDate: created.issueDate,
      currency: created.currency,
      total: created.total,
      taxableAmount: created.taxableAmount,
      vatAmount: created.vatAmount,
      nhilAmount: created.nhilAmount,
      getfundAmount: created.getfundAmount,
      category: created.category,
      postedBy: actor.name || actor.email,
    });

    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_bill_created',
    entity: 'FinanceVendorBill',
    entityId: bill.id,
    details: {
      payableNumber,
      vendorId: bill.vendorId,
      total: bill.total.toFixed(2),
      currency: bill.currency,
      taxTreatment: bill.taxTreatment,
      taxableAmount: bill.taxableAmount.toFixed(2),
      vatAmount: bill.vatAmount.toFixed(2),
      nhilAmount: bill.nhilAmount.toFixed(2),
      getfundAmount: bill.getfundAmount.toFixed(2),
    },
  });
  return NextResponse.json({ success: true, data: serialize(bill) }, { status: 201 });
}
