'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Landmark,
  RefreshCw,
  TrendingUp,
  UsersRound,
  WalletCards,
  Timer,
  Download,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import FinanceExecutiveActionCenter from '@/components/admin/FinanceExecutiveActionCenter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type FinanceExecutiveDashboardData = {
  period: { from: string; to: string };
  byCurrency: Record<string, {
    receivables: string;
    payables: string;
    cashIn: string;
    cashOut: string;
    netCashflow: string;
    revenue: string;
    expenses: string;
    netProfit: string;
  }>;
  cashPosition: Record<string, {
    cash: string;
    bank: string;
    mobileMoney: string;
    total: string;
  }>;
  renewalExposure: Record<string, {
    amount: string;
    count: number;
    overdueCount: number;
  }>;
  recurringRevenue: Record<string, {
    mrr: string;
    arr: string;
    activeServices: number;
    excludedServices: number;
    methodology: string;
  }>;
  receivableConcentration: Record<string, {
    customers: number;
    topCustomerId: string;
    topCustomer: string;
    topBalance: string;
    topSharePct: number;
    top3SharePct: number;
    methodology: string;
  }>;
  collectionHealth: Record<string, {
    reportingDays: number;
    receivableDaysProxy: number | null;
    overdueSharePct: number;
    severeAgingSharePct: number;
    collectionCoveragePct: number | null;
    methodology: string;
  }>;
  renewalPerformance: {
    dueInPeriod: number;
    completedDueInPeriod: number;
    completedInPeriod: number;
    overdueOpen: number;
    completionRatePct: number | null;
    methodology: string;
  };
  runway: Record<string, {
    liquidity: string;
    averageMonthlyCashOut: string;
    months: string | null;
    sampleMonths: number;
    status: 'unavailable' | 'under_1' | 'under_3' | 'under_6' | 'six_plus';
    methodology: string;
  }>;
  collections: {
    followUpDue: number;
    brokenPromises: number;
    activePromises: number;
    promiseAmounts: Record<string, string>;
    overdueInvoices: number;
  };
  trends: Record<string, Array<{
    period: string;
    label: string;
    revenue: string;
    expenses: string;
    netProfit: string;
    cashIn: string;
    cashOut: string;
    netCashflow: string;
  }>>;
  debtors: Array<{
    id: string;
    invoiceNumber: string;
    customer: string;
    organizationId: string;
    service: string;
    currency: string;
    total: string;
    balance: string;
    issueDate: string;
    dueDate: string;
    status: string;
  }>;
  creditors: Array<{
    id: string;
    payableNumber: string;
    vendor: string;
    vendorId: string;
    category: string;
    currency: string;
    total: string;
    balance: string;
    issueDate: string;
    dueDate: string;
    status: string;
  }>;
  aging: {
    debtors: Record<string, Record<string, string>>;
    creditors: Record<string, Record<string, string>>;
  };
  serviceAlerts: Array<{
    id: string;
    customer: string;
    organizationId: string;
    project: string;
    name: string;
    planName: string;
    status: string;
    billingCycle: string;
    currency: string;
    recurringAmount: string;
    expiryDate: string | null;
    nextDueDate: string | null;
    expiryDays: number | null;
    dueDays: number | null;
    alert: string;
  }>;
  counts: {
    customersWithDebt: number;
    creditors: number;
    activeVendors: number;
    serviceAlerts: number;
  };
};

type Preset = 'ytd' | '30d' | '90d' | '12m';

const performanceConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
  expenses: { label: 'Expenses', color: 'var(--chart-5)' },
  netProfit: { label: 'Net profit', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const cashflowConfig = {
  cashIn: { label: 'Cash in', color: 'var(--chart-1)' },
  cashOut: { label: 'Cash out', color: 'var(--chart-5)' },
  netCashflow: { label: 'Net cashflow', color: 'var(--chart-2)' },
} satisfies ChartConfig;

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

function compactMoney(value: string | number, currency: string): string {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return currency + ' ' + amount.toLocaleString();
  }
}

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string): string {
  if (['paid', 'active', 'completed'].includes(status)) {
    return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (['overdue', 'expired', 'cancelled'].includes(status)) {
    return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  }
  if (['partially_paid', 'suspended'].includes(status)) {
    return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  }
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = isoDay(now);
  if (preset === 'ytd') return { from: String(now.getUTCFullYear()) + '-01-01', to };

  const from = new Date(now);
  if (preset === '30d') from.setUTCDate(from.getUTCDate() - 29);
  if (preset === '90d') from.setUTCDate(from.getUTCDate() - 89);
  if (preset === '12m') from.setUTCFullYear(from.getUTCFullYear() - 1);
  return { from: isoDay(from), to };
}

async function fetchDashboard(from: string, to: string): Promise<FinanceExecutiveDashboardData> {
  const response = await fetch(
    '/api/admin/finance/dashboard?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to),
    { cache: 'no-store' },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Unable to load executive finance dashboard');
  return payload.data;
}

function KpiCard({
  label,
  value,
  detail,
  Icon,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: typeof WalletCards;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group min-w-0 text-left">
      <Card className="h-full border-border/60 transition group-hover:border-amber-400/60 group-hover:bg-amber-50/30 dark:group-hover:bg-amber-950/10">
        <CardContent className="flex h-full items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{detail}</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 transition group-hover:bg-amber-500/15">
            <Icon className="size-5" />
          </span>
        </CardContent>
      </Card>
    </button>
  );
}

export default function FinanceExecutiveDashboard({
  initialData,
  onOpenInvoice,
  onOpenBill,
  onOpenCustomer,
  onReviewService,
  onPrepareRenewalInvoice,
  onCollections,
  onRenewals,
  onSuppliers,
  onCashbook,
  onStatements,
  onApprovals,
  onClose,
}: {
  initialData: FinanceExecutiveDashboardData;
  onOpenInvoice: (invoiceId: string) => void;
  onOpenBill: (billId: string) => void;
  onOpenCustomer: (organizationId: string) => void;
  onReviewService: (serviceId: string) => void;
  onPrepareRenewalInvoice: (serviceId: string) => void;
  onCollections: () => void;
  onRenewals: () => void;
  onSuppliers: () => void;
  onCashbook: () => void;
  onStatements: () => void;
  onApprovals: () => void;
  onClose: () => void;
}) {
  const [dashboard, setDashboard] = useState(initialData);
  const [preset, setPreset] = useState<Preset>('ytd');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    setDashboard(initialData);
  }, [initialData]);

  const currencies = useMemo(
    () => Array.from(new Set([
      ...Object.keys(dashboard.byCurrency || {}),
      ...Object.keys(dashboard.cashPosition || {}),
      ...Object.keys(dashboard.renewalExposure || {}),
      ...Object.keys(dashboard.recurringRevenue || {}),
      ...Object.keys(dashboard.receivableConcentration || {}),
      ...Object.keys(dashboard.collectionHealth || {}),
      ...Object.keys(dashboard.runway || {}),
      ...Object.keys(dashboard.trends || {}),
    ])).sort(),
    [dashboard],
  );

  useEffect(() => {
    if (currency && currencies.includes(currency)) return;
    setCurrency(currencies.includes('GHS') ? 'GHS' : (currencies[0] || 'GHS'));
  }, [currencies, currency]);

  const applyPreset = async (nextPreset: Preset) => {
    setPreset(nextPreset);
    const range = presetRange(nextPreset);
    setLoading(true);
    try {
      setDashboard(await fetchDashboard(range.from, range.to));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh executive dashboard');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    const range = presetRange(preset);
    setLoading(true);
    try {
      setDashboard(await fetchDashboard(range.from, range.to));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh executive dashboard');
    } finally {
      setLoading(false);
    }
  };

  const downloadManagementPack = () => {
    const quote = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const lines: string[][] = [
      ['Lightworld Technologies Ltd', 'Executive finance management snapshot'],
      ['Reporting period', dashboard.period.from + ' to ' + dashboard.period.to],
      ['Generated at', new Date().toISOString()],
      [],
      ['Currency', 'Liquidity', 'Cash runway months', 'Avg monthly cash out', 'Receivables', 'Receivable days proxy', 'Overdue receivable share %', '61+ day share %', 'Collection coverage %', 'Largest customer receivable share %', 'Top 3 receivable share %', 'Payables', 'Revenue', 'Expenses', 'Net profit', 'MRR', 'ARR', 'Active recurring services', 'Excluded non-standard cycles', 'Renewal exposure', 'Renewal cycles', 'Overdue renewal cycles'],
    ];

    const codes = Array.from(new Set([
      ...Object.keys(dashboard.byCurrency || {}),
      ...Object.keys(dashboard.cashPosition || {}),
      ...Object.keys(dashboard.runway || {}),
      ...Object.keys(dashboard.recurringRevenue || {}),
      ...Object.keys(dashboard.receivableConcentration || {}),
      ...Object.keys(dashboard.collectionHealth || {}),
      ...Object.keys(dashboard.renewalExposure || {}),
    ])).sort();

    for (const code of codes) {
      const finance = dashboard.byCurrency[code];
      const position = dashboard.cashPosition[code];
      const coverage = dashboard.runway[code];
      const renewals = dashboard.renewalExposure[code];
      const recurring = dashboard.recurringRevenue[code];
      const concentration = dashboard.receivableConcentration[code];
      const collectionHealth = dashboard.collectionHealth[code];
      lines.push([
        code,
        position?.total || '0.00',
        coverage?.months || '',
        coverage?.averageMonthlyCashOut || '0.00',
        finance?.receivables || '0.00',
        collectionHealth?.receivableDaysProxy === null || collectionHealth?.receivableDaysProxy === undefined ? '' : String(collectionHealth.receivableDaysProxy),
        String(collectionHealth?.overdueSharePct || 0),
        String(collectionHealth?.severeAgingSharePct || 0),
        collectionHealth?.collectionCoveragePct === null || collectionHealth?.collectionCoveragePct === undefined ? '' : String(collectionHealth.collectionCoveragePct),
        String(concentration?.topSharePct || 0),
        String(concentration?.top3SharePct || 0),
        finance?.payables || '0.00',
        finance?.revenue || '0.00',
        finance?.expenses || '0.00',
        finance?.netProfit || '0.00',
        recurring?.mrr || '0.00',
        recurring?.arr || '0.00',
        String(recurring?.activeServices || 0),
        String(recurring?.excludedServices || 0),
        renewals?.amount || '0.00',
        String(renewals?.count || 0),
        String(renewals?.overdueCount || 0),
      ]);
    }

    lines.push(
      [],
      ['Renewal workflow'],
      ['Due in selected period', String(dashboard.renewalPerformance.dueInPeriod)],
      ['Completed from due set', String(dashboard.renewalPerformance.completedDueInPeriod)],
      ['Completed during period', String(dashboard.renewalPerformance.completedInPeriod)],
      ['Overdue open renewals', String(dashboard.renewalPerformance.overdueOpen)],
      ['Renewal workflow completion %', dashboard.renewalPerformance.completionRatePct === null ? '' : String(dashboard.renewalPerformance.completionRatePct)],
      [],
      ['Collections control'],
      ['Follow-ups due', String(dashboard.collections.followUpDue)],
      ['Broken promises', String(dashboard.collections.brokenPromises)],
      ['Active promises', String(dashboard.collections.activePromises)],
      ['Overdue invoices', String(dashboard.collections.overdueInvoices)],
      [],
      ['Control note', 'Currencies remain separate. Cash runway is historical coverage only and excludes future collections and FX conversion.'],
    );

    const csv = lines.map((row) => row.map(quote).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lightworld-finance-management-' + dashboard.period.to.slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('Executive finance management snapshot downloaded');
  };

  const totals = dashboard.byCurrency[currency] || {
    receivables: '0',
    payables: '0',
    cashIn: '0',
    cashOut: '0',
    netCashflow: '0',
    revenue: '0',
    expenses: '0',
    netProfit: '0',
  };
  const cash = dashboard.cashPosition[currency] || {
    cash: '0',
    bank: '0',
    mobileMoney: '0',
    total: '0',
  };
  const renewal = dashboard.renewalExposure[currency] || {
    amount: '0',
    count: 0,
    overdueCount: 0,
  };
  const recurring = dashboard.recurringRevenue[currency] || {
    mrr: '0',
    arr: '0',
    activeServices: 0,
    excludedServices: 0,
    methodology: 'No active standard recurring services are currently recorded for this currency.',
  };
  const concentration = dashboard.receivableConcentration[currency] || {
    customers: 0,
    topCustomerId: '',
    topCustomer: '',
    topBalance: '0',
    topSharePct: 0,
    top3SharePct: 0,
    methodology: 'No open customer receivables are currently recorded for this currency.',
  };
  const collectionHealth = dashboard.collectionHealth[currency] || {
    reportingDays: 0,
    receivableDaysProxy: null,
    overdueSharePct: 0,
    severeAgingSharePct: 0,
    collectionCoveragePct: null,
    methodology: 'Collection efficiency becomes available when receivables, revenue or customer receipts are recorded.',
  };
  const runway = dashboard.runway[currency] || {
    liquidity: cash.total,
    averageMonthlyCashOut: '0',
    months: null,
    sampleMonths: 0,
    status: 'unavailable' as const,
    methodology: 'Historical cash-out coverage is unavailable until cash-out activity has been recorded.',
  };
  const trend = (dashboard.trends[currency] || []).map((item) => ({
    ...item,
    revenue: Number(item.revenue),
    expenses: Number(item.expenses),
    netProfit: Number(item.netProfit),
    cashIn: Number(item.cashIn),
    cashOut: Number(item.cashOut),
    netCashflow: Number(item.netCashflow),
  }));

  const debtAging = ['current', '1_30', '31_60', '61_90', '90_plus'].map((bucket) => ({
    bucket,
    value: Number(dashboard.aging.debtors[bucket]?.[currency] || 0),
  }));
  const overdueReceivables = debtAging
    .filter((item) => item.bucket !== 'current')
    .reduce((sum, item) => sum + item.value, 0);
  const currentReceivables = debtAging.find((item) => item.bucket === 'current')?.value || 0;
  const profitMargin = Number(totals.revenue) > 0
    ? (Number(totals.netProfit) / Number(totals.revenue)) * 100
    : 0;
  const promiseAmount = dashboard.collections.promiseAmounts[currency] || '0';

  const periodText =
    new Date(dashboard.period.from).toLocaleDateString() +
    ' – ' +
    new Date(dashboard.period.to).toLocaleDateString();

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Executive finance</p>
            <h2 className="mt-1 text-xl font-bold">Financial command centre</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Current liquidity, working capital and renewal exposure with period performance from {periodText}.
              Currencies remain separate and are never silently converted.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-10 min-w-[110px] rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Dashboard currency"
            >
              {currencies.length
                ? currencies.map((code) => <option key={code} value={code}>{code}</option>)
                : <option value="GHS">GHS</option>}
            </select>
            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 p-1">
              {([
                ['ytd', 'YTD'],
                ['30d', '30D'],
                ['90d', '90D'],
                ['12m', '12M'],
              ] as Array<[Preset, string]>).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={preset === value ? 'default' : 'ghost'}
                  className="h-8 px-3"
                  disabled={loading}
                  onClick={() => void applyPreset(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={downloadManagementPack}>
              <Download className="mr-2 size-4" />
              Download management pack
            </Button>
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-9">
        <KpiCard
          label="Available liquidity"
          value={money(cash.total, currency)}
          detail={'Ledger cash + bank + MoMo as of today'}
          Icon={Landmark}
          onClick={onCashbook}
        />
        <KpiCard
          label="Cash runway"
          value={runway.months ? Number(runway.months).toFixed(1) + ' mo' : '—'}
          detail={
            runway.sampleMonths
              ? money(runway.averageMonthlyCashOut, currency) + ' avg monthly cash out · ' + runway.sampleMonths + ' month sample · ' + runway.methodology
              : runway.methodology
          }
          Icon={Timer}
          onClick={onCashbook}
        />
        <KpiCard
          label="Receivables"
          value={money(totals.receivables, currency)}
          detail={dashboard.counts.customersWithDebt + ' customers · ' + money(overdueReceivables, currency) + ' overdue'}
          Icon={UsersRound}
          onClick={onCollections}
        />
        <KpiCard
          label="Customer concentration"
          value={concentration.topSharePct.toFixed(1) + '%'}
          detail={concentration.topCustomer ? concentration.topCustomer + ' · top 3 = ' + concentration.top3SharePct.toFixed(1) + '% of ' + currency + ' receivables' : concentration.methodology}
          Icon={UsersRound}
          onClick={() => concentration.topCustomerId ? onOpenCustomer(concentration.topCustomerId) : onCollections()}
        />
        <KpiCard
          label="Payables"
          value={money(totals.payables, currency)}
          detail={dashboard.counts.creditors + ' suppliers with outstanding balances'}
          Icon={Building2}
          onClick={onSuppliers}
        />
        <KpiCard
          label="Net profit"
          value={money(totals.netProfit, currency)}
          detail={(Number.isFinite(profitMargin) ? profitMargin.toFixed(1) : '0.0') + '% margin for selected period'}
          Icon={TrendingUp}
          onClick={onStatements}
        />
        <KpiCard
          label="Recurring revenue"
          value={money(recurring.mrr, currency) + ' MRR'}
          detail={money(recurring.arr, currency) + ' ARR · ' + recurring.activeServices + ' active recurring service' + (recurring.activeServices === 1 ? '' : 's') + (recurring.excludedServices ? ' · ' + recurring.excludedServices + ' custom/one-time excluded' : '')}
          Icon={CircleDollarSign}
          onClick={onRenewals}
        />
        <KpiCard
          label="Renewal exposure"
          value={money(renewal.amount, currency)}
          detail={renewal.count + ' cycles in 60 days · ' + renewal.overdueCount + ' overdue'}
          Icon={CalendarClock}
          onClick={onRenewals}
        />
        <KpiCard
          label="Collection pressure"
          value={String(dashboard.collections.followUpDue + dashboard.collections.brokenPromises)}
          detail={dashboard.collections.followUpDue + ' follow-ups · ' + dashboard.collections.brokenPromises + ' broken promises'}
          Icon={AlertTriangle}
          onClick={onCollections}
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-amber-600" />
            Renewal workflow performance
          </CardTitle>
          <p className="text-xs text-muted-foreground">{dashboard.renewalPerformance.methodology}</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Due in period', dashboard.renewalPerformance.dueInPeriod],
            ['Completed from due set', dashboard.renewalPerformance.completedDueInPeriod],
            ['Overdue open', dashboard.renewalPerformance.overdueOpen],
            ['Completion rate', dashboard.renewalPerformance.completionRatePct === null ? '—' : dashboard.renewalPerformance.completionRatePct.toFixed(1) + '%'],
          ].map(([label, value]) => (
            <button key={String(label)} type="button" onClick={onRenewals} className="rounded-xl border border-border/60 p-4 text-left transition hover:bg-muted/40">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p>
              <p className="mt-2 text-xl font-bold">{String(value)}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4 text-amber-600" />
            Collection efficiency · {currency}
          </CardTitle>
          <p className="text-xs leading-5 text-muted-foreground">{collectionHealth.methodology}</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Receivable days proxy', collectionHealth.receivableDaysProxy === null ? '—' : collectionHealth.receivableDaysProxy.toFixed(1) + ' days', 'Ending AR relative to ' + collectionHealth.reportingDays + ' reporting day(s) of revenue'],
            ['Overdue share', collectionHealth.overdueSharePct.toFixed(1) + '%', 'Share of current receivables already past due'],
            ['61+ day share', collectionHealth.severeAgingSharePct.toFixed(1) + '%', 'Older receivables carrying higher collection risk'],
            ['Collection coverage', collectionHealth.collectionCoveragePct === null ? '—' : collectionHealth.collectionCoveragePct.toFixed(1) + '%', 'Period customer receipts vs receipts plus current open AR'],
          ].map(([label, value, detail]) => (
            <button key={String(label)} type="button" onClick={onCollections} className="rounded-xl border border-border/60 p-4 text-left transition hover:bg-muted/40">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p>
              <p className="mt-2 text-xl font-bold tabular-nums">{String(value)}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{String(detail)}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <FinanceExecutiveActionCenter
        collections={dashboard.collections}
        onCollections={onCollections}
        onRenewals={onRenewals}
        onApprovals={onApprovals}
        onClose={onClose}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="min-w-0 border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Performance trend · {currency}</CardTitle>
            <p className="text-xs text-muted-foreground">Accrual revenue, expenses and net profit for the selected reporting period.</p>
          </CardHeader>
          <CardContent>
            {trend.length ? (
              <ChartContainer config={performanceConfig} className="h-[300px] w-full aspect-auto">
                <ComposedChart data={trend} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickFormatter={(value) => compactMoney(value, currency)} tickLine={false} axisLine={false} width={70} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex min-w-[170px] items-center justify-between gap-4">
                            <span className="text-muted-foreground">{performanceConfig[String(name) as keyof typeof performanceConfig]?.label || String(name)}</span>
                            <span className="font-mono font-semibold">{money(Number(value), currency)}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                  <Line dataKey="netProfit" stroke="var(--color-netProfit)" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No period activity to chart.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Liquidity position · {currency}</CardTitle>
            <p className="text-xs text-muted-foreground">Current posted-ledger balances, separate from period cash movement.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Bank', cash.bank, Landmark],
              ['Mobile money', cash.mobileMoney, WalletCards],
              ['Cash on hand', cash.cash, Banknote],
            ].map(([label, value, Icon]) => (
              <button
                type="button"
                key={String(label)}
                onClick={onCashbook}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 p-4 text-left transition hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted"><Icon className="size-4" /></span>
                  <span className="text-sm font-medium">{String(label)}</span>
                </div>
                <strong className="tabular-nums">{money(String(value), currency)}</strong>
              </button>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Cash in</p>
                <p className="mt-1 font-semibold">{money(totals.cashIn, currency)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Cash out</p>
                <p className="mt-1 font-semibold">{money(totals.cashOut, currency)}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Net period cashflow</span>
                  <strong>{money(totals.netCashflow, currency)}</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="min-w-0 border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Cashflow trend · {currency}</CardTitle>
            <p className="text-xs text-muted-foreground">Cash received, cash paid and the resulting net movement.</p>
          </CardHeader>
          <CardContent>
            {trend.length ? (
              <ChartContainer config={cashflowConfig} className="h-[270px] w-full aspect-auto">
                <ComposedChart data={trend} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickFormatter={(value) => compactMoney(value, currency)} tickLine={false} axisLine={false} width={70} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex min-w-[170px] items-center justify-between gap-4">
                            <span className="text-muted-foreground">{cashflowConfig[String(name) as keyof typeof cashflowConfig]?.label || String(name)}</span>
                            <span className="font-mono font-semibold">{money(Number(value), currency)}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="cashIn" fill="var(--color-cashIn)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cashOut" fill="var(--color-cashOut)" radius={[4, 4, 0, 0]} />
                  <Line dataKey="netCashflow" stroke="var(--color-netCashflow)" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[270px] items-center justify-center text-sm text-muted-foreground">No cashflow activity to chart.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Receivables health · {currency}</CardTitle>
            <p className="text-xs text-muted-foreground">Age profile and collection pressure on outstanding customer balances.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onCollections} className="rounded-xl border border-border/60 p-3 text-left hover:bg-muted/40">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Current</p>
                <p className="mt-1 font-bold">{money(currentReceivables, currency)}</p>
              </button>
              <button type="button" onClick={onCollections} className="rounded-xl border border-border/60 p-3 text-left hover:bg-muted/40">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Overdue</p>
                <p className="mt-1 font-bold text-rose-700 dark:text-rose-300">{money(overdueReceivables, currency)}</p>
              </button>
            </div>
            <div className="space-y-2.5">
              {debtAging.map((item) => {
                const total = Math.max(1, Number(totals.receivables));
                const width = Math.min(100, Math.max(0, (item.value / total) * 100));
                return (
                  <button type="button" onClick={onCollections} key={item.bucket} className="block w-full text-left">
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span>{item.bucket === 'current' ? 'Current' : item.bucket.replace('_', '–') + ' days'}</span>
                      <strong>{money(item.value, currency)}</strong>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: width + '%' }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-xs leading-5">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Active promises</span><strong>{dashboard.collections.activePromises}</strong></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Promised value</span><strong>{money(promiseAmount, currency)}</strong></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Follow-ups due</span><strong>{dashboard.collections.followUpDue}</strong></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Broken promises</span><strong>{dashboard.collections.brokenPromises}</strong></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0 border-border/60">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Largest customer balances</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Highest open receivables requiring collection attention.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onCollections}>Open collections</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-w-full overflow-x-auto">
              <Table exportFileName="lightworld-executive-debtors" className="min-w-[620px]">
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dashboard.debtors.slice(0, 8).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <button type="button" className="font-medium hover:underline" onClick={() => onOpenCustomer(item.organizationId)}>{item.customer}</button>
                        <p className="text-[10px] text-muted-foreground">{item.service || 'General account'}</p>
                      </TableCell>
                      <TableCell><button type="button" className="font-mono text-xs hover:underline" onClick={() => onOpenInvoice(item.id)}>{item.invoiceNumber}</button></TableCell>
                      <TableCell><p className="text-xs">{new Date(item.dueDate).toLocaleDateString()}</p><Badge className={statusTone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{money(item.balance, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!dashboard.debtors.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No outstanding customer balances.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/60">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Largest supplier balances</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Highest outstanding payables and near-term cash obligations.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onSuppliers}>Open suppliers</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-w-full overflow-x-auto">
              <Table exportFileName="lightworld-executive-creditors" className="min-w-[600px]">
                <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Bill</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dashboard.creditors.slice(0, 8).map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => onOpenBill(item.id)}>
                      <TableCell className="font-medium">{item.vendor}</TableCell>
                      <TableCell className="font-mono text-xs">{item.payableNumber}</TableCell>
                      <TableCell><p className="text-xs">{new Date(item.dueDate).toLocaleDateString()}</p><Badge className={statusTone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{money(item.balance, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!dashboard.creditors.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No outstanding supplier balances.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-amber-600" /> Renewal action centre</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Upcoming and overdue service cycles with direct operational actions.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onRenewals}>Open renewal queue</Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.serviceAlerts.slice(0, 9).map((service) => (
            <div key={service.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="min-w-0 text-left" onClick={() => onOpenCustomer(service.organizationId)}>
                  <p className="truncate font-semibold hover:underline">{service.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{service.customer} · {service.planName || 'No plan'}</p>
                </button>
                <Badge className={service.alert.includes('overdue') || service.alert === 'expired' ? statusTone('overdue') : statusTone('partially_paid')}>{pretty(service.alert)}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold">{money(service.recurringAmount, service.currency)}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {service.expiryDate && <p>Expires: {new Date(service.expiryDate).toLocaleDateString()}</p>}
                {service.nextDueDate && <p>Next due: {new Date(service.nextDueDate).toLocaleDateString()}</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onReviewService(service.id)}>Review service</Button>
                <Button type="button" size="sm" onClick={() => onPrepareRenewalInvoice(service.id)}>Prepare invoice</Button>
              </div>
            </div>
          ))}
          {!dashboard.serviceAlerts.length && <p className="text-sm text-muted-foreground">No upcoming service or renewal alerts.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ['Revenue', money(totals.revenue, currency), CircleDollarSign, onStatements],
          ['Expenses', money(totals.expenses, currency), Building2, onStatements],
          ['Net cashflow', money(totals.netCashflow, currency), WalletCards, onCashbook],
          ['Promised collections', money(promiseAmount, currency), UsersRound, onCollections],
        ] as Array<[string, string, typeof WalletCards, () => void]>).map(([label, value, Icon, action]) => (
          <button type="button" key={label} onClick={action} className="rounded-xl border border-border/60 bg-muted/20 p-4 text-left transition hover:bg-muted/40">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p><p className="mt-1 font-bold">{String(value)}</p></div>
              <Icon className="size-4 text-amber-700" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
