import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { assessFinanceClose } from '@/lib/finance-close';

const schema = z.object({
  action: z.enum(['close', 'reopen']),
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
    return NextResponse.json({ success: false, error: 'Invalid period action' }, { status: 400 });
  }

  const { id } = await params;
  const period = await db.financeAccountingPeriod.findUnique({ where: { id } });
  if (!period) {
    return NextResponse.json({ success: false, error: 'Accounting period not found' }, { status: 404 });
  }

  if (parsed.data.action === 'reopen' && actor.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Only a super admin can reopen a closed accounting period' },
      { status: 403 },
    );
  }

  if (parsed.data.action === 'close') {
    if (period.status === 'closed') {
      return NextResponse.json({ success: true, data: period });
    }

    const readiness = await assessFinanceClose({
      from: period.startDate,
      to: period.endDate,
    });
    if (!readiness.ready) {
      return NextResponse.json(
        {
          success: false,
          error: 'Accounting period cannot be closed until finance close blockers are resolved',
          controls: readiness.controls,
          blockingCount: readiness.blockingCount,
          warningCount: readiness.warningCount,
        },
        { status: 409 },
      );
    }

    const unbalanced = await db.$queryRawUnsafe<Array<{ journalNumber: string }>>(
      'SELECT e."journalNumber" ' +
      'FROM "FinanceJournalEntry" e ' +
      'JOIN "FinanceJournalLine" l ON l."entryId" = e."id" ' +
      'WHERE e."status" = \'posted\' ' +
      'AND e."entryDate" >= $1 AND e."entryDate" <= $2 ' +
      'GROUP BY e."id", e."journalNumber" ' +
      'HAVING ROUND(SUM(l."debit") - SUM(l."credit"), 2) <> 0 ' +
      'LIMIT 1',
      period.startDate,
      period.endDate,
    );

    if (unbalanced.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Period cannot be closed because an unbalanced journal was detected',
          journalNumber: unbalanced[0].journalNumber,
        },
        { status: 409 },
      );
    }

    const updated = await db.financeAccountingPeriod.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: actor.name || actor.email,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_accounting_period_closed',
      entity: 'FinanceAccountingPeriod',
      entityId: period.id,
      details: {
        name: period.name,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        closeControls: readiness.controls.map((item) => ({
          key: item.key,
          status: item.status,
          count: item.count,
        })),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  if (period.status === 'open') {
    return NextResponse.json({ success: true, data: period });
  }

  const updated = await db.financeAccountingPeriod.update({
    where: { id },
    data: {
      status: 'open',
      closedAt: null,
      closedBy: '',
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_accounting_period_reopened',
    entity: 'FinanceAccountingPeriod',
    entityId: period.id,
    details: {
      name: period.name,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
