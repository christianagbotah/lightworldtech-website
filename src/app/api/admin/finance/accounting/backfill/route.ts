import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  getActiveAdminContext,
  getSuperAdminContext,
  recordAdminAudit,
} from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  postCustomerPaymentJournal,
  postExpenseJournal,
  postInvoiceJournal,
  postVendorBillJournal,
  postVendorPaymentJournal,
} from '@/lib/finance-ledger';

const requestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(250),
}).default({ limit: 250 });

type Candidate =
  | { kind: 'invoice'; id: string; date: Date; record: any }
  | { kind: 'client_payment'; id: string; date: Date; record: any }
  | { kind: 'vendor_bill'; id: string; date: Date; record: any }
  | { kind: 'vendor_payment'; id: string; date: Date; record: any }
  | { kind: 'expense'; id: string; date: Date; record: any };

function key(type: string, id: string): string {
  return type + ':' + id;
}

function sameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

async function inventory() {
  const [invoices, clientPayments, vendorBills, vendorPayments, expenses, journals, periods] = await Promise.all([
    db.clientInvoice.findMany({
      where: { status: { notIn: ['draft', 'void'] } },
      orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    db.clientPayment.findMany({
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      include: { allocations: true },
    }),
    db.financeVendorBill.findMany({
      where: { status: { not: 'void' } },
      orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    db.financeVendorPayment.findMany({
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      include: { allocations: true },
    }),
    db.financeExpense.findMany({
      orderBy: [{ incurredAt: 'asc' }, { createdAt: 'asc' }],
    }),
    db.financeJournalEntry.findMany({
      where: {
        sourceId: { not: '' },
        sourceType: {
          in: [
            'client_invoice',
            'client_payment',
            'vendor_bill',
            'vendor_payment',
            'finance_expense',
            'finance_expense_payment',
          ],
        },
      },
      select: { sourceType: true, sourceId: true },
    }),
    db.financeAccountingPeriod.findMany({
      orderBy: { startDate: 'asc' },
    }),
  ]);

  const posted = new Set(journals.map((journal) => key(journal.sourceType, journal.sourceId)));
  const candidates: Candidate[] = [];

  for (const record of invoices) {
    if (!posted.has(key('client_invoice', record.id))) {
      candidates.push({ kind: 'invoice', id: record.id, date: record.issueDate, record });
    }
  }

  for (const record of clientPayments) {
    if (!posted.has(key('client_payment', record.id))) {
      candidates.push({ kind: 'client_payment', id: record.id, date: record.paidAt, record });
    }
  }

  for (const record of vendorBills) {
    if (!posted.has(key('vendor_bill', record.id))) {
      candidates.push({ kind: 'vendor_bill', id: record.id, date: record.issueDate, record });
    }
  }

  for (const record of vendorPayments) {
    if (!posted.has(key('vendor_payment', record.id))) {
      candidates.push({ kind: 'vendor_payment', id: record.id, date: record.paidAt, record });
    }
  }

  for (const record of expenses) {
    const recognitionMissing = !posted.has(key('finance_expense', record.id));
    const settlementNeeded =
      Boolean(record.paidAt) &&
      !sameUtcDay(record.incurredAt, record.paidAt!) &&
      !posted.has(key('finance_expense_payment', record.id));

    if (recognitionMissing || settlementNeeded) {
      candidates.push({ kind: 'expense', id: record.id, date: record.incurredAt, record });
    }
  }

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime() || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

  const hasOpenPeriod = (value: Date) => {
    const period = periods.find((item) =>
      item.startDate.getTime() <= value.getTime() &&
      item.endDate.getTime() >= value.getTime(),
    );
    return Boolean(period && period.status === 'open');
  };

  const blocked = candidates.filter((candidate) => {
    if (!hasOpenPeriod(candidate.date)) return true;

    if (
      candidate.kind === 'expense' &&
      candidate.record.paidAt &&
      !sameUtcDay(candidate.record.incurredAt, candidate.record.paidAt)
    ) {
      return !hasOpenPeriod(candidate.record.paidAt);
    }

    return false;
  });

  const blockedKeys = new Set(blocked.map((candidate) => key(candidate.kind, candidate.id)));
  const ready = candidates.filter((candidate) => !blockedKeys.has(key(candidate.kind, candidate.id)));

  const counts = candidates.reduce<Record<string, number>>((result, candidate) => {
    result[candidate.kind] = (result[candidate.kind] || 0) + 1;
    return result;
  }, {});

  return {
    candidates,
    ready,
    blocked,
    counts,
    periods,
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const state = await inventory();
  return NextResponse.json({
    success: true,
    data: {
      pending: state.candidates.length,
      ready: state.ready.length,
      blocked: state.blocked.length,
      byType: state.counts,
      blockedRecords: state.blocked.slice(0, 50).map((candidate) => ({
        kind: candidate.kind,
        id: candidate.id,
        date: candidate.date,
      })),
      periods: state.periods.map((period) => ({
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
      })),
      canBackfill: actor.role === 'super_admin',
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) {
    return NextResponse.json(
      { success: false, error: 'Only a super admin can initialize historical ledger journals' },
      { status: 403 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid backfill request' }, { status: 400 });
  }

  const state = await inventory();
  const work = state.ready.slice(0, parsed.data.limit);
  const posted: Array<{ kind: string; id: string }> = [];
  const failed: Array<{ kind: string; id: string; error: string }> = [];

  for (const candidate of work) {
    try {
      await db.$transaction(async (tx) => {
        if (candidate.kind === 'invoice') {
          const record = candidate.record;
          await postInvoiceJournal(tx, {
            invoiceId: record.id,
            invoiceNumber: record.invoiceNumber,
            issueDate: record.issueDate,
            currency: record.currency,
            subtotal: record.subtotal,
            discount: record.discount,
            tax: record.tax,
            vatAmount: record.vatAmount,
            nhilAmount: record.nhilAmount,
            getfundAmount: record.getfundAmount,
            total: record.total,
            postedBy: actor.name || actor.email,
          });
          return;
        }

        if (candidate.kind === 'client_payment') {
          const record = candidate.record;
          const allocatedAmount = record.allocations.reduce(
            (sum: Prisma.Decimal, item: any) => sum.plus(item.amount),
            new Prisma.Decimal(0),
          );
          await postCustomerPaymentJournal(tx, {
            paymentId: record.id,
            paymentNumber: record.paymentNumber,
            paidAt: record.paidAt,
            currency: record.currency,
            amount: record.amount,
            allocatedAmount,
            method: record.method,
            postedBy: actor.name || actor.email,
          });
          return;
        }

        if (candidate.kind === 'vendor_bill') {
          const record = candidate.record;
          await postVendorBillJournal(tx, {
            billId: record.id,
            payableNumber: record.payableNumber,
            issueDate: record.issueDate,
            currency: record.currency,
            total: record.total,
            taxableAmount: record.taxableAmount,
            vatAmount: record.vatAmount,
            nhilAmount: record.nhilAmount,
            getfundAmount: record.getfundAmount,
            category: record.category,
            postedBy: actor.name || actor.email,
          });
          return;
        }

        if (candidate.kind === 'vendor_payment') {
          const record = candidate.record;
          const allocatedAmount = record.allocations.reduce(
            (sum: Prisma.Decimal, item: any) => sum.plus(item.amount),
            new Prisma.Decimal(0),
          );
          await postVendorPaymentJournal(tx, {
            paymentId: record.id,
            paymentNumber: record.paymentNumber,
            paidAt: record.paidAt,
            currency: record.currency,
            amount: record.amount,
            allocatedAmount,
            method: record.method,
            postedBy: actor.name || actor.email,
          });
          return;
        }

        const record = candidate.record;
        await postExpenseJournal(tx, {
          expenseId: record.id,
          expenseNumber: record.expenseNumber,
          incurredAt: record.incurredAt,
          paidAt: record.paidAt,
          currency: record.currency,
          amount: record.amount,
          category: record.category,
          method: record.method,
          postedBy: actor.name || actor.email,
        });
      });
      posted.push({ kind: candidate.kind, id: candidate.id });
    } catch (error) {
      failed.push({
        kind: candidate.kind,
        id: candidate.id,
        error: error instanceof Error ? error.message : 'Unknown ledger backfill error',
      });
    }
  }

  const after = await inventory();

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_ledger_backfill',
    entity: 'FinanceJournalEntry',
    details: {
      requestedLimit: parsed.data.limit,
      attempted: work.length,
      posted: posted.length,
      failed: failed.length,
      remaining: after.candidates.length,
      blocked: after.blocked.length,
    },
  });

  return NextResponse.json({
    success: failed.length === 0,
    data: {
      attempted: work.length,
      posted: posted.length,
      failed,
      remaining: after.candidates.length,
      readyRemaining: after.ready.length,
      blockedRemaining: after.blocked.length,
    },
  }, { status: failed.length ? 207 : 200 });
}
