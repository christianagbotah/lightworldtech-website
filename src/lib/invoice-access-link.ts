import { createHash, randomBytes } from 'node:crypto';
import type { MailMessage } from '@/lib/mail';

export const INVOICE_ACCESS_DEFAULT_DAYS = 30;
export const INVOICE_ACCESS_MAX_DAYS = 90;

export function hashInvoiceAccessToken(token: string): string {
  return createHash('sha256')
    .update('lightworld-invoice-access:' + token)
    .digest('hex');
}

export function createInvoiceAccessToken(days = INVOICE_ACCESS_DEFAULT_DAYS): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const boundedDays = Math.max(1, Math.min(INVOICE_ACCESS_MAX_DAYS, Math.floor(days || INVOICE_ACCESS_DEFAULT_DAYS)));
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashInvoiceAccessToken(token),
    expiresAt: new Date(Date.now() + boundedDays * 24 * 60 * 60 * 1000),
  };
}

function productionOrigin(): string {
  return 'https://lightworldtech.com';
}

function safeOrigin(candidate: string | undefined): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(candidate.trim());
    const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase()) ||
      url.hostname.toLowerCase().endsWith('.localhost');
    if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || local)) return null;
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function invoiceAccessUrl(token: string, requestOrigin?: string): string {
  const configured =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  const origin =
    safeOrigin(configured) ||
    (process.env.NODE_ENV === 'production' ? productionOrigin() : safeOrigin(requestOrigin)) ||
    (process.env.NODE_ENV === 'production' ? productionOrigin() : 'http://localhost:3000');
  return new URL('/invoice/' + encodeURIComponent(token), origin).toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value: string | number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return currency + ' ' + Number(value || 0).toFixed(2);
  }
}

export function invoiceDeliveryMail(input: {
  to: string;
  customer: string;
  contactName?: string;
  invoiceNumber: string;
  currency: string;
  total: string;
  balance: string;
  dueDate: Date;
  url: string;
}): MailMessage {
  const greeting = input.contactName?.trim() || input.customer;
  const due = input.dueDate.toLocaleDateString('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const total = money(input.total, input.currency);
  const balance = money(input.balance, input.currency);
  const paid = Number(input.balance) <= 0;

  return {
    to: input.to,
    subject: 'Lightworld invoice ' + input.invoiceNumber,
    text:
      'Dear ' + greeting + ',\n\n' +
      'Please find your Lightworld Technologies invoice ' + input.invoiceNumber + '.\n\n' +
      'Invoice total: ' + total + '\n' +
      'Balance due: ' + balance + '\n' +
      'Due date: ' + due + '\n\n' +
      'View, print or save the invoice securely:\n' + input.url + '\n\n' +
      (paid
        ? 'Our records show that this invoice currently has no outstanding balance.\n\n'
        : 'If payment has already been made, please disregard the balance reminder or reply with your payment reference.\n\n') +
      'Lightworld Technologies Ltd\n' +
      'mail@lightworldtech.com\n' +
      '+233 (024) 361 8186',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827;line-height:1.65">' +
      '<div style="border:1px solid #e5e7eb;border-radius:22px;overflow:hidden">' +
      '<div style="background:#111827;color:#fff;padding:26px 30px">' +
      '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#f6c453;font-weight:700">Lightworld Technologies Ltd</div>' +
      '<h1 style="margin:8px 0 0;font-size:26px">Invoice ' + escapeHtml(input.invoiceNumber) + '</h1>' +
      '</div>' +
      '<div style="padding:28px 30px">' +
      '<p>Dear ' + escapeHtml(greeting) + ',</p>' +
      '<p>Please find your invoice from Lightworld Technologies Ltd.</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:22px 0">' +
      '<tr><td style="padding:10px 0;color:#6b7280">Invoice total</td><td style="padding:10px 0;text-align:right;font-weight:700">' + escapeHtml(total) + '</td></tr>' +
      '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #eee">Balance due</td><td style="padding:10px 0;text-align:right;font-weight:700;border-top:1px solid #eee">' + escapeHtml(balance) + '</td></tr>' +
      '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #eee">Due date</td><td style="padding:10px 0;text-align:right;border-top:1px solid #eee">' + escapeHtml(due) + '</td></tr>' +
      '</table>' +
      '<p style="margin:26px 0"><a href="' + escapeHtml(input.url) + '" style="display:inline-block;background:#d4a62a;color:#111827;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">Open secure invoice</a></p>' +
      '<p style="font-size:13px;color:#6b7280">The secure invoice link expires automatically. You can view the current balance and payment status, then print or save the invoice as PDF.</p>' +
      '<hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0">' +
      '<p style="font-size:13px;color:#6b7280">Lightworld Technologies Ltd · Ghana<br>mail@lightworldtech.com · +233 (024) 361 8186</p>' +
      '</div></div></div>',
  };
}
