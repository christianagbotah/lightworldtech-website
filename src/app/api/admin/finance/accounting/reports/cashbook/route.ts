import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

type CashAccount = {
  id: string;
  code: string;
  name: string;
  systemKey: string | null;
};

function key(accountId: string, currency: string): string {
  return accountId + '::' + currency;
}

function summaryBucket() {
  return {
    openingBalance: new Prisma.Decimal(0),
    inflow: new Prisma.Decimal(0),
    outflow: new Prisma.Decimal(0),
    closingBalance: new Prisma.Decimal(0),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = now.getUTCFullYear();
  const fromRaw = searchParams.get('from')?.trim() || year + '-01-01';
  const toRaw = searchParams.get('to')?.trim() || now.toISOString().slice(0, 10);
  const currency = searchParams.get('currency')?.trim().toUpperCase() || '';
  const channel = searchParams.get('channel')?.trim() || 'all';

  if (!['all', 'cash', 'bank', 'mobile_money'].includes(channel)) {
    return NextResponse.json({ success: false, error: 'Invalid cashbook channel' }, { status: 400 });
  }

  const from = new Date(fromRaw.length === 10 ? fromRaw + 'T00:00:00.000Z' : fromRaw);
  const to = new Date(toRaw.length === 10 ? toRaw + 'T23:59:59.999Z' : toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ success: false, error: 'Invalid cashbook date range' }, { status: 400 });
  }

  const systemKeys = channel === 'all'
    ? ['cash', 'bank', 'mobile_money']
    : [channel];

  const accountSelect = {
    id: true,
    code: true,
    name: true,
    systemKey: true,
  } as const;

  const [lines, openingLines] = await Promise.all([
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: { in: systemKeys } },
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: { gte: from, lte: to },
          ...(currency ? { currency } : {}),
        },
      },
      orderBy: [
        { entry: { entryDate: 'asc' } },
        { createdAt: 'asc' },
      ],
      include: {
        account: { select: accountSelect },
        entry: {
          select: {
            id: true,
            journalNumber: true,
            entryDate: true,
            currency: true,
            description: true,
            reference: true,
            sourceType: true,
            sourceId: true,
            postedBy: true,
            postedAt: true,
            lines: {
              select: {
                account: { select: { systemKey: true } },
              },
            },
          },
        },
      },
    }),
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: { in: systemKeys } },
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: { lt: from },
          ...(currency ? { currency } : {}),
        },
      },
      include: {
        account: { select: accountSelect },
        entry: { select: { currency: true } },
      },
    }),
  ]);

  const openingByAccount = new Map<string, Prisma.Decimal>();
  const accountMeta = new Map<string, CashAccount>();
  const currencySummary = new Map<string, ReturnType<typeof summaryBucket>>();

  for (const line of openingLines) {
    const code = line.entry.currency;
    const accountKey = key(line.accountId, code);
    const opening = openingByAccount.get(accountKey) || new Prisma.Decimal(0);
    openingByAccount.set(accountKey, opening.plus(line.debit).minus(line.credit));
    accountMeta.set(line.accountId, line.account);

    if (!currencySummary.has(code)) currencySummary.set(code, summaryBucket());
    const bucket = currencySummary.get(code)!;
    bucket.openingBalance = bucket.openingBalance.plus(line.debit).minus(line.credit);
  }

  const runningByAccount = new Map(openingByAccount);
  const activityByAccount = new Map<string, {
    account: CashAccount;
    currency: string;
    openingBalance: Prisma.Decimal;
    inflow: Prisma.Decimal;
    outflow: Prisma.Decimal;
  }>();

  const rows = lines.map((line) => {
    const code = line.entry.currency;
    const accountKey = key(line.accountId, code);
    const openingBalance = openingByAccount.get(accountKey) || new Prisma.Decimal(0);
    const running = (runningByAccount.get(accountKey) || openingBalance)
      .plus(line.debit)
      .minus(line.credit);
    runningByAccount.set(accountKey, running);
    accountMeta.set(line.accountId, line.account);

    if (!currencySummary.has(code)) currencySummary.set(code, summaryBucket());
    const currencyBucket = currencySummary.get(code)!;
    currencyBucket.inflow = currencyBucket.inflow.plus(line.debit);
    currencyBucket.outflow = currencyBucket.outflow.plus(line.credit);

    if (!activityByAccount.has(accountKey)) {
      activityByAccount.set(accountKey, {
        account: line.account,
        currency: code,
        openingBalance,
        inflow: new Prisma.Decimal(0),
        outflow: new Prisma.Decimal(0),
      });
    }
    const accountBucket = activityByAccount.get(accountKey)!;
    accountBucket.inflow = accountBucket.inflow.plus(line.debit);
    accountBucket.outflow = accountBucket.outflow.plus(line.credit);

    const cashLegs = line.entry.lines.filter((entryLine) =>
      ['cash', 'bank', 'mobile_money'].includes(entryLine.account.systemKey || ''),
    ).length;

    const inflow = line.debit.gt(0);
    return {
      id: line.id,
      journalId: line.entry.id,
      journalNumber: line.entry.journalNumber,
      entryDate: line.entry.entryDate,
      currency: code,
      account: line.account,
      direction: inflow ? 'inflow' : 'outflow',
      amount: (inflow ? line.debit : line.credit).toFixed(2),
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
      runningBalance: running.toFixed(2),
      description: line.description || line.entry.description,
      journalDescription: line.entry.description,
      reference: line.entry.reference,
      sourceType: line.entry.sourceType,
      sourceId: line.entry.sourceId,
      postedBy: line.entry.postedBy,
      postedAt: line.entry.postedAt,
      internalTransfer: cashLegs > 1,
    };
  });

  for (const [accountKey, openingBalance] of openingByAccount.entries()) {
    if (activityByAccount.has(accountKey)) continue;
    const [accountId, code] = accountKey.split('::');
    const account = accountMeta.get(accountId);
    if (!account) continue;
    activityByAccount.set(accountKey, {
      account,
      currency: code,
      openingBalance,
      inflow: new Prisma.Decimal(0),
      outflow: new Prisma.Decimal(0),
    });
  }

  const summary = Object.fromEntries(
    [...currencySummary.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, bucket]) => {
        const closing = bucket.openingBalance.plus(bucket.inflow).minus(bucket.outflow);
        bucket.closingBalance = closing;
        return [code, {
          openingBalance: bucket.openingBalance.toFixed(2),
          inflow: bucket.inflow.toFixed(2),
          outflow: bucket.outflow.toFixed(2),
          netChange: bucket.inflow.minus(bucket.outflow).toFixed(2),
          closingBalance: closing.toFixed(2),
        }];
      }),
  );

  const accounts = [...activityByAccount.values()]
    .sort((a, b) => {
      const currencyOrder = a.currency.localeCompare(b.currency);
      return currencyOrder || a.account.code.localeCompare(b.account.code);
    })
    .map((item) => ({
      ...item.account,
      currency: item.currency,
      openingBalance: item.openingBalance.toFixed(2),
      inflow: item.inflow.toFixed(2),
      outflow: item.outflow.toFixed(2),
      closingBalance: item.openingBalance.plus(item.inflow).minus(item.outflow).toFixed(2),
    }));

  return NextResponse.json({
    success: true,
    data: {
      from,
      to,
      currency: currency || null,
      channel,
      summary,
      accounts,
      rows,
    },
  });
}
