import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  canApproveCustomerReceipt,
  executeReceiptApproval,
  serializeReceiptApproval,
} from '@/lib/finance-receipt-approvals';

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
    return NextResponse.json({ success: false, error: 'Invalid receipt approval decision' }, { status: 400 });
  }

  const { id } = await params;
  const approval = await db.financeReceiptApproval.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!approval) {
    return NextResponse.json({ success: false, error: 'Receipt approval request not found' }, { status: 404 });
  }
  if (approval.status !== 'pending') {
    return NextResponse.json({ success: false, error: 'Receipt approval request has already been decided' }, { status: 409 });
  }

  if (parsed.data.action === 'cancel') {
    if (approval.requestedByAdminId !== actor.id && actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only the requester or a super admin can cancel a pending receipt request' },
        { status: 403 },
      );
    }

    const updated = await db.financeReceiptApproval.update({
      where: { id },
      data: {
        status: 'cancelled',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Cancelled before approval',
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_approval_cancelled',
      entity: 'FinanceReceiptApproval',
      entityId: id,
      details: {
        requestNumber: approval.requestNumber,
        organizationId: approval.organizationId,
        amount: approval.amount.toFixed(2),
        currency: approval.currency,
      },
    });

    return NextResponse.json({ success: true, data: serializeReceiptApproval(updated) });
  }

  if (!canApproveCustomerReceipt(actor)) {
    return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
  }
  if (approval.requestedByAdminId === actor.id) {
    return NextResponse.json(
      { success: false, error: 'Maker-checker prevents you from deciding your own receipt request' },
      { status: 409 },
    );
  }

  if (parsed.data.action === 'reject') {
    const updated = await db.financeReceiptApproval.update({
      where: { id },
      data: {
        status: 'rejected',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Rejected',
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_approval_rejected',
      entity: 'FinanceReceiptApproval',
      entityId: id,
      details: {
        requestNumber: approval.requestNumber,
        organizationId: approval.organizationId,
        amount: approval.amount.toFixed(2),
        currency: approval.currency,
      },
    });

    return NextResponse.json({ success: true, data: serializeReceiptApproval(updated) });
  }

  try {
    const result = await executeReceiptApproval(id, actor, parsed.data.notes);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_receipt_approval_approved',
      entity: 'FinanceReceiptApproval',
      entityId: id,
      details: {
        requestNumber: approval.requestNumber,
        organizationId: approval.organizationId,
        amount: approval.amount.toFixed(2),
        currency: approval.currency,
        paymentId: result.payment.id,
        receiptNumber: result.payment.paymentNumber,
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_customer_payment_recorded',
      entity: 'ClientPayment',
      entityId: result.payment.id,
      details: {
        paymentNumber: result.payment.paymentNumber,
        organizationId: result.payment.organizationId,
        amount: result.payment.amount.toFixed(2),
        currency: result.payment.currency,
        sourceApprovalId: id,
        sourceApprovalNumber: approval.requestNumber,
        allocationCount: result.payment.allocations.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        approval: serializeReceiptApproval(result.approval),
        payment: {
          id: result.payment.id,
          paymentNumber: result.payment.paymentNumber,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to approve customer receipt',
      },
      { status: 409 },
    );
  }
}
