'use client';

import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  CalendarCheck2,
  CircleAlert,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ActionsData = {
  generatedAt: string;
  approvals: {
    pendingCount: number;
    totalsByCurrency: Record<string, string>;
    oldestRequestedAt: string | null;
    oldestRequestNumber: string;
  };
  paidRenewals: {
    count: number;
    manualDateCount: number;
    totalsByCurrency: Record<string, string>;
    oldestDueDate: string | null;
  };
  priorMonthClose: {
    month: string;
    label: string;
    periodName: string;
    periodStatus: string;
    state: 'closed' | 'ready' | 'blocked';
    blockingCount: number;
    warningCount: number;
    detail: string;
    controls: Array<{
      key: string;
      label: string;
      status: 'pass' | 'block' | 'warn';
      count: number;
      detail: string;
    }>;
  };
};

function moneyList(values: Record<string, string>): string {
  const entries = Object.entries(values);
  if (!entries.length) return '—';
  return entries.map(([currency, value]) => {
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
  }).join(' · ');
}

function ageText(value: string | null): string {
  if (!value) return 'No waiting item';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? 'Started today' : days + ' day' + (days === 1 ? '' : 's') + ' waiting';
}

async function loadActions(): Promise<ActionsData> {
  const response = await fetch('/api/admin/finance/executive-actions', { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Unable to load executive finance actions');
  return payload.data;
}

function ActionCard({
  eyebrow,
  title,
  value,
  detail,
  Icon,
  tone,
  button,
  onClick,
}: {
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  Icon: typeof CircleAlert;
  tone: 'neutral' | 'warning' | 'critical' | 'good';
  button: string;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'critical'
      ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/10'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/10'
        : tone === 'good'
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/10'
          : 'border-border/60';

  return (
    <Card className={toneClass}>
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{eyebrow}</p>
            <p className="mt-1 text-sm font-semibold">{title}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background/80">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-4 text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 min-h-10 text-[11px] leading-5 text-muted-foreground">{detail}</p>
        <Button type="button" size="sm" variant="outline" className="mt-4 w-full" onClick={onClick}>
          {button}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function FinanceExecutiveActionCenter({
  collections,
  onCollections,
  onRenewals,
  onApprovals,
  onClose,
}: {
  collections: {
    followUpDue: number;
    brokenPromises: number;
    activePromises: number;
    promiseAmounts: Record<string, string>;
    overdueInvoices: number;
  };
  onCollections: () => void;
  onRenewals: () => void;
  onApprovals: () => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<ActionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loadActions());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load executive finance actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const collectionCount = collections.followUpDue + collections.brokenPromises;
  const closeState = data?.priorMonthClose.state || 'blocked';

  return (
    <Card className="border-border/60">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Executive action centre</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Exceptions requiring a finance decision or operational follow-through now.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <RefreshCw className="mr-2 size-3.5" />}
          Refresh actions
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            eyebrow="Collections"
            title="Follow-up exceptions"
            value={String(collectionCount)}
            detail={
              collections.followUpDue + ' follow-ups due · ' +
              collections.brokenPromises + ' broken promises · ' +
              collections.overdueInvoices + ' overdue invoices'
            }
            Icon={CircleAlert}
            tone={collectionCount ? 'critical' : 'good'}
            button="Open collections"
            onClick={onCollections}
          />

          <ActionCard
            eyebrow="Renewals"
            title="Paid cycles awaiting completion"
            value={data ? String(data.paidRenewals.count) : loading ? '…' : '—'}
            detail={
              data
                ? moneyList(data.paidRenewals.totalsByCurrency) +
                  (data.paidRenewals.manualDateCount
                    ? ' · ' + data.paidRenewals.manualDateCount + ' require manual dates'
                    : '')
                : 'Checking paid renewal cycles'
            }
            Icon={CalendarCheck2}
            tone={data?.paidRenewals.count ? 'warning' : 'good'}
            button="Open renewals"
            onClick={onRenewals}
          />

          <ActionCard
            eyebrow="Governance"
            title="Outflows awaiting approval"
            value={data ? String(data.approvals.pendingCount) : loading ? '…' : '—'}
            detail={
              data
                ? moneyList(data.approvals.totalsByCurrency) +
                  (data.approvals.oldestRequestedAt ? ' · ' + ageText(data.approvals.oldestRequestedAt) : '')
                : 'Checking maker-checker approvals'
            }
            Icon={ClipboardCheck}
            tone={data?.approvals.pendingCount ? 'warning' : 'good'}
            button="Review approvals"
            onClick={onApprovals}
          />

          <ActionCard
            eyebrow={data?.priorMonthClose.label || 'Month-end'}
            title="Prior-month close"
            value={
              data
                ? closeState === 'closed'
                  ? 'Closed'
                  : closeState === 'ready'
                    ? 'Ready'
                    : data.priorMonthClose.blockingCount + ' blockers'
                : loading ? '…' : '—'
            }
            detail={
              data
                ? data.priorMonthClose.detail +
                  (data.priorMonthClose.warningCount
                    ? ' · ' + data.priorMonthClose.warningCount + ' warning' +
                      (data.priorMonthClose.warningCount === 1 ? '' : 's')
                    : '')
                : 'Checking close controls'
            }
            Icon={closeState === 'closed' || closeState === 'ready' ? BadgeCheck : ShieldCheck}
            tone={closeState === 'closed' ? 'good' : closeState === 'ready' ? 'neutral' : 'critical'}
            button="Open month-end close"
            onClick={onClose}
          />
        </div>

        {data?.priorMonthClose.controls.length ? (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Close exceptions</p>
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {data.priorMonthClose.controls.map((control) => (
                <button
                  type="button"
                  key={control.key}
                  onClick={onClose}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background p-3 text-left hover:bg-muted/30"
                >
                  <div>
                    <p className="text-xs font-semibold">{control.label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{control.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold">{control.count}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
