import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';
import {
  canApproveReceiptReversal,
  executeReceiptReversal,
  serializeReceiptReversalRequest,
} from '@/lib/finance-receipt-reversals';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
  notes: z.string().trim().max(4000).default(''),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid receipt reversal decision' }, { status: 400 });
  }

  const { id } = await params;
  const reversalRequest = await db.financeReceiptReversalRequest.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          currency: true,
          paidAt: true,
          method: true,
          source: true,
        },
      },
    },
  });
  if (!reversalRequest) {
    return NextResponse.json({ success: false, error: 'Receipt reversal request not found' }, { status: 404 });
  }
  if (reversalRequest.status !== 'pending') {
    return NextResponse.json({ success: false, error: 'Receipt reversal request has already been decided' }, { status: 409 });
  }

  if (parsed.data.action === 'cancel') {
    if (reversalRequest.requestedByAdminId !== actor.id && actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only the requester or a super admin can cancel this reversal request' },
        { status: 403 },
      );
    }

    const updated = await db.financeReceiptReversalRequest.update({
      where: { id },
      data: {
        status: 'cancelled',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Cancelled before approval',
      },
      include: {
        organization: { select: { id: true, name: true } },
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
            paidAt: true,
            method: true,
            source: true,
          },
        },
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_reversal_cancelled',
      entity: 'FinanceReceiptReversalRequest',
      entityId: id,
      details: {
        requestNumber: reversalRequest.requestNumber,
        paymentId: reversalRequest.paymentId,
        paymentNumber: reversalRequest.payment.paymentNumber,
      },
    });

    return NextResponse.json({ success: true, data: serializeReceiptReversalRequest(updated) });
  }

  if (!canApproveReceiptReversal(actor)) {
    return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
  }

  const policy = await getFinanceApprovalPolicy();
  if (
    policy?.enabled &&
    policy.requireSecondApprover &&
    reversalRequest.requestedByAdminId === actor.id
  ) {
    return NextResponse.json(
      { success: false, error: 'Maker-checker prevents you from deciding your own receipt reversal request' },
      { status: 409 },
    );
  }

  if (parsed.data.action === 'reject') {
    if (!parsed.data.notes.trim()) {
      return NextResponse.json({ success: false, error: 'A rejection reason is required' }, { status: 400 });
    }
    const updated = await db.financeReceiptReversalRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes,
      },
      include: {
        organization: { select: { id: true, name: true } },
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
            paidAt: true,
            method: true,
            source: true,
          },
        },
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_reversal_rejected',
      entity: 'FinanceReceiptReversalRequest',
      entityId: id,
      details: {
        requestNumber: reversalRequest.requestNumber,
        paymentId: reversalRequest.paymentId,
        paymentNumber: reversalRequest.payment.paymentNumber,
        reason: parsed.data.notes,
      },
    });

    return NextResponse.json({ success: true, data: serializeReceiptReversalRequest(updated) });
  }

  try {
    const executed = await executeReceiptReversal(id, actor, parsed.data.notes);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_reversal_approved',
      entity: 'FinanceReceiptReversalRequest',
      entityId: id,
      details: {
        requestNumber: reversalRequest.requestNumber,
        paymentId: reversalRequest.paymentId,
        paymentNumber: reversalRequest.payment.paymentNumber,
        reversalPaymentId: executed.reversal.id,
        reversalPaymentNumber: executed.reversal.paymentNumber,
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_reversed',
      entity: 'ClientPayment',
      entityId: reversalRequest.paymentId,
      details: {
        requestId: reversalRequest.id,
        requestNumber: reversalRequest.requestNumber,
        originalPaymentNumber: reversalRequest.payment.paymentNumber,
        reversalPaymentId: executed.reversal.id,
        reversalPaymentNumber: executed.reversal.paymentNumber,
        reversalDate: reversalRequest.reversalDate.toISOString(),
        reason: reversalRequest.reason,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        request: serializeReceiptReversalRequest(executed.request),
        reversal: {
          id: executed.reversal.id,
          paymentNumber: executed.reversal.paymentNumber,
          amount: executed.reversal.amount.toFixed(2),
          currency: executed.reversal.currency,
          paidAt: executed.reversal.paidAt,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to approve receipt reversal',
      },
      { status: 409 },
    );
  }
}
