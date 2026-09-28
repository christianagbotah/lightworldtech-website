import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  createOutflowApproval,
  getFinanceApprovalPolicy,
  serializeOutflowApproval,
} from '@/lib/finance-approvals';
import { postExpenseSettlementJournal } from '@/lib/finance-ledger';

const schema = z.object({
  paidAt: z.coerce.date(),
  method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other']).default('bank_transfer'),
  reference: z.string().trim().max(200).default(''),
  notes: z.string().trim().max(4000).default(''),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid expense payment request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const expense = await db.financeExpense.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true } },
    },
  });
  if (!expense) return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
  if (expense.paidAt) return NextResponse.json({ success: false, error: 'Expense has already been paid' }, { status: 409 });
  if (parsed.data.paidAt.getTime() < expense.incurredAt.getTime()) {
    return NextResponse.json({ success: false, error: 'Payment date cannot be earlier than the incurred date' }, { status: 400 });
  }

  const pending = await db.financeOutflowApproval.findFirst({
    where: {
      outflowType: 'direct_expense_payment',
      sourceId: expense.id,
      status: { in: ['pending', 'scheduled'] },
    },
    select: { id: true, requestNumber: true, status: true },
  });
  if (pending) {
    return NextResponse.json({
      success: false,
      error: 'A payment request already exists for this expense',
      existingApproval: pending,
    }, { status: 409 });
  }

  const policy = await getFinanceApprovalPolicy();
  if (policy?.enabled) {
    const approval = await createOutflowApproval(actor, {
      outflowType: 'direct_expense_payment',
      counterpartyId: expense.vendorId || expense.organizationId || expense.id,
      counterpartyName: expense.vendor?.name || expense.organization?.name || 'Direct expense',
      sourceId: expense.id,
      sourceReference: expense.expenseNumber,
      currency: expense.currency,
      amount: expense.amount,
      effectiveDate: parsed.data.paidAt,
      method: parsed.data.method,
      reference: parsed.data.reference,
      reason: parsed.data.notes || expense.description,
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_expense_payment_requested',
      entity: 'FinanceOutflowApproval',
      entityId: approval.id,
      details: {
        requestNumber: approval.requestNumber,
        expenseId: expense.id,
        expenseNumber: expense.expenseNumber,
        amount: expense.amount.toFixed(2),
        currency: expense.currency,
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_expense_payment_requested',
      entity: 'FinanceExpense',
      entityId: expense.id,
      details: {
        requestNumber: approval.requestNumber,
        approvalId: approval.id,
        amount: expense.amount.toFixed(2),
        currency: expense.currency,
        effectiveDate: approval.effectiveDate.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      data: serializeOutflowApproval(approval),
    }, { status: 202 });
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.financeExpense.update({
      where: { id: expense.id },
      data: {
        paidAt: parsed.data.paidAt,
        method: parsed.data.method,
        reference: parsed.data.reference || expense.reference,
      },
    });
    await postExpenseSettlementJournal(tx, {
      expenseId: row.id,
      expenseNumber: row.expenseNumber,
      paidAt: parsed.data.paidAt,
      currency: row.currency,
      amount: row.amount,
      method: parsed.data.method,
      postedBy: actor.name || actor.email,
    });
    return row;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_expense_payment_recorded',
    entity: 'FinanceExpense',
    entityId: updated.id,
    details: {
      expenseNumber: updated.expenseNumber,
      amount: updated.amount.toFixed(2),
      currency: updated.currency,
      paidAt: updated.paidAt?.toISOString() || null,
    },
  });

  return NextResponse.json({
    success: true,
    pendingApproval: false,
    data: { ...updated, amount: updated.amount.toFixed(2) },
  });
}
