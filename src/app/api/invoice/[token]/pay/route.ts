import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoiceBalance } from '@/lib/finance';
import { hubtelConfiguration, initiateHubtelCheckout } from '@/lib/hubtel';
import { hashInvoiceAccessToken } from '@/lib/invoice-access-link';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const rate = consumePublicRateLimit(request, 'invoice-payment', 10, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many payment attempts' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  if (!hubtelConfiguration().payments) {
    return NextResponse.json({ success: false, error: 'Online payment is not configured yet' }, { status: 503 });
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
          allocations: true,
          creditNotes: { where: { status: 'posted' } },
          organization: {
            select: {
              name: true,
              primaryContactName: true,
              primaryEmail: true,
              primaryPhone: true,
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
  if (invoice.currency !== 'GHS') {
    return NextResponse.json({ success: false, error: 'Hubtel checkout is currently enabled for GHS invoices only' }, { status: 409 });
  }

  const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
  if (balance.lte(0)) {
    return NextResponse.json({ success: false, error: 'This invoice has no outstanding balance' }, { status: 409 });
  }

  const clientReference = 'LW-' + Date.now().toString(36).toUpperCase() + '-' + randomUUID().slice(0, 8).toUpperCase();
  const origin = siteOrigin();

  const intent = await db.hubtelPaymentIntent.create({
    data: {
      clientReference,
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      currency: invoice.currency,
      amount: balance,
      payerName: invoice.organization.primaryContactName || invoice.organization.name,
      payerEmail: invoice.organization.primaryEmail,
      payerPhone: invoice.organization.primaryPhone,
      status: 'initiating',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  try {
    const invoiceUrl = origin + '/invoice/' + encodeURIComponent(token);
    const checkout = await initiateHubtelCheckout({
      totalAmount: Number(balance.toFixed(2)),
      description: 'Lightworld invoice ' + invoice.invoiceNumber,
      clientReference,
      callbackUrl: origin + '/api/payments/hubtel/callback',
      returnUrl: invoiceUrl + '?payment=success&reference=' + encodeURIComponent(clientReference),
      cancellationUrl: invoiceUrl + '?payment=cancelled&reference=' + encodeURIComponent(clientReference),
      payerName: intent.payerName,
      payerEmail: intent.payerEmail,
      payerPhone: intent.payerPhone,
    });

    const updated = await db.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'pending',
        checkoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
        checkoutDirectUrl: checkout.checkoutDirectUrl,
        providerResponse: JSON.stringify(checkout.raw),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        reference: updated.clientReference,
        checkoutUrl: updated.checkoutUrl || updated.checkoutDirectUrl,
        amount: updated.amount.toFixed(2),
        currency: updated.currency,
      },
    }, { status: 201 });
  } catch (error) {
    await db.hubtelPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'initiation_failed',
        providerResponse: JSON.stringify({
          error: error instanceof Error ? error.message : 'Hubtel checkout failed',
        }),
      },
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to start Hubtel checkout' },
      { status: 502 },
    );
  }
}
