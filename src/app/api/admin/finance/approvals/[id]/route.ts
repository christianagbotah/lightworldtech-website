import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  canApproveFinanceOutflow,
  executeOutflowApproval,
  isFutureFinanceDate,
  serializeOutflowApproval,
} from '@/lib/finance-approvals';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'cancel', 'execute']),
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
    return NextResponse.json({ success: false, error: 'Invalid approval decision' }, { status: 400 });
  }

  const { id } = await params;
  const approval = await db.financeOutflowApproval.findUnique({ where: { id } });
  if (!approval) {
    return NextResponse.json({ success: false, error: 'Approval request not found' }, { status: 404 });
  }
  const isScheduledExecution = parsed.data.action === 'execute' && approval.status === 'scheduled';
  if (approval.status !== 'pending' && !isScheduledExecution) {
    return NextResponse.json({ success: false, error: 'Approval request has already been decided' }, { status: 409 });
  }

  if (parsed.data.action === 'execute') {
    if (!canApproveFinanceOutflow(actor)) {
      return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
    }
    if (approval.requestedByAdminId === actor.id) {
      return NextResponse.json({ success: false, error: 'Maker-checker prevents the requester from executing their own scheduled outflow' }, { status: 409 });
    }
    if (isFutureFinanceDate(approval.effectiveDate)) {
      return NextResponse.json({ success: false, error: 'Scheduled outflow cannot execute before its effective date' }, { status: 409 });
    }
    try {
      const result = await executeOutflowApproval(id, actor, parsed.data.notes, { allowScheduled: true });
      await recordAdminAudit({
        admin: actor,
        action: 'admin.finance_scheduled_outflow_executed',
        entity: 'FinanceOutflowApproval',
        entityId: id,
        details: {
          requestNumber: approval.requestNumber,
          outflowType: approval.outflowType,
          amount: approval.amount.toFixed(2),
          currency: approval.currency,
          resultId: result.resultId,
          resultNumber: result.resultNumber,
        },
      });
      if (approval.outflowType === 'direct_expense_payment') {
        await recordAdminAudit({
          admin: actor,
          action: 'admin.finance_expense_payment_approved',
          entity: 'FinanceExpense',
          entityId: result.resultId,
          details: {
            requestNumber: approval.requestNumber,
            approvalId: approval.id,
            resultNumber: result.resultNumber,
            amount: approval.amount.toFixed(2),
            currency: approval.currency,
            effectiveDate: approval.effectiveDate.toISOString(),
            scheduledExecution: true,
          },
        });
      }
      return NextResponse.json({ success: true, scheduledExecution: true, data: result });
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to execute scheduled outflow' }, { status: 409 });
    }
  }

  if (parsed.data.action === 'cancel') {
    if (approval.requestedByAdminId !== actor.id && actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only the requester or a super admin can cancel a pending request' },
        { status: 403 },
      );
    }

    const updated = await db.financeOutflowApproval.update({
      where: { id },
      data: {
        status: 'cancelled',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Cancelled before approval',
      },
    });

    const treasuryLines = await db.financeTreasuryPaymentRunLine.findMany({
      where: { approvalId: id },
      select: { runId: true },
      distinct: ['runId'],
    });
    if (treasuryLines.length) {
      await db.financeTreasuryPaymentRunLine.updateMany({
        where: { approvalId: id },
        data: { status: 'cancelled' },
      });
      await db.financeTreasuryPaymentRun.updateMany({
        where: { id: { in: treasuryLines.map((item) => item.runId) } },
        data: { status: 'needs_attention' },
      });
    }

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_outflow_approval_cancelled',
      entity: 'FinanceOutflowApproval',
      entityId: id,
      details: { requestNumber: approval.requestNumber, outflowType: approval.outflowType },
    });

    return NextResponse.json({ success: true, data: serializeOutflowApproval(updated) });
  }

  if (!canApproveFinanceOutflow(actor)) {
    return NextResponse.json(
      { success: false, error: 'Finance approval permission is required' },
      { status: 403 },
    );
  }
  if (approval.requestedByAdminId === actor.id) {
    return NextResponse.json(
      { success: false, error: 'Maker-checker prevents you from deciding your own outflow request' },
      { status: 409 },
    );
  }

  if (parsed.data.action === 'reject') {
    const updated = await db.financeOutflowApproval.update({
      where: { id },
      data: {
        status: 'rejected',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Rejected',
      },
    });

    const treasuryLines = await db.financeTreasuryPaymentRunLine.findMany({
      where: { approvalId: id },
      select: { runId: true },
      distinct: ['runId'],
    });
    if (treasuryLines.length) {
      await db.financeTreasuryPaymentRunLine.updateMany({
        where: { approvalId: id },
        data: { status: 'rejected' },
      });
      await db.financeTreasuryPaymentRun.updateMany({
        where: { id: { in: treasuryLines.map((item) => item.runId) } },
        data: { status: 'needs_attention' },
      });
    }

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_outflow_approval_rejected',
      entity: 'FinanceOutflowApproval',
      entityId: id,
      details: {
        requestNumber: approval.requestNumber,
        outflowType: approval.outflowType,
        amount: approval.amount.toFixed(2),
        currency: approval.currency,
      },
    });

    return NextResponse.json({ success: true, data: serializeOutflowApproval(updated) });
  }

  if (parsed.data.action === 'approve' && isFutureFinanceDate(approval.effectiveDate)) {
    if (['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType) && approval.method !== 'cash') {
      const proofCount = await db.financeOutflowApprovalAttachment.count({ where: { approvalId: approval.id } });
      if (!proofCount) {
        const label = approval.outflowType === 'vendor_payment' ? 'supplier payment' : 'direct expense payment';
        return NextResponse.json({ success: false, error: 'Payment proof is required before a non-cash ' + label + ' can be scheduled' }, { status: 409 });
      }
    }
    const updated = await db.financeOutflowApproval.update({
      where: { id },
      data: {
        status: 'scheduled',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || 'Admin',
        decidedByEmail: actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes || 'Approved for scheduled execution',
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_outflow_scheduled',
      entity: 'FinanceOutflowApproval',
      entityId: id,
      details: {
        requestNumber: approval.requestNumber,
        outflowType: approval.outflowType,
        amount: approval.amount.toFixed(2),
        currency: approval.currency,
        effectiveDate: approval.effectiveDate.toISOString(),
      },
    });
    return NextResponse.json({ success: true, scheduled: true, data: serializeOutflowApproval(updated) });
  }

  try {
    const result = await executeOutflowApproval(id, actor, parsed.data.notes);
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_outflow_approval_approved',
      entity: 'FinanceOutflowApproval',
      entityId: id,
      details: {
        requestNumber: approval.requestNumber,
        outflowType: approval.outflowType,
        amount: approval.amount.toFixed(2),
        currency: approval.currency,
        resultId: result.resultId,
        resultNumber: result.resultNumber,
      },
    });
    if (approval.outflowType === 'direct_expense_payment') {
      await recordAdminAudit({
        admin: actor,
        action: 'admin.finance_expense_payment_approved',
        entity: 'FinanceExpense',
        entityId: result.resultId,
        details: {
          requestNumber: approval.requestNumber,
          approvalId: approval.id,
          resultNumber: result.resultNumber,
          amount: approval.amount.toFixed(2),
          currency: approval.currency,
          effectiveDate: approval.effectiveDate.toISOString(),
          scheduledExecution: false,
        },
      });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to approve finance outflow',
      },
      { status: 409 },
    );
  }
}