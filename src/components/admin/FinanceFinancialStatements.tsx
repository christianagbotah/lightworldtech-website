'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Scale,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type StatementRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  systemKey: string | null;
  amount: string;
};

type StatementCurrency = {
  profitLoss: {
    revenue: StatementRow[];
    totalRevenue: string;
    costOfServices: StatementRow[];
    totalCostOfServices: string;
    grossProfit: string;
    operatingExpenses: StatementRow[];
    totalOperatingExpenses: string;
    netProfit: string;
  };
  balanceSheet: {
    assets: StatementRow[];
    totalAssets: string;
    liabilities: StatementRow[];
    totalLiabilities: string;
    equity: StatementRow[];
    postedEquity: string;
    currentEarnings: string;
    totalEquity: string;
    liabilitiesAndEquity: string;
    difference: string;
    balanced: boolean;
  };
  cashFlow: {
    openingCash: string;
    operating: string;
    investing: string;
    financing: string;
    netCashChange: string;
    closingCash: string;
    rows: Array<{
      journalId: string;
      journalNumber: string;
      entryDate: string;
      description: string;
      reference: string;
      sourceType: string;
      classification: 'operating' | 'investing' | 'financing';
      amount: string;
    }>;
  };
};

type Statements = {
  from: string;
  to: string;
  currency: string | null;
  byCurrency: Record<string, StatementCurrency>;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfYear(): string {
  return new Date().getUTCFullYear() + '-01-01';
}

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
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function loadStatements(from: string, to: string, currency: string): Promise<Statements> {
  const query = new URLSearchParams({ from, to });
  if (currency.trim()) query.set('currency', currency.trim().toUpperCase());

  const response = await fetch(
    '/api/admin/finance/accounting/reports/financial-statements?' + query.toString(),
    { cache: 'no-store' },
  );
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep gateway HTML out of the render path.
  }
  if (!response.ok) throw new Error(payload?.error || 'Unable to load financial statements');
  return payload.data as Statements;
}

function StatementSection({
  title,
  rows,
  totalLabel,
  total,
  currency,
}: {
  title: string;
  rows: StatementRow[];
  totalLabel: string;
  total: string;
  currency: string;
}) {
  return (
    <>
      <TableRow className="bg-muted/25">
        <TableCell colSpan={3} className="font-semibold">{title}</TableCell>
      </TableRow>
      {rows.map((row) => (
        <TableRow key={row.accountId}>
          <TableCell className="font-mono text-xs">{row.code}</TableCell>
          <TableCell>{row.name}</TableCell>
          <TableCell className="text-right">{money(row.amount, currency)}</TableCell>
        </TableRow>
      ))}
      {!rows.length && (
        <TableRow>
          <TableCell colSpan={3} className="py-4 text-center text-xs text-muted-foreground">No posted activity.</TableCell>
        </TableRow>
      )}
      <TableRow className="font-semibold">
        <TableCell colSpan={2}>{totalLabel}</TableCell>
        <TableCell className="text-right">{money(total, currency)}</TableCell>
      </TableRow>
    </>
  );
}

