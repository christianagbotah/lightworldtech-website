import { NextRequest, NextResponse } from 'next/server';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { assessFinanceClose } from '@/lib/finance-close';
import { db } from '@/lib/db';

function monthRange(value: Date) {
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from: start, to: end };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month')?.trim() || '';
  const anchor = month
    ? new Date(month.length === 7 ? month + '-01T00:00:00.000Z' : month)
    : new Date();

  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid close month' }, { status: 400 });
  }

  const range = monthRange(anchor);
  const [result, monthClose] = await Promise.all([
    assessFinanceClose(range),
    db.financeMonthClose.findUnique({
      where: { monthStart: range.from },
    }),
  ]);
  const monthEnded = range.to.getTime() < Date.now();
  const closeStatus = monthClose?.status || 'open';

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      month: range.from.toISOString().slice(0, 7),
      monthEnded,
      closeState: monthClose ? {
        id: monthClose.id,
        status: monthClose.status,
        closedAt: monthClose.closedAt,
        closedBy: monthClose.closedBy,
        reopenedAt: monthClose.reopenedAt,
        reopenedBy: monthClose.reopenedBy,
        notes: monthClose.notes,
      } : {
        id: null,
        status: 'open',
        closedAt: null,
        closedBy: '',
        reopenedAt: null,
        reopenedBy: '',
        notes: '',
      },
      canClose: closeStatus !== 'closed' && monthEnded && result.ready,
      canReopen: closeStatus === 'closed' && actor.role === 'super_admin',
    },
  });
}
