import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { toCsv } from '@/lib/csv';
import { invoiceStatusFromBalance } from '@/lib/finance';

export const runtime = 'nodejs';

function fileSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'client';
}

export async function GET(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await db.clientOrganization.findFirst({
    where: {
      id: context.user.organizationId,
      status: 'active',
    },
    select: {
      id: true,
      name: true,
      primaryContactName: true,
      primaryEmail: true,
      invoices: {
        where: { status: { notIn: ['draft', 'void'] } },
        orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          service: { select: { name: true, planName: true } },
          allocations: true,
        },
      },
      payments: {
        orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        include: { allocations: true },
      },
      creditNotes: {
        where: { status: 'posted' },
        orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          invoice: { select: { invoiceNumber: true } },
          refunds: true,
        },
      },
      refunds: {
        orderBy: [{ refundedAt: 'asc' }, { createdAt: 'asc' }],
        include: {
          creditNote: { select: { creditNoteNumber: true } },
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ success: false, error: 'Client account not found' }, { status: 404 });
  }

  type Entry = {
    date: Date;
    order: number;
    type: 'Invoice' | 'Payment' | 'Credit Note' | 'Refund';
    reference: string;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    currency: string;
    status: string;
  };

  const entries: Entry[] = [
    ...organization.invoices.map((invoice): Entry => ({
      date: invoice.issueDate,
      order: 0,
      type: 'Invoice',
      reference: invoice.invoiceNumber,
      description: invoice.service
        ? invoice.service.name + (invoice.service.planName ? ' · ' + invoice.service.planName : '')
        : 'General account invoice',
      debit: invoice.total,
      credit: new Prisma.Decimal(0),
      currency: invoice.currency,
      status: invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: invoice.allocations,
        credits: organization.creditNotes.filter((note) => note.invoiceId === invoice.id),
        dueDate: invoice.dueDate,
      }),
    })),
    ...organization.payments.map((payment): Entry => ({
      date: payment.paidAt,
      order: 1,
      type: 'Payment',
      reference: payment.paymentNumber,
      description:
        'Payment · ' +
        payment.method.replaceAll('_', ' ') +
        (payment.reference ? ' · Ref ' + payment.reference : ''),
      debit: new Prisma.Decimal(0),
      credit: payment.amount,
      currency: payment.currency,
      status: 'received',
    })),
    ...organization.creditNotes.map((note): Entry => ({
      date: note.issueDate,
      order: 2,
      type: 'Credit Note',
      reference: note.creditNoteNumber,
      description:
        'Credit against invoice ' +
        note.invoice.invoiceNumber +
        ' · ' +
        note.reason,
      debit: new Prisma.Decimal(0),
      credit: note.total,
      currency: note.currency,
      status: 'posted',
    })),
    ...organization.refunds.map((refund): Entry => ({
      date: refund.refundedAt,
      order: 3,
      type: 'Refund',
      reference: refund.refundNumber,
      description:
        'Refund of ' +
        refund.creditNote.creditNoteNumber +
        ' · ' +
        refund.method.replaceAll('_', ' ') +
        (refund.reference ? ' · Ref ' + refund.reference : ''),
      debit: refund.amount,
      credit: new Prisma.Decimal(0),
      currency: refund.currency,
      status: 'refunded',
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order || a.reference.localeCompare(b.reference));

  const running = new Map<string, Prisma.Decimal>();
  const transactionRows = entries.map((entry) => {
    const balance = (running.get(entry.currency) || new Prisma.Decimal(0))
      .plus(entry.debit)
      .minus(entry.credit);
    running.set(entry.currency, balance);

    return [
      entry.date.toISOString().slice(0, 10),
      entry.type,
      entry.reference,
      entry.description,
      entry.debit.eq(0) ? '' : entry.debit.toFixed(2),
      entry.credit.eq(0) ? '' : entry.credit.toFixed(2),
      entry.currency,
      balance.toFixed(2),
      entry.status,
    ];
  });

  const rows: unknown[][] = [
    ['Lightworld Technologies Ltd', 'Client Account Statement'],
    ['Customer', organization.name],
    ['Primary contact', organization.primaryContactName],
    ['Email', organization.primaryEmail],
    ['Period', 'Beginning', 'to', 'Current'],
    ['Generated', new Date().toISOString()],
    [],
    ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Currency', 'Running balance', 'Status'],
    ...transactionRows,
    [],
    ['Closing balances'],
    ...[...running.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, balance]) => [
      currency,
      balance.toFixed(2),
    ]),
  ];

  const filename =
    'lightworld-statement-' +
    fileSlug(organization.name) +
    '-' +
    new Date().toISOString().slice(0, 10) +
    '.csv';

  return new NextResponse(toCsv(rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
