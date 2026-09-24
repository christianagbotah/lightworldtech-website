import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance } from '@/lib/finance';
import { assessFinanceClose } from '@/lib/finance-close';

function add(
  totals: Record<string, Prisma.Decimal>,
  currency: string,
  value: Prisma.Decimal,
) {
  totals[currency] = (totals[currency] || new Prisma.Decimal(0)).plus(value);
}

function jsonTotals(totals: Record<string, Prisma.Decimal>) {
  return Object.fromEntries(
    Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]) => [currency, value.toFixed(2)]),
  );
}

function previousMonthRange(now: Date) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(next.getTime() - 1);
  return {
    from,
    to,
    key: from.toISOString().slice(0, 7),
    label: new Intl.DateTimeFormat('en-GH', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(from),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const closeRange = previousMonthRange(now);

  const [
    pendingApprovals,
    renewalInvoices,
    existingClose,
    accountingPeriod,
  ] = await Promise.all([
    db.financeOutflowApproval.findMany({
      where: { status: 'pending' },
      orderBy: { requestedAt: 'asc' },
      select: {
        id: true,
        requestNumber: true,
        outflowType: true,
        currency: true,
        amount: true,
        counterpartyName: true,
        requestedAt: true,
      },
    }),
    db.clientInvoice.findMany({
      where: {
        status: { notIn: ['draft', 'void'] },
        renewalForDate: { not: null },
        renewalCompletedAt: null,
        serviceId: { not: null },
      },
      include: {
        allocations: true,
        creditNotes: { where: { status: 'posted' } },
        organization: { select: { id: true, name: true } },
        service: {
          select: {
            id: true,
            name: true,
            billingCycle: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
    }),
    db.financeMonthClose.findUnique({
      where: { monthStart: closeRange.from },
      select: {
        id: true,
        status: true,
        closedAt: true,
        closedBy: true,
      },
    }),
    db.financeAccountingPeriod.findFirst({
      where: {
        startDate: { lte: closeRange.from },
        endDate: { gte: closeRange.to },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
  ]);

  const approvalTotals: Record<string, Prisma.Decimal> = {};
  for (const approval of pendingApprovals) {
    add(approvalTotals, approval.currency, approval.amount);
  }

  const paidRenewals = renewalInvoices.filter((invoice) =>
    invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes).lte(0),
  );
  const paidRenewalTotals: Record<string, Prisma.Decimal> = {};
  let manualRenewalCount = 0;
  for (const invoice of paidRenewals) {
    add(paidRenewalTotals, invoice.currency, invoice.total);
    if (['custom', 'one_time'].includes(invoice.service?.billingCycle || '')) {
      manualRenewalCount += 1;
    }
  }

  let closeReadiness: {
    state: 'closed' | 'ready' | 'blocked';
    blockingCount: number;
    warningCount: number;
    controls: Array<{
      key: string;
      label: string;
      status: 'pass' | 'block' | 'warn';
      count: number;
      detail: string;
    }>;
    detail: string;
  };

  if (existingClose?.status === 'closed') {
    closeReadiness = {
      state: 'closed',
      blockingCount: 0,
      warningCount: 0,
      controls: [],
      detail:
        'Closed' +
        (existingClose.closedAt ? ' on ' + existingClose.closedAt.toISOString().slice(0, 10) : '') +
        (existingClose.closedBy ? ' by ' + existingClose.closedBy : ''),
    };
  } else if (!accountingPeriod) {
    closeReadiness = {
      state: 'blocked',
      blockingCount: 1,
      warningCount: 0,
      controls: [],
      detail: 'No accounting period covers this month.',
    };
  } else if (accountingPeriod.status !== 'open') {
    closeReadiness = {
      state: 'blocked',
      blockingCount: 1,
      warningCount: 0,
      controls: [],
      detail: 'The covering accounting period is not open for month-close processing.',
    };
  } else {
    const readiness = await assessFinanceClose({
      from: closeRange.from,
      to: closeRange.to,
    });
    closeReadiness = {
      state: readiness.ready ? 'ready' : 'blocked',
      blockingCount: readiness.blockingCount,
      warningCount: readiness.warningCount,
      controls: readiness.controls
        .filter((control) => control.status !== 'pass')
        .slice(0, 5),
      detail: readiness.ready
        ? readiness.warningCount
          ? 'All blocking controls pass; review warnings before sign-off.'
          : 'All blocking controls pass and the month is ready for close review.'
        : 'Resolve the blocking finance controls before closing the month.',
    };
  }

  return NextResponse.json({
    success: true,
    data: {
      generatedAt: now,
      approvals: {
        pendingCount: pendingApprovals.length,
        totalsByCurrency: jsonTotals(approvalTotals),
        oldestRequestedAt: pendingApprovals[0]?.requestedAt || null,
        oldestRequestNumber: pendingApprovals[0]?.requestNumber || '',
      },
      paidRenewals: {
        count: paidRenewals.length,
        manualDateCount: manualRenewalCount,
        totalsByCurrency: jsonTotals(paidRenewalTotals),
        oldestDueDate: paidRenewals[0]?.dueDate || null,
      },
      priorMonthClose: {
        month: closeRange.key,
        label: closeRange.label,
        periodName: accountingPeriod?.name || '',
        periodStatus: accountingPeriod?.status || 'missing',
        ...closeReadiness,
      },
    },
  });
}
