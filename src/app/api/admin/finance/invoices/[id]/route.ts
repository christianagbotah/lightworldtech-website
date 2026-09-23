import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postInvoiceJournal, postInvoiceVoidJournal } from '@/lib/finance-ledger';

const schema = z.object({
  status: z.enum(['draft', 'issued', 'void']).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(8000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one invoice change is required');

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid invoice update', details: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  const invoice = await db.clientInvoice.findUnique({
    where: { id },
    include: { allocations: true },
  });
  if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });

  if (parsed.data.status === 'void' && invoice.allocations.length > 0) {
    return NextResponse.json({ success: false, error: 'An invoice with allocated payments cannot be voided' }, { status: 409 });
  }
  if (invoice.status !== 'draft' && parsed.data.status === 'draft') {
    return NextResponse.json(
      { success: false, error: 'An issued invoice cannot be returned to draft. Void it instead.' },
      { status: 409 },
    );
  }
  if (parsed.data.dueDate && parsed.data.dueDate.getTime() < invoice.issueDate.getTime()) {
    return NextResponse.json({ success: false, error: 'Due date cannot be earlier than issue date' }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.clientInvoice.update({ where: { id }, data: parsed.data });

    if (invoice.status === 'draft' && next.status === 'issued') {
      await postInvoiceJournal(tx, {
        invoiceId: next.id,
        invoiceNumber: next.invoiceNumber,
        issueDate: next.issueDate,
        currency: next.currency,
        subtotal: next.subtotal,
        discount: next.discount,
        tax: next.tax,
        vatAmount: next.vatAmount,
        nhilAmount: next.nhilAmount,
        getfundAmount: next.getfundAmount,
        total: next.total,
        postedBy: actor.name || actor.email,
      });
    }

    if (invoice.status !== 'void' && next.status === 'void') {
      const originalJournal = await tx.financeJournalEntry.findFirst({
        where: {
          sourceType: 'client_invoice',
          sourceId: next.id,
        },
        select: { id: true },
      });

      if (originalJournal) {
        await postInvoiceVoidJournal(tx, {
          invoiceId: next.id,
          invoiceNumber: next.invoiceNumber,
          voidDate: new Date(),
          currency: next.currency,
          subtotal: next.subtotal,
          discount: next.discount,
          tax: next.tax,
          total: next.total,
          postedBy: actor.name || actor.email,
        });
      }
    }

    return next;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_invoice_updated',
    entity: 'ClientInvoice',
    entityId: id,
    details: { invoiceNumber: invoice.invoiceNumber, changedFields: Object.keys(parsed.data) },
  });

  return NextResponse.json({ success: true, data: { ...updated, subtotal: updated.subtotal.toFixed(2), discount: updated.discount.toFixed(2), tax: updated.tax.toFixed(2), total: updated.total.toFixed(2) } });
}
