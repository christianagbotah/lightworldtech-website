import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { nextJournalNumber, normalizeCurrency } from '@/lib/finance';

const lineSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().trim().max(500).default(''),
  debit: z.coerce.number().min(0).max(999999999999).default(0),
  credit: z.coerce.number().min(0).max(999999999999).default(0),
}).superRefine((value, ctx) => {
  const debit = new Prisma.Decimal(value.debit);
  const credit = new Prisma.Decimal(value.credit);
  if (debit.gt(0) === credit.gt(0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Each journal line must contain either a debit or a credit, but not both',
    });
  }
});

const createSchema = z.object({
  entryDate: z.coerce.date(),
  currency: z.string().trim().max(3).default('GHS'),
  description: z.string().trim().min(2).max(1000),
  reference: z.string().trim().max(200).default(''),
  lines: z.array(lineSchema).min(2).max(200),
});

function serialize(entry: any) {
  const debit = entry.lines.reduce(
    (sum: Prisma.Decimal, line: any) => sum.plus(line.debit),
    new Prisma.Decimal(0),
  );
  const credit = entry.lines.reduce(
    (sum: Prisma.Decimal, line: any) => sum.plus(line.credit),
    new Prisma.Decimal(0),
  );
  return {
    ...entry,
    totalDebit: debit.toFixed(2),
    totalCredit: credit.toFixed(2),
    lines: entry.lines.map((line: any) => ({
      ...line,
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const currency = searchParams.get('currency')?.trim().toUpperCase() || '';
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : null;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : null;

  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) {
    return NextResponse.json({ success: false, error: 'Invalid journal date range' }, { status: 400 });
  }

  const entries = await db.financeJournalEntry.findMany({
    where: {
      ...(currency ? { currency } : {}),
      ...(from || to ? {
        entryDate: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      } : {}),
      ...(q ? {
        OR: [
          { journalNumber: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    take: 1000,
    include: {
      lines: {
        orderBy: { createdAt: 'asc' },
        include: { account: { select: { id: true, code: true, name: true, type: true } } },
      },
    },
  });

  return NextResponse.json({ success: true, data: entries.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid journal entry', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const entryDate = parsed.data.entryDate;
  const currency = normalizeCurrency(parsed.data.currency);
  const totalDebit = parsed.data.lines.reduce(
    (sum, line) => sum.plus(line.debit),
    new Prisma.Decimal(0),
  );
  const totalCredit = parsed.data.lines.reduce(
    (sum, line) => sum.plus(line.credit),
    new Prisma.Decimal(0),
  );

  if (totalDebit.lte(0) || !totalDebit.eq(totalCredit)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Journal entry is not balanced',
        totals: { debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2) },
      },
      { status: 409 },
    );
  }

  const period = await db.financeAccountingPeriod.findFirst({
    where: {
      startDate: { lte: entryDate },
      endDate: { gte: entryDate },
    },
    orderBy: { startDate: 'desc' },
  });
  if (!period) {
    return NextResponse.json(
      { success: false, error: 'No accounting period covers this posting date' },
      { status: 409 },
    );
  }
  if (period.status !== 'open') {
    return NextResponse.json(
      { success: false, error: 'The accounting period for this posting date is closed' },
      { status: 409 },
    );
  }

  const accountIds = [...new Set(parsed.data.lines.map((line) => line.accountId))];
  const accounts = await db.financeAccount.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      code: true,
      name: true,
      active: true,
      allowPosting: true,
    },
  });
  if (accounts.length !== accountIds.length) {
    return NextResponse.json({ success: false, error: 'One or more ledger accounts do not exist' }, { status: 400 });
  }

  const blocked = accounts.find((account) => !account.active || !account.allowPosting);
  if (blocked) {
    return NextResponse.json(
      { success: false, error: 'Posting is disabled for account ' + blocked.code + ' · ' + blocked.name },
      { status: 409 },
    );
  }

  const journalNumber = await nextJournalNumber(entryDate);
  const entry = await db.$transaction(async (tx) => {
    return tx.financeJournalEntry.create({
      data: {
        journalNumber,
        entryDate,
        currency,
        description: parsed.data.description,
        reference: parsed.data.reference,
        sourceType: 'manual',
        sourceId: '',
        status: 'posted',
        postedAt: new Date(),
        postedBy: actor.name || actor.email,
        lines: {
          create: parsed.data.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
          })),
        },
      },
      include: {
        lines: {
          orderBy: { createdAt: 'asc' },
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_journal_posted',
    entity: 'FinanceJournalEntry',
    entityId: entry.id,
    details: {
      journalNumber,
      entryDate: entry.entryDate.toISOString(),
      currency,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      lineCount: entry.lines.length,
      periodId: period.id,
      periodName: period.name,
    },
  });

  return NextResponse.json({ success: true, data: serialize(entry) }, { status: 201 });
}
