import 'server-only';

import { db } from '@/lib/db';
import { getMailTransportStatus, sanitizeMailError, sendTransactionalMail } from '@/lib/mail';
import { hubtelConfiguration, normalizePhone, renderSmsTemplate } from '@/lib/hubtel';
import { queueSingleSms } from '@/lib/sms';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value: unknown, currency: string): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export async function notifyCustomerPaymentReceived(paymentId: string) {
  const payment = await db.clientPayment.findUnique({
    where: { id: paymentId },
    include: {
      organization: {
        select: {
          name: true,
          primaryContactName: true,
          primaryEmail: true,
          primaryPhone: true,
        },
      },
      allocations: {
        include: {
          invoice: { select: { invoiceNumber: true } },
        },
      },
    },
  });
  if (!payment) return { status: 'missing', channels: [] as string[] };

  const claimed = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-payment-notification:' + paymentId,
    );

    const current = await tx.clientPayment.findUnique({
      where: { id: paymentId },
      select: {
        customerNotificationStatus: true,
        customerNotificationAttemptedAt: true,
      },
    });
    if (!current) return false;
    if (['sent', 'partial', 'skipped'].includes(current.customerNotificationStatus)) {
      return false;
    }
    if (
      current.customerNotificationStatus === 'sending' &&
      current.customerNotificationAttemptedAt &&
      current.customerNotificationAttemptedAt.getTime() > Date.now() - 10 * 60 * 1000
    ) {
      return false;
    }

    await tx.clientPayment.update({
      where: { id: paymentId },
      data: {
        customerNotificationStatus: 'sending',
        customerNotificationAttemptedAt: new Date(),
        customerNotificationError: '',
      },
    });
    return true;
  });
  if (!claimed) {
    return {
      status: payment.customerNotificationStatus,
      channels: payment.customerNotificationChannels.split(',').filter(Boolean),
    };
  }

  const customerName = payment.organization.primaryContactName || payment.organization.name;
  const amount = money(payment.amount, payment.currency);
  const invoiceLabel = payment.allocations.length
    ? payment.allocations.map((item) => item.invoice.invoiceNumber).join(', ')
    : 'account credit';
  const portalUrl =
    (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
      .trim()
      .replace(/\/$/, '') + '/client#billing';

  const successes: string[] = [];
  const errors: string[] = [];

  const mail = getMailTransportStatus();
  const email = payment.organization.primaryEmail.trim().toLowerCase();
  if (mail.configured && email) {
    try {
      await sendTransactionalMail({
        to: email,
        subject: 'Payment received · ' + payment.paymentNumber,
        text:
          'Hello ' + customerName + ',\n\n' +
          'We received ' + amount + ' and recorded receipt ' + payment.paymentNumber + '.\n' +
          'Applied to: ' + invoiceLabel + '\n\n' +
          'You can review your account, invoices and receipt in the Lightworld Client Portal:\n' +
          portalUrl + '\n\nThank you,\nLightworld Technologies Ltd',
        html:
          '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
          '<div style="padding:32px;border:1px solid #e2e8f0;border-radius:24px">' +
          '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b7791f;font-weight:700;margin:0 0 18px">Lightworld Technologies</p>' +
          '<h1 style="font-size:24px;margin:0 0 18px">Payment received</h1>' +
          '<p>Hello ' + esc(customerName) + ',</p>' +
          '<p>We received <strong>' + esc(amount) + '</strong> and recorded receipt <strong>' + esc(payment.paymentNumber) + '</strong>.</p>' +
          '<p><strong>Applied to:</strong> ' + esc(invoiceLabel) + '</p>' +
          '<p><a href="' + esc(portalUrl) + '" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#b7791f;color:#fff;text-decoration:none;font-weight:700">Open client account</a></p>' +
          '<p>Thank you,<br><strong>Lightworld Technologies Ltd</strong></p>' +
          '</div></div>',
      });
      successes.push('email');
    } catch (error) {
      errors.push('Email: ' + sanitizeMailError(error));
    }
  }

  const smsConfig = hubtelConfiguration();
  if (smsConfig.sms && smsConfig.senderId && payment.organization.primaryPhone.trim()) {
    try {
      const template = await db.smsTemplate.findFirst({
        where: { key: 'payment_received', active: true },
      });
      if (template) {
        const recipient = normalizePhone(payment.organization.primaryPhone);
        const content = renderSmsTemplate(template.body, {
          name: customerName,
          amount,
          invoice: invoiceLabel,
          receipt: payment.paymentNumber,
        });
        await queueSingleSms({
          recipient,
          senderId: smsConfig.senderId,
          content,
          templateId: template.id,
          scheduledAt: new Date(Date.now() + 30_000),
          createdBy: 'System payment confirmation',
        });
        successes.push('sms');
      }
    } catch (error) {
      errors.push('SMS: ' + (error instanceof Error ? error.message.slice(0, 500) : 'Payment confirmation SMS failed'));
    }
  }

  const status =
    successes.length && !errors.length
      ? 'sent'
      : successes.length
        ? 'partial'
        : errors.length
          ? 'failed'
          : 'skipped';

  await db.clientPayment.update({
    where: { id: paymentId },
    data: {
      customerNotificationStatus: status,
      customerNotificationCompletedAt: new Date(),
      customerNotificationChannels: successes.join(','),
      customerNotificationError: errors.join(' | ').slice(0, 2000),
    },
  });

  return { status, channels: successes, errors };
}
