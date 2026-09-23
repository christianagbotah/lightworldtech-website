import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { nextReconciliationBatchNumber, normalizeCurrency } from '@/lib/finance';

const lineSchema = z.object({
  transactionDate: z.coerce.date(),
  description: z.string().trim().min(1).max(1000),
  reference: z.string().trim().max(250).default(''),
  direction: z.enum(['in', 'out']),
  amount: z.coerce.number().positive().max(999999999999),
});

const createSchema = z.object({
  channel: z.enum(['bank', 'mobile_money']),
  accountLabel: z.string().trim().min(2).max(160),
  accountReference: z.string().trim().max(160).default(''),
  currency: z.string().trim().max(3).default('GHS'),
  statementFrom: z.coerce.date(),
  statementTo: z.coerce.date(),
  openingBalance: z.coerce.number().min(-999999999999).max(999999999999),
  closingBalance: z.coerce.number().min(-999999999999).max(999999999999),
  notes: z.string().trim().max(4000).default(''),
  lines: z.array(lineSchema).min(1).max(1000),
}).superRefine((value, ctx) => {
  if (value.statementTo.getTime() < value.statementFrom.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['statementTo'],
      message: 'Statement end date cannot be earlier than start date',
    });
  }
  value.lines.forEach((line, index) => {
    if (
      line.transactionDate.getTime() < value.statementFrom.getTime() ||
      line.transactionDate.getTime() > value.statementTo.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lines', index, 'transactionDate'],
        message: 'Statement line date must fall inside the statement period',
      });
    }
  });
});

function signedMovement(lines: Array<{ direction: string; amount: Prisma.Decimal | number | string }>) {
  return lines.reduce(
    (sum, line) => line.direction === 'in'
      ? sum.plus(new Prisma.Decimal(line.amount))
      : sum.minus(new Prisma.Decimal(line.amount)),
    new Prisma.Decimal(0),
  );
}

function serialize(batch: any) {
  const matched = (batch.lines || []).filter((line: any) => line.status === 'matched').length;
  const unmatched = (batch.lines || []).filter((line: any) => line.status === 'unmatched').length;
  const movement = signedMovement(batch.lines || []);
  const expectedClosing = batch.openingBalance.plus(movement);
  return {
    ...batch,
    openingBalance: batch.openingBalance.toFixed(2),
    closingBalance: batch.closingBalance.toFixed(2),
    statementMovement: movement.toFixed(2),
    expectedClosing: expectedClosing.toFixed(2),
    statementDifference: expectedClosing.minus(batch.closingBalance).toFixed(2),
    matchedCount: matched,
    unmatchedCount: unmatched,
    lineCount: (batch.lines || []).length,
    lines: (batch.lines || []).map((line: any) => ({
      ...line,
      amount: line.amount.toFixed(2),
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const batches = await db.financeReconciliationBatch.findMany({
    orderBy: [{ statementTo: 'desc' }, { createdAt: 'desc' }],
    take: 500,
    include: {
      lines: {
        select: {
          id: true,
          direction: true,
          amount: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: batches.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid reconciliation statement', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const opening = new Prisma.Decimal(parsed.data.openingBalance).toDecimalPlaces(2);
  const closing = new Prisma.Decimal(parsed.data.closingBalance).toDecimalPlaces(2);
  const preparedLines = parsed.data.lines.map((line) => ({
    transactionDate: line.transactionDate,
    description: line.description,
    reference: line.reference,
    direction: line.direction,
    amount: new Prisma.Decimal(line.amount).toDecimalPlaces(2),
  }));
  const movement = signedMovement(preparedLines);
  const expectedClosing = opening.plus(movement).toDecimalPlaces(2);

  if (expectedClosing.minus(closing).abs().gt('0.01')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Statement lines do not reconcile to the supplied closing balance',
        expectedClosing: expectedClosing.toFixed(2),
        suppliedClosing: closing.toFixed(2),
        difference: expectedClosing.minus(closing).toFixed(2),
      },
      { status: 409 },
    );
  }

  const currency = normalizeCurrency(parsed.data.currency);
  const overlap = await db.financeReconciliationBatch.findFirst({
    where: {
      accountSystemKey: parsed.data.channel,
      currency,
      statementFrom: { lte: parsed.data.statementTo },
      statementTo: { gte: parsed.data.statementFrom },
    },
    select: {
      id: true,
      batchNumber: true,
      statementFrom: true,
      statementTo: true,
      status: true,
    },
  });
  if (overlap) {
    return NextResponse.json(
      {
        success: false,
        error: 'A reconciliation batch already covers part of this account and statement period',
        conflict: overlap,
      },
      { status: 409 },
    );
  }

  const batchNumber = await nextReconciliationBatchNumber(parsed.data.statementTo);
  const batch = await db.financeReconciliationBatch.create({
    data: {
      batchNumber,
      channel: parsed.data.channel,
      accountSystemKey: parsed.data.channel,
      accountLabel: parsed.data.accountLabel,
      accountReference: parsed.data.accountReference,
      currency,
      statementFrom: parsed.data.statementFrom,
      statementTo: parsed.data.statementTo,
      openingBalance: opening,
      closingBalance: closing,
      status: 'open',
      importedBy: actor.name || actor.email,
      notes: parsed.data.notes,
      lines: {
        create: preparedLines,
      },
    },
    include: {
      lines: {
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_reconciliation_batch_created',
    entity: 'FinanceReconciliationBatch',
    entityId: batch.id,
    details: {
      batchNumber,
      channel: batch.channel,
      currency,
      statementFrom: batch.statementFrom.toISOString(),
      statementTo: batch.statementTo.toISOString(),
      openingBalance: opening.toFixed(2),
      closingBalance: closing.toFixed(2),
      lineCount: batch.lines.length,
    },
  });

  return NextResponse.json({ success: true, data: serialize(batch) }, { status: 201 });
}
