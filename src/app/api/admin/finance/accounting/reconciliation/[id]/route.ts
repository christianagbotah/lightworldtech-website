import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

function normalizeReference(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function daysApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86400000;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const batch = await db.financeReconciliationBatch.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          matchedJournalLine: {
            include: {
              account: { select: { code: true, name: true, systemKey: true } },
              entry: {
                select: {
                  id: true,
                  journalNumber: true,
                  entryDate: true,
                  currency: true,
                  description: true,
                  reference: true,
                  sourceType: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ success: false, error: 'Reconciliation batch not found' }, { status: 404 });
  }

  const windowStart = new Date(batch.statementFrom.getTime() - 7 * 86400000);
  const windowEnd = new Date(batch.statementTo.getTime() + 7 * 86400000);
  const candidates = await db.financeJournalLine.findMany({
    where: {
      reconciliationLine: null,
      account: { systemKey: batch.accountSystemKey },
      entry: {
        currency: batch.currency,
        status: { in: ['posted', 'reversed'] },
        entryDate: { gte: windowStart, lte: windowEnd },
      },
    },
    orderBy: [{ entry: { entryDate: 'asc' } }, { createdAt: 'asc' }],
    include: {
      account: { select: { code: true, name: true, systemKey: true } },
      entry: {
        select: {
          id: true,
          journalNumber: true,
          entryDate: true,
          currency: true,
          description: true,
          reference: true,
          sourceType: true,
        },
      },
    },
    take: 5000,
  });

  const lines = batch.lines.map((line) => {
    const targetAmount = line.amount.toDecimalPlaces(2);
    const lineReference = normalizeReference(line.reference);

    const suggestions = line.status === 'matched'
      ? []
      : candidates
          .filter((candidate) => {
            const amount = line.direction === 'in' ? candidate.debit : candidate.credit;
            return amount.toDecimalPlaces(2).eq(targetAmount) &&
              daysApart(candidate.entry.entryDate, line.transactionDate) <= 7;
          })
          .map((candidate) => {
            const candidateReference = normalizeReference(candidate.entry.reference);
            const exactReference = Boolean(
              lineReference &&
              candidateReference &&
              lineReference === candidateReference,
            );
            const sameDay = candidate.entry.entryDate.toISOString().slice(0, 10) ===
              line.transactionDate.toISOString().slice(0, 10);
            const score =
              (exactReference ? 100 : 0) +
              (sameDay ? 30 : 0) +
              Math.max(0, 14 - Math.floor(daysApart(candidate.entry.entryDate, line.transactionDate) * 2));

            return {
              id: candidate.id,
              journalId: candidate.entry.id,
              journalNumber: candidate.entry.journalNumber,
              entryDate: candidate.entry.entryDate,
              description: candidate.entry.description,
              reference: candidate.entry.reference,
              sourceType: candidate.entry.sourceType,
              debit: candidate.debit.toFixed(2),
              credit: candidate.credit.toFixed(2),
              accountCode: candidate.account.code,
              accountName: candidate.account.name,
              score,
            };
          })
          .sort((a, b) => b.score - a.score || a.journalNumber.localeCompare(b.journalNumber))
          .slice(0, 5);

    return {
      ...line,
      amount: line.amount.toFixed(2),
      suggestions,
      matchedJournalLine: line.matchedJournalLine ? {
        ...line.matchedJournalLine,
        debit: line.matchedJournalLine.debit.toFixed(2),
        credit: line.matchedJournalLine.credit.toFixed(2),
      } : null,
    };
  });

  const movement = batch.lines.reduce(
    (sum, line) => line.direction === 'in' ? sum.plus(line.amount) : sum.minus(line.amount),
    new Prisma.Decimal(0),
  );
  const expectedClosing = batch.openingBalance.plus(movement);

  return NextResponse.json({
    success: true,
    data: {
      ...batch,
      openingBalance: batch.openingBalance.toFixed(2),
      closingBalance: batch.closingBalance.toFixed(2),
      statementMovement: movement.toFixed(2),
      expectedClosing: expectedClosing.toFixed(2),
      statementDifference: expectedClosing.minus(batch.closingBalance).toFixed(2),
      matchedCount: lines.filter((line) => line.status === 'matched').length,
      unmatchedCount: lines.filter((line) => line.status === 'unmatched').length,
      lines,
    },
  });
}
