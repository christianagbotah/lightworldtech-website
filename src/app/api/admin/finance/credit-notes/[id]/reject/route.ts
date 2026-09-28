import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';

const schema = z.object({
  reason: z.string().trim().min(3).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
    return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'A rejection reason is required' }, { status: 400 });
  }

  const { id } = await params;
  const policy = await getFinanceApprovalPolicy();
  const existing = await db.financeCreditNote.findUnique({
    where: { id },
    select: {
      id: true,
      creditNoteNumber: true,
      status: true,
      createdByAdminId: true,
      invoiceId: true,
    },
  });
  if (!existing) return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
  if (existing.status !== 'draft') {
    return NextResponse.json({ success: false, error: 'Only draft credit notes can be rejected' }, { status: 409 });
  }
  if (policy?.enabled && policy.requireSecondApprover && existing.createdByAdminId === actor.id) {
    return NextResponse.json(
      { success: false, error: 'Maker-checker prevents the credit-note preparer from rejecting their own draft' },
      { status: 409 },
    );
  }

  const note = await db.financeCreditNote.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedByAdminId: actor.id,
      rejectedBy: actor.name || actor.email,
      rejectedAt: new Date(),
      rejectionReason: parsed.data.reason,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_credit_note_rejected',
    entity: 'FinanceCreditNote',
    entityId: note.id,
    details: {
      creditNoteNumber: note.creditNoteNumber,
      invoiceId: note.invoiceId,
      rejectedByAdminId: actor.id,
      reason: parsed.data.reason,
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
