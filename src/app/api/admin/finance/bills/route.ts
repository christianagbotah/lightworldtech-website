import { NextRequest, NextResponse } from 'next/server';
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
  total: z.coerce.number().positive().max(999999999999),
  notes: z.string().trim().max(8000).default(''),
}).refine((value) => value.dueDate.getTime() >= value.issueDate.getTime(), {
  message: 'Due date cannot be earlier than issue date',
  path: ['dueDate'],
});

function serialize(bill: any) {
  const balance = invoiceBalance(bill.total, bill.allocations || []);
  return {
    ...bill,
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
        total: parsed.data.total,
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
    details: { payableNumber, vendorId: bill.vendorId, total: bill.total.toFixed(2), currency: bill.currency },
  });
  return NextResponse.json({ success: true, data: serialize(bill) }, { status: 201 });
}
