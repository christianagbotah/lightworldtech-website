import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { nextCustomerRefundNumber } from '@/lib/finance';
import { postCustomerRefundJournal } from '@/lib/finance-ledger';
import {
  createOutflowApproval,
  getFinanceApprovalPolicy,
  serializeOutflowApproval,
} from '@/lib/finance-approvals';

const schema = z.object({
  creditNoteId: z.string().min(1),
  amount: z.coerce.number().positive().max(999999999999),
  refundedAt: z.coerce.date(),
  method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other']).default('bank_transfer'),
  reference: z.string().trim().max(200).default(''),
  reason: z.string().trim().min(2).max(2000),
});

function serialize(refund: any) {
  return {
    ...refund,
    amount: refund.amount.toFixed(2),
    creditNote: refund.creditNote ? {
      ...refund.creditNote,
      subtotal: refund.creditNote.subtotal.toFixed(2),
      tax: refund.creditNote.tax.toFixed(2),
      total: refund.creditNote.total.toFixed(2),
      appliedAmount: refund.creditNote.appliedAmount.toFixed(2),
    } : undefined,
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const refunds = await db.financeCustomerRefund.findMany({
    orderBy: [{ refundedAt: 'desc' }, { createdAt: 'desc' }],
    take: 1000,
    include: {
      organization: { select: { id: true, name: true } },
      creditNote: {
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: refunds.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid customer refund', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const note = await db.financeCreditNote.findUnique({
    where: { id: parsed.data.creditNoteId },
    include: {
      organization: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      refunds: true,
    },
  });

  if (!note) {
    return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
  }
  if (note.status !== 'posted') {
    return NextResponse.json(
      { success: false, error: 'Refunds can only be issued against a posted credit note' },
      { status: 409 },
    );
  }
  if (parsed.data.refundedAt.getTime() < note.issueDate.getTime()) {
    return NextResponse.json(
      { success: false, error: 'Refund date cannot be earlier than the credit note date' },
      { status: 409 },
    );
  }

  const alreadyRefunded = note.refunds.reduce(
    (sum, item) => sum.plus(item.amount),
    new Prisma.Decimal(0),
  );
  const pendingRefundApprovals = await db.financeOutflowApproval.findMany({
    where: {
      outflowType: 'customer_refund',
      status: 'pending',
      sourceId: note.id,
      currency: note.currency,
    },
    select: { amount: true },
  });
  const pendingRefundAmount = pendingRefundApprovals.reduce(
    (sum, item) => sum.plus(item.amount),
    new Prisma.Decimal(0),
  );
  const refundableBalance = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    note.total.minus(note.appliedAmount).minus(alreadyRefunded).minus(pendingRefundAmount),
  );
  const amount = new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2);

  if (amount.gt(refundableBalance)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Refund exceeds the remaining refundable credit balance',
        refundableBalance: refundableBalance.toFixed(2),
      },
      { status: 409 },
    );
  }

  const policy = await getFinanceApprovalPolicy();
  if (policy?.enabled) {
    const approval = await createOutflowApproval(actor, {
      outflowType: 'customer_refund',
      counterpartyId: note.organizationId,
      counterpartyName: note.organization.name,
      sourceId: note.id,
      sourceReference: note.creditNoteNumber,
      currency: note.currency,
      amount,
      effectiveDate: parsed.data.refundedAt,
      method: parsed.data.method,
      reference: parsed.data.reference,
      reason: parsed.data.reason,
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_refund_requested',
      entity: 'FinanceOutflowApproval',
      entityId: approval.id,
      details: {
        requestNumber: approval.requestNumber,
        creditNoteId: note.id,
        creditNoteNumber: note.creditNoteNumber,
        invoiceNumber: note.invoice.invoiceNumber,
        amount: amount.toFixed(2),
        currency: note.currency,
      },
    });

    return NextResponse.json(
      {
        success: true,
        pendingApproval: true,
        data: serializeOutflowApproval(approval),
      },
      { status: 202 },
    );
  }

  const refundNumber = await nextCustomerRefundNumber(parsed.data.refundedAt);
  const refund = await db.$transaction(async (tx) => {
    const created = await tx.financeCustomerRefund.create({
      data: {
        refundNumber,
        organizationId: note.organizationId,
        creditNoteId: note.id,
        currency: note.currency,
        amount,
        refundedAt: parsed.data.refundedAt,
        method: parsed.data.method,
        reference: parsed.data.reference,
        reason: parsed.data.reason,
        refundedBy: actor.name || actor.email,
      },
      include: {
        organization: { select: { id: true, name: true } },
        creditNote: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
    });

    await postCustomerRefundJournal(tx, {
      refundId: created.id,
      refundNumber: created.refundNumber,
      refundedAt: created.refundedAt,
      currency: created.currency,
      amount: created.amount,
      method: created.method,
      postedBy: actor.name || actor.email,
    });

    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_customer_refund_recorded',
    entity: 'FinanceCustomerRefund',
    entityId: refund.id,
    details: {
      refundNumber,
      creditNoteId: note.id,
      creditNoteNumber: note.creditNoteNumber,
      invoiceNumber: note.invoice.invoiceNumber,
      amount: amount.toFixed(2),
      currency: note.currency,
      method: parsed.data.method,
    },
  });

  return NextResponse.json({ success: true, data: serialize(refund) }, { status: 201 });
}
