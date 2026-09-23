'use client';

import { useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CashbookData = {
  from: string;
  to: string;
  currency: string | null;
  channel: 'all' | 'cash' | 'bank' | 'mobile_money';
  summary: Record<string, {
    openingBalance: string;
    inflow: string;
    outflow: string;
    netChange: string;
    closingBalance: string;
  }>;
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    systemKey: string | null;
    currency: string;
    openingBalance: string;
    inflow: string;
    outflow: string;
    closingBalance: string;
  }>;
  rows: Array<{
    id: string;
    journalId: string;
    journalNumber: string;
    entryDate: string;
    currency: string;
    account: {
      id: string;
      code: string;
      name: string;
      systemKey: string | null;
    };
    direction: 'inflow' | 'outflow';
    amount: string;
    debit: string;
    credit: string;
    runningBalance: string;
    description: string;
    journalDescription: string;
    reference: string;
    sourceType: string;
    sourceId: string;
    postedBy: string;
    postedAt: string;
    internalTransfer: boolean;
  }>;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

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

function date(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function api(url: string): Promise<CashbookData> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Unable to load cashbook');
  return payload.data as CashbookData;
}

export default function FinanceCashbookWorkspace() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [currency, setCurrency] = useState('');
  const [channel, setChannel] = useState<CashbookData['channel']>('all');
  const [data, setData] = useState<CashbookData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ from, to, channel });
      if (currency.trim()) query.set('currency', currency.trim().toUpperCase());
      setData(await api('/api/admin/finance/accounting/reports/cashbook?' + query.toString()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load cashbook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Initial report uses the default current-month range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currencies = useMemo(() => Object.entries(data?.summary || {}), [data]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="size-4 text-amber-700" />
                Cashbook & treasury
              </CardTitle>
              <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                Daily cash, bank and mobile-money movements generated directly from the posted double-entry ledger.
                Internal transfers are identified instead of being mistaken for external business cash flow.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[150px_150px_120px_170px_auto]">
              <div><Label className="text-[10px] uppercase tracking-[0.1em]">From</Label><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
              <div><Label className="text-[10px] uppercase tracking-[0.1em]">To</Label><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
              <div><Label className="text-[10px] uppercase tracking-[0.1em]">Currency</Label><Input maxLength={3} value={currency} placeholder="All" onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></div>
              <div>
                <Label className="text-[10px] uppercase tracking-[0.1em]">Channel</Label>
                <select value={channel} onChange={(event) => setChannel(event.target.value as CashbookData['channel'])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="all">All cash channels</option>
                  <option value="cash">Cash on hand</option>
                  <option value="bank">Bank accounts</option>
                  <option value="mobile_money">Mobile money</option>
                </select>
              </div>
              <Button type="button" className="self-end" onClick={() => void load()} disabled={loading}>
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                Run cashbook
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && !data && <Skeleton className="h-72 rounded-2xl" />}

      {currencies.map(([code, summary]) => (
        <Card key={code} className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{code} treasury position</CardTitle>
              <Badge variant="outline">{pretty(data?.channel || 'all')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl bg-muted/30 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Opening</p><p className="mt-1 font-semibold">{money(summary.openingBalance, code)}</p></div>
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/20"><p className="text-[10px] uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">Inflows</p><p className="mt-1 font-semibold">{money(summary.inflow, code)}</p></div>
            <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/20"><p className="text-[10px] uppercase tracking-[0.1em] text-rose-700 dark:text-rose-300">Outflows</p><p className="mt-1 font-semibold">{money(summary.outflow, code)}</p></div>
            <div className="rounded-xl bg-muted/30 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Net change</p><p className="mt-1 font-semibold">{money(summary.netChange, code)}</p></div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20"><p className="text-[10px] uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">Closing</p><p className="mt-1 font-bold">{money(summary.closingBalance, code)}</p></div>
          </CardContent>
        </Card>
      ))}

      {data && (
        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cash account positions</CardTitle>
            <p className="text-xs text-muted-foreground">Opening and closing positions by cash, bank or mobile-money ledger account.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-cashbook-account-positions" className="min-w-[820px]">
              <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Channel</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Inflows</TableHead><TableHead className="text-right">Outflows</TableHead><TableHead className="text-right">Closing</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.accounts.map((account) => (
                  <TableRow key={account.id + '-' + account.currency}>
                    <TableCell><p className="font-mono text-xs font-semibold">{account.code}</p><p className="text-sm">{account.name}</p></TableCell>
                    <TableCell><Badge variant="outline">{pretty(account.systemKey || 'cash')}</Badge></TableCell>
                    <TableCell>{account.currency}</TableCell>
                    <TableCell className="text-right">{money(account.openingBalance, account.currency)}</TableCell>
                    <TableCell className="text-right">{money(account.inflow, account.currency)}</TableCell>
                    <TableCell className="text-right">{money(account.outflow, account.currency)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(account.closingBalance, account.currency)}</TableCell>
                  </TableRow>
                ))}
                {!data.accounts.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No cash, bank or mobile-money activity exists for this filter.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><CardTitle className="text-base">Cashbook movements</CardTitle><p className="mt-1 text-xs text-muted-foreground">{data.rows.length} posted ledger movements in the selected period.</p></div>
              <Badge variant="outline">{date(data.from)} – {date(data.to)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-cashbook" className="min-w-[1120px]">
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Account</TableHead><TableHead>Journal</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead>Type</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Running balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{date(row.entryDate)}</TableCell>
                    <TableCell><p className="font-mono text-xs font-semibold">{row.account.code}</p><p className="text-xs text-muted-foreground">{row.account.name}</p></TableCell>
                    <TableCell><p className="font-mono text-xs font-semibold">{row.journalNumber}</p><p className="text-[10px] text-muted-foreground">{pretty(row.sourceType)}</p></TableCell>
                    <TableCell className="whitespace-normal"><p className="text-sm">{row.description}</p>{row.internalTransfer && <Badge className="mt-1 border-0 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">Internal transfer</Badge>}</TableCell>
                    <TableCell className="font-mono text-xs">{row.reference || '—'}</TableCell>
                    <TableCell><Badge className={row.direction === 'inflow' ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}>{row.direction === 'inflow' ? 'Inflow' : 'Outflow'}</Badge></TableCell>
                    <TableCell>{row.currency}</TableCell>
                    <TableCell className="text-right font-medium">{money(row.amount, row.currency)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.runningBalance, row.currency)}</TableCell>
                  </TableRow>
                ))}
                {!data.rows.length && <TableRow><TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">No cashbook movements match this filter.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
