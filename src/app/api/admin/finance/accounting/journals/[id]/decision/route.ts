import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { isBalancedJournal } from '@/lib/finance';

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(2000).default(''),
}).superRefine((value, ctx) => {
  if (value.action === 'reject' && value.notes.trim().length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'A rejection reason of at least 3 characters is required',
    });
  }
});

function serialize(entry: any) {
  const totalDebit = entry.lines.reduce(
    (sum: Prisma.Decimal, line: any) => sum.plus(line.debit),
    new Prisma.Decimal(0),
  );
  const totalCredit = entry.lines.reduce(
    (sum: Prisma.Decimal, line: any) => sum.plus(line.credit),
    new Prisma.Decimal(0),
  );
  return {
    ...entry,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    lines: entry.lines.map((line: any) => ({
      ...line,
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
    })),
  };
}

export async function PATCH(
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
      { success: false, error: 'Finance approval permission is required' },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid journal approval decision', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-journal-approval:' + id,
    );

    const journal = await tx.financeJournalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { createdAt: 'asc' },
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                active: true,
                allowPosting: true,
              },
            },
          },
        },
      },
    });

    if (!journal) return { entry: null, error: 'Journal draft not found', status: 404 };
    if (journal.status !== 'draft') {
      return { entry: null, error: 'Only draft journals can be approved or rejected', status: 409 };
    }
    if (!['manual', 'reversal'].includes(journal.sourceType)) {
      return { entry: null, error: 'Only manual and reversal journal drafts use this approval workflow', status: 409 };
    }
    if (journal.createdByAdminId && journal.createdByAdminId === actor.id) {
      return {
        entry: null,
        error: 'Maker-checker prevents the journal preparer from deciding their own draft',
        status: 409,
      };
    }

    if (parsed.data.action === 'reject') {
      const rejected = await tx.financeJournalEntry.update({
        where: { id: journal.id },
        data: {
          status: 'rejected',
          rejectedByAdminId: actor.id,
          rejectedBy: actor.name || actor.email,
          rejectedAt: new Date(),
          rejectionReason: parsed.data.notes,
        },
        include: {
          lines: {
            orderBy: { createdAt: 'asc' },
            include: { account: { select: { id: true, code: true, name: true, type: true } } },
          },
        },
      });
      return { entry: rejected, error: '', status: 200 };
    }

    if (journal.lines.length < 2 || !isBalancedJournal(journal.lines)) {
      return { entry: null, error: 'Journal draft is no longer balanced', status: 409 };
    }

    const period = await tx.financeAccountingPeriod.findFirst({
      where: {
        startDate: { lte: journal.entryDate },
        endDate: { gte: journal.entryDate },
      },
      orderBy: { startDate: 'desc' },
    });
    if (!period) {
      return { entry: null, error: 'No accounting period covers this journal date', status: 409 };
    }
    if (period.status !== 'open') {
      return { entry: null, error: 'The accounting period for this journal date is closed', status: 409 };
    }

    const monthLock = await tx.financeMonthClose.findFirst({
      where: {
        status: 'closed',
        monthStart: { lte: journal.entryDate },
        monthEnd: { gte: journal.entryDate },
      },
      select: { id: true },
    });
    if (monthLock) {
      return { entry: null, error: 'The month for this journal date is closed', status: 409 };
    }

    const blockedAccount = journal.lines.find((line) => !line.account.active || !line.account.allowPosting);
    if (blockedAccount) {
      return {
        entry: null,
        error: 'Posting is disabled for account ' + blockedAccount.account.code + ' · ' + blockedAccount.account.name,
        status: 409,
      };
    }

    if (journal.sourceType === 'reversal') {
      const original = await tx.financeJournalEntry.findUnique({
        where: { id: journal.sourceId },
        select: { id: true, journalNumber: true, status: true, entryDate: true },
      });
      if (!original) {
        return { entry: null, error: 'Original journal for this reversal no longer exists', status: 409 };
      }
      if (original.status !== 'posted') {
        return { entry: null, error: 'Only a currently posted journal can be reversed', status: 409 };
      }
      if (journal.entryDate.getTime() < original.entryDate.getTime()) {
        return { entry: null, error: 'Reversal date cannot be earlier than the original journal date', status: 409 };
      }

      const otherReversal = await tx.financeJournalEntry.findFirst({
        where: {
          sourceType: 'reversal',
          sourceId: original.id,
          id: { not: journal.id },
          status: { in: ['draft', 'posted'] },
        },
        select: { id: true, journalNumber: true, status: true },
      });
      if (otherReversal) {
        return {
          entry: null,
          error: 'Another pending or posted reversal already exists for ' + original.journalNumber,
          status: 409,
        };
      }

      await tx.financeJournalEntry.update({
        where: { id: original.id },
        data: { status: 'reversed' },
      });
    }

    const approvedAt = new Date();
    const posted = await tx.financeJournalEntry.update({
      where: { id: journal.id },
      data: {
        status: 'posted',
        approvedByAdminId: actor.id,
        approvedBy: actor.name || actor.email,
        approvedAt,
        postedAt: approvedAt,
        postedBy: actor.name || actor.email,
      },
      include: {
        lines: {
          orderBy: { createdAt: 'asc' },
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });

    return { entry: posted, error: '', status: 200 };
  });

  if (!result.entry) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  await recordAdminAudit({
    admin: actor,
    action: parsed.data.action === 'approve'
      ? 'admin.finance_journal_approved'
      : 'admin.finance_journal_rejected',
    entity: 'FinanceJournalEntry',
    entityId: result.entry.id,
    details: {
      journalNumber: result.entry.journalNumber,
      sourceType: result.entry.sourceType,
      makerAdminId: result.entry.createdByAdminId,
      checkerAdminId: actor.id,
      entryDate: result.entry.entryDate.toISOString(),
      currency: result.entry.currency,
      decisionNotes: parsed.data.notes,
    },
  });

  return NextResponse.json({ success: true, data: serialize(result.entry) });
}
