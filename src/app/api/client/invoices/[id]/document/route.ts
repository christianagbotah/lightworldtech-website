import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { invoiceBalance, sumAmounts } from '@/lib/finance';

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
  const invoice = await db.clientInvoice.findFirst({
    where: {
      id,
      organizationId: context.user.organizationId,
      status: { notIn: ['draft', 'void'] },
    },
    include: {
      organization: {
        select: {
          name: true,
          primaryContactName: true,
          primaryEmail: true,
          primaryPhone: true,
        },
      },
      service: { select: { name: true, planName: true } },
      project: { select: { name: true } },
      lines: { orderBy: { order: 'asc' } },
      allocations: true,
      creditNotes: { where: { status: 'posted' } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
  }

  const paid = sumAmounts(invoice.allocations);
  const credits = invoice.creditNotes.reduce((sum, note) => sum + Number(note.appliedAmount), 0);
  const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
  const rows = invoice.lines.map((line) =>
    '<tr><td>' + esc(line.description) + '</td><td class="num">' + esc(line.quantity.toFixed(2)) +
    '</td><td class="num">' + esc(money(line.unitPrice, invoice.currency)) +
    '</td><td class="num">' + esc(money(line.amount, invoice.currency)) + '</td></tr>'
  ).join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(invoice.invoiceNumber)} · Lightworld Technologies</title>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;margin:0;background:#f8fafc}.page{max-width:900px;margin:32px auto;background:white;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(15,23,42,.08)}h1{margin:0;font-size:30px}.muted{color:#64748b}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:28px 0}.box{border:1px solid #e2e8f0;border-radius:14px;padding:14px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #e2e8f0;padding:12px;text-align:left}.num{text-align:right}.summary{margin-left:auto;margin-top:24px;max-width:360px}.summary div{display:flex;justify-content:space-between;padding:7px 0}.total{font-size:18px;font-weight:700;border-top:2px solid #0f172a;margin-top:6px;padding-top:12px!important}.actions{display:flex;justify-content:flex-end;margin-bottom:20px}.actions button{border:0;border-radius:10px;padding:10px 16px;background:#b7791f;color:#fff;font-weight:700;cursor:pointer}@media print{body{background:#fff}.page{box-shadow:none;margin:0;max-width:none;border-radius:0}.actions{display:none}}@media(max-width:640px){.page{margin:0;padding:22px;border-radius:0}.meta{grid-template-columns:1fr}table{font-size:12px}}
</style></head><body><main class="page"><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
<p style="font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#b7791f;font-weight:700">Lightworld Technologies Ltd</p>
<h1>Invoice ${esc(invoice.invoiceNumber)}</h1>
<p class="muted">${esc(invoice.service?.name || invoice.project?.name || 'Customer account')}</p>
<div class="meta">
<div class="box"><strong>Bill to</strong><p>${esc(invoice.organization.name)}</p><p class="muted">${esc(invoice.organization.primaryContactName)}<br>${esc(invoice.organization.primaryEmail)}<br>${esc(invoice.organization.primaryPhone)}</p></div>
<div class="box"><strong>Invoice details</strong><p>Issued: ${esc(formatDate(invoice.issueDate))}<br>Due: ${esc(formatDate(invoice.dueDate))}<br>Status: ${esc(invoice.status.replaceAll('_',' '))}</p></div>
</div>
<table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="summary">
<div><span>Subtotal</span><strong>${esc(money(invoice.subtotal, invoice.currency))}</strong></div>
<div><span>Discount</span><strong>${esc(money(invoice.discount, invoice.currency))}</strong></div>
<div><span>Tax</span><strong>${esc(money(invoice.tax, invoice.currency))}</strong></div>
<div><span>Total</span><strong>${esc(money(invoice.total, invoice.currency))}</strong></div>
<div><span>Paid</span><strong>${esc(money(paid, invoice.currency))}</strong></div>
<div><span>Credits</span><strong>${esc(money(credits, invoice.currency))}</strong></div>
<div class="total"><span>Balance</span><strong>${esc(money(balance, invoice.currency))}</strong></div>
</div>
${invoice.notes ? '<div class="box" style="margin-top:28px"><strong>Notes</strong><p class="muted">' + esc(invoice.notes) + '</p></div>' : ''}
<p class="muted" style="margin-top:34px;font-size:12px">Secure client document · generated from your authenticated Lightworld Client Portal account.</p>
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
