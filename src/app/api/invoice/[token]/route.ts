import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoiceBalance, invoiceStatusFromBalance, sumAmounts } from '@/lib/finance';
import { hubtelConfiguration } from '@/lib/hubtel';
import { hashInvoiceAccessToken } from '@/lib/invoice-access-link';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const rate = consumePublicRateLimit(request, 'invoice-document', 120, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const { token } = await params;
  if (!token || token.length < 30 || token.length > 200) {
    return NextResponse.json({ success: false, error: 'Invoice link is invalid or has expired' }, { status: 404 });
  }

  const now = new Date();
  const link = await db.invoiceAccessLink.findUnique({
    where: { tokenHash: hashInvoiceAccessToken(token) },
    include: {
      invoice: {
        include: {
          organization: {
            select: {
              name: true,
              primaryContactName: true,
              primaryEmail: true,
            },
          },
          service: { select: { name: true, planName: true } },
          project: { select: { name: true } },
          lines: { orderBy: { order: 'asc' } },
          allocations: {
            orderBy: { createdAt: 'asc' },
            include: {
              payment: {
                select: {
                  paymentNumber: true,
                  paidAt: true,
                  method: true,
                  reference: true,
                },
              },
            },
          },
          creditNotes: {
            where: { status: 'posted' },
            orderBy: { issueDate: 'asc' },
            select: {
              creditNoteNumber: true,
              issueDate: true,
              appliedAmount: true,
              total: true,
              reason: true,
            },
          },
        },
      },
    },
  });

  if (
    !link ||
    link.status !== 'active' ||
    link.revokedAt ||
    link.expiresAt <= now ||
    ['draft', 'void'].includes(link.invoice.status)
  ) {
    return NextResponse.json({ success: false, error: 'Invoice link is invalid or has expired' }, { status: 404 });
  }

  const invoice = link.invoice;
  const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
  const amountPaid = sumAmounts(invoice.allocations);
  const derivedStatus = invoiceStatusFromBalance({
    storedStatus: invoice.status,
    total: invoice.total,
    allocations: invoice.allocations,
    credits: invoice.creditNotes,
    dueDate: invoice.dueDate,
    now,
  });
  const hubtel = hubtelConfiguration();

  await db.invoiceAccessLink.update({
    where: { id: link.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: now,
      ...(link.firstViewedAt ? {} : { firstViewedAt: now }),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      invoiceNumber: invoice.invoiceNumber,
      status: derivedStatus,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      customer: invoice.organization.name,
      contactName: invoice.organization.primaryContactName,
      service: invoice.service?.name || '',
      planName: invoice.service?.planName || '',
      project: invoice.project?.name || '',
      subtotal: invoice.subtotal.toFixed(2),
      discount: invoice.discount.toFixed(2),
      taxTreatment: invoice.taxTreatment,
      taxableAmount: invoice.taxableAmount.toFixed(2),
      vatRate: invoice.vatRate.toFixed(2),
      vatAmount: invoice.vatAmount.toFixed(2),
      nhilRate: invoice.nhilRate.toFixed(2),
      nhilAmount: invoice.nhilAmount.toFixed(2),
      getfundRate: invoice.getfundRate.toFixed(2),
      getfundAmount: invoice.getfundAmount.toFixed(2),
      tax: invoice.tax.toFixed(2),
      total: invoice.total.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      creditedAmount: invoice.creditNotes.reduce((sum, note) => sum.plus(note.appliedAmount), new Prisma.Decimal(0)).toFixed(2),
      balance: balance.toFixed(2),
      notes: invoice.notes,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity.toFixed(2),
        unitPrice: line.unitPrice.toFixed(2),
        amount: line.amount.toFixed(2),
      })),
      payments: invoice.allocations.map((allocation) => ({
        paymentNumber: allocation.payment.paymentNumber,
        paidAt: allocation.payment.paidAt,
        method: allocation.payment.method,
        reference: allocation.payment.reference,
        amount: allocation.amount.toFixed(2),
      })),
      credits: invoice.creditNotes.map((note) => ({
        creditNoteNumber: note.creditNoteNumber,
        issueDate: note.issueDate,
        reason: note.reason,
        total: note.total.toFixed(2),
        appliedAmount: note.appliedAmount.toFixed(2),
      })),
      secureLinkExpiresAt: link.expiresAt,
      paymentConfigured: hubtel.payments && invoice.currency === 'GHS' && balance.gt(0),
      paymentProvider: hubtel.payments ? 'Hubtel' : '',
      portalUrl: 'https://lightworldtech.com/client#account',
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
