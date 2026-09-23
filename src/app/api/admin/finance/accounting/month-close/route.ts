import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { assessFinanceClose } from '@/lib/finance-close';

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  action: z.enum(['close', 'reopen']),
  notes: z.string().trim().max(4000).default(''),
});

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from.getUTCFullYear() !== year ||
    from.getUTCMonth() !== monthNumber - 1
  ) {
    return null;
  }
  return { from, to };
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid month-close request' }, { status: 400 });
  }

  const range = monthRange(parsed.data.month);
  if (!range) {
    return NextResponse.json({ success: false, error: 'Invalid close month' }, { status: 400 });
  }

  const existing = await db.financeMonthClose.findUnique({
    where: { monthStart: range.from },
  });

  if (parsed.data.action === 'reopen') {
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only a super admin can reopen a closed month' },
        { status: 403 },
      );
    }
    if (!existing || existing.status === 'open') {
      return NextResponse.json({
        success: true,
        data: existing || {
          monthStart: range.from,
          monthEnd: range.to,
          status: 'open',
        },
      });
    }

    const reopened = await db.financeMonthClose.update({
      where: { id: existing.id },
      data: {
        status: 'open',
        reopenedAt: new Date(),
        reopenedBy: actor.name || actor.email,
        notes: parsed.data.notes || existing.notes,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_month_reopened',
      entity: 'FinanceMonthClose',
      entityId: reopened.id,
      details: {
        month: parsed.data.month,
        previousClosedAt: existing.closedAt?.toISOString() || null,
        previousClosedBy: existing.closedBy,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ success: true, data: reopened });
  }

  if (existing?.status === 'closed') {
    return NextResponse.json({ success: true, data: existing });
  }

  if (range.to.getTime() >= Date.now()) {
    return NextResponse.json(
      { success: false, error: 'A month cannot be closed before its calendar end has passed' },
      { status: 409 },
    );
  }

  const period = await db.financeAccountingPeriod.findFirst({
    where: {
      startDate: { lte: range.from },
      endDate: { gte: range.to },
    },
    orderBy: { startDate: 'desc' },
  });
  if (!period) {
    return NextResponse.json(
      { success: false, error: 'No accounting period covers the selected month' },
      { status: 409 },
    );
  }
  if (period.status !== 'open') {
    return NextResponse.json(
      { success: false, error: 'The accounting period containing this month is already closed' },
      { status: 409 },
    );
  }

  const readiness = await assessFinanceClose(range);
  if (!readiness.ready) {
    return NextResponse.json(
      {
        success: false,
        error: 'Month cannot be closed until all blocking finance controls are resolved',
        controls: readiness.controls,
        blockingCount: readiness.blockingCount,
        warningCount: readiness.warningCount,
      },
      { status: 409 },
    );
  }

  const closed = await db.financeMonthClose.upsert({
    where: { monthStart: range.from },
    create: {
      monthStart: range.from,
      monthEnd: range.to,
      status: 'closed',
      closedAt: new Date(),
      closedBy: actor.name || actor.email,
      notes: parsed.data.notes,
    },
    update: {
      monthEnd: range.to,
      status: 'closed',
      closedAt: new Date(),
      closedBy: actor.name || actor.email,
      reopenedAt: null,
      reopenedBy: '',
      notes: parsed.data.notes,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_month_closed',
    entity: 'FinanceMonthClose',
    entityId: closed.id,
    details: {
      month: parsed.data.month,
      accountingPeriodId: period.id,
      accountingPeriodName: period.name,
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

  return NextResponse.json({ success: true, data: closed });
}
