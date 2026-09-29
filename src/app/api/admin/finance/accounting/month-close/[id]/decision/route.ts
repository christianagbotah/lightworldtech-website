import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { assessFinanceClose } from '@/lib/finance-close';

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(4000).default(''),
}).superRefine((value, ctx) => {
  if (value.action === 'reject' && value.notes.trim().length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'A rejection reason of at least 3 characters is required',
    });
  }
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (
    !actor ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.manage') ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  ) {
    return NextResponse.json(
      { success: false, error: 'Finance approval permission is required' },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid month-close decision', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-month-close-approval:' + id,
    );

    const pending = await tx.financeMonthClose.findUnique({ where: { id } });
    if (!pending) return { close: null, error: 'Month-close request not found', status: 404 };
    if (pending.status !== 'pending_approval') {
      return { close: null, error: 'Only pending month-close requests can be approved or rejected', status: 409 };
    }
    if (!pending.requestedByAdminId) {
      return {
        close: null,
        error: 'This legacy month-close request has no auditable preparer identity and must be resubmitted',
        status: 409,
      };
    }
    if (pending.requestedByAdminId === actor.id) {
      return {
        close: null,
        error: 'Maker-checker prevents the close preparer from deciding their own month-close request',
        status: 409,
      };
    }

    if (parsed.data.action === 'reject') {
      const rejected = await tx.financeMonthClose.update({
        where: { id: pending.id },
        data: {
          status: 'rejected',
          rejectedByAdminId: actor.id,
          rejectedBy: actor.name || actor.email,
          rejectedAt: new Date(),
          rejectionReason: parsed.data.notes,
        },
      });
      return { close: rejected, error: '', status: 200 };
    }

    if (pending.monthEnd.getTime() >= Date.now()) {
      return { close: null, error: 'A month cannot be closed before its calendar end has passed', status: 409 };
    }

    const period = await tx.financeAccountingPeriod.findFirst({
      where: {
        startDate: { lte: pending.monthStart },
        endDate: { gte: pending.monthEnd },
      },
      orderBy: { startDate: 'desc' },
    });
    if (!period) {
      return { close: null, error: 'No accounting period covers the selected month', status: 409 };
    }
    if (period.status !== 'open') {
      return { close: null, error: 'The accounting period containing this month is already closed', status: 409 };
    }

    return { close: pending, error: '', status: 200, period };
  });

  if (!result.close) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  if (parsed.data.action === 'reject') {
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_month_close_rejected',
      entity: 'FinanceMonthClose',
      entityId: result.close.id,
      details: {
        month: result.close.monthStart.toISOString().slice(0, 7),
        requestedByAdminId: result.close.requestedByAdminId,
        rejectedByAdminId: actor.id,
        reason: parsed.data.notes,
      },
    });
    return NextResponse.json({ success: true, data: result.close });
  }

  const readiness = await assessFinanceClose({
    from: result.close.monthStart,
    to: result.close.monthEnd,
  });
  if (!readiness.ready) {
    return NextResponse.json(
      {
        success: false,
        error: 'Month close can no longer be approved because finance close blockers now exist',
        controls: readiness.controls,
        blockingCount: readiness.blockingCount,
        warningCount: readiness.warningCount,
      },
      { status: 409 },
    );
  }

  const approved = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-month-close-approval:' + id,
    );

    const current = await tx.financeMonthClose.findUnique({ where: { id } });
    if (!current || current.status !== 'pending_approval') {
      throw new Error('Month-close request changed before approval completed');
    }
    if (current.requestedByAdminId === actor.id) {
      throw new Error('Maker-checker prevents self-approval');
    }

    const approvedAt = new Date();
    return tx.financeMonthClose.update({
      where: { id: current.id },
      data: {
        status: 'closed',
        approvedByAdminId: actor.id,
        approvedBy: actor.name || actor.email,
        approvedAt,
        closedAt: approvedAt,
        closedBy: actor.name || actor.email,
        rejectedByAdminId: '',
        rejectedBy: '',
        rejectedAt: null,
        rejectionReason: '',
        notes: parsed.data.notes || current.notes,
      },
    });
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_month_close_approved',
    entity: 'FinanceMonthClose',
    entityId: approved.id,
    details: {
      month: approved.monthStart.toISOString().slice(0, 7),
      requestedByAdminId: approved.requestedByAdminId,
      approvedByAdminId: actor.id,
      blockingCount: readiness.blockingCount,
      warningCount: readiness.warningCount,
      controls: readiness.controls.map((item) => ({
        key: item.key,
        status: item.status,
        count: item.count,
      })),
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ success: true, data: approved });
}
