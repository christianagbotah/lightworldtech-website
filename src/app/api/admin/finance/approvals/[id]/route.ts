import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  canApproveFinanceOutflow,
  executeOutflowApproval,
  serializeOutflowApproval,
} from '@/lib/finance-approvals';

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
    return NextResponse.json({ success: false, error: 'Invalid approval decision' }, { status: 400 });
  }

  const { id } = await params;
  const approval = await db.financeOutflowApproval.findUnique({ where: { id } });
  if (!approval) {
    return NextResponse.json({ success: false, error: 'Approval request not found' }, { status: 404 });
  }
  if (approval.status !== 'pending') {
    return NextResponse.json({ success: false, error: 'Approval request has already been decided' }, { status: 409 });
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
