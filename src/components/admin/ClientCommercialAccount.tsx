'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CalendarClock,
  CreditCard,
  Loader2,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Service = {
  id: string;
  name: string;
  serviceType: string;
  planName: string;
  status: string;
  billingCycle: string;
  currency: string;
  recurringAmount: string;
  expiryDate: string | null;
  nextDueDate: string | null;
  autoRenew: boolean;
  renewalNoticeDays: number;
  project: { id: string; name: string } | null;
  _count: { invoices: number };
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  serviceId: string | null;
  service: { id: string; name: string; planName: string } | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  total: string;
  amountPaid: string;
  balance: string;
  status: string;
  derivedStatus: string;
};

type Payment = {
  id: string;
  paymentNumber: string;
  currency: string;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  paidAt: string;
  method: string;
  reference: string;
  receivedBy: string;
};

type CommercialData = {
  organization: { id: string; name: string; status: string };
  byCurrency: Record<string, {
    invoiced: string;
    paid: string;
    outstanding: string;
    unapplied: string;
  }>;
  services: Service[];
  invoices: Invoice[];
  payments: Payment[];
};

type AllocationForm = {
  invoiceId: string;
  amount: string;
};

type Props = {
  organizationId: string;
  organizationName: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: string | number, currency = 'GHS') {
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

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function date(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function statusTone(status: string) {
  if (['paid', 'active'].includes(status)) return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (['overdue', 'expired', 'cancelled'].includes(status)) return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (['partially_paid', 'suspended'].includes(status)) return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

export default function ClientCommercialAccount({ organizationId, organizationName }: Props) {
  const [data, setData] = useState<CommercialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    currency: 'GHS',
    amount: '',
    paidAt: today(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
    allocations: [{ invoiceId: '', amount: '' }] as AllocationForm[],
  });

  const load = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await fetch(
        '/api/admin/clients/' + encodeURIComponent(organizationId) + '/commercial',
        { cache: 'no-store' },
      );
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (response.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(payload?.error || 'Unable to load client account');
      setData(payload.data as CommercialData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load client account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const openInvoices = useMemo(
    () => (data?.invoices || []).filter(
      (invoice) =>
        invoice.currency === paymentForm.currency &&
        Number(invoice.balance) > 0 &&
        !['draft', 'void', 'paid'].includes(invoice.derivedStatus),
    ),
    [data?.invoices, paymentForm.currency],
  );

  const currencyCodes = Object.keys(data?.byCurrency || {});
  const openPayment = (invoice?: Invoice) => {
    const currency = invoice?.currency || currencyCodes[0] || 'GHS';
    const amount = invoice?.balance || '';
    setPaymentForm({
      currency,
      amount,
      paidAt: today(),
      method: 'bank_transfer',
      reference: '',
      notes: invoice
        ? 'Receipt against ' + invoice.invoiceNumber
        : 'Customer payment recorded from the client account workspace.',
      allocations: invoice
        ? [{ invoiceId: invoice.id, amount }]
        : [{ invoiceId: '', amount: '' }],
    });
    setPaymentOpen(true);
  };

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          currency: paymentForm.currency,
          amount: Number(paymentForm.amount || 0),
          paidAt: paymentForm.paidAt,
          method: paymentForm.method,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
          allocations: paymentForm.allocations
            .filter((item) => item.invoiceId && Number(item.amount) > 0)
            .map((item) => ({
              invoiceId: item.invoiceId,
              amount: Number(item.amount),
            })),
        }),
      });
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (!response.ok) throw new Error(payload?.error || 'Unable to record customer payment');
      toast.success('Customer payment recorded and posted to the ledger');
      setPaymentOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to record customer payment');
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="size-4 text-amber-600" />
              Account & billing
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Customer receipts, invoice balances, service expiry and renewal details for {organizationName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
              Refresh
            </Button>
            <Button type="button" size="sm" onClick={() => openPayment()} disabled={loading}>
              <CreditCard className="mr-2 size-4" />
              Record customer payment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && !data ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading account and billing…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(data?.byCurrency || {}).flatMap(([currency, totals]) => [
                <div key={currency + '-invoiced'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} invoiced</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.invoiced, currency)}</p>
                </div>,
                <div key={currency + '-paid'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} paid</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.paid, currency)}</p>
                </div>,
                <div key={currency + '-outstanding'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} outstanding</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.outstanding, currency)}</p>
                </div>,
                <div key={currency + '-unapplied'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} unapplied credit</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.unapplied, currency)}</p>
                </div>,
              ])}
              {!Object.keys(data?.byCurrency || {}).length && (
                <div className="sm:col-span-2 xl:col-span-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No invoices or customer payments have been recorded yet.
                </div>
              )}
            </div>

            <div className="grid gap-5 2xl:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                  <div>
                    <p className="font-semibold">Invoices & balances</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Click Record payment to settle a specific invoice.</p>
                  </div>
                  <Badge variant="outline">{data?.invoices.length || 0}</Badge>
                </div>
                <div className="max-w-full overflow-x-auto">
                  <Table exportFileName="lightworld-client-account-invoices" className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Project / service</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.invoices || []).slice(0, 20).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            <p className="text-xs font-medium">{invoice.project?.name || 'General account'}</p>
                            <p className="text-[10px] text-muted-foreground">{invoice.service?.name || invoice.service?.planName || 'No linked service'}</p>
                          </TableCell>
                          <TableCell className="text-xs">{date(invoice.dueDate)}</TableCell>
                          <TableCell><Badge className={statusTone(invoice.derivedStatus)}>{pretty(invoice.derivedStatus)}</Badge></TableCell>
                          <TableCell className="text-right">{money(invoice.total, invoice.currency)}</TableCell>
                          <TableCell className="text-right font-semibold">{money(invoice.balance, invoice.currency)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Number(invoice.balance) <= 0 || ['draft', 'void'].includes(invoice.derivedStatus)}
                              onClick={() => openPayment(invoice)}
                            >
                              Record payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!data?.invoices.length && (
                        <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No invoices for this customer.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                  <div>
                    <p className="font-semibold">Service expiry & renewal</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Recurring service accounts linked to this customer or project.</p>
                  </div>
                  <Badge variant="outline">{data?.services.length || 0}</Badge>
                </div>
                <div className="max-w-full overflow-x-auto">
                  <Table exportFileName="lightworld-client-service-renewals" className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Billing</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Next due</TableHead>
                        <TableHead>Auto renew</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.services || []).map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <p className="text-xs font-semibold">{service.name}</p>
                            <p className="text-[10px] text-muted-foreground">{service.planName || pretty(service.serviceType)}</p>
                          </TableCell>
                          <TableCell className="text-xs">{service.project?.name || 'General'}</TableCell>
                          <TableCell>
                            <p className="text-xs">{money(service.recurringAmount, service.currency)}</p>
                            <p className="text-[10px] text-muted-foreground">{pretty(service.billingCycle)}</p>
                          </TableCell>
                          <TableCell className="text-xs">{date(service.expiryDate)}</TableCell>
                          <TableCell className="text-xs">{date(service.nextDueDate)}</TableCell>
                          <TableCell><Badge variant="outline">{service.autoRenew ? 'Yes' : 'No'}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {!data?.services.length && (
                        <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No recurring service accounts linked yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-border/60">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                <div>
                  <p className="font-semibold">Customer payment history</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Receipts recorded against this customer account.</p>
                </div>
                <Badge variant="outline">{data?.payments.length || 0}</Badge>
              </div>
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-client-payment-history" className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method / reference</TableHead>
                      <TableHead>Received by</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Unapplied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.payments || []).slice(0, 30).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.paymentNumber}</TableCell>
                        <TableCell className="text-xs">{date(payment.paidAt)}</TableCell>
                        <TableCell>
                          <p className="text-xs">{pretty(payment.method)}</p>
                          <p className="text-[10px] text-muted-foreground">{payment.reference || 'No reference'}</p>
                        </TableCell>
                        <TableCell className="text-xs">{payment.receivedBy}</TableCell>
                        <TableCell className="text-right font-semibold">{money(payment.amount, payment.currency)}</TableCell>
                        <TableCell className="text-right">{money(payment.unallocatedAmount, payment.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {!data?.payments.length && (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No customer payments recorded yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={paymentOpen} onOpenChange={(open) => !saving && setPaymentOpen(open)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record customer payment</DialogTitle>
            <DialogDescription>
              Record cash received from {organizationName}. Allocate it to outstanding invoices or leave any excess as unapplied customer credit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPayment} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
              <div><Label>Currency</Label><Input required maxLength={3} value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value.toUpperCase(), allocations: [{ invoiceId: '', amount: '' }] })} /></div>
              <div><Label>Payment date</Label><Input required type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} /></div>
              <div>
                <Label>Method</Label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div><Label>Payment reference</Label><Input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Bank reference, MoMo transaction ID, cheque number…" /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Allocate to invoices</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentForm((current) => ({
                    ...current,
                    allocations: [...current.allocations, { invoiceId: '', amount: '' }],
                  }))}
                >
                  <ReceiptText className="mr-2 size-3.5" /> Add allocation
                </Button>
              </div>
              {paymentForm.allocations.map((allocation, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <select
                    value={allocation.invoiceId}
                    onChange={(e) => {
                      const invoice = openInvoices.find((item) => item.id === e.target.value);
                      setPaymentForm((current) => ({
                        ...current,
                        allocations: current.allocations.map((item, itemIndex) =>
                          itemIndex === index
                            ? { invoiceId: e.target.value, amount: invoice?.balance || item.amount }
                            : item,
                        ),
                      }));
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Leave unapplied / select invoice</option>
                    {openInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} · {invoice.project?.name || 'General'} · balance {money(invoice.balance, invoice.currency)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={allocation.amount}
                    onChange={(e) => setPaymentForm((current) => ({
                      ...current,
                      allocations: current.allocations.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, amount: e.target.value } : item,
                      ),
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentForm((current) => ({
                      ...current,
                      allocations: current.allocations.filter((_, itemIndex) => itemIndex !== index),
                    }))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div><Label>Notes</Label><Textarea rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>

            <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-amber-600" />
                The receipt posts automatically to the double-entry ledger and updates invoice balances immediately.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)} disabled={saving}>Cancel</Button>
              <Button disabled={saving || Number(paymentForm.amount) <= 0}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
