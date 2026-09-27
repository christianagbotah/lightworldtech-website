import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  canApproveFinanceOutflow,
  countEligibleFinanceApprovers,
  createOutflowApproval,
} from '@/lib/finance-approvals';
import {
  executeTreasuryPlanPayment,
  getTreasurySourceAccount,
  parseTreasuryAllocations,
  serializeTreasuryPlan,
  validateTreasuryAllocations,
} from '@/lib/finance-treasury';

const schema = z.object({
  action: z.enum(['submit', 'cancel', 'execute']),
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
    return NextResponse.json({ success: false, error: 'Invalid treasury plan action' }, { status: 400 });
  }

  const { id } = await params;
  const plan = await db.financeTreasuryPaymentPlan.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, active: true } },
      sourceAccount: { select: { id: true, code: true, name: true, subtype: true, systemKey: true } },
    },
  });
  if (!plan) {
    return NextResponse.json({ success: false, error: 'Treasury payment plan not found' }, { status: 404 });
  }

  try {
    if (parsed.data.action === 'submit') {
      if (plan.status !== 'draft') {
        return NextResponse.json({ success: false, error: 'Only draft treasury plans can be submitted' }, { status: 409 });
      }
      if (!plan.vendor.active) throw new Error('Supplier is no longer active');

      const eligibleApprovers = await countEligibleFinanceApprovers();
      if (eligibleApprovers < 2) {
        throw new Error(
          'Treasury maker-checker requires at least two active administrators with Finance Approvals permission',
        );
      }

      await getTreasurySourceAccount(plan.sourceAccountId, plan.method);
      const allocations = parseTreasuryAllocations(plan.allocationsJson);
      await validateTreasuryAllocations({
        vendorId: plan.vendorId,
        currency: plan.currency,
        allocations,
        excludePlanId: plan.id,
        requireEvidence: true,
        includeReservations: true,
      });

      const approval = await createOutflowApproval(actor, {
        outflowType: 'treasury_vendor_payment',
        counterpartyId: plan.vendorId,
        counterpartyName: plan.vendor.name,
        sourceId: plan.id,
        sourceReference: plan.planNumber,
        currency: plan.currency,
        amount: plan.amount,
        effectiveDate: plan.scheduledFor,
        method: plan.method,
        reference: plan.reference,
        reason: plan.notes,
        allocations,
      });

      const updated = await db.financeTreasuryPaymentPlan.update({
        where: { id: plan.id },
        data: {
          status: 'pending_approval',
          approvalId: approval.id,
          requestedByAdminId: actor.id,
          requestedByName: actor.name || 'Admin',
          requestedByEmail: actor.email,
          submittedAt: new Date(),
        },
        include: {
          vendor: { select: { id: true, name: true } },
          sourceAccount: { select: { id: true, code: true, name: true, subtype: true, systemKey: true } },
        },
      });

      await recordAdminAudit({
        admin: actor,
        action: 'admin.finance_treasury_plan_submitted',
        entity: 'FinanceTreasuryPaymentPlan',
        entityId: plan.id,
        details: {
          planNumber: plan.planNumber,
          approvalId: approval.id,
          approvalNumber: approval.requestNumber,
          amount: plan.amount.toFixed(2),
          currency: plan.currency,
          scheduledFor: plan.scheduledFor.toISOString(),
        },
      });

      return NextResponse.json(
        {
          success: true,
          pendingApproval: true,
          data: {
            plan: serializeTreasuryPlan(updated),
            approvalNumber: approval.requestNumber,
          },
        },
        { status: 202 },
      );
    }

    if (parsed.data.action === 'cancel') {
      if (plan.status === 'executed') {
        return NextResponse.json({ success: false, error: 'Executed treasury plans cannot be cancelled' }, { status: 409 });
      }
      if (plan.status === 'cancelled' || plan.status === 'rejected') {
        return NextResponse.json({ success: false, error: 'Treasury plan is already closed' }, { status: 409 });
      }
      const ownsPlan = plan.createdByAdminId === actor.id || plan.requestedByAdminId === actor.id;
      const privileged = actor.role === 'super_admin' || canApproveFinanceOutflow(actor);
      if (!ownsPlan && !privileged) {
        return NextResponse.json(
          { success: false, error: 'Only the plan owner or an authorized finance approver can cancel this plan' },
          { status: 403 },
        );
      }

      const now = new Date();
      await db.$transaction(async (tx) => {
        await tx.financeTreasuryPaymentPlan.update({
          where: { id: plan.id },
          data: {
            status: 'cancelled',
            decisionNotes: parsed.data.notes || 'Cancelled before execution',
          },
        });
        if (plan.approvalId) {
          await tx.financeOutflowApproval.updateMany({
            where: { id: plan.approvalId, status: 'pending' },
            data: {
              status: 'cancelled',
              decidedByAdminId: actor.id,
              decidedByName: actor.name || 'Admin',
              decidedByEmail: actor.email,
              decidedAt: now,
              decisionNotes: parsed.data.notes || 'Treasury plan cancelled',
            },
          });
        }
      });

      await recordAdminAudit({
        admin: actor,
        action: 'admin.finance_treasury_plan_cancelled',
        entity: 'FinanceTreasuryPaymentPlan',
        entityId: plan.id,
        details: { planNumber: plan.planNumber, previousStatus: plan.status },
      });

      return NextResponse.json({ success: true });
    }

    if (!canApproveFinanceOutflow(actor)) {
      return NextResponse.json(
        { success: false, error: 'Finance approval permission is required to execute treasury plans' },
        { status: 403 },
      );
    }
    if (plan.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Only approved treasury plans can be executed' }, { status: 409 });
    }
    if (plan.method !== 'cash' && !plan.reference.trim()) {
      throw new Error('Payment or bank reference is required before executing a non-cash treasury plan');
    }

    const result = await executeTreasuryPlanPayment(plan.id, actor);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_treasury_plan_executed',
      entity: 'FinanceTreasuryPaymentPlan',
      entityId: plan.id,
      details: {
        planNumber: plan.planNumber,
        paymentId: result.paymentId,
        paymentNumber: result.paymentNumber,
        sourceAccountId: plan.sourceAccountId,
        amount: result.amount,
        currency: result.currency,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to update treasury payment plan',
      },
      { status: 409 },
    );
  }
}