import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { nextTreasuryPaymentPlanNumber, normalizeCurrency } from '@/lib/finance';
import {
  getTreasurySourceAccount,
  serializeTreasuryPlan,
  treasuryAccountKind,
  validateTreasuryAllocations,
} from '@/lib/finance-treasury';

const planSchema = z.object({
  vendorId: z.string().min(1),
  sourceAccountId: z.string().min(1),
  currency: z.string().trim().max(3).default('GHS'),
  amount: z.coerce.number().positive().max(999999999999),
  scheduledFor: z.coerce.date(),
  method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other']).default('bank_transfer'),
  reference: z.string().trim().max(200).default(''),
  notes: z.string().trim().max(8000).default(''),
  allocations: z.array(z.object({
    billId: z.string().min(1),
    amount: z.coerce.number().positive().max(999999999999),
  })).max(100).default([]),
}).superRefine((value, ctx) => {
  const allocated = value.allocations.reduce((sum, item) => sum + item.amount, 0);
  if (allocated - value.amount > 0.001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allocations'],
      message: 'Allocated amount cannot exceed treasury plan amount',
    });
  }
  const ids = value.allocations.map((item) => item.billId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allocations'],
      message: 'Each supplier bill can be allocated only once',
    });
  }
});

function decimal(value: Prisma.Decimal | number | string | null | undefined) {
  return new Prisma.Decimal(value || 0);
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [plans, sourceAccounts] = await Promise.all([
    db.financeTreasuryPaymentPlan.findMany({
      include: {
        vendor: { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, code: true, name: true, subtype: true, systemKey: true } },
      },
      orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
    }),
    db.financeAccount.findMany({
      where: {
        active: true,
        allowPosting: true,
        type: 'asset',
        OR: [
          { systemKey: { in: ['cash', 'bank', 'mobile_money'] } },
          { subtype: { in: ['cash', 'bank', 'mobile_money'] } },
        ],
      },
      select: { id: true, code: true, name: true, type: true, subtype: true, systemKey: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const accountIds = sourceAccounts.map((account) => account.id);
  const [journalLines, commitments] = await Promise.all([
    accountIds.length
      ? db.financeJournalLine.findMany({
          where: {
            accountId: { in: accountIds },
            entry: { status: 'posted' },
          },
          select: {
            accountId: true,
            debit: true,
            credit: true,
            entry: { select: { currency: true } },
          },
        })
      : [],
    db.financeTreasuryPaymentPlan.findMany({
      where: {
        sourceAccountId: { in: accountIds },
        status: { in: ['pending_approval', 'approved'] },
      },
      select: {
        sourceAccountId: true,
        currency: true,
        amount: true,
        status: true,
      },
    }),
  ]);

  const balanceMap = new Map<string, Prisma.Decimal>();
  for (const line of journalLines) {
    const currency = normalizeCurrency(line.entry.currency);
    const key = line.accountId + '|' + currency;
    const next = (balanceMap.get(key) || new Prisma.Decimal(0))
      .plus(line.debit)
      .minus(line.credit);
    balanceMap.set(key, next);
  }

  const commitmentMap = new Map<string, { pending: Prisma.Decimal; approved: Prisma.Decimal }>();
  for (const plan of commitments) {
    const currency = normalizeCurrency(plan.currency);
    const key = plan.sourceAccountId + '|' + currency;
    const row = commitmentMap.get(key) || {
      pending: new Prisma.Decimal(0),
      approved: new Prisma.Decimal(0),
    };
    if (plan.status === 'approved') row.approved = row.approved.plus(plan.amount);
    else row.pending = row.pending.plus(plan.amount);
    commitmentMap.set(key, row);
  }

  const currenciesByAccount = new Map<string, Set<string>>();
  for (const key of balanceMap.keys()) {
    const [accountId, currency] = key.split('|');
    const set = currenciesByAccount.get(accountId) || new Set<string>();
    set.add(currency);
    currenciesByAccount.set(accountId, set);
  }
  for (const key of commitmentMap.keys()) {
    const [accountId, currency] = key.split('|');
    const set = currenciesByAccount.get(accountId) || new Set<string>();
    set.add(currency);
    currenciesByAccount.set(accountId, set);
  }

  const accounts = sourceAccounts.map((account) => ({
    ...account,
    kind: account.systemKey || account.subtype || 'bank',
    balances: [...(currenciesByAccount.get(account.id) || new Set<string>(['GHS']))]
      .sort()
      .map((currency) => {
        const key = account.id + '|' + currency;
        const posted = balanceMap.get(key) || new Prisma.Decimal(0);
        const commitment = commitmentMap.get(key) || {
          pending: new Prisma.Decimal(0),
          approved: new Prisma.Decimal(0),
        };
        return {
          currency,
          postedBalance: posted.toFixed(2),
          pendingCommitments: commitment.pending.toFixed(2),
          approvedCommitments: commitment.approved.toFixed(2),
          availableAfterApproved: posted.minus(commitment.approved).toFixed(2),
        };
      }),
  }));

  return NextResponse.json({
    success: true,
    data: {
      plans: plans.map(serializeTreasuryPlan),
      sourceAccounts: accounts,
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid treasury payment plan', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const currency = normalizeCurrency(parsed.data.currency);
  const vendor = await db.financeVendor.findUnique({
    where: { id: parsed.data.vendorId },
    select: { id: true, name: true, active: true },
  });
  if (!vendor || !vendor.active) {
    return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 404 });
  }

  try {
    const sourceAccount = await getTreasurySourceAccount(parsed.data.sourceAccountId, parsed.data.method);
    await validateTreasuryAllocations({
      vendorId: vendor.id,
      currency,
      allocations: parsed.data.allocations,
      requireEvidence: false,
      includeReservations: false,
    });

    const planNumber = await nextTreasuryPaymentPlanNumber(parsed.data.scheduledFor);
    const plan = await db.financeTreasuryPaymentPlan.create({
      data: {
        planNumber,
        vendorId: vendor.id,
        sourceAccountId: sourceAccount.id,
        currency,
        amount: decimal(parsed.data.amount).toDecimalPlaces(2),
        scheduledFor: parsed.data.scheduledFor,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        allocationsJson: JSON.stringify(parsed.data.allocations),
        status: 'draft',
        createdByAdminId: actor.id,
        createdByName: actor.name || 'Admin',
        createdByEmail: actor.email,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, code: true, name: true, subtype: true, systemKey: true } },
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_treasury_plan_created',
      entity: 'FinanceTreasuryPaymentPlan',
      entityId: plan.id,
      details: {
        planNumber,
        vendorId: vendor.id,
        sourceAccountId: sourceAccount.id,
        sourceAccount: sourceAccount.code + ' · ' + sourceAccount.name,
        sourceKind: treasuryAccountKind(parsed.data.method),
        amount: plan.amount.toFixed(2),
        currency,
        scheduledFor: plan.scheduledFor.toISOString(),
        allocationCount: parsed.data.allocations.length,
      },
    });

    return NextResponse.json({ success: true, data: serializeTreasuryPlan(plan) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to create treasury payment plan',
      },
      { status: 409 },
    );
  }
}