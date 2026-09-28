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
    invoiceDrafts,
    renewalInvoices,
    agreementBillingAgreements,
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
      where: { status: 'draft' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        total: true,
        createdAt: true,
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
    db.clientAgreement.findMany({
      where: {
        status: 'active',
        approvalStatus: 'approved',
        contractValue: { gt: 0 },
      },
      select: {
        id: true,
        currency: true,
        contractValue: true,
        contractValueBasis: true,
        invoices: {
          where: { status: { not: 'void' } },
          select: {
            status: true,
            taxableAmount: true,
            total: true,
          },
        },
      },
      take: 1000,
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

  const invoiceApprovalTotals: Record<string, Prisma.Decimal> = {};
  for (const invoice of invoiceDrafts) {
    add(invoiceApprovalTotals, invoice.currency, invoice.total);
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

  const agreementRemainingTotals: Record<string, Prisma.Decimal> = {};
  const agreementDraftTotals: Record<string, Prisma.Decimal> = {};
  const agreementOverbilledTotals: Record<string, Prisma.Decimal> = {};
  let agreementOverbilledCount = 0;
  let agreementDraftPendingCount = 0;
  let agreementUnpreparedCount = 0;
  let agreementBasisUnspecifiedCount = 0;
  const agreementAttentionIds = new Set<string>();

  for (const agreement of agreementBillingAgreements) {
    if (agreement.contractValueBasis === 'unspecified') {
      agreementBasisUnspecifiedCount += 1;
      agreementAttentionIds.add(agreement.id);
    }
    const comparableAmount = (invoice: { taxableAmount: Prisma.Decimal; total: Prisma.Decimal }) =>
      agreement.contractValueBasis === 'tax_exclusive' ? invoice.taxableAmount : invoice.total;
    const issuedAmount = agreement.invoices
      .filter((invoice) => invoice.status !== 'draft')
      .reduce((sum, invoice) => sum.plus(comparableAmount(invoice)), new Prisma.Decimal(0));
    const draftAmount = agreement.invoices
      .filter((invoice) => invoice.status === 'draft')
      .reduce((sum, invoice) => sum.plus(comparableAmount(invoice)), new Prisma.Decimal(0));
    const committedAmount = issuedAmount.plus(draftAmount);
    const remainingToPrepare = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      agreement.contractValue.minus(committedAmount),
    );
    const overbilledAmount = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      issuedAmount.minus(agreement.contractValue),
    );

    if (overbilledAmount.gt(0)) {
      agreementOverbilledCount += 1;
      agreementAttentionIds.add(agreement.id);
      add(agreementOverbilledTotals, agreement.currency, overbilledAmount);
      continue;
    }
    if (draftAmount.gt(0)) {
      agreementDraftPendingCount += 1;
      agreementAttentionIds.add(agreement.id);
      add(agreementDraftTotals, agreement.currency, draftAmount);
      continue;
    }
    if (remainingToPrepare.gt(0)) {
      agreementUnpreparedCount += 1;
      agreementAttentionIds.add(agreement.id);
      add(agreementRemainingTotals, agreement.currency, remainingToPrepare);
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
      invoiceApprovals: {
        pendingCount: invoiceDrafts.length,
        totalsByCurrency: jsonTotals(invoiceApprovalTotals),
        oldestCreatedAt: invoiceDrafts[0]?.createdAt || null,
        oldestInvoiceNumber: invoiceDrafts[0]?.invoiceNumber || '',
      },
      paidRenewals: {
        count: paidRenewals.length,
        manualDateCount: manualRenewalCount,
        totalsByCurrency: jsonTotals(paidRenewalTotals),
        oldestDueDate: paidRenewals[0]?.dueDate || null,
      },
      agreementBilling: {
        attentionCount: agreementAttentionIds.size,
        overbilledCount: agreementOverbilledCount,
        draftPendingCount: agreementDraftPendingCount,
        unpreparedCount: agreementUnpreparedCount,
        basisUnspecifiedCount: agreementBasisUnspecifiedCount,
        remainingByCurrency: jsonTotals(agreementRemainingTotals),
        draftByCurrency: jsonTotals(agreementDraftTotals),
        overbilledByCurrency: jsonTotals(agreementOverbilledTotals),
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
