'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, RefreshCw, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type AgreementBillingRow = {
  id: string;
  organizationId: string;
  projectId: string | null;
  title: string;
  referenceNumber: string;
  agreementType: string;
  currency: string;
  contractValue: string;
  contractValueBasis: 'unspecified' | 'tax_exclusive' | 'tax_inclusive';
  basisUnspecified: boolean;
  issuedAmount: string;
  draftAmount: string;
  remainingToPrepare: string;
  remainingUnissued: string;
  scheduledAmount: string;
  unscheduledAmount: string;
  billingMilestoneCount: number;
  billedMilestoneCount: number;
  unbilledMilestoneCount: number;
  readyUnbilledMilestoneCount: number;
  plannedUnbilledMilestoneCount: number;
  nextMilestone: {
    id: string;
    title: string;
    amount: string;
    dueDate: string | null;
    order: number;
    readinessStatus: string;
    readinessNote: string;
    evidenceUrl: string;
    readyAt: string | null;
    readyBy: string;
  } | null;
  overbilledAmount: string;
  state: 'unbilled' | 'partially_billed' | 'draft_pending' | 'fully_billed' | 'overbilled';
  effectiveDate: string | null;
  expiryDate: string | null;
  updatedAt: string;
  organization: { id: string; name: string; paymentTermsDays: number };
  project: { id: string; name: string; status: string } | null;
  latestInvoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: string;
    issueDate: string;
    dueDate: string;
  } | null;
  invoiceCount: number;
};

type AgreementBillingData = {
  rows: AgreementBillingRow[];
  byCurrency: Array<{
    currency: string;
    contractValue: string;
    issuedAmount: string;
    draftAmount: string;
    remainingToPrepare: string;
    scheduledAmount: string;
    unscheduledAmount: string;
    agreements: number;
    overbilled: number;
    basisUnspecified: number;
  }>;
  methodology: string;
};

type Props = {
  refreshKey?: string | number;
  organizationId?: string;
  onPrepareDraft: (row: AgreementBillingRow) => void;
  onOpenInvoice: (invoiceId: string) => void;
  onOpenCustomer: (organizationId: string) => void;
};

