import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { accountNormalSide } from '@/lib/finance';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId')?.trim() || '';
  const currency = searchParams.get('currency')?.trim().toUpperCase() || '';
  const fromRaw = searchParams.get('from')?.trim() || '';
  const toRaw = searchParams.get('to')?.trim() || '';

  if (!accountId) {
    return NextResponse.json({ success: false, error: 'Choose a ledger account' }, { status: 400 });
  }

  const from = fromRaw ? new Date(fromRaw.length === 10 ? fromRaw + 'T00:00:00.000Z' : fromRaw) : null;
  const to = toRaw ? new Date(toRaw.length === 10 ? toRaw + 'T23:59:59.999Z' : toRaw) : new Date();
  if ((from && Number.isNaN(from.getTime())) || Number.isNaN(to.getTime()) || (from && from > to)) {
    return NextResponse.json({ success: false, error: 'Invalid ledger date range' }, { status: 400 });
  }

  const account = await db.financeAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      subtype: true,
      active: true,
    },
  });
  if (!account) {
    return NextResponse.json({ success: false, error: 'Ledger account not found' }, { status: 404 });
  }

  const [lines, openingLines] = await Promise.all([
    db.financeJournalLine.findMany({
      where: {
        accountId,
        entry: {
          status: { in: ['posted', 'reversed'] },
          entryDate: {
            ...(from ? { gte: from } : {}),
            lte: to,
          },
          ...(currency ? { currency } : {}),
        },
      },
      orderBy: [
        { entry: { entryDate: 'asc' } },
        { createdAt: 'asc' },
      ],
      include: {
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
            status: true,
            postedBy: true,
            postedAt: true,
          },
        },
      },
    }),
    from
      ? db.financeJournalLine.findMany({
          where: {
            accountId,
            entry: {
              status: { in: ['posted', 'reversed'] },
              entryDate: { lt: from },
              ...(currency ? { currency } : {}),
            },
          },
          include: {
            entry: { select: { currency: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const normalSide = accountNormalSide(account.type);
  const running = new Map<string, Prisma.Decimal>();
  const opening = new Map<string, Prisma.Decimal>();
  const totals = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();

  for (const line of openingLines) {
    const code = line.entry.currency;
    const current = opening.get(code) || new Prisma.Decimal(0);
    const movement = normalSide === 'debit'
      ? line.debit.minus(line.credit)
      : line.credit.minus(line.debit);
    opening.set(code, current.plus(movement));
  }

  for (const [code, balance] of opening.entries()) {
    running.set(code, balance);
  }

  const rows = lines.map((line) => {
    const code = line.entry.currency;
    if (!running.has(code)) running.set(code, new Prisma.Decimal(0));
    if (!totals.has(code)) {
      totals.set(code, { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) });
    }

    const total = totals.get(code)!;
    total.debit = total.debit.plus(line.debit);
    total.credit = total.credit.plus(line.credit);

    const movement = normalSide === 'debit'
      ? line.debit.minus(line.credit)
      : line.credit.minus(line.debit);
    const balance = running.get(code)!.plus(movement);
    running.set(code, balance);

    return {
      id: line.id,
      journalId: line.entry.id,
      journalNumber: line.entry.journalNumber,
      entryDate: line.entry.entryDate,
      currency: code,
      description: line.description || line.entry.description,
      journalDescription: line.entry.description,
      reference: line.entry.reference,
      sourceType: line.entry.sourceType,
      sourceId: line.entry.sourceId,
      postedBy: line.entry.postedBy,
      postedAt: line.entry.postedAt,
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
      runningBalance: balance.toFixed(2),
      normalSide,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      account,
      normalSide,
      from,
      to,
      currency: currency || null,
      rows,
      totals: Object.fromEntries(
        [...new Set([...totals.keys(), ...opening.keys()])].sort().map((code) => {
          const value = totals.get(code) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
          return [
            code,
            {
              openingBalance: (opening.get(code) || new Prisma.Decimal(0)).toFixed(2),
              debit: value.debit.toFixed(2),
              credit: value.credit.toFixed(2),
              closingBalance: (running.get(code) || new Prisma.Decimal(0)).toFixed(2),
            },
          ];
        }),
      ),
    },
  });
}