export default function FinanceFinancialStatements() {
  const [from, setFrom] = useState(firstDayOfYear());
  const [to, setTo] = useState(today());
  const [currency, setCurrency] = useState('');
  const [statements, setStatements] = useState<Statements | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const run = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setStatements(await loadStatements(from, to, currency));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load financial statements';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
    // Initial report uses the default current-year period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = Object.entries(statements?.byCurrency || {});

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="text-base">Ledger-derived financial statements</CardTitle>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                Profit & Loss, Balance Sheet and Cash Flow are calculated from posted double-entry journals only.
                Currencies are kept separate and are never silently consolidated.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[150px_150px_120px_auto]">
              <div>
                <Label className="text-[10px] uppercase tracking-[0.1em]">From</Label>
                <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-[0.1em]">To</Label>
                <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-[0.1em]">Currency</Label>
                <Input value={currency} maxLength={3} placeholder="All" onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
              </div>
              <Button type="button" className="self-end" onClick={() => void run()} disabled={loading}>
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                Run statements
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

      {entries.map(([code, report]) => (
        <div key={code} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Net profit</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{money(report.profitLoss.netProfit, code)}</p>
                  <TrendingUp className="size-5 text-amber-700" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total assets</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{money(report.balanceSheet.totalAssets, code)}</p>
                  <Scale className="size-5 text-amber-700" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Closing cash</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{money(report.cashFlow.closingCash, code)}</p>
                  <WalletCards className="size-5 text-amber-700" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Balance Sheet control</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold">{report.balanceSheet.balanced ? 'Balanced' : money(report.balanceSheet.difference, code)}</p>
                    <p className="text-[11px] text-muted-foreground">Assets − liabilities − equity</p>
                  </div>
                  <Badge className={report.balanceSheet.balanced
                    ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}>
                    {report.balanceSheet.balanced ? 'Control OK' : 'Review'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <Card className="min-w-0 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{code} Profit & Loss</CardTitle>
                <p className="text-xs text-muted-foreground">{date(statements?.from || from)} – {date(statements?.to || to)}</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table exportFileName={'lightworld-profit-loss-' + code.toLowerCase()} className="min-w-[560px]">
                  <TableHeader>
                    <TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    <StatementSection title="Revenue" rows={report.profitLoss.revenue} totalLabel="Total revenue" total={report.profitLoss.totalRevenue} currency={code} />
                    <StatementSection title="Cost of services" rows={report.profitLoss.costOfServices} totalLabel="Total cost of services" total={report.profitLoss.totalCostOfServices} currency={code} />
                    <TableRow className="bg-amber-50/50 font-semibold dark:bg-amber-950/10">
                      <TableCell colSpan={2}>Gross profit</TableCell>
                      <TableCell className="text-right">{money(report.profitLoss.grossProfit, code)}</TableCell>
                    </TableRow>
                    <StatementSection title="Operating expenses" rows={report.profitLoss.operatingExpenses} totalLabel="Total operating expenses" total={report.profitLoss.totalOperatingExpenses} currency={code} />
                    <TableRow className="bg-muted/50 text-base font-bold">
                      <TableCell colSpan={2}>Net profit / (loss)</TableCell>
                      <TableCell className="text-right">{money(report.profitLoss.netProfit, code)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{code} Balance Sheet</CardTitle>
                    <p className="text-xs text-muted-foreground">As of {date(statements?.to || to)}</p>
                  </div>
                  <Badge className={report.balanceSheet.balanced
                    ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}>
                    {report.balanceSheet.balanced ? 'Balanced' : 'Out of balance'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table exportFileName={'lightworld-balance-sheet-' + code.toLowerCase()} className="min-w-[560px]">
                  <TableHeader>
                    <TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Balance</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    <StatementSection title="Assets" rows={report.balanceSheet.assets} totalLabel="Total assets" total={report.balanceSheet.totalAssets} currency={code} />
                    <StatementSection title="Liabilities" rows={report.balanceSheet.liabilities} totalLabel="Total liabilities" total={report.balanceSheet.totalLiabilities} currency={code} />
                    <StatementSection title="Equity" rows={report.balanceSheet.equity} totalLabel="Posted equity" total={report.balanceSheet.postedEquity} currency={code} />
                    <TableRow>
                      <TableCell className="font-mono text-xs">—</TableCell>
                      <TableCell>Current earnings</TableCell>
                      <TableCell className="text-right">{money(report.balanceSheet.currentEarnings, code)}</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold">
                      <TableCell colSpan={2}>Total equity</TableCell>
                      <TableCell className="text-right">{money(report.balanceSheet.totalEquity, code)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 text-base font-bold">
                      <TableCell colSpan={2}>Liabilities + equity</TableCell>
                      <TableCell className="text-right">{money(report.balanceSheet.liabilitiesAndEquity, code)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{code} Cash Flow Statement</CardTitle>
              <p className="text-xs text-muted-foreground">Cash and cash-equivalent movement classified from posted journals.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Opening cash', report.cashFlow.openingCash],
                  ['Operating', report.cashFlow.operating],
                  ['Investing', report.cashFlow.investing],
                  ['Financing', report.cashFlow.financing],
                  ['Closing cash', report.cashFlow.closingCash],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/60 bg-muted/15 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{money(value, code)}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-full overflow-x-auto rounded-xl border border-border/60">
                <Table exportFileName={'lightworld-cash-flow-' + code.toLowerCase()} className="min-w-[760px]">
                  <TableHeader>
                    <TableRow><TableHead>Date</TableHead><TableHead>Journal</TableHead><TableHead>Classification</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Cash movement</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.cashFlow.rows.map((row) => (
                      <TableRow key={row.journalId}>
                        <TableCell className="text-xs">{date(row.entryDate)}</TableCell>
                        <TableCell><p className="font-mono text-xs font-semibold">{row.journalNumber}</p><p className="text-[10px] text-muted-foreground">{pretty(row.sourceType)}</p></TableCell>
                        <TableCell><Badge variant="outline">{pretty(row.classification)}</Badge></TableCell>
                        <TableCell className="max-w-[300px] whitespace-normal">{row.description}</TableCell>
                        <TableCell className="font-mono text-xs">{row.reference || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{money(row.amount, code)}</TableCell>
                      </TableRow>
                    ))}
                    {!report.cashFlow.rows.length && (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No cash movements in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                <span className="text-muted-foreground">Net cash change</span>
                <strong>{money(report.cashFlow.netCashChange, code)}</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {!loading && !entries.length && !loadError && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Scale className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-medium">No posted ledger activity for this statement period</p>
            <p className="mt-1 text-xs text-muted-foreground">Post or backfill operational journals, then run the statements again.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
