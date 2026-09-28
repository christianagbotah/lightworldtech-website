import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';
import {
  canApproveReceiptReversal,
  createReceiptReversalRequest,
  executeReceiptReversal,
  serializeReceiptReversalRequest,
} from '@/lib/finance-receipt-reversals';

const schema = z.object({
  reversalDate: z.coerce.date(),
  reason: z.string().trim().min(5).max(2000),
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
    return NextResponse.json(
      { success: false, error: 'A valid reversal date and reason of at least 5 characters are required' },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const reversalRequest = await createReceiptReversalRequest(actor, {
      paymentId: id,
      reversalDate: parsed.data.reversalDate,
      reason: parsed.data.reason,
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_reversal_requested',
      entity: 'FinanceReceiptReversalRequest',
      entityId: reversalRequest.id,
      details: {
        requestNumber: reversalRequest.requestNumber,
        paymentId: reversalRequest.paymentId,
        paymentNumber: reversalRequest.payment.paymentNumber,
        organizationId: reversalRequest.organizationId,
        reversalDate: reversalRequest.reversalDate.toISOString(),
        reason: reversalRequest.reason,
      },
    });

    const policy = await getFinanceApprovalPolicy();
    const makerCheckerEnabled = Boolean(policy?.enabled && policy.requireSecondApprover);
    if (makerCheckerEnabled || !canApproveReceiptReversal(actor)) {
      return NextResponse.json({
        success: true,
        data: {
          pendingApproval: true,
          request: serializeReceiptReversalRequest(reversalRequest),
          makerCheckerRequired: makerCheckerEnabled,
        },
      }, { status: 202 });
    }

    const executed = await executeReceiptReversal(
      reversalRequest.id,
      actor,
      'Approved immediately because maker-checker is disabled.',
    );

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
        pendingApproval: false,
        request: serializeReceiptReversalRequest(executed.request),
        reversal: {
          id: executed.reversal.id,
          paymentNumber: executed.reversal.paymentNumber,
          amount: executed.reversal.amount.toFixed(2),
          currency: executed.reversal.currency,
          paidAt: executed.reversal.paidAt,
        },
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to request customer receipt reversal',
      },
      { status: 409 },
    );
  }
}
