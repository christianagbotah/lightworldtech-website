import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { hubtelConfiguration, initiateHubtelCheckout } from '@/lib/hubtel';
import { invoiceBalance } from '@/lib/finance';

const schema = z.object({
  invoiceId: z.string().min(1),
  payerPhone: z.string().trim().min(8).max(30).optional().default(''),
});

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!hubtelConfiguration().payments) {
    return NextResponse.json({ success: false, error: 'Online payment is not configured yet' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid payment request' }, { status: 400 });

  const invoice = await db.clientInvoice.findFirst({
    where: {
      id: parsed.data.invoiceId,
      organizationId: context.user.organizationId,
      status: { notIn: ['draft', 'void', 'paid'] },
    },
    include: {
      allocations: true,
      organization: {
        select: {
          name: true,
          primaryContactName: true,
          primaryEmail: true,
          primaryPhone: true,
        },
      },
    },
  });
  if (!invoice) return NextResponse.json({ success: false, error: 'Payable invoice not found' }, { status: 404 });
  if (invoice.currency !== 'GHS') {
    return NextResponse.json({ success: false, error: 'Hubtel checkout is currently enabled for GHS invoices only' }, { status: 409 });
  }

  const balance = invoiceBalance(invoice.total, invoice.allocations);
  if (balance.lte(0)) return NextResponse.json({ success: false, error: 'This invoice has no outstanding balance' }, { status: 409 });

  const clientReference = 'LW-' + Date.now().toString(36).toUpperCase() + '-' + randomUUID().slice(0, 8).toUpperCase();
  const origin = siteOrigin();

  const intent = await db.hubtelPaymentIntent.create({
    data: {
      clientReference,
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      currency: invoice.currency,
      amount: balance,
      payerName: context.user.name || invoice.organization.primaryContactName || invoice.organization.name,
      payerEmail: context.user.email || invoice.organization.primaryEmail,
      payerPhone: parsed.data.payerPhone || invoice.organization.primaryPhone,
      status: 'initiating',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  try {
    const checkout = await initiateHubtelCheckout({
      totalAmount: Number(balance.toFixed(2)),
      description: 'Lightworld invoice ' + invoice.invoiceNumber,
      clientReference,
      callbackUrl: origin + '/api/payments/hubtel/callback',
      returnUrl: origin + '/client?payment=success&reference=' + encodeURIComponent(clientReference),
      cancellationUrl: origin + '/client?payment=cancelled&reference=' + encodeURIComponent(clientReference),
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
        providerResponse: JSON.stringify({ error: error instanceof Error ? error.message : 'Hubtel checkout failed' }),
      },
    });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to start Hubtel checkout' }, { status: 502 });
  }
}
