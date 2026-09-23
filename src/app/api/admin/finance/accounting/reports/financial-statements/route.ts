import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

type AccountShape = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  systemKey: string | null;
};

type AmountRow = {
  account: AccountShape;
  amount: Prisma.Decimal;
};

function decimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function signedAccountMovement(
  type: string,
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
): Prisma.Decimal {
  return type === 'asset' || type === 'expense'
    ? debit.minus(credit)
    : credit.minus(debit);
}

function rowsJson(rows: AmountRow[]) {
  return rows
    .filter((row) => !row.amount.eq(0))
    .sort((a, b) => a.account.code.localeCompare(b.account.code))
    .map((row) => ({
      accountId: row.account.id,
      code: row.account.code,
      name: row.account.name,
      type: row.account.type,
      subtype: row.account.subtype,
      systemKey: row.account.systemKey,
      amount: row.amount.toFixed(2),
    }));
}

function addAccountAmount(
  map: Map<string, AmountRow>,
  account: AccountShape,
  amount: Prisma.Decimal,
) {
  const current = map.get(account.id);
  if (current) {
    current.amount = current.amount.plus(amount);
  } else {
    map.set(account.id, { account, amount });
  }
}

function classifyCashFlow(entry: {
  sourceType: string;
  lines: Array<{ account: AccountShape }>;
}): 'operating' | 'investing' | 'financing' {
  if (['client_payment', 'vendor_payment', 'finance_expense_payment'].includes(entry.sourceType)) {
    return 'operating';
  }

  const nonCash = entry.lines
    .map((line) => line.account)
    .filter((account) => !['cash', 'bank', 'mobile_money'].includes(account.systemKey || ''));

  if (nonCash.some((account) => account.type === 'equity')) return 'financing';

  if (nonCash.some((account) =>
    account.type === 'liability' &&
    /(loan|debt|borrow|finance)/i.test(account.subtype + ' ' + account.name),
  )) return 'financing';

  if (nonCash.some((account) =>
    account.type === 'asset' &&
    !['accounts_receivable', 'prepaid_expenses'].includes(account.systemKey || ''),
  )) return 'investing';

  return 'operating';
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

  const from = new Date(fromRaw.length === 10 ? fromRaw + 'T00:00:00.000Z' : fromRaw);
  const to = new Date(toRaw.length === 10 ? toRaw + 'T23:59:59.999Z' : toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ success: false, error: 'Invalid financial statement date range' }, { status: 400 });
  }

  const accountSelect = {
    id: true,
    code: true,
    name: true,
    type: true,
    subtype: true,
    systemKey: true,
  } as const;

  const [periodLines, cumulativeLines, cashEntries, openingCashLines] = await Promise.all([
    db.financeJournalLine.findMany({
      where: {
        account: { type: { in: ['revenue', 'expense'] } },
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: { gte: from, lte: to },
          ...(currency ? { currency } : {}),
        },
      },
      include: {
        account: { select: accountSelect },
        entry: { select: { currency: true } },
      },
    }),
    db.financeJournalLine.findMany({
      where: {
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: { lte: to },
          ...(currency ? { currency } : {}),
        },
      },
      include: {
        account: { select: accountSelect },
        entry: { select: { currency: true } },
      },
    }),
    db.financeJournalEntry.findMany({
      where: {
        status: { in: ['posted', 'reversed'] },
        entryDate: { gte: from, lte: to },
        ...(currency ? { currency } : {}),
        lines: {
          some: {
            account: {
              systemKey: { in: ['cash', 'bank', 'mobile_money'] },
            },
          },
        },
      },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        lines: {
          orderBy: { createdAt: 'asc' },
          include: { account: { select: accountSelect } },
        },
      },
    }),
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: { in: ['cash', 'bank', 'mobile_money'] } },
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

  const profitLoss = new Map<string, {
    revenue: Map<string, AmountRow>;
    costOfServices: Map<string, AmountRow>;
    operatingExpenses: Map<string, AmountRow>;
  }>();

  for (const line of periodLines) {
    const code = line.entry.currency;
    if (!profitLoss.has(code)) {
      profitLoss.set(code, {
        revenue: new Map(),
        costOfServices: new Map(),
        operatingExpenses: new Map(),
      });
    }
    const bucket = profitLoss.get(code)!;
    const amount = signedAccountMovement(line.account.type, line.debit, line.credit);
    if (line.account.type === 'revenue') {
      addAccountAmount(bucket.revenue, line.account, amount);
    } else if (line.account.subtype === 'cost_of_services') {
      addAccountAmount(bucket.costOfServices, line.account, amount);
    } else {
      addAccountAmount(bucket.operatingExpenses, line.account, amount);
    }
  }

  const balanceSheet = new Map<string, {
    assets: Map<string, AmountRow>;
    liabilities: Map<string, AmountRow>;
    equity: Map<string, AmountRow>;
    earnings: Prisma.Decimal;
  }>();

  for (const line of cumulativeLines) {
    const code = line.entry.currency;
    if (!balanceSheet.has(code)) {
      balanceSheet.set(code, {
        assets: new Map(),
        liabilities: new Map(),
        equity: new Map(),
        earnings: new Prisma.Decimal(0),
      });
    }
    const bucket = balanceSheet.get(code)!;
    const movement = signedAccountMovement(line.account.type, line.debit, line.credit);

    if (line.account.type === 'asset') addAccountAmount(bucket.assets, line.account, movement);
    else if (line.account.type === 'liability') addAccountAmount(bucket.liabilities, line.account, movement);
    else if (line.account.type === 'equity') addAccountAmount(bucket.equity, line.account, movement);
    else if (line.account.type === 'revenue') bucket.earnings = bucket.earnings.plus(movement);
    else if (line.account.type === 'expense') bucket.earnings = bucket.earnings.minus(movement);
  }

  const openingCash = new Map<string, Prisma.Decimal>();
  for (const line of openingCashLines) {
    const code = line.entry.currency;
    openingCash.set(
      code,
      (openingCash.get(code) || new Prisma.Decimal(0)).plus(line.debit).minus(line.credit),
    );
  }

  const cashFlow = new Map<string, {
    operating: Prisma.Decimal;
    investing: Prisma.Decimal;
    financing: Prisma.Decimal;
    rows: Array<{
      journalId: string;
      journalNumber: string;
      entryDate: Date;
      description: string;
      reference: string;
      sourceType: string;
      classification: 'operating' | 'investing' | 'financing';
      amount: string;
    }>;
  }>();

  for (const entry of cashEntries) {
    const movement = entry.lines
      .filter((line) => ['cash', 'bank', 'mobile_money'].includes(line.account.systemKey || ''))
      .reduce(
        (sum, line) => sum.plus(line.debit).minus(line.credit),
        new Prisma.Decimal(0),
      );

    if (movement.eq(0)) continue;

    if (!cashFlow.has(entry.currency)) {
      cashFlow.set(entry.currency, {
        operating: new Prisma.Decimal(0),
        investing: new Prisma.Decimal(0),
        financing: new Prisma.Decimal(0),
        rows: [],
      });
    }

    const bucket = cashFlow.get(entry.currency)!;
    const classification = classifyCashFlow(entry);
    bucket[classification] = bucket[classification].plus(movement);
    bucket.rows.push({
      journalId: entry.id,
      journalNumber: entry.journalNumber,
      entryDate: entry.entryDate,
      description: entry.description,
      reference: entry.reference,
      sourceType: entry.sourceType,
      classification,
      amount: movement.toFixed(2),
    });
  }

  const allCurrencies = new Set<string>([
    ...profitLoss.keys(),
    ...balanceSheet.keys(),
    ...cashFlow.keys(),
    ...openingCash.keys(),
  ]);

  const byCurrency = Object.fromEntries(
    [...allCurrencies].sort().map((code) => {
      const pnl = profitLoss.get(code) || {
        revenue: new Map<string, AmountRow>(),
        costOfServices: new Map<string, AmountRow>(),
        operatingExpenses: new Map<string, AmountRow>(),
      };

      const revenue = [...pnl.revenue.values()].reduce(
        (sum, row) => sum.plus(row.amount),
        new Prisma.Decimal(0),
      );
      const costOfServices = [...pnl.costOfServices.values()].reduce(
        (sum, row) => sum.plus(row.amount),
        new Prisma.Decimal(0),
      );
      const operatingExpenses = [...pnl.operatingExpenses.values()].reduce(
        (sum, row) => sum.plus(row.amount),
        new Prisma.Decimal(0),
      );
      const grossProfit = revenue.minus(costOfServices);
      const netProfit = grossProfit.minus(operatingExpenses);

      const bs = balanceSheet.get(code) || {
        assets: new Map<string, AmountRow>(),
        liabilities: new Map<string, AmountRow>(),
        equity: new Map<string, AmountRow>(),
        earnings: new Prisma.Decimal(0),
      };
      const assets = [...bs.assets.values()].reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
      const liabilities = [...bs.liabilities.values()].reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
      const postedEquity = [...bs.equity.values()].reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
      const totalEquity = postedEquity.plus(bs.earnings);
      const balanceDifference = assets.minus(liabilities).minus(totalEquity);

      const cf = cashFlow.get(code) || {
        operating: new Prisma.Decimal(0),
        investing: new Prisma.Decimal(0),
        financing: new Prisma.Decimal(0),
        rows: [],
      };
      const opening = openingCash.get(code) || new Prisma.Decimal(0);
      const netCashChange = cf.operating.plus(cf.investing).plus(cf.financing);
      const closing = opening.plus(netCashChange);

      return [code, {
        profitLoss: {
          revenue: rowsJson([...pnl.revenue.values()]),
          totalRevenue: revenue.toFixed(2),
          costOfServices: rowsJson([...pnl.costOfServices.values()]),
          totalCostOfServices: costOfServices.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          operatingExpenses: rowsJson([...pnl.operatingExpenses.values()]),
          totalOperatingExpenses: operatingExpenses.toFixed(2),
          netProfit: netProfit.toFixed(2),
        },
        balanceSheet: {
          assets: rowsJson([...bs.assets.values()]),
          totalAssets: assets.toFixed(2),
          liabilities: rowsJson([...bs.liabilities.values()]),
          totalLiabilities: liabilities.toFixed(2),
          equity: rowsJson([...bs.equity.values()]),
          postedEquity: postedEquity.toFixed(2),
          currentEarnings: bs.earnings.toFixed(2),
          totalEquity: totalEquity.toFixed(2),
          liabilitiesAndEquity: liabilities.plus(totalEquity).toFixed(2),
          difference: balanceDifference.toFixed(2),
          balanced: balanceDifference.abs().lt('0.01'),
        },
        cashFlow: {
          openingCash: opening.toFixed(2),
          operating: cf.operating.toFixed(2),
          investing: cf.investing.toFixed(2),
          financing: cf.financing.toFixed(2),
          netCashChange: netCashChange.toFixed(2),
          closingCash: closing.toFixed(2),
          rows: cf.rows,
        },
      }];
    }),
  );

  return NextResponse.json({
    success: true,
    data: {
      from,
      to,
      currency: currency || null,
      byCurrency,
    },
  });
}
