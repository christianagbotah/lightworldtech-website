import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('match'),
    lineId: z.string().min(1),
    journalLineId: z.string().min(1),
  }),
  z.object({
    action: z.literal('unmatch'),
    lineId: z.string().min(1),
  }),
]);

function daysApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86400000;
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
    return NextResponse.json({ success: false, error: 'Invalid reconciliation match request' }, { status: 400 });
  }

  const { id } = await params;
  const batch = await db.financeReconciliationBatch.findUnique({
    where: { id },
    select: {
      id: true,
      batchNumber: true,
      status: true,
      accountSystemKey: true,
      currency: true,
      statementFrom: true,
      statementTo: true,
    },
  });
  if (!batch) {
    return NextResponse.json({ success: false, error: 'Reconciliation batch not found' }, { status: 404 });
  }
  if (batch.status !== 'open') {
    return NextResponse.json({ success: false, error: 'A reconciled batch cannot be changed' }, { status: 409 });
  }

  const line = await db.financeReconciliationLine.findFirst({
    where: { id: parsed.data.lineId, batchId: batch.id },
  });
  if (!line) {
    return NextResponse.json({ success: false, error: 'Statement line not found in this batch' }, { status: 404 });
  }

  if (parsed.data.action === 'unmatch') {
    const updated = await db.financeReconciliationLine.update({
      where: { id: line.id },
      data: {
        status: 'unmatched',
        matchedJournalLineId: null,
        matchedAt: null,
        matchedBy: '',
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_reconciliation_line_unmatched',
      entity: 'FinanceReconciliationLine',
      entityId: line.id,
      details: { batchId: batch.id, batchNumber: batch.batchNumber },
    });

    return NextResponse.json({ success: true, data: { ...updated, amount: updated.amount.toFixed(2) } });
  }

  const journalLine = await db.financeJournalLine.findUnique({
    where: { id: parsed.data.journalLineId },
    include: {
      account: { select: { code: true, name: true, systemKey: true } },
      entry: {
        select: {
          id: true,
          journalNumber: true,
          entryDate: true,
          currency: true,
          status: true,
          reference: true,
        },
      },
      reconciliationLine: { select: { id: true, batchId: true } },
    },
  });

  if (!journalLine) {
    return NextResponse.json({ success: false, error: 'Ledger line not found' }, { status: 404 });
  }
  if (journalLine.reconciliationLine && journalLine.reconciliationLine.id !== line.id) {
    return NextResponse.json(
      { success: false, error: 'This ledger line is already matched to another statement line' },
      { status: 409 },
    );
  }
  if (journalLine.account.systemKey !== batch.accountSystemKey) {
    return NextResponse.json(
      { success: false, error: 'Ledger line belongs to a different cash/bank account' },
      { status: 409 },
    );
  }
  if (journalLine.entry.currency !== batch.currency) {
    return NextResponse.json(
      { success: false, error: 'Ledger line currency does not match the reconciliation batch' },
      { status: 409 },
    );
  }
  if (!['posted', 'reversed'].includes(journalLine.entry.status)) {
    return NextResponse.json(
      { success: false, error: 'Only posted ledger movements can be reconciled' },
      { status: 409 },
    );
  }

  const ledgerAmount = line.direction === 'in' ? journalLine.debit : journalLine.credit;
  if (!ledgerAmount.toDecimalPlaces(2).eq(line.amount.toDecimalPlaces(2))) {
    return NextResponse.json(
      { success: false, error: 'Ledger movement amount does not match the statement line' },
      { status: 409 },
    );
  }
  if (
    journalLine.entry.entryDate.getTime() < batch.statementFrom.getTime() ||
    journalLine.entry.entryDate.getTime() > batch.statementTo.getTime()
  ) {
    return NextResponse.json(
      { success: false, error: 'Ledger posting date falls outside this statement period' },
      { status: 409 },
    );
  }

  if (daysApart(journalLine.entry.entryDate, line.transactionDate) > 7) {
    return NextResponse.json(
      { success: false, error: 'Ledger posting date is more than 7 days from the statement transaction date' },
      { status: 409 },
    );
  }

  const updated = await db.financeReconciliationLine.update({
    where: { id: line.id },
    data: {
      status: 'matched',
      matchedJournalLineId: journalLine.id,
      matchedAt: new Date(),
      matchedBy: actor.name || actor.email,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_reconciliation_line_matched',
    entity: 'FinanceReconciliationLine',
    entityId: line.id,
    details: {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      journalLineId: journalLine.id,
      journalNumber: journalLine.entry.journalNumber,
      amount: line.amount.toFixed(2),
      direction: line.direction,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      amount: updated.amount.toFixed(2),
      journalNumber: journalLine.entry.journalNumber,
    },
  });
}
