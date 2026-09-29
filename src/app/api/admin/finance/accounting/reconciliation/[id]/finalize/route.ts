import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (
    !actor ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.manage') ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  ) {
    return NextResponse.json(
      { success: false, error: 'Finance approval permission is required to finalize reconciliation' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const batch = await db.financeReconciliationBatch.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!batch) {
    return NextResponse.json({ success: false, error: 'Reconciliation batch not found' }, { status: 404 });
  }
  if (batch.status === 'reconciled') {
    return NextResponse.json({ success: true, data: batch });
  }

  if (!batch.importedByAdminId) {
    return NextResponse.json(
      {
        success: false,
        error: 'This legacy reconciliation lacks an auditable importer identity and must be recreated before finalization',
      },
      { status: 409 },
    );
  }

  const matchedWithoutOperator = batch.lines.find(
    (line) => line.status === 'matched' && !line.matchedByAdminId,
  );
  if (matchedWithoutOperator) {
    return NextResponse.json(
      {
        success: false,
        error: 'This reconciliation contains legacy matches without auditable operator identity and must be recreated',
      },
      { status: 409 },
    );
  }

  if (batch.importedByAdminId === actor.id) {
    return NextResponse.json(
      {
        success: false,
        error: 'Maker-checker prevents the statement importer from finalizing their own reconciliation',
      },
      { status: 409 },
    );
  }

  const matcherIds = [...new Set(
    batch.lines.map((line) => line.matchedByAdminId).filter(Boolean),
  )];
  if (matcherIds.includes(actor.id)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Maker-checker prevents a statement-line matcher from finalizing the same reconciliation',
      },
      { status: 409 },
    );
  }

  const unmatched = batch.lines.filter((line) => line.status !== 'matched');
  if (unmatched.length) {
    return NextResponse.json(
      {
        success: false,
        error: 'All statement lines must be matched before reconciliation can be finalized',
        unmatchedCount: unmatched.length,
      },
      { status: 409 },
    );
  }

  const statementMovement = batch.lines.reduce(
    (sum, line) => line.direction === 'in' ? sum.plus(line.amount) : sum.minus(line.amount),
    new Prisma.Decimal(0),
  );
  const expectedStatementClosing = batch.openingBalance.plus(statementMovement).toDecimalPlaces(2);
  if (expectedStatementClosing.minus(batch.closingBalance).abs().gt('0.01')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Statement opening balance and line movements do not reproduce the supplied closing balance',
        expectedClosing: expectedStatementClosing.toFixed(2),
        suppliedClosing: batch.closingBalance.toFixed(2),
      },
      { status: 409 },
    );
  }

  const [openingLedgerLines, periodLedgerLines] = await Promise.all([
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: batch.accountSystemKey },
        entry: {
          currency: batch.currency,
          status: { in: ['posted', 'reversed'] },
          entryDate: { lt: batch.statementFrom },
        },
      },
      select: { debit: true, credit: true },
      take: 100000,
    }),
    db.financeJournalLine.findMany({
      where: {
        account: { systemKey: batch.accountSystemKey },
        entry: {
          currency: batch.currency,
          status: { in: ['posted', 'reversed'] },
          entryDate: {
            gte: batch.statementFrom,
            lte: batch.statementTo,
          },
        },
      },
      select: {
        id: true,
        debit: true,
        credit: true,
        reconciliationLine: {
          select: { id: true, batchId: true, status: true },
        },
      },
      take: 100000,
    }),
  ]);

  const ledgerOpening = openingLedgerLines.reduce(
    (sum, line) => sum.plus(line.debit).minus(line.credit),
    new Prisma.Decimal(0),
  ).toDecimalPlaces(2);
  const openingDifference = ledgerOpening.minus(batch.openingBalance).toDecimalPlaces(2);

  if (openingDifference.abs().gt('0.01')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ledger opening balance does not agree with the statement opening balance',
        ledgerOpening: ledgerOpening.toFixed(2),
        statementOpening: batch.openingBalance.toFixed(2),
        difference: openingDifference.toFixed(2),
      },
      { status: 409 },
    );
  }

  const unmatchedLedgerLines = periodLedgerLines.filter(
    (line) =>
      !line.reconciliationLine ||
      line.reconciliationLine.batchId !== batch.id ||
      line.reconciliationLine.status !== 'matched',
  );
  if (unmatchedLedgerLines.length) {
    return NextResponse.json(
      {
        success: false,
        error: 'Every bank/mobile-money ledger movement in the statement period must be matched before finalization',
        unmatchedLedgerLineCount: unmatchedLedgerLines.length,
      },
      { status: 409 },
    );
  }

  const ledgerMovement = periodLedgerLines.reduce(
    (sum, line) => sum.plus(line.debit).minus(line.credit),
    new Prisma.Decimal(0),
  ).toDecimalPlaces(2);
  const ledgerClosing = ledgerOpening.plus(ledgerMovement).toDecimalPlaces(2);
  const controlDifference = ledgerClosing.minus(batch.closingBalance).toDecimalPlaces(2);

  if (controlDifference.abs().gt('0.01')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ledger closing balance does not agree with the statement closing balance',
        ledgerOpening: ledgerOpening.toFixed(2),
        ledgerMovement: ledgerMovement.toFixed(2),
        ledgerClosing: ledgerClosing.toFixed(2),
        statementClosing: batch.closingBalance.toFixed(2),
        difference: controlDifference.toFixed(2),
      },
      { status: 409 },
    );
  }

  const updated = await db.financeReconciliationBatch.update({
    where: { id: batch.id },
    data: {
      status: 'reconciled',
      reconciledAt: new Date(),
      reconciledByAdminId: actor.id,
      reconciledBy: actor.name || actor.email,
    },
    include: {
      lines: {
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_reconciliation_finalized',
    entity: 'FinanceReconciliationBatch',
    entityId: batch.id,
    details: {
      batchNumber: batch.batchNumber,
      accountSystemKey: batch.accountSystemKey,
      currency: batch.currency,
      statementTo: batch.statementTo.toISOString(),
      openingBalance: batch.openingBalance.toFixed(2),
      ledgerOpening: ledgerOpening.toFixed(2),
      closingBalance: batch.closingBalance.toFixed(2),
      ledgerClosing: ledgerClosing.toFixed(2),
      ledgerMovement: ledgerMovement.toFixed(2),
      matchedLineCount: batch.lines.length,
      matchedLedgerLineCount: periodLedgerLines.length,
      importerAdminId: batch.importedByAdminId,
      matcherAdminIds: matcherIds,
      checkerAdminId: actor.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      openingBalance: updated.openingBalance.toFixed(2),
      closingBalance: updated.closingBalance.toFixed(2),
      ledgerOpening: ledgerOpening.toFixed(2),
      openingDifference: openingDifference.toFixed(2),
      ledgerMovement: ledgerMovement.toFixed(2),
      ledgerClosing: ledgerClosing.toFixed(2),
      controlDifference: controlDifference.toFixed(2),
      lines: updated.lines.map((line) => ({
        ...line,
        amount: line.amount.toFixed(2),
      })),
    },
  });
}
