'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FileMinus2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
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

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  currency: string;
  total: string;
  balance: string;
  derivedStatus: string;
  issueDate: string;
  organization: { id: string; name: string };
};

type CreditNote = {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  currency: string;
  issueDate: string;
  reason: string;
  subtotal: string;
  tax: string;
  total: string;
  appliedAmount: string;
  refundedAmount: string;
  refundableBalance: string;
  status: string;
  organization: { id: string; name: string };
  invoice: { id: string; invoiceNumber: string; total: string; dueDate: string; status: string };
};

type Refund = {
  id: string;
  refundNumber: string;
  currency: string;
  amount: string;
  refundedAt: string;
  method: string;
  reference: string;
  reason: string;
  organization: { id: string; name: string };
  creditNote: {
    id: string;
    creditNoteNumber: string;
    invoice: { id: string; invoiceNumber: string };
  };
};

type Props = {
  invoices: InvoiceOption[];
  onFinanceChanged: () => void | Promise<void>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: string | number, currency: string) {
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
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Controlled fallback for upstream HTML/proxy failures.
  }
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload.data as T;
}

export default function FinanceCustomerCredits({ invoices, onFinanceChanged }: Props) {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditDialog, setCreditDialog] = useState(false);
  const [refundNote, setRefundNote] = useState<CreditNote | null>(null);

  const [creditForm, setCreditForm] = useState({
    invoiceId: '',
    issueDate: today(),
    reason: '',
    subtotal: '',
    tax: '0',
  });

  const [refundForm, setRefundForm] = useState({
    amount: '',
    refundedAt: today(),
    method: 'bank_transfer',
    reference: '',
    reason: '',
  });

  const eligibleInvoices = useMemo(
    () => invoices.filter((item) => !['draft', 'void'].includes(item.derivedStatus)),
    [invoices],
  );

  const selectedInvoice = eligibleInvoices.find((item) => item.id === creditForm.invoiceId) || null;

  const load = async () => {
    setLoading(true);
    try {
      const [nextNotes, nextRefunds] = await Promise.all([
        api<CreditNote[]>('/api/admin/finance/credit-notes'),
        api<Refund[]>('/api/admin/finance/refunds'),
      ]);
      setNotes(nextNotes);
      setRefunds(nextRefunds);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load customer credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCredit = () => {
    setCreditForm({
      invoiceId: eligibleInvoices[0]?.id || '',
      issueDate: today(),
      reason: '',
      subtotal: '',
      tax: '0',
    });
    setCreditDialog(true);
  };

  const submitCredit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api<CreditNote>('/api/admin/finance/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditForm),
      });
      toast.success('Credit note posted to the customer account and general ledger');
      setCreditDialog(false);
      await Promise.all([load(), Promise.resolve(onFinanceChanged())]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to issue credit note');
    } finally {
      setSaving(false);
    }
  };

  const openRefund = (note: CreditNote) => {
    setRefundNote(note);
    setRefundForm({
      amount: note.refundableBalance,
      refundedAt: today(),
      method: 'bank_transfer',
      reference: '',
      reason: '',
    });
  };

  const submitRefund = async (event: FormEvent) => {
    event.preventDefault();
    if (!refundNote) return;
    setSaving(true);
    try {
      await api<Refund>('/api/admin/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditNoteId: refundNote.id,
          ...refundForm,
        }),
      });
      toast.success('Customer refund posted to the general ledger');
      setRefundNote(null);
      await Promise.all([load(), Promise.resolve(onFinanceChanged())]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to record customer refund');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Customer credits & refunds</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Credit notes reduce receivables and revenue; refundable excess is held as customer credit until refunded.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCredit} disabled={!eligibleInvoices.length}>
            <FileMinus2 className="mr-2 size-4" />
            Issue credit note
          </Button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Credit notes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-customer-credit-notes" className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Credit note</TableHead>
                  <TableHead>Customer / invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Applied to A/R</TableHead>
                  <TableHead className="text-right">Refundable</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-semibold">{note.creditNoteNumber}</p>
                      <Badge variant="outline" className="mt-1">{pretty(note.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{note.organization.name}</p>
                      <p className="text-[10px] text-muted-foreground">{note.invoice.invoiceNumber}</p>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(note.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{money(note.total, note.currency)}</TableCell>
                    <TableCell className="text-right">{money(note.appliedAmount, note.currency)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(note.refundableBalance, note.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Number(note.refundableBalance) <= 0 || note.status !== 'posted'}
                        onClick={() => openRefund(note)}
                      >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        Refund
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!notes.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No credit notes have been issued.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Customer refunds</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-customer-refunds" className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Refund</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Credit note</TableHead>
                  <TableHead>Date / method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-semibold">{refund.refundNumber}</p>
                      <p className="max-w-[240px] truncate text-[10px] text-muted-foreground">{refund.reference || refund.reason}</p>
                    </TableCell>
                    <TableCell className="font-medium">{refund.organization.name}</TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{refund.creditNote.creditNoteNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{refund.creditNote.invoice.invoiceNumber}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{new Date(refund.refundedAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-muted-foreground">{pretty(refund.method)}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{money(refund.amount, refund.currency)}</TableCell>
                  </TableRow>
                ))}
                {!refunds.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No customer refunds have been recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={creditDialog} onOpenChange={(open) => !saving && setCreditDialog(open)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Issue customer credit note</DialogTitle>
            <DialogDescription>
              The original invoice remains unchanged. The credit note posts its own reversing journal and reduces the customer balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCredit} className="space-y-4">
            <div>
              <Label>Invoice</Label>
              <select
                required
                value={creditForm.invoiceId}
                onChange={(event) => setCreditForm({ ...creditForm, invoiceId: event.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select invoice</option>
                {eligibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} · {invoice.organization.name} · {money(invoice.total, invoice.currency)}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs sm:grid-cols-3">
                <div><span className="text-muted-foreground">Invoice total</span><p className="mt-1 font-semibold">{money(selectedInvoice.total, selectedInvoice.currency)}</p></div>
                <div><span className="text-muted-foreground">Current balance</span><p className="mt-1 font-semibold">{money(selectedInvoice.balance, selectedInvoice.currency)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p className="mt-1 font-semibold">{pretty(selectedInvoice.derivedStatus)}</p></div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Credit date</Label><Input required type="date" value={creditForm.issueDate} onChange={(event) => setCreditForm({ ...creditForm, issueDate: event.target.value })} /></div>
              <div><Label>Net amount</Label><Input required type="number" min="0.01" step="0.01" value={creditForm.subtotal} onChange={(event) => setCreditForm({ ...creditForm, subtotal: event.target.value })} /></div>
              <div><Label>Tax reversal</Label><Input type="number" min="0" step="0.01" value={creditForm.tax} onChange={(event) => setCreditForm({ ...creditForm, tax: event.target.value })} /></div>
            </div>
            <div><Label>Reason</Label><Textarea required rows={3} value={creditForm.reason} onChange={(event) => setCreditForm({ ...creditForm, reason: event.target.value })} placeholder="Cancellation, service adjustment, billing correction…" /></div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreditDialog(false)} disabled={saving}>Cancel</Button>
              <Button disabled={saving || !creditForm.invoiceId || !creditForm.subtotal}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Post credit note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(refundNote)} onOpenChange={(open) => !saving && !open && setRefundNote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Refund customer credit</DialogTitle>
            <DialogDescription>
              Refunds are limited to the remaining refundable credit and create a separate cash/bank/mobile-money journal.
            </DialogDescription>
          </DialogHeader>
          {refundNote && (
            <form onSubmit={submitRefund} className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="font-mono text-xs font-semibold">{refundNote.creditNoteNumber}</p>
                <p className="mt-1 text-sm">{refundNote.organization.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Refundable balance: <strong className="text-foreground">{money(refundNote.refundableBalance, refundNote.currency)}</strong>
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Refund amount</Label><Input required type="number" min="0.01" max={refundNote.refundableBalance} step="0.01" value={refundForm.amount} onChange={(event) => setRefundForm({ ...refundForm, amount: event.target.value })} /></div>
                <div><Label>Refund date</Label><Input required type="date" value={refundForm.refundedAt} onChange={(event) => setRefundForm({ ...refundForm, refundedAt: event.target.value })} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Method</Label>
                  <select value={refundForm.method} onChange={(event) => setRefundForm({ ...refundForm, method: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Reference</Label><Input value={refundForm.reference} onChange={(event) => setRefundForm({ ...refundForm, reference: event.target.value })} placeholder="Bank/MoMo reference" /></div>
              </div>
              <div><Label>Reason</Label><Textarea required rows={3} value={refundForm.reason} onChange={(event) => setRefundForm({ ...refundForm, reason: event.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRefundNote(null)} disabled={saving}>Cancel</Button>
                <Button disabled={saving || Number(refundForm.amount) <= 0 || Number(refundForm.amount) > Number(refundNote.refundableBalance)}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Post refund
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
