'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Mail,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldCheck,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export type FinanceRecordSelection = {
  type: 'invoice' | 'receipt' | 'bill' | 'expense';
  id: string;
} | null;

type AuditEntry = {
  id: string;
  action: string;
  adminName: string;
  adminEmail: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type RelatedRecord = {
  id: string;
  type: 'invoice' | 'bill' | 'expense';
  reference: string;
  date: string;
  dueDate?: string;
  status: string;
  currency: string;
  amount: string;
  balance?: string;
  vendor?: string;
  description?: string;
};

type Position = Record<string, {
  outstanding: string;
  unappliedCredit: string;
  netDue: string;
}>;

type DetailPayload = {
  type: 'invoice' | 'receipt' | 'bill' | 'expense';
  invoice?: any;
  payment?: any;
  bill?: any;
  expense?: any;
  accountPosition?: Position;
  related?: RelatedRecord[];
  audit: AuditEntry[];
};

type Props = {
  selection: FinanceRecordSelection;
  onOpenChange: (open: boolean) => void;
  onOpenRecord: (selection: NonNullable<FinanceRecordSelection>) => void;
  onRecordReceipt: (invoice: any) => void;
  onPaySupplier: (bill: any) => void;
};

function pretty(value: string | null | undefined): string {
  return String(value || '')
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: string | number | null | undefined, currency = 'GHS'): string {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency + ' ' + amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

function date(value: string | Date | null | undefined, includeTime = false): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return includeTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
}

function statusTone(status: string): string {
  if (['paid', 'active', 'received', 'completed', 'delivered', 'sent'].includes(status)) {
    return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (['overdue', 'expired', 'cancelled', 'void', 'failed'].includes(status)) {
    return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  }
  if (['partially_paid', 'suspended', 'pending', 'unpaid'].includes(status)) {
    return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  }
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function DetailItem({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-muted/15 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className={'mt-1 min-w-0 break-words text-sm font-medium ' + (mono ? 'font-mono text-xs' : '')}>
        {value || '—'}
      </div>
    </div>
  );
}

function PositionCards({ position }: { position?: Position }) {
  const entries = Object.entries(position || {});
  if (!entries.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(([currency, values]) => (
        <Card key={currency} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{currency} account</p>
                <p className="mt-1 text-xl font-bold">{money(values.netDue, currency)}</p>
                <p className="text-[11px] text-muted-foreground">Net amount due</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <WalletCards className="size-5" />
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/35 p-2.5">
                <p className="text-muted-foreground">Outstanding</p>
                <p className="mt-1 font-semibold">{money(values.outstanding, currency)}</p>
              </div>
              <div className="rounded-lg bg-muted/35 p-2.5">
                <p className="text-muted-foreground">Unapplied credit</p>
                <p className="mt-1 font-semibold">{money(values.unappliedCredit, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditTrail({ items }: { items: AuditEntry[] }) {
  return (
    <Card className="min-w-0 border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-amber-700" /> Audit trail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{pretty(item.action)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.adminName || item.adminEmail || 'System'}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">{date(item.createdAt, true)}</span>
            </div>
            {Object.keys(item.details || {}).length > 0 && (
              <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                {Object.entries(item.details).slice(0, 8).map(([key, value]) => (
                  <p key={key} className="min-w-0 break-words">
                    <span className="font-medium text-foreground/75">{pretty(key)}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
        {!items.length && (
          <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            No additional administrator audit events are recorded for this item yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedRecords({
  items,
  onOpenRecord,
}: {
  items?: RelatedRecord[];
  onOpenRecord: Props['onOpenRecord'];
}) {
  if (!items?.length) return null;
  return (
    <Card className="min-w-0 border-border/60">
      <CardHeader className="pb-3"><CardTitle className="text-base">Related account activity</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table hideExport className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                onClick={() => onOpenRecord({ type: item.type, id: item.id })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenRecord({ type: item.type, id: item.id });
                  }
                }}
              >
                <TableCell>
                  <p className="font-mono text-xs font-semibold">{item.reference}</p>
                  {item.description && <p className="max-w-[260px] truncate text-[10px] text-muted-foreground">{item.description}</p>}
                </TableCell>
                <TableCell className="text-xs">{date(item.date)}</TableCell>
                <TableCell><Badge className={statusTone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                <TableCell className="text-right">{money(item.amount, item.currency)}</TableCell>
                <TableCell className="text-right font-semibold">
                  {item.balance === undefined ? '—' : money(item.balance, item.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function FinanceRecordDetailsDialog({
  selection,
  onOpenChange,
  onOpenRecord,
  onRecordReceipt,
  onPaySupplier,
}: Props) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceLink, setInvoiceLink] = useState<any>(null);
  const [deliveryBusy, setDeliveryBusy] = useState<'link' | 'open' | 'email' | ''>('');

  useEffect(() => {
    if (!selection) {
      setData(null);
      setError('');
      setInvoiceLink(null);
      setDeliveryBusy('');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    fetch(
      '/api/admin/finance/records/' +
        encodeURIComponent(selection.type) +
        '/' +
        encodeURIComponent(selection.id),
      { cache: 'no-store' },
    )
      .then(async (response) => {
        const raw = await response.text();
        let payload: any = null;
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          // Preserve a controlled UX if a gateway ever returns HTML.
        }
        if (!response.ok) throw new Error(payload?.error || 'Unable to load financial record');
        return payload?.data as DetailPayload;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((cause) => {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : 'Unable to load financial record';
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selection]);

  const identity = useMemo(() => {
    if (!data) return null;
    if (data.type === 'invoice' && data.invoice) {
      return {
        icon: FileText,
        eyebrow: 'Customer invoice',
        title: data.invoice.invoiceNumber,
        subtitle: data.invoice.organization?.name || '',
        status: data.invoice.derivedStatus,
      };
    }
    if (data.type === 'receipt' && data.payment) {
      return {
        icon: ReceiptText,
        eyebrow: 'Customer receipt',
        title: data.payment.paymentNumber,
        subtitle: data.payment.organization?.name || '',
        status: 'received',
      };
    }
    if (data.type === 'bill' && data.bill) {
      return {
        icon: Building2,
        eyebrow: 'Supplier bill',
        title: data.bill.payableNumber,
        subtitle: data.bill.vendor?.name || '',
        status: data.bill.derivedStatus,
      };
    }
    if (data.type === 'expense' && data.expense) {
      return {
        icon: CircleDollarSign,
        eyebrow: 'Direct expense',
        title: data.expense.expenseNumber,
        subtitle: data.expense.vendor?.name || data.expense.description || '',
        status: data.expense.paidAt ? 'paid' : 'unpaid',
      };
    }
    return null;
  }, [data]);

  const copyReference = async () => {
    if (!identity?.title || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(identity.title);
      toast.success('Reference copied');
    } catch {
      toast.error('Unable to copy reference');
    }
  };

  const issueSecureInvoiceLink = async (mode: 'link' | 'open' = 'link') => {
    if (!data?.invoice?.id) return;
    setDeliveryBusy(mode);
    try {
      const response = await fetch('/api/admin/finance/invoices/' + encodeURIComponent(data.invoice.id) + '/access-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to create secure invoice link');
      setInvoiceLink({ ...payload.data.link, url: payload.data.url });
      if (mode === 'open') {
        window.open(payload.data.url, '_blank', 'noopener,noreferrer');
        toast.success('Secure invoice opened in a new tab');
      } else {
        await navigator.clipboard.writeText(payload.data.url);
        toast.success('New secure invoice link copied. Any previous link is now revoked.');
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create secure invoice link');
    } finally {
      setDeliveryBusy('');
    }
  };

  const emailSecureInvoice = async () => {
    if (!data?.invoice?.id) return;
    setDeliveryBusy('email');
    try {
      const response = await fetch('/api/admin/finance/invoices/' + encodeURIComponent(data.invoice.id) + '/send', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || payload?.detail || 'Unable to email invoice');
      setInvoiceLink({ ...payload.data.link, url: payload.data.url });
      toast.success('Invoice emailed to ' + payload.data.recipient);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to email invoice');
    } finally {
      setDeliveryBusy('');
    }
  };

  return (
    <Dialog open={Boolean(selection)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="sr-only">Financial record details</DialogTitle>
          <DialogDescription className="sr-only">
            Review the financial record, linked account position, allocations, related activity and audit trail.
          </DialogDescription>

          {identity ? (
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                  <identity.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{identity.eyebrow}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-xl font-semibold">{identity.title}</h2>
                    <button type="button" onClick={() => void copyReference()} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Copy financial reference">
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{identity.subtitle}</p>
                </div>
              </div>
              <Badge className={statusTone(identity.status)}>{pretty(identity.status)}</Badge>
            </div>
          ) : (
            <div className="h-12" />
          )}
        </DialogHeader>

        <div className="max-h-[calc(94vh-88px)] overflow-y-auto">
          {loading && (
            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          )}

          {!loading && error && (
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
                {error}
              </div>
            </div>
          )}

          {!loading && data?.type === 'invoice' && data.invoice && (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Invoice total</p><p className="mt-1 text-xl font-bold">{money(data.invoice.total, data.invoice.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Paid / allocated</p><p className="mt-1 text-xl font-bold text-emerald-700">{money(data.invoice.amountPaid, data.invoice.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Credit notes applied</p><p className="mt-1 text-xl font-bold text-sky-700">{money((data.invoice.creditNotes || []).reduce((sum: number, note: any) => sum + Number(note.appliedAmount || 0), 0), data.invoice.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Balance due</p><p className="mt-1 text-xl font-bold text-amber-700">{money(data.invoice.balance, data.invoice.currency)}</p></CardContent></Card>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {Number(data.invoice.balance) > 0 && !['draft', 'void'].includes(data.invoice.derivedStatus) && (
                  <Button type="button" onClick={() => onRecordReceipt(data.invoice)}>
                    <ArrowDownLeft className="mr-2 size-4" /> Record receipt
                  </Button>
                )}
              </div>

              {!['draft', 'void'].includes(data.invoice.derivedStatus) && (
                <Card className="border-amber-200/70 bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Invoice document & delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <DetailItem
                        label="Secure link"
                        value={
                          invoiceLink
                            ? 'Active until ' + date(invoiceLink.expiresAt)
                            : data.invoice.accessLinks?.find((link: any) => link.status === 'active' && !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now())
                              ? 'Active until ' + date(data.invoice.accessLinks.find((link: any) => link.status === 'active' && !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now()).expiresAt)
                              : 'Not created'
                        }
                      />
                      <DetailItem
                        label="Last emailed"
                        value={invoiceLink?.lastSentAt ? date(invoiceLink.lastSentAt, true) : data.invoice.accessLinks?.find((link: any) => link.lastSentAt)?.lastSentAt ? date(data.invoice.accessLinks.find((link: any) => link.lastSentAt).lastSentAt, true) : 'Not sent'}
                      />
                      <DetailItem
                        label="Last recipient"
                        value={invoiceLink?.sentTo || data.invoice.accessLinks?.find((link: any) => link.sentTo)?.sentTo || data.invoice.organization.primaryEmail || '—'}
                      />
                      <DetailItem
                        label="Views"
                        value={String(invoiceLink?.viewCount ?? data.invoice.accessLinks?.[0]?.viewCount ?? 0)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => void issueSecureInvoiceLink('open')} disabled={Boolean(deliveryBusy)}>
                        {deliveryBusy === 'open' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ExternalLink className="mr-2 size-4" />}
                        Open / print invoice
                      </Button>
                      <Button type="button" variant="outline" onClick={() => void issueSecureInvoiceLink('link')} disabled={Boolean(deliveryBusy)}>
                        {deliveryBusy === 'link' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Link2 className="mr-2 size-4" />}
                        Create & copy secure link
                      </Button>
                      <Button type="button" onClick={() => void emailSecureInvoice()} disabled={Boolean(deliveryBusy) || !data.invoice.organization.primaryEmail}>
                        {deliveryBusy === 'email' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
                        Email invoice
                      </Button>
                      {invoiceLink?.url && (
                        <Button type="button" variant="ghost" onClick={() => window.open(invoiceLink.url, '_blank', 'noopener,noreferrer')}>
                          <ExternalLink className="mr-2 size-4" /> Reopen current link
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Secure links expire after 30 days. Creating or emailing a new link revokes the previous one. Only the token hash is stored in the database; the raw token is never persisted.
                    </p>
                  </CardContent>
                </Card>
              )}

              <PositionCards position={data.accountPosition} />

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
                <Card className="min-w-0 border-border/60">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Invoice details</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <DetailItem label="Customer" value={data.invoice.organization.name} />
                    <DetailItem label="Primary contact" value={data.invoice.organization.primaryContactName || '—'} />
                    <DetailItem label="Email" value={data.invoice.organization.primaryEmail || '—'} />
                    <DetailItem label="Service" value={data.invoice.service?.name || 'General account'} />
                    <DetailItem label="Project" value={data.invoice.project?.name || '—'} />
                    <DetailItem label="Currency" value={data.invoice.currency} mono />
                    <DetailItem label="Issue date" value={date(data.invoice.issueDate)} />
                    <DetailItem label="Due date" value={date(data.invoice.dueDate)} />
                    <DetailItem label="Created by" value={data.invoice.createdBy || 'Admin'} />
                    <DetailItem label="Subtotal" value={money(data.invoice.subtotal, data.invoice.currency)} />
                    <DetailItem label="Discount" value={money(data.invoice.discount, data.invoice.currency)} />
                    <DetailItem label="Tax" value={money(data.invoice.tax, data.invoice.currency)} />
                  </CardContent>
                </Card>

                <Card className="min-w-0 border-border/60">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Notes & lifecycle</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl bg-muted/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{data.invoice.notes || 'No invoice notes.'}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <DetailItem label="Created" value={date(data.invoice.createdAt, true)} />
                      <DetailItem label="Last updated" value={date(data.invoice.updatedAt, true)} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Line items</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table hideExport className="min-w-[660px]">
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.invoice.lines.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell className="whitespace-normal">{line.description}</TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">{money(line.unitPrice, data.invoice.currency)}</TableCell>
                          <TableCell className="text-right font-semibold">{money(line.amount, data.invoice.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {Boolean(data.invoice.creditNotes?.length) && (
                <Card className="min-w-0 border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Credit notes & customer refunds</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.invoice.creditNotes.map((note: any) => (
                      <div key={note.id} className="rounded-xl border border-border/60 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono text-xs font-semibold">{note.creditNoteNumber}</p>
                              <Badge variant="outline">{pretty(note.status)}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{date(note.issueDate)} · {note.reason}</p>
                          </div>
                          <p className="font-semibold text-sky-700">{money(note.total, data.invoice.currency)}</p>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-lg bg-muted/35 p-2.5 text-xs">
                            <p className="text-muted-foreground">Applied to receivable</p>
                            <p className="mt-1 font-semibold">{money(note.appliedAmount, data.invoice.currency)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/35 p-2.5 text-xs">
                            <p className="text-muted-foreground">Refunded</p>
                            <p className="mt-1 font-semibold">{money(note.refundedAmount || 0, data.invoice.currency)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/35 p-2.5 text-xs">
                            <p className="text-muted-foreground">Available customer credit</p>
                            <p className="mt-1 font-semibold">{money(note.refundableBalance || 0, data.invoice.currency)}</p>
                          </div>
                        </div>

                        {Boolean(note.refunds?.length) && (
                          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Refund history</p>
                            {note.refunds.map((refund: any) => (
                              <div key={refund.id} className="flex flex-col gap-1 rounded-lg bg-muted/20 p-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-mono font-semibold">{refund.refundNumber}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {date(refund.refundedAt)} · {pretty(refund.method)}
                                    {refund.reference ? ' · ' + refund.reference : ''}
                                  </p>
                                </div>
                                <p className="font-semibold">{money(refund.amount, data.invoice.currency)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Payment allocations</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.invoice.allocations.map((allocation: any) => (
                    <button
                      type="button"
                      key={allocation.id}
                      onClick={() => onOpenRecord({ type: 'receipt', id: allocation.payment.id })}
                      className="flex w-full flex-col gap-2 rounded-xl border border-border/60 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-xs font-semibold">{allocation.payment.paymentNumber}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {date(allocation.payment.paidAt)} · {pretty(allocation.payment.method)}
                          {allocation.payment.reference ? ' · ' + allocation.payment.reference : ''}
                        </p>
                      </div>
                      <p className="font-semibold text-emerald-700">{money(allocation.amount, data.invoice.currency)}</p>
                    </button>
                  ))}
                  {!data.invoice.allocations.length && <p className="text-xs text-muted-foreground">No receipts have been allocated to this invoice.</p>}
                </CardContent>
              </Card>

              {Boolean(data.invoice.paymentIntents?.length) && (
                <Card className="min-w-0 border-border/60">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Hubtel payment activity</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {data.invoice.paymentIntents.map((intent: any) => (
                      <div key={intent.id} className="rounded-xl border border-border/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs font-semibold">{intent.clientReference}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{date(intent.createdAt, true)}</p>
                          </div>
                          <Badge className={statusTone(intent.status)}>{pretty(intent.status)}</Badge>
                        </div>
                        <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                          <p>Amount: <span className="font-medium text-foreground">{money(intent.amount, data.invoice.currency)}</span></p>
                          <p>Method: <span className="font-medium text-foreground">{pretty(intent.paymentMethod) || '—'}</span></p>
                          {intent.hubtelTransactionId && <p className="break-all">Hubtel: {intent.hubtelTransactionId}</p>}
                          {intent.externalTransactionId && <p className="break-all">External: {intent.externalTransactionId}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <RelatedRecords items={data.related} onOpenRecord={onOpenRecord} />
              <AuditTrail items={data.audit} />
            </div>
          )}

          {!loading && data?.type === 'receipt' && data.payment && (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Receipt amount</p><p className="mt-1 text-xl font-bold">{money(data.payment.amount, data.payment.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Allocated</p><p className="mt-1 text-xl font-bold text-emerald-700">{money(data.payment.allocatedAmount, data.payment.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Unapplied credit</p><p className="mt-1 text-xl font-bold text-amber-700">{money(data.payment.unallocatedAmount, data.payment.currency)}</p></CardContent></Card>
              </div>

              <PositionCards position={data.accountPosition} />

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Receipt details</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailItem label="Customer" value={data.payment.organization.name} />
                  <DetailItem label="Paid date" value={date(data.payment.paidAt)} />
                  <DetailItem label="Method" value={pretty(data.payment.method)} />
                  <DetailItem label="Currency" value={data.payment.currency} mono />
                  <DetailItem label="Reference" value={data.payment.reference || '—'} mono />
                  <DetailItem label="Source" value={pretty(data.payment.source)} />
                  <DetailItem label="Provider reference" value={data.payment.providerReference || '—'} mono />
                  <DetailItem label="Received by" value={data.payment.receivedBy || 'Admin'} />
                </CardContent>
              </Card>

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Invoice allocations</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.payment.allocations.map((allocation: any) => (
                    <button
                      type="button"
                      key={allocation.id}
                      onClick={() => onOpenRecord({ type: 'invoice', id: allocation.invoice.id })}
                      className="flex w-full flex-col gap-2 rounded-xl border border-border/60 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-xs font-semibold">{allocation.invoice.invoiceNumber}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {allocation.invoice.service?.name || 'General invoice'} · Due {date(allocation.invoice.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{money(allocation.amount, data.payment.currency)}</p>
                        <Badge className={statusTone(allocation.invoice.derivedStatus)}>{pretty(allocation.invoice.derivedStatus)}</Badge>
                      </div>
                    </button>
                  ))}
                  {!data.payment.allocations.length && <p className="text-xs text-muted-foreground">This receipt is currently held as unapplied customer credit.</p>}
                </CardContent>
              </Card>

              {data.payment.hubtelIntent && (
                <Card className="min-w-0 border-border/60">
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Landmark className="size-4 text-amber-700" /> Hubtel settlement reference</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <DetailItem label="Client reference" value={data.payment.hubtelIntent.clientReference} mono />
                    <DetailItem label="Status" value={<Badge className={statusTone(data.payment.hubtelIntent.status)}>{pretty(data.payment.hubtelIntent.status)}</Badge>} />
                    <DetailItem label="Payment method" value={pretty(data.payment.hubtelIntent.paymentMethod)} />
                    <DetailItem label="Hubtel transaction" value={data.payment.hubtelIntent.hubtelTransactionId || '—'} mono />
                    <DetailItem label="External transaction" value={data.payment.hubtelIntent.externalTransactionId || '—'} mono />
                    <DetailItem label="Verified paid at" value={date(data.payment.hubtelIntent.paidAt, true)} />
                  </CardContent>
                </Card>
              )}

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Notes & lifecycle</CardTitle></CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl bg-muted/25 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{data.payment.notes || 'No receipt notes.'}</p></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailItem label="Created" value={date(data.payment.createdAt, true)} />
                    <DetailItem label="Last updated" value={date(data.payment.updatedAt, true)} />
                  </div>
                </CardContent>
              </Card>

              <AuditTrail items={data.audit} />
            </div>
          )}

          {!loading && data?.type === 'bill' && data.bill && (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Bill total</p><p className="mt-1 text-xl font-bold">{money(data.bill.total, data.bill.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Paid / allocated</p><p className="mt-1 text-xl font-bold text-emerald-700">{money(data.bill.amountPaid, data.bill.currency)}</p></CardContent></Card>
                <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Balance payable</p><p className="mt-1 text-xl font-bold text-amber-700">{money(data.bill.balance, data.bill.currency)}</p></CardContent></Card>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {Number(data.bill.balance) > 0 && data.bill.derivedStatus !== 'void' && (
                  <Button type="button" onClick={() => onPaySupplier(data.bill)}>
                    <ArrowUpRight className="mr-2 size-4" /> Pay supplier
                  </Button>
                )}
              </div>

              <PositionCards position={data.accountPosition} />

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Supplier bill details</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailItem label="Supplier" value={data.bill.vendor.name} />
                  <DetailItem label="Supplier reference" value={data.bill.vendorReference || '—'} mono />
                  <DetailItem label="Category" value={pretty(data.bill.category)} />
                  <DetailItem label="Currency" value={data.bill.currency} mono />
                  <DetailItem label="Issue date" value={date(data.bill.issueDate)} />
                  <DetailItem label="Due date" value={date(data.bill.dueDate)} />
                  <DetailItem label="Supplier email" value={data.bill.vendor.email || '—'} />
                  <DetailItem label="Supplier phone" value={data.bill.vendor.phone || '—'} />
                </CardContent>
              </Card>

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Payment allocations</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.bill.allocations.map((allocation: any) => (
                    <div key={allocation.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono text-xs font-semibold">{allocation.payment.paymentNumber}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {date(allocation.payment.paidAt)} · {pretty(allocation.payment.method)}
                          {allocation.payment.reference ? ' · ' + allocation.payment.reference : ''}
                        </p>
                      </div>
                      <p className="font-semibold text-emerald-700">{money(allocation.amount, data.bill.currency)}</p>
                    </div>
                  ))}
                  {!data.bill.allocations.length && <p className="text-xs text-muted-foreground">No supplier payments have been allocated to this bill.</p>}
                </CardContent>
              </Card>

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Notes & lifecycle</CardTitle></CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl bg-muted/25 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{data.bill.notes || 'No supplier bill notes.'}</p></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailItem label="Created" value={date(data.bill.createdAt, true)} />
                    <DetailItem label="Last updated" value={date(data.bill.updatedAt, true)} />
                  </div>
                </CardContent>
              </Card>

              <RelatedRecords items={data.related} onOpenRecord={onOpenRecord} />
              <AuditTrail items={data.audit} />
            </div>
          )}

          {!loading && data?.type === 'expense' && data.expense && (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="border-border/60 md:col-span-1"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Expense amount</p><p className="mt-1 text-2xl font-bold">{money(data.expense.amount, data.expense.currency)}</p></CardContent></Card>
                <Card className="border-border/60 md:col-span-2">
                  <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailItem label="Category" value={pretty(data.expense.category)} />
                    <DetailItem label="Supplier" value={data.expense.vendor?.name || 'No supplier'} />
                    <DetailItem label="Incurred" value={date(data.expense.incurredAt)} />
                    <DetailItem label="Paid" value={date(data.expense.paidAt)} />
                  </CardContent>
                </Card>
              </div>

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Expense record</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailItem label="Description" value={data.expense.description} />
                  <DetailItem label="Method" value={pretty(data.expense.method) || '—'} />
                  <DetailItem label="Reference" value={data.expense.reference || '—'} mono />
                  <DetailItem label="Recorded by" value={data.expense.recordedBy || 'Admin'} />
                  <DetailItem label="Currency" value={data.expense.currency} mono />
                  <DetailItem label="Created" value={date(data.expense.createdAt, true)} />
                  <DetailItem label="Last updated" value={date(data.expense.updatedAt, true)} />
                  <DetailItem label="Status" value={<Badge className={statusTone(data.expense.paidAt ? 'paid' : 'unpaid')}>{data.expense.paidAt ? 'Paid' : 'Unpaid'}</Badge>} />
                </CardContent>
              </Card>

              <Card className="min-w-0 border-border/60">
                <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-wrap text-sm">{data.expense.notes || 'No expense notes.'}</p></CardContent>
              </Card>

              <RelatedRecords items={data.related} onOpenRecord={onOpenRecord} />
              <AuditTrail items={data.audit} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
