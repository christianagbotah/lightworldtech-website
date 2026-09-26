import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { paymentUnallocated, sumAmounts } from '@/lib/finance';

function esc(value: unknown): string {
  return String(value ?? '')
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Accra',
  }).format(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const payment = await db.clientPayment.findFirst({
    where: { id, organizationId: context.user.organizationId },
    include: {
      organization: { select: { name: true, primaryContactName: true, primaryEmail: true } },
      allocations: {
        include: {
          invoice: { select: { invoiceNumber: true } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
  }

  const allocated = sumAmounts(payment.allocations);
  const unapplied = paymentUnallocated(payment.amount, payment.allocations);
  const rows = payment.allocations.map((allocation) =>
    '<tr><td>' + esc(allocation.invoice.invoiceNumber) + '</td><td class="num">' +
    esc(money(allocation.amount, payment.currency)) + '</td></tr>'
  ).join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(payment.paymentNumber)} · Lightworld Technologies</title>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;margin:0;background:#f8fafc}.page{max-width:760px;margin:32px auto;background:white;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(15,23,42,.08)}h1{margin:0;font-size:30px}.muted{color:#64748b}.box{border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:22px}.row{display:flex;justify-content:space-between;gap:20px;padding:7px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #e2e8f0;padding:12px;text-align:left}.num{text-align:right}.actions{display:flex;justify-content:flex-end;margin-bottom:20px}.actions button{border:0;border-radius:10px;padding:10px 16px;background:#b7791f;color:#fff;font-weight:700;cursor:pointer}@media print{body{background:#fff}.page{box-shadow:none;margin:0;max-width:none;border-radius:0}.actions{display:none}}@media(max-width:640px){.page{margin:0;padding:22px;border-radius:0}}
</style></head><body><main class="page"><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
<p style="font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#b7791f;font-weight:700">Lightworld Technologies Ltd</p>
<h1>Payment receipt</h1><p class="muted">${esc(payment.paymentNumber)}</p>
<div class="box"><strong>Received from</strong><p>${esc(payment.organization.name)}</p><p class="muted">${esc(payment.organization.primaryContactName)} · ${esc(payment.organization.primaryEmail)}</p></div>
<div class="box">
<div class="row"><span>Date received</span><strong>${esc(formatDate(payment.paidAt))}</strong></div>
<div class="row"><span>Method</span><strong>${esc(payment.method.replaceAll('_',' '))}</strong></div>
<div class="row"><span>Reference</span><strong>${esc(payment.reference || '—')}</strong></div>
<div class="row"><span>Total received</span><strong>${esc(money(payment.amount, payment.currency))}</strong></div>
<div class="row"><span>Allocated</span><strong>${esc(money(allocated, payment.currency))}</strong></div>
<div class="row"><span>Unapplied credit</span><strong>${esc(money(unapplied, payment.currency))}</strong></div>
</div>
${payment.allocations.length ? '<h2 style="font-size:16px;margin-top:28px">Applied to invoices</h2><table><thead><tr><th>Invoice</th><th class="num">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="muted" style="margin-top:24px">This receipt is currently unapplied customer credit.</p>'}
<p class="muted" style="margin-top:34px;font-size:12px">Secure client receipt · generated from your authenticated Lightworld Client Portal account.</p>
</main></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
