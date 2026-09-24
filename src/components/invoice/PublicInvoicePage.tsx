'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  Printer,
  ReceiptText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type InvoiceData = {
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  customer: string;
  contactName: string;
  service: string;
  planName: string;
  project: string;
  subtotal: string;
  discount: string;
  taxTreatment: string;
  taxableAmount: string;
  vatRate: string;
  vatAmount: string;
  nhilRate: string;
  nhilAmount: string;
  getfundRate: string;
  getfundAmount: string;
  tax: string;
  total: string;
  amountPaid: string;
  creditedAmount: string;
  balance: string;
  notes: string;
  lines: Array<{ description: string; quantity: string; unitPrice: string; amount: string }>;
  payments: Array<{ paymentNumber: string; paidAt: string; method: string; reference: string; amount: string }>;
  credits: Array<{ creditNoteNumber: string; issueDate: string; reason: string; total: string; appliedAmount: string }>;
  secureLinkExpiresAt: string;
  paymentConfigured: boolean;
  paymentProvider: string;
  portalUrl: string;
};

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

function date(value: string): string {
  return new Date(value).toLocaleDateString('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PublicInvoicePage({ token }: { token: string }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/invoice/' + encodeURIComponent(token), { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load invoice');
      setData(payload.data);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Token identifies the invoice document.
  }, [token]);

  const payOnline = async () => {
    setPaying(true);
    setError('');
    try {
      const response = await fetch('/api/invoice/' + encodeURIComponent(token) + '/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to start secure payment');
      if (!payload?.data?.checkoutUrl) throw new Error('Payment provider did not return a checkout link');
      window.location.assign(payload.data.checkoutUrl);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Unable to start secure payment');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f5ef] px-4 py-12 text-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-3xl bg-white p-16 shadow-sm">
          <Loader2 className="mr-3 size-5 animate-spin text-amber-700" />
          <span className="text-sm">Loading secure invoice…</span>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f5ef] px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto size-10 text-rose-700" />
          <h1 className="mt-4 text-2xl font-bold">Invoice link unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error || 'This secure invoice link is invalid or has expired.'}</p>
          <a href="mailto:mail@lightworldtech.com" className="mt-5 inline-block text-sm font-semibold text-amber-700 hover:underline">
            Contact Lightworld Technologies
          </a>
        </div>
      </main>
    );
  }

  const paid = Number(data.balance) <= 0;

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-3 py-5 text-slate-900 sm:px-6 sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <LockKeyhole className="size-4 text-emerald-700" />
            Secure Lightworld invoice · expires {date(data.secureLinkExpiresAt)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Print / Save PDF
            </Button>
            {data.paymentConfigured && !paid && (
              <Button type="button" onClick={() => void payOnline()} disabled={paying} className="bg-amber-600 text-white hover:bg-amber-700">
                {paying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
                Pay securely
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 print:hidden">{error}</div>
        )}

        <article className="overflow-hidden rounded-[28px] bg-white shadow-xl shadow-slate-200/40 print:rounded-none print:shadow-none">
          <header className="bg-slate-950 px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Lightworld Technologies Ltd</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">INVOICE</h1>
                <p className="mt-2 font-mono text-sm text-slate-300">{data.invoiceNumber}</p>
              </div>
              <div className="text-sm leading-6 text-slate-300 sm:text-right">
                <p className="font-semibold text-white">lightworldtech.com</p>
                <p>mail@lightworldtech.com</p>
                <p>+233 (024) 361 8186</p>
                <p>Ghana</p>
              </div>
            </div>
          </header>

          <div className="space-y-8 p-6 sm:p-10">
            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Bill to</p>
                <p className="mt-3 text-xl font-bold">{data.customer}</p>
                {data.contactName && <p className="mt-1 text-sm text-slate-600">{data.contactName}</p>}
                {data.service && <p className="mt-3 text-sm"><span className="text-slate-500">Service:</span> {data.service}{data.planName ? ' · ' + data.planName : ''}</p>}
                {data.project && <p className="mt-1 text-sm"><span className="text-slate-500">Project:</span> {data.project}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <CalendarDays className="size-4 text-amber-700" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Issue date</p>
                  <p className="mt-1 text-sm font-semibold">{date(data.issueDate)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <CalendarDays className="size-4 text-amber-700" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Due date</p>
                  <p className="mt-1 text-sm font-semibold">{date(data.dueDate)}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">Status</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <strong className="text-lg">{pretty(data.status)}</strong>
                    {paid && <CheckCircle2 className="size-5 text-emerald-700" />}
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit price</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-4 py-4 font-medium">{line.description}</td>
                      <td className="px-4 py-4 text-right">{line.quantity}</td>
                      <td className="px-4 py-4 text-right">{money(line.unitPrice, data.currency)}</td>
                      <td className="px-4 py-4 text-right font-semibold">{money(line.amount, data.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                {data.notes && (
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{data.notes}</p>
                  </div>
                )}

                {(data.payments.length > 0 || data.credits.length > 0) && (
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      <ReceiptText className="size-4" /> Account activity
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {data.payments.map((payment) => (
                        <div key={payment.paymentNumber} className="flex items-start justify-between gap-4 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                          <div><strong>{payment.paymentNumber}</strong><p className="text-xs text-slate-500">{date(payment.paidAt)} · {pretty(payment.method)}{payment.reference ? ' · ' + payment.reference : ''}</p></div>
                          <strong className="text-emerald-700">-{money(payment.amount, data.currency)}</strong>
                        </div>
                      ))}
                      {data.credits.map((credit) => (
                        <div key={credit.creditNoteNumber} className="flex items-start justify-between gap-4 border-t border-slate-100 pt-2">
                          <div><strong>{credit.creditNoteNumber}</strong><p className="text-xs text-slate-500">{date(credit.issueDate)} · {credit.reason}</p></div>
                          <strong className="text-sky-700">-{money(credit.appliedAmount, data.currency)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4 text-slate-300"><span>Subtotal</span><span>{money(data.subtotal, data.currency)}</span></div>
                  {Number(data.discount) > 0 && <div className="flex justify-between gap-4 text-slate-300"><span>Discount</span><span>-{money(data.discount, data.currency)}</span></div>}
                  {Number(data.vatAmount) > 0 && <div className="flex justify-between gap-4 text-slate-300"><span>VAT ({data.vatRate}%)</span><span>{money(data.vatAmount, data.currency)}</span></div>}
                  {Number(data.nhilAmount) > 0 && <div className="flex justify-between gap-4 text-slate-300"><span>NHIL ({data.nhilRate}%)</span><span>{money(data.nhilAmount, data.currency)}</span></div>}
                  {Number(data.getfundAmount) > 0 && <div className="flex justify-between gap-4 text-slate-300"><span>GETFund ({data.getfundRate}%)</span><span>{money(data.getfundAmount, data.currency)}</span></div>}
                  {Number(data.tax) > 0 && Number(data.vatAmount) === 0 && Number(data.nhilAmount) === 0 && Number(data.getfundAmount) === 0 && (
                    <div className="flex justify-between gap-4 text-slate-300"><span>Tax</span><span>{money(data.tax, data.currency)}</span></div>
                  )}
                  <div className="mt-3 flex justify-between gap-4 border-t border-slate-700 pt-3 text-base font-bold"><span>Total</span><span>{money(data.total, data.currency)}</span></div>
                  <div className="flex justify-between gap-4 text-emerald-300"><span>Paid</span><span>-{money(data.amountPaid, data.currency)}</span></div>
                  {Number(data.creditedAmount) > 0 && <div className="flex justify-between gap-4 text-sky-300"><span>Credit applied</span><span>-{money(data.creditedAmount, data.currency)}</span></div>}
                </div>
                <div className="mt-5 rounded-xl bg-white/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-300">Balance due</p>
                  <p className="mt-1 text-2xl font-bold text-amber-300">{money(data.balance, data.currency)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5 print:hidden">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold">Payment & account access</p>
                  {paid ? (
                    <p className="mt-1 text-sm text-slate-600">This invoice currently has no outstanding balance.</p>
                  ) : data.paymentConfigured ? (
                    <p className="mt-1 text-sm text-slate-600">Secure online payment is available through {data.paymentProvider}.</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">Online payment is not configured yet. Contact Lightworld Technologies for payment instructions, or use the Client Portal to review your account.</p>
                  )}
                  <a href={data.portalUrl} className="mt-2 inline-block text-sm font-semibold text-amber-700 hover:underline">Open Client Portal</a>
                </div>
              </div>
            </section>

            <footer className="border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">
              <p>This document reflects the current invoice balance in Lightworld Technologies&apos; finance system.</p>
              <p>Lightworld Technologies Ltd · lightworldtech.com · mail@lightworldtech.com · +233 (024) 361 8186</p>
            </footer>
          </div>
        </article>
      </div>
    </main>
  );
}
