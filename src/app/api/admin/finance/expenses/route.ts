import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postExpenseJournal } from '@/lib/finance-ledger';
import { nextExpenseNumber, normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  vendorId: z.string().min(1).nullable().optional(),
  category: z.string().trim().min(2).max(120).default('operating_expense'),
  description: z.string().trim().min(2).max(500),
  currency: z.string().trim().max(3).default('GHS'),
  amount: z.coerce.number().positive().max(999999999999),
  incurredAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable().optional(),
  method: z.string().trim().max(80).default(''),
  reference: z.string().trim().max(200).default(''),
  notes: z.string().trim().max(8000).default(''),
});

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const expenses = await db.financeExpense.findMany({
    orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
    include: { vendor: { select: { id: true, name: true } } },
    take: 2000,
  });
  return NextResponse.json({
    success: true,
    data: expenses.map((expense) => ({ ...expense, amount: expense.amount.toFixed(2) })),
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid expense', details: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.vendorId) {
    const vendor = await db.financeVendor.findUnique({ where: { id: parsed.data.vendorId }, select: { id: true } });
    if (!vendor) return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
  }

  const expenseNumber = await nextExpenseNumber(parsed.data.incurredAt);
  const currency = normalizeCurrency(parsed.data.currency);
  const expense = await db.$transaction(async (tx) => {
    const created = await tx.financeExpense.create({
      data: {
        expenseNumber,
        vendorId: parsed.data.vendorId || null,
        category: parsed.data.category,
        description: parsed.data.description,
        currency,
        amount: parsed.data.amount,
        incurredAt: parsed.data.incurredAt,
        paidAt: parsed.data.paidAt || null,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        recordedBy: actor.name || actor.email,
      },
      include: { vendor: { select: { id: true, name: true } } },
    });

    await postExpenseJournal(tx, {
      expenseId: created.id,
      expenseNumber: created.expenseNumber,
      incurredAt: created.incurredAt,
      paidAt: created.paidAt,
      currency: created.currency,
      amount: created.amount,
      category: created.category,
      method: created.method,
      postedBy: actor.name || actor.email,
    });

    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_expense_recorded',
    entity: 'FinanceExpense',
    entityId: expense.id,
    details: { expenseNumber, amount: expense.amount.toFixed(2), currency: expense.currency, category: expense.category },
  });
  return NextResponse.json({ success: true, data: { ...expense, amount: expense.amount.toFixed(2) } }, { status: 201 });
}
