import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

type Totals = {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const currency = searchParams.get('currency')?.trim().toUpperCase() || '';
  const asOfRaw = searchParams.get('asOf')?.trim() || '';
  const asOf = asOfRaw
    ? new Date(asOfRaw.length === 10 ? asOfRaw + 'T23:59:59.999Z' : asOfRaw)
    : new Date();

  if (Number.isNaN(asOf.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid trial balance date' }, { status: 400 });
  }

  const lines = await db.financeJournalLine.findMany({
    where: {
      entry: {
        status: 'posted',
        entryDate: { lte: asOf },
        ...(currency ? { currency } : {}),
      },
    },
    orderBy: [{ account: { code: 'asc' } }, { createdAt: 'asc' }],
    include: {
      account: { select: { id: true, code: true, name: true, type: true, subtype: true } },
      entry: { select: { currency: true } },
    },
  });

  const buckets = new Map<string, Map<string, {
    account: typeof lines[number]['account'];
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
  }>>();

  for (const line of lines) {
    if (!buckets.has(line.entry.currency)) buckets.set(line.entry.currency, new Map());
    const accounts = buckets.get(line.entry.currency)!;
    if (!accounts.has(line.accountId)) {
      accounts.set(line.accountId, {
        account: line.account,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      });
    }
    const row = accounts.get(line.accountId)!;
    row.debit = row.debit.plus(line.debit);
    row.credit = row.credit.plus(line.credit);
  }

  const byCurrency = Object.fromEntries(
    [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, accountMap]) => {
      const movement: Totals = {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      };
      const closing: Totals = {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      };

      const rows = [...accountMap.values()]
        .sort((a, b) => a.account.code.localeCompare(b.account.code))
        .map((row) => {
          movement.debit = movement.debit.plus(row.debit);
          movement.credit = movement.credit.plus(row.credit);

          const net = row.debit.minus(row.credit);
          const debitBalance = net.gt(0) ? net : new Prisma.Decimal(0);
          const creditBalance = net.lt(0) ? net.abs() : new Prisma.Decimal(0);
          closing.debit = closing.debit.plus(debitBalance);
          closing.credit = closing.credit.plus(creditBalance);

          return {
            accountId: row.account.id,
            code: row.account.code,
            name: row.account.name,
            type: row.account.type,
            subtype: row.account.subtype,
            debitMovement: row.debit.toFixed(2),
            creditMovement: row.credit.toFixed(2),
            debitBalance: debitBalance.toFixed(2),
            creditBalance: creditBalance.toFixed(2),
          };
        });

      const difference = closing.debit.minus(closing.credit);

      return [code, {
        rows,
        movement: {
          debit: movement.debit.toFixed(2),
          credit: movement.credit.toFixed(2),
        },
        closing: {
          debit: closing.debit.toFixed(2),
          credit: closing.credit.toFixed(2),
          difference: difference.toFixed(2),
          balanced: difference.eq(0),
        },
      }];
    }),
  );

  return NextResponse.json({
    success: true,
    data: {
      asOf,
      currency: currency || null,
      byCurrency,
    },
  });
}