function money(value: string | number, currency: string): string {
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

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stateClass(state: AgreementBillingRow['state']): string {
  if (state === 'overbilled') return 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200';
  if (state === 'fully_billed') return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200';
  if (state === 'draft_pending') return 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200';
  if (state === 'partially_billed') return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200';
  return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200';
}

export default function FinanceAgreementBillingControl({
  refreshKey = '',
  organizationId = '',
  onPrepareDraft,
  onOpenInvoice,
  onOpenCustomer,
}: Props) {
  const [data, setData] = useState<AgreementBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | AgreementBillingRow['state']>('all');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (organizationId) params.set('organizationId', organizationId);

    fetch('/api/admin/finance/agreement-billing?' + params.toString(), { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to load agreement billing control');
        return payload?.data as AgreementBillingData;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load agreement billing control');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [organizationId, refreshKey, refreshNonce]);

  const rows = useMemo(
    () => (data?.rows || []).filter((row) => filter === 'all' || row.state === filter),
    [data?.rows, filter],
  );

  const exceptionCount = (data?.rows || []).filter((row) => row.state === 'overbilled').length;
  const draftPendingCount = (data?.rows || []).filter((row) => row.state === 'draft_pending').length;

  return (
    <Card id="agreement-billing-control" className="min-w-0 scroll-mt-28 border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="size-4 text-amber-700" />
              Agreement billing control
            </CardTitle>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">
              Compare approved active agreement values with permanently linked draft and issued invoices. Preparing a draft never issues or charges the client.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {exceptionCount > 0 && (
              <Badge className="border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {exceptionCount} overbilling exception{exceptionCount === 1 ? '' : 's'}
              </Badge>
            )}
            {draftPendingCount > 0 && <Badge variant="outline">{draftPendingCount} draft pending</Badge>}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setFilter('all');
                setRefreshNonce((value) => value + 1);
              }}
            >
              <RefreshCw className={loading ? 'mr-1.5 size-3.5 animate-spin' : 'mr-1.5 size-3.5'} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 px-6 md:grid-cols-2 xl:grid-cols-4">
              {(data?.byCurrency || []).map((item) => (
                <div key={item.currency} className="rounded-xl border border-border/60 bg-muted/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.currency} agreements</p>
                      <p className="mt-1 text-lg font-bold">{money(item.contractValue, item.currency)}</p>
                      <p className="text-[10px] text-muted-foreground">{item.agreements} agreement{item.agreements === 1 ? '' : 's'}</p>
                      {item.basisUnspecified > 0 && (
                        <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          {item.basisUnspecified} basis review required
                        </p>
                      )}
                    </div>
                    {item.overbilled > 0 && <AlertTriangle className="size-4 text-rose-600" />}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                    <div><p className="text-muted-foreground">Issued</p><p className="mt-0.5 font-semibold">{money(item.issuedAmount, item.currency)}</p></div>
                    <div><p className="text-muted-foreground">Drafts</p><p className="mt-0.5 font-semibold">{money(item.draftAmount, item.currency)}</p></div>
                    <div><p className="text-muted-foreground">Scheduled</p><p className="mt-0.5 font-semibold">{money(item.scheduledAmount, item.currency)}</p></div>
                    <div><p className="text-muted-foreground">Unscheduled</p><p className="mt-0.5 font-semibold">{money(item.unscheduledAmount, item.currency)}</p></div>
                  </div>
                </div>
              ))}
              {!data?.byCurrency.length && (
                <div className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground md:col-span-2 xl:col-span-4">
                  No approved active agreements with a recorded contract value are available for billing control.
                </div>
              )}
            </div>

            {(data?.rows?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 px-6">
                {([
                  ['all', 'All'],
                  ['unbilled', 'Unbilled'],
                  ['partially_billed', 'Partially billed'],
                  ['draft_pending', 'Draft pending'],
                  ['fully_billed', 'Fully billed'],
                  ['overbilled', 'Overbilled'],
                ] as const).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={filter === value ? 'default' : 'outline'}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}

            <div className="max-w-full overflow-x-auto border-t border-border/60">
              <Table exportFileName="lightworld-agreement-billing-control" className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Client / agreement</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Contract</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Drafts</TableHead>
                    <TableHead className="text-right">Unprepared</TableHead>
                    <TableHead>Billing schedule</TableHead>
                    <TableHead>Latest invoice</TableHead>
                    <TableHead data-export-ignore className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <button type="button" className="text-left" onClick={() => onOpenCustomer(row.organizationId)}>
                          <p className="font-semibold hover:underline">{row.organization.name}</p>
                          <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">{row.title}</p>
                          <p className="text-[10px] text-muted-foreground">{row.referenceNumber || pretty(row.agreementType)}</p>
                        </button>
                      </TableCell>
                      <TableCell className="text-xs">{row.project?.name || 'No linked project'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={stateClass(row.state)}>{pretty(row.state)}</Badge>
                          <Badge
                            variant="outline"
                            className={row.basisUnspecified
                              ? 'border-amber-300 text-amber-800 dark:border-amber-900 dark:text-amber-200'
                              : ''}
                          >
                            {row.contractValueBasis === 'tax_exclusive'
                              ? 'Tax-exclusive'
                              : row.contractValueBasis === 'tax_inclusive'
                                ? 'Tax-inclusive'
                                : 'Basis unspecified'}
                          </Badge>
                        </div>
                        {Number(row.overbilledAmount) > 0 && (
                          <p className="mt-1 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                            {money(row.overbilledAmount, row.currency)} over contract
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{money(row.contractValue, row.currency)}</TableCell>
                      <TableCell className="text-right">{money(row.issuedAmount, row.currency)}</TableCell>
                      <TableCell className="text-right">{money(row.draftAmount, row.currency)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(row.remainingToPrepare, row.currency)}</TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{row.billingMilestoneCount} milestone{row.billingMilestoneCount === 1 ? '' : 's'}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {money(row.scheduledAmount, row.currency)} scheduled · {money(row.unscheduledAmount, row.currency)} unscheduled
                        </p>
                        {row.billingMilestoneCount > 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {row.readyUnbilledMilestoneCount} ready · {row.plannedUnbilledMilestoneCount} planned · {row.billedMilestoneCount} billed
                          </p>
                        )}
                        {row.nextMilestone ? (
                          <div className="mt-1 max-w-[240px] text-[10px] text-emerald-700 dark:text-emerald-300">
                            <p className="truncate">
                              Ready: {row.nextMilestone.title} · {money(row.nextMilestone.amount, row.currency)}
                              {row.nextMilestone.dueDate ? ' · ' + new Date(row.nextMilestone.dueDate).toLocaleDateString() : ''}
                            </p>
                            {row.nextMilestone.readyBy && <p className="truncate opacity-80">Confirmed by {row.nextMilestone.readyBy}</p>}
                          </div>
                        ) : row.billingMilestoneCount > 0 && row.unbilledMilestoneCount > 0 ? (
                          <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">Awaiting milestone readiness confirmation</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {row.latestInvoice ? (
                          <button type="button" onClick={() => onOpenInvoice(row.latestInvoice!.id)} className="text-left">
                            <p className="font-mono text-xs font-semibold hover:underline">{row.latestInvoice.invoiceNumber}</p>
                            <p className="text-[10px] text-muted-foreground">{pretty(row.latestInvoice.status)} · {money(row.latestInvoice.total, row.currency)}</p>
                          </button>
                        ) : <span className="text-xs text-muted-foreground">No linked invoice</span>}
                      </TableCell>
                      <TableCell data-export-ignore className="text-right">
                        {Number(row.remainingToPrepare) > 0 && (row.billingMilestoneCount === 0 || Boolean(row.nextMilestone)) ? (
                          <Button type="button" size="sm" onClick={() => onPrepareDraft(row)}>
                            <FileText className="mr-1.5 size-3.5" /> Prepare next draft
                          </Button>
                        ) : row.billingMilestoneCount > 0 && row.unbilledMilestoneCount > 0 && !row.nextMilestone ? (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Await readiness</span>
                        ) : row.state === 'overbilled' ? (
                          <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">Review exception</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No unprepared value</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                        No agreements match this billing-control view.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {data?.methodology && (
              <div className="mx-6 mb-6 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[11px] leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                <strong>Methodology:</strong> {data.methodology}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
