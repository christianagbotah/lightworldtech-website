import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance, invoiceStatusFromBalance } from '@/lib/finance';
import { postCreditNoteJournal } from '@/lib/finance-ledger';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
    return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
  }

  const { id } = await params;
  const policy = await getFinanceApprovalPolicy();

  const result = await db.$transaction(async (tx) => {
    const draft = await tx.financeCreditNote.findUnique({
      where: { id },
      select: {
        id: true,
        creditNoteNumber: true,
        invoiceId: true,
        status: true,
        createdByAdminId: true,
        issueDate: true,
        currency: true,
        subtotal: true,
        tax: true,
        vatAmount: true,
        nhilAmount: true,
        getfundAmount: true,
        total: true,
      },
    });
    if (!draft) return { blocked: { error: 'Credit note not found', status: 404 }, note: null };
    if (draft.status !== 'draft') {
      return { blocked: { error: 'Only draft credit notes can be posted', status: 409 }, note: null };
    }
    if (policy?.enabled && policy.requireSecondApprover && draft.createdByAdminId === actor.id) {
      return {
        blocked: { error: 'Maker-checker prevents the credit-note preparer from posting their own draft', status: 409 },
        note: null,
      };
    }

    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-invoice-lifecycle:' + draft.invoiceId,
    );

    const invoice = await tx.clientInvoice.findUnique({
      where: { id: draft.invoiceId },
      include: {
        allocations: true,
        creditNotes: {
          where: { status: 'posted', id: { not: draft.id } },
          include: { refunds: true },
        },
      },
    });
    if (!invoice) return { blocked: { error: 'Linked invoice no longer exists', status: 409 }, note: null };
    if (invoice.status === 'draft' || invoice.status === 'void') {
      return {
        blocked: { error: 'Credit notes can only be posted against an active issued invoice', status: 409 },
        note: null,
      };
    }
    if (draft.currency !== invoice.currency) {
      return { blocked: { error: 'Credit-note currency no longer matches the invoice', status: 409 }, note: null };
    }
    if (draft.issueDate.getTime() < invoice.issueDate.getTime()) {
      return { blocked: { error: 'Credit note date cannot be earlier than the invoice date', status: 409 }, note: null };
    }

    const previouslyCreditedRevenue = invoice.creditNotes.reduce(
      (sum, item) => sum.plus(item.subtotal),
      new Prisma.Decimal(0),
    );
    const previouslyCreditedTax = invoice.creditNotes.reduce(
      (sum, item) => sum.plus(item.tax),
      new Prisma.Decimal(0),
    );
    const previouslyCreditedTotal = invoice.creditNotes.reduce(
      (sum, item) => sum.plus(item.total),
      new Prisma.Decimal(0),
    );
    const originalNetRevenue = invoice.subtotal.minus(invoice.discount).toDecimalPlaces(2);
    const remainingRevenue = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      originalNetRevenue.minus(previouslyCreditedRevenue),
    );
    const remainingTax = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoice.tax.minus(previouslyCreditedTax),
    );
    const remainingCreditable = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoice.total.minus(previouslyCreditedTotal),
    );

    if (draft.subtotal.gt(remainingRevenue)) {
      return {
        blocked: { error: 'Draft credit note now exceeds the remaining recognized invoice revenue', status: 409 },
        note: null,
      };
    }
    if (draft.tax.gt(remainingTax)) {
      return {
        blocked: { error: 'Draft credit note tax reversal now exceeds the remaining invoice tax', status: 409 },
        note: null,
      };
    }
    if (draft.total.gt(remainingCreditable)) {
      return {
        blocked: { error: 'Draft credit note now exceeds the remaining creditable invoice amount', status: 409 },
        note: null,
      };
    }

    const outstandingBeforeCredit = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    const appliedAmount = Prisma.Decimal.min(draft.total, outstandingBeforeCredit);
    const now = new Date();

    const note = await tx.financeCreditNote.update({
      where: { id: draft.id },
      data: {
        status: 'posted',
        appliedAmount,
        approvedByAdminId: actor.id,
        approvedBy: actor.name || actor.email,
        approvedAt: now,
      },
      include: {
        organization: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true } },
        refunds: true,
      },
    });

    await postCreditNoteJournal(tx, {
      creditNoteId: note.id,
      creditNoteNumber: note.creditNoteNumber,
      issueDate: note.issueDate,
      currency: note.currency,
      subtotal: note.subtotal,
      tax: note.tax,
      vatAmount: note.vatAmount,
      nhilAmount: note.nhilAmount,
      getfundAmount: note.getfundAmount,
      total: note.total,
      appliedAmount: note.appliedAmount,
      postedBy: actor.name || actor.email,
    });

    const nextStatus = invoiceStatusFromBalance({
      storedStatus: invoice.status,
      total: invoice.total,
      allocations: invoice.allocations,
      credits: [...invoice.creditNotes, { appliedAmount }],
      dueDate: invoice.dueDate,
    });
    await tx.clientInvoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    });

    return { blocked: null, note };
  });

  if (result.blocked) {
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_credit_note_post_blocked',
      entity: 'FinanceCreditNote',
      entityId: id,
      details: { reason: result.blocked.error },
    });
    return NextResponse.json(
      { success: false, error: result.blocked.error },
      { status: result.blocked.status },
    );
  }

  const note = result.note!;
  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_credit_note_posted',
    entity: 'FinanceCreditNote',
    entityId: note.id,
    details: {
      creditNoteNumber: note.creditNoteNumber,
      invoiceId: note.invoiceId,
      invoiceNumber: note.invoice.invoiceNumber,
      currency: note.currency,
      total: note.total.toFixed(2),
      appliedAmount: note.appliedAmount.toFixed(2),
      approvedByAdminId: actor.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...note,
      subtotal: note.subtotal.toFixed(2),
      tax: note.tax.toFixed(2),
      vatAmount: note.vatAmount.toFixed(2),
      nhilAmount: note.nhilAmount.toFixed(2),
      getfundAmount: note.getfundAmount.toFixed(2),
      total: note.total.toFixed(2),
      appliedAmount: note.appliedAmount.toFixed(2),
    },
  });
}
