import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { nextJournalNumber } from '@/lib/finance';

const schema = z.object({
  entryDate: z.coerce.date(),
  reason: z.string().trim().min(2).max(1000),
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid journal reversal', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const original = await db.financeJournalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { createdAt: 'asc' },
        include: { account: { select: { id: true, code: true, name: true, type: true } } },
      },
    },
  });

  if (!original) {
    return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 });
  }
  if (original.sourceType === 'reversal') {
    return NextResponse.json(
      { success: false, error: 'A reversal journal cannot itself be reversed; post a correcting journal instead' },
      { status: 409 },
    );
  }
  if (original.status === 'reversed') {
    const existing = await db.financeJournalEntry.findFirst({
      where: { sourceType: 'reversal', sourceId: original.id },
      select: { id: true, journalNumber: true, entryDate: true },
    });
    return NextResponse.json(
      {
        success: false,
        error: 'This journal has already been reversed',
        reversal: existing,
      },
      { status: 409 },
    );
  }
  if (parsed.data.entryDate.getTime() < original.entryDate.getTime()) {
    return NextResponse.json(
      { success: false, error: 'Reversal date cannot be earlier than the original journal date' },
      { status: 409 },
    );
  }

  const duplicate = await db.financeJournalEntry.findFirst({
    where: { sourceType: 'reversal', sourceId: original.id },
    select: { id: true, journalNumber: true, entryDate: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { success: false, error: 'This journal already has a reversal', reversal: duplicate },
      { status: 409 },
    );
  }

  const period = await db.financeAccountingPeriod.findFirst({
    where: {
      startDate: { lte: parsed.data.entryDate },
      endDate: { gte: parsed.data.entryDate },
    },
    orderBy: { startDate: 'desc' },
  });
  if (!period) {
    return NextResponse.json(
      { success: false, error: 'No accounting period covers the reversal date' },
      { status: 409 },
    );
  }
  if (period.status !== 'open') {
    return NextResponse.json(
      { success: false, error: 'The accounting period for the reversal date is closed' },
      { status: 409 },
    );
  }

  const monthLock = await db.financeMonthClose.findFirst({
    where: {
      status: 'closed',
      monthStart: { lte: parsed.data.entryDate },
      monthEnd: { gte: parsed.data.entryDate },
    },
    select: { id: true, monthStart: true, monthEnd: true },
  });
  if (monthLock) {
    return NextResponse.json(
      { success: false, error: 'The month for this reversal date is closed' },
      { status: 409 },
    );
  }

  const journalNumber = await nextJournalNumber(parsed.data.entryDate);
  const reversal = await db.$transaction(async (tx) => {
    const created = await tx.financeJournalEntry.create({
      data: {
        journalNumber,
        entryDate: parsed.data.entryDate,
        currency: original.currency,
        description: 'Reversal of ' + original.journalNumber + ' · ' + parsed.data.reason,
        reference: original.reference || original.journalNumber,
        sourceType: 'reversal',
        sourceId: original.id,
        status: 'posted',
        postedAt: new Date(),
        postedBy: actor.name || actor.email,
        lines: {
          create: original.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description || 'Reversal of ' + original.journalNumber,
            debit: line.credit,
            credit: line.debit,
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

    await tx.financeJournalEntry.update({
      where: { id: original.id },
      data: { status: 'reversed' },
    });

    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_journal_reversed',
    entity: 'FinanceJournalEntry',
    entityId: original.id,
    details: {
      originalJournalNumber: original.journalNumber,
      reversalJournalId: reversal.id,
      reversalJournalNumber: reversal.journalNumber,
      reversalDate: reversal.entryDate.toISOString(),
      reason: parsed.data.reason,
      periodId: period.id,
      periodName: period.name,
    },
  });

  return NextResponse.json({ success: true, data: serialize(reversal) }, { status: 201 });
}
