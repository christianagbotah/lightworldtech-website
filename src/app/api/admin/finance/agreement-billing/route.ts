import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

function zero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function positive(value: Prisma.Decimal): Prisma.Decimal {
  return Prisma.Decimal.max(zero(), value);
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim() || '';

  const agreements = await db.clientAgreement.findMany({
    where: {
      status: 'active',
      approvalStatus: 'approved',
      contractValue: { gt: 0 },
      ...(organizationId ? { organizationId } : {}),
    },
    orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'desc' }],
    take: 1000,
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      title: true,
      referenceNumber: true,
      agreementType: true,
      currency: true,
      contractValue: true,
      contractValueBasis: true,
      effectiveDate: true,
      expiryDate: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          paymentTermsDays: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      billingMilestones: {
        orderBy: [{ order: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          amount: true,
          dueDate: true,
          order: true,
        },
      },
      invoices: {
        where: { status: { not: 'void' } },
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          billingMilestoneId: true,
          taxableAmount: true,
          total: true,
          issueDate: true,
          dueDate: true,
        },
      },
    },
  });

  const summary = new Map<string, {
    contract: Prisma.Decimal;
    issued: Prisma.Decimal;
    drafts: Prisma.Decimal;
    remainingToPrepare: Prisma.Decimal;
    scheduled: Prisma.Decimal;
    unscheduled: Prisma.Decimal;
    agreements: number;
    overbilled: number;
    basisUnspecified: number;
  }>();

  const rows = agreements.map((agreement) => {
    const issuedInvoices = agreement.invoices.filter((invoice) => invoice.status !== 'draft');
    const draftInvoices = agreement.invoices.filter((invoice) => invoice.status === 'draft');
    const comparableAmount = (invoice: { taxableAmount: Prisma.Decimal; total: Prisma.Decimal }) =>
      agreement.contractValueBasis === 'tax_exclusive' ? invoice.taxableAmount : invoice.total;
    const issuedAmount = issuedInvoices.reduce((sum, invoice) => sum.plus(comparableAmount(invoice)), zero());
    const draftAmount = draftInvoices.reduce((sum, invoice) => sum.plus(comparableAmount(invoice)), zero());
    const committedAmount = issuedAmount.plus(draftAmount);
    const scheduledAmount = agreement.billingMilestones.reduce(
      (sum, milestone) => sum.plus(milestone.amount),
      zero(),
    );
    const unscheduledAmount = positive(agreement.contractValue.minus(scheduledAmount));
    const linkedMilestoneIds = new Set(
      agreement.invoices
        .map((invoice) => invoice.billingMilestoneId)
        .filter((id): id is string => Boolean(id)),
    );
    const sortedMilestones = agreement.billingMilestones
      .slice()
      .sort((a, b) => {
        const ad = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bd = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (ad !== bd) return ad - bd;
        return a.order - b.order;
      });
    const nextMilestone = sortedMilestones.find((milestone) => !linkedMilestoneIds.has(milestone.id)) || null;
    const linkedMilestoneCount = linkedMilestoneIds.size;
    const openMilestoneCount = Math.max(0, agreement.billingMilestones.length - linkedMilestoneCount);
    const remainingToPrepare = positive(agreement.contractValue.minus(committedAmount));
    const remainingUnissued = positive(agreement.contractValue.minus(issuedAmount));
    const overbilledAmount = positive(issuedAmount.minus(agreement.contractValue));

    let state: 'unbilled' | 'partially_billed' | 'draft_pending' | 'fully_billed' | 'overbilled' = 'unbilled';
    if (overbilledAmount.gt(0)) state = 'overbilled';
    else if (remainingUnissued.eq(0)) state = 'fully_billed';
    else if (draftAmount.gt(0)) state = 'draft_pending';
    else if (issuedAmount.gt(0)) state = 'partially_billed';

    const currency = agreement.currency.trim().toUpperCase() || 'UNSPECIFIED';
    const bucket = summary.get(currency) || {
      contract: zero(),
      issued: zero(),
      drafts: zero(),
      remainingToPrepare: zero(),
      scheduled: zero(),
      unscheduled: zero(),
      agreements: 0,
      overbilled: 0,
      basisUnspecified: 0,
    };
    bucket.contract = bucket.contract.plus(agreement.contractValue);
    bucket.issued = bucket.issued.plus(issuedAmount);
    bucket.drafts = bucket.drafts.plus(draftAmount);
    bucket.remainingToPrepare = bucket.remainingToPrepare.plus(remainingToPrepare);
    bucket.scheduled = bucket.scheduled.plus(scheduledAmount);
    bucket.unscheduled = bucket.unscheduled.plus(unscheduledAmount);
    bucket.agreements += 1;
    if (state === 'overbilled') bucket.overbilled += 1;
    if (agreement.contractValueBasis === 'unspecified') bucket.basisUnspecified += 1;
    summary.set(currency, bucket);

    return {
      id: agreement.id,
      organizationId: agreement.organizationId,
      projectId: agreement.projectId,
      title: agreement.title,
      referenceNumber: agreement.referenceNumber,
      agreementType: agreement.agreementType,
      currency,
      contractValue: agreement.contractValue.toFixed(2),
      contractValueBasis: agreement.contractValueBasis,
      basisUnspecified: agreement.contractValueBasis === 'unspecified',
      issuedAmount: issuedAmount.toFixed(2),
      draftAmount: draftAmount.toFixed(2),
      remainingToPrepare: remainingToPrepare.toFixed(2),
      remainingUnissued: remainingUnissued.toFixed(2),
      scheduledAmount: scheduledAmount.toFixed(2),
      unscheduledAmount: unscheduledAmount.toFixed(2),
      billingMilestoneCount: agreement.billingMilestones.length,
      linkedMilestoneCount,
      openMilestoneCount,
      nextMilestone: nextMilestone ? {
        id: nextMilestone.id,
        title: nextMilestone.title,
        amount: nextMilestone.amount.toFixed(2),
        dueDate: nextMilestone.dueDate,
        order: nextMilestone.order,
      } : null,
      overbilledAmount: overbilledAmount.toFixed(2),
      state,
      effectiveDate: agreement.effectiveDate,
      expiryDate: agreement.expiryDate,
      updatedAt: agreement.updatedAt,
      organization: agreement.organization,
      project: agreement.project,
      latestInvoice: agreement.invoices[0] ? {
        ...agreement.invoices[0],
        total: agreement.invoices[0].total.toFixed(2),
      } : null,
      invoiceCount: agreement.invoices.length,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      rows,
      byCurrency: [...summary.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, values]) => ({
          currency,
          contractValue: values.contract.toFixed(2),
          issuedAmount: values.issued.toFixed(2),
          draftAmount: values.drafts.toFixed(2),
          remainingToPrepare: values.remainingToPrepare.toFixed(2),
          scheduledAmount: values.scheduled.toFixed(2),
          unscheduledAmount: values.unscheduled.toFixed(2),
          agreements: values.agreements,
          overbilled: values.overbilled,
          basisUnspecified: values.basisUnspecified,
        })),
      methodology:
        'Tax-exclusive agreements are compared with invoice taxable value before tax; tax-inclusive agreements are compared with final invoice totals. Unspecified legacy agreements continue to use final invoice totals but are explicitly flagged for review. Billing milestones are planning records until explicitly linked to an invoice. A milestone with a non-void linked invoice is treated as invoiced for schedule progression; draft invoices reserve billing coverage but are not treated as issued.',
    },
  });
}
