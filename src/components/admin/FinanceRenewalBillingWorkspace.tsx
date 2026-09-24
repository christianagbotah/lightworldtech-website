'use client';

import { CalendarClock, CheckCircle2, FileText, RefreshCw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';

type RenewalService = {
  id: string;
  organizationId: string;
  name: string;
  planName: string;
  status: string;
  billingCycle: string;
  currency: string;
  recurringAmount: string;
  expiryDate: string | null;
  nextDueDate: string | null;
  autoRenew: boolean;
  organization: { id: string; name: string };
};

type RenewalInvoice = {
  id: string;
  invoiceNumber: string;
  serviceId: string | null;
  status: string;
  derivedStatus: string;
  currency: string;
  dueDate: string;
  renewalForDate: string | null;
  renewalCompletedAt: string | null;
  renewalCompletedBy: string;
  balance: string;
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

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dayKey(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export default function FinanceRenewalBillingWorkspace({
  services,
  invoices,
  onPrepareInvoice,
  onOpenInvoice,
  onManageService,
  onRefresh,
}: {
  services: RenewalService[];
  invoices: RenewalInvoice[];
  onPrepareInvoice: (serviceId: string) => void;
  onOpenInvoice: (invoiceId: string) => void;
  onManageService: (serviceId: string) => void;
  onRefresh: () => void;
}) {
  const [pendingCompletion, setPendingCompletion] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    customer: string;
    service: string;
    cycleDate: string;
  } | null>(null);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const horizon = new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10);

  const rows = services
    .filter((service) => ['active', 'pending', 'suspended'].includes(service.status))
    .flatMap((service) => {
      const billingDate = dayKey(service.nextDueDate || service.expiryDate);
      if (billingDate && billingDate > horizon) return [];

      const invoice = billingDate
        ? invoices.find((candidate) =>
            candidate.serviceId === service.id &&
            dayKey(candidate.renewalForDate) === billingDate &&
            candidate.status !== 'void',
          ) || null
        : null;

      const days = billingDate
        ? Math.ceil((new Date(billingDate + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000)
        : null;

      return [{
        service,
        billingDate,
        invoice,
        days,
        state: !billingDate
          ? 'schedule_missing'
          : invoice
            ? invoice.renewalCompletedAt
              ? 'renewal_completed'
              : invoice.derivedStatus === 'paid'
                ? ['custom', 'one_time'].includes(service.billingCycle)
                  ? 'paid_manual_completion'
                  : 'paid_ready_to_complete'
                : 'billed'
            : Number(service.recurringAmount) <= 0
              ? 'amount_missing'
              : days !== null && days < 0
                ? 'overdue_unbilled'
                : 'ready',
      }];
    })
    .sort((a, b) => {
      if (!a.billingDate && b.billingDate) return 1;
      if (a.billingDate && !b.billingDate) return -1;
      return (a.billingDate || '').localeCompare(b.billingDate || '');
    });

  const unbilledTotals: Record<string, number> = {};
  for (const row of rows) {
    if (!['ready', 'overdue_unbilled'].includes(row.state)) continue;
    unbilledTotals[row.service.currency] =
      (unbilledTotals[row.service.currency] || 0) + Number(row.service.recurringAmount || 0);
  }

  const unbilledValue = Object.entries(unbilledTotals).length
    ? Object.entries(unbilledTotals).map(([currency, value]) => money(value, currency)).join(' · ')
    : '—';
  const dueCount = rows.filter((row) => ['ready', 'overdue_unbilled'].includes(row.state)).length;
  const readyToCompleteCount = rows.filter((row) => row.state === 'paid_ready_to_complete').length;
  const missingCount = rows.filter((row) => ['schedule_missing', 'amount_missing'].includes(row.state)).length;

  const tone = (state: string) => {
    if (state === 'renewal_completed') return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
    if (state === 'paid_ready_to_complete') return 'border-0 bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200';
    if (state === 'paid_manual_completion') return 'border-0 bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200';
    if (state === 'billed') return 'border-0 bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
    if (state === 'overdue_unbilled') return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
    if (state.includes('missing')) return 'border-0 bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200';
    return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Renewals to bill', String(dueCount), CalendarClock],
          ['Unbilled value', unbilledValue, FileText],
          ['Paid to complete', String(readyToCompleteCount), CheckCircle2],
          ['Needs setup', String(missingCount), Settings2],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)} className="border-border/60">
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p>
                <p className="mt-2 truncate text-xl font-bold">{String(value)}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Renewal billing queue</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Review service cycles due within 60 days. Issuing remains a finance action; auto-renew never means auto-charge.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-renewal-billing-queue" className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / service</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Renewal date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Renewal amount</TableHead>
                  <TableHead data-export-ignore className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.service.id}>
                    <TableCell>
                      <p className="font-medium">{row.service.organization.name}</p>
                      <p className="text-xs text-muted-foreground">{row.service.name}{row.service.planName ? ' · ' + row.service.planName : ''}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{pretty(row.service.billingCycle)}</p>
                      {row.service.autoRenew && <p className="text-[10px] text-muted-foreground">Auto-renew flag · no automatic charge</p>}
                    </TableCell>
                    <TableCell>
                      {row.billingDate ? (
                        <><p className="text-sm">{new Date(row.billingDate + 'T00:00:00Z').toLocaleDateString()}</p><p className="text-[10px] text-muted-foreground">{row.days !== null && row.days < 0 ? Math.abs(row.days) + ' days overdue' : row.days === 0 ? 'Due today' : row.days + ' days remaining'}</p></>
                      ) : <span className="text-sm text-muted-foreground">Not scheduled</span>}
                    </TableCell>
                    <TableCell><Badge className={tone(row.state)}>{pretty(row.state)}</Badge></TableCell>
                    <TableCell>
                      {row.invoice ? (
                        <button type="button" onClick={() => onOpenInvoice(row.invoice!.id)} className="text-left">
                          <p className="font-mono text-xs font-semibold hover:underline">{row.invoice.invoiceNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{pretty(row.invoice.derivedStatus)} · {money(row.invoice.balance, row.invoice.currency)} balance</p>
                        </button>
                      ) : <span className="text-xs text-muted-foreground">Not issued</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{money(row.service.recurringAmount, row.service.currency)}</TableCell>
                    <TableCell data-export-ignore>
                      <div className="flex justify-end gap-2">
                        {row.invoice && row.state === 'paid_ready_to_complete' ? (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => onOpenInvoice(row.invoice!.id)}>Open invoice</Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setPendingCompletion({
                                invoiceId: row.invoice!.id,
                                invoiceNumber: row.invoice!.invoiceNumber,
                                customer: row.service.organization.name,
                                service: row.service.name,
                                cycleDate: row.billingDate,
                              })}
                            >
                              <CheckCircle2 className="mr-1.5 size-3.5" /> Complete renewal
                            </Button>
                          </>
                        ) : row.invoice && row.state === 'paid_manual_completion' ? (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => onOpenInvoice(row.invoice!.id)}>Open invoice</Button>
                            <Button type="button" size="sm" onClick={() => onManageService(row.service.id)}>Set renewal dates</Button>
                          </>
                        ) : row.invoice ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => onOpenInvoice(row.invoice!.id)}>Open invoice</Button>
                        ) : ['schedule_missing', 'amount_missing'].includes(row.state) ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => onManageService(row.service.id)}>Manage service</Button>
                        ) : (
                          <Button type="button" size="sm" onClick={() => onPrepareInvoice(row.service.id)}>
                            <FileText className="mr-1.5 size-3.5" /> Prepare invoice
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No active service renewals fall within the next 60 days.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={Boolean(pendingCompletion)}
        onOpenChange={(open) => {
          if (!open) setPendingCompletion(null);
        }}
        title="Complete paid service renewal?"
        description={
          pendingCompletion
            ? 'This will advance ' + pendingCompletion.service + ' for ' + pendingCompletion.customer +
              ' from renewal cycle ' + new Date(pendingCompletion.cycleDate + 'T00:00:00Z').toLocaleDateString() +
              '. The previous dates remain in service history. This does not charge the customer again.'
            : 'Complete this paid service renewal.'
        }
        confirmLabel="Complete renewal"
        tone="default"
        onConfirm={async () => {
          if (!pendingCompletion) return;
          try {
            const response = await fetch(
              '/api/admin/finance/invoices/' + encodeURIComponent(pendingCompletion.invoiceId) + '/complete-renewal',
              { method: 'POST' },
            );
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error || 'Unable to complete service renewal');
            toast.success(payload?.data?.alreadyCompleted ? 'Renewal was already completed' : 'Service renewal completed');
            onRefresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to complete service renewal');
          }
        }}
      />
    </div>
  );
}
