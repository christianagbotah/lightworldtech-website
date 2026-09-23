import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  nextCreditNoteNumber,
} from '@/lib/finance';
import { postCreditNoteJournal } from '@/lib/finance-ledger';

const schema = z.object({
  invoiceId: z.string().min(1),
  issueDate: z.coerce.date(),
  reason: z.string().trim().min(2).max(2000),
  subtotal: z.coerce.number().positive().max(999999999999),
  tax: z.coerce.number().min(0).max(999999999999).default(0),
});

function serialize(note: any) {
  const refunded = (note.refunds || []).reduce(
    (sum: Prisma.Decimal, item: any) => sum.plus(item.amount),
    new Prisma.Decimal(0),
  );
  const refundable = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    note.total.minus(note.appliedAmount).minus(refunded),
  );

  return {
    ...note,
    subtotal: note.subtotal.toFixed(2),
    tax: note.tax.toFixed(2),
    vatAmount: note.vatAmount.toFixed(2),
    nhilAmount: note.nhilAmount.toFixed(2),
    getfundAmount: note.getfundAmount.toFixed(2),
    total: note.total.toFixed(2),
    appliedAmount: note.appliedAmount.toFixed(2),
    refundedAmount: refunded.toFixed(2),
    refundableBalance: refundable.toFixed(2),
    refunds: (note.refunds || []).map((item: any) => ({
      ...item,
      amount: item.amount.toFixed(2),
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const notes = await db.financeCreditNote.findMany({
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    take: 1000,
    include: {
      organization: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true } },
      refunds: { orderBy: { refundedAt: 'asc' } },
    },
  });

  return NextResponse.json({ success: true, data: notes.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid credit note', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const invoice = await db.clientInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
    include: {
      allocations: true,
      creditNotes: {
        where: { status: 'posted' },
        include: { refunds: true },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
  }
  if (invoice.status === 'draft' || invoice.status === 'void') {
    return NextResponse.json(
      { success: false, error: 'Credit notes can only be issued against a posted invoice' },
      { status: 409 },
    );
  }
  if (parsed.data.issueDate.getTime() < invoice.issueDate.getTime()) {
    return NextResponse.json(
      { success: false, error: 'Credit note date cannot be earlier than the invoice date' },
      { status: 409 },
    );
  }

  const subtotal = new Prisma.Decimal(parsed.data.subtotal).toDecimalPlaces(2);
  let vatAmount = new Prisma.Decimal(0);
  let nhilAmount = new Prisma.Decimal(0);
  let getfundAmount = new Prisma.Decimal(0);

  if (invoice.taxTreatment === 'standard') {
    vatAmount = subtotal.mul(invoice.vatRate).div(100).toDecimalPlaces(2);
    nhilAmount = subtotal.mul(invoice.nhilRate).div(100).toDecimalPlaces(2);
    getfundAmount = subtotal.mul(invoice.getfundRate).div(100).toDecimalPlaces(2);
  }

  const tax = invoice.taxTreatment === 'legacy'
    ? new Prisma.Decimal(parsed.data.tax).toDecimalPlaces(2)
    : vatAmount.plus(nhilAmount).plus(getfundAmount).toDecimalPlaces(2);
  const total = subtotal.plus(tax).toDecimalPlaces(2);
  const previouslyCredited = invoice.creditNotes.reduce(
    (sum, item) => sum.plus(item.total),
    new Prisma.Decimal(0),
  );
  const previouslyCreditedRevenue = invoice.creditNotes.reduce(
    (sum, item) => sum.plus(item.subtotal),
    new Prisma.Decimal(0),
  );
  const previouslyCreditedTax = invoice.creditNotes.reduce(
    (sum, item) => sum.plus(item.tax),
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
    invoice.total.minus(previouslyCredited),
  );

  if (subtotal.gt(remainingRevenue)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Credit note net amount exceeds the remaining recognized invoice revenue',
        remainingRevenue: remainingRevenue.toFixed(2),
      },
      { status: 409 },
    );
  }

  if (tax.gt(remainingTax)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Credit note tax reversal exceeds the remaining invoice tax',
        remainingTax: remainingTax.toFixed(2),
      },
      { status: 409 },
    );
  }

  if (total.gt(remainingCreditable)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Credit note exceeds the remaining creditable invoice amount',
        remainingCreditable: remainingCreditable.toFixed(2),
      },
      { status: 409 },
    );
  }

  const outstandingBeforeCredit = invoiceBalance(
    invoice.total,
    invoice.allocations,
    invoice.creditNotes,
  );
  const appliedAmount = Prisma.Decimal.min(total, outstandingBeforeCredit);
  const creditNoteNumber = await nextCreditNoteNumber(parsed.data.issueDate);

  const created = await db.$transaction(async (tx) => {
    const note = await tx.financeCreditNote.create({
      data: {
        creditNoteNumber,
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        currency: invoice.currency,
        issueDate: parsed.data.issueDate,
        reason: parsed.data.reason,
        subtotal,
        tax,
        vatAmount,
        nhilAmount,
        getfundAmount,
        total,
        appliedAmount,
        status: 'posted',
        createdBy: actor.name || actor.email,
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

    const allCredits = [...invoice.creditNotes, { appliedAmount }];
    const nextStatus = invoiceStatusFromBalance({
      storedStatus: invoice.status,
      total: invoice.total,
      allocations: invoice.allocations,
      credits: allCredits,
      dueDate: invoice.dueDate,
    });
    await tx.clientInvoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    });

    return note;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_credit_note_issued',
    entity: 'FinanceCreditNote',
    entityId: created.id,
    details: {
      creditNoteNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      total: total.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      nhilAmount: nhilAmount.toFixed(2),
      getfundAmount: getfundAmount.toFixed(2),
      appliedAmount: appliedAmount.toFixed(2),
      customerCredit: total.minus(appliedAmount).toFixed(2),
      previouslyCredited: previouslyCredited.toFixed(2),
      remainingRevenueAfterCredit: remainingRevenue.minus(subtotal).toFixed(2),
      remainingTaxAfterCredit: remainingTax.minus(tax).toFixed(2),
    },
  });

  return NextResponse.json({ success: true, data: serialize(created) }, { status: 201 });
}
