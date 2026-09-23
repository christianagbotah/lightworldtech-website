'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CloseControl = {
  key: string;
  label: string;
  status: 'pass' | 'block' | 'warn';
  count: number;
  detail: string;
};

type CloseReadiness = {
  month: string;
  from: string;
  to: string;
  controls: CloseControl[];
  blockingCount: number;
  warningCount: number;
  ready: boolean;
  details: {
    missingSourceJournals: Record<string, number>;
    openReconciliationBatches: Array<{
      id: string;
      batchNumber: string;
      accountSystemKey: string;
      currency: string;
      statementFrom: string;
      statementTo: string;
    }>;
    uncoveredCashAccounts: string[];
    uncoveredCashLineCount?: number;
    reconciliationCoverage?: Array<{
      accountSystemKey: string;
      currency: string;
      statementFrom: string;
      statementTo: string;
    }>;
    trialBalance: Array<{
      currency: string;
      debit: string;
      credit: string;
      difference: string;
    }>;
  };
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/w/g, (letter) => letter.toUpperCase());
}

function date(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

async function loadReadiness(month: string): Promise<CloseReadiness> {
  const response = await fetch(
    '/api/admin/finance/accounting/close-readiness?month=' + encodeURIComponent(month),
    { cache: 'no-store' },
  );
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep upstream HTML/proxy failures outside the rendering path.
  }
  if (!response.ok) throw new Error(payload?.error || 'Unable to assess finance close readiness');
  return payload.data as CloseReadiness;
}

function ControlIcon({ status }: { status: CloseControl['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="size-5 text-emerald-600" />;
  if (status === 'warn') return <AlertTriangle className="size-5 text-amber-600" />;
  return <CircleAlert className="size-5 text-rose-600" />;
}

function ControlBadge({ status }: { status: CloseControl['status'] }) {
  return (
    <Badge className={
      status === 'pass'
        ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
        : status === 'warn'
          ? 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          : 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
    }>
      {status === 'pass' ? 'Passed' : status === 'warn' ? 'Review' : 'Blocking'}
    </Badge>
  );
}

export default function FinanceCloseWorkspace() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<CloseReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const run = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setData(await loadReadiness(month));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to assess finance close readiness';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
    // Initial check uses current month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingEntries = Object.entries(data?.details.missingSourceJournals || {})
    .filter(([, count]) => count > 0);

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-amber-700" />
                Month-end close control centre
              </CardTitle>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                Close readiness is calculated from the ledger, operational source journals,
                bank/mobile-money reconciliation and settlement exceptions—not from a manual checklist.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-[0.1em]">Close month</Label>
                <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-[170px]" />
              </div>
              <Button type="button" onClick={() => void run()} disabled={loading || !month}>
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                Run controls
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
          {loadError}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className={data.ready ? 'border-emerald-300/70' : 'border-rose-300/70'}>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Close status</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold">{data.ready ? 'Ready' : 'Blocked'}</p>
                    <p className="text-xs text-muted-foreground">{date(data.from)} – {date(data.to)}</p>
                  </div>
                  {data.ready
                    ? <CheckCircle2 className="size-7 text-emerald-600" />
                    : <CircleAlert className="size-7 text-rose-600" />}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Blocking controls</p>
                <p className="mt-2 text-2xl font-bold">{data.blockingCount}</p>
                <p className="text-xs text-muted-foreground">Must reach zero before close</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Warnings</p>
                <p className="mt-2 text-2xl font-bold">{data.warningCount}</p>
                <p className="text-xs text-muted-foreground">Review before sign-off</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Cash items without coverage</p>
                <p className="mt-2 text-2xl font-bold">{data.details.uncoveredCashLineCount || 0}</p>
                <p className="text-xs text-muted-foreground">Bank/MoMo ledger movements</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {data.controls.map((control) => (
              <Card key={control.key} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ControlIcon status={control.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{control.label}</p>
                        <div className="flex items-center gap-2">
                          {control.count > 0 && <Badge variant="outline">{control.count}</Badge>}
                          <ControlBadge status={control.status} />
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{control.detail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(missingEntries.length > 0 ||
            data.details.openReconciliationBatches.length > 0 ||
            data.details.uncoveredCashAccounts.length > 0) && (
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">Items requiring action</CardTitle></CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Missing source journals</p>
                  <div className="mt-2 space-y-1.5 text-sm">
                    {missingEntries.map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span>{pretty(key)}</span><strong>{count}</strong>
                      </div>
                    ))}
                    {!missingEntries.length && <p className="text-xs text-muted-foreground">None.</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Open reconciliations</p>
                  <div className="mt-2 space-y-2">
                    {data.details.openReconciliationBatches.map((batch) => (
                      <div key={batch.id} className="text-xs">
                        <p className="font-mono font-semibold">{batch.batchNumber}</p>
                        <p className="text-muted-foreground">
                          {pretty(batch.accountSystemKey)} · {batch.currency} · {date(batch.statementFrom)} – {date(batch.statementTo)}
                        </p>
                      </div>
                    ))}
                    {!data.details.openReconciliationBatches.length && <p className="text-xs text-muted-foreground">None.</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unreconciled account-months</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    {data.details.uncoveredCashAccounts.map((item) => {
                      const [account, currency, activityMonth] = item.split('|');
                      return (
                        <p key={item}>
                          <span className="font-medium">{pretty(account)}</span> · {currency} · {activityMonth}
                        </p>
                      );
                    })}
                    {!data.details.uncoveredCashAccounts.length && <p className="text-muted-foreground">None.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="font-semibold">Close policy</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Blocking controls prevent an accounting period from closing. Warnings do not automatically block the period,
                but should be reviewed and documented before management sign-off. Reopening a closed accounting period remains restricted to super-admin authority.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
