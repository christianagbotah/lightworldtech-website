'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BookOpen,
  CalendarRange,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Account = {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subtype: string;
  systemKey: string | null;
  description: string;
  active: boolean;
  allowPosting: boolean;
  _count?: { journalLines: number; children: number };
};

type Period = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  closedAt: string | null;
  closedBy: string;
};

type JournalLine = {
  id: string;
  description: string;
  debit: string;
  credit: string;
  account: Pick<Account, 'id' | 'code' | 'name' | 'type'>;
};

type Journal = {
  id: string;
  journalNumber: string;
  entryDate: string;
  currency: string;
  description: string;
  reference: string;
  sourceType: string;
  sourceId: string;
  status: string;
  postedAt: string;
  postedBy: string;
  totalDebit: string;
  totalCredit: string;
  lines: JournalLine[];
};

type TrialBalance = {
  asOf: string;
  currency: string | null;
  byCurrency: Record<string, {
    rows: Array<{
      accountId: string;
      code: string;
      name: string;
      type: string;
      subtype: string;
      debitMovement: string;
      creditMovement: string;
      debitBalance: string;
      creditBalance: string;
    }>;
    movement: { debit: string; credit: string };
    closing: { debit: string; credit: string; difference: string; balanced: boolean };
  }>;
};

type Ledger = {
  account: Pick<Account, 'id' | 'code' | 'name' | 'type' | 'subtype' | 'active'>;
  normalSide: 'debit' | 'credit';
  from: string | null;
  to: string;
  currency: string | null;
  rows: Array<{
    id: string;
    journalId: string;
    journalNumber: string;
    entryDate: string;
    currency: string;
    description: string;
    journalDescription: string;
    reference: string;
    sourceType: string;
    sourceId: string;
    postedBy: string;
    postedAt: string;
    debit: string;
    credit: string;
    runningBalance: string;
    normalSide: 'debit' | 'credit';
  }>;
  totals: Record<string, { openingBalance: string; debit: string; credit: string; closingBalance: string }>;
};

type JournalFormLine = {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
};

type View = 'accounts' | 'journals' | 'trial-balance' | 'general-ledger' | 'periods';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function date(value: string | Date | null | undefined, includeTime = false): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return includeTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
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

function pretty(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function accountTone(type: string): string {
  if (type === 'asset') return 'border-0 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200';
  if (type === 'liability') return 'border-0 bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200';
  if (type === 'equity') return 'border-0 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  if (type === 'revenue') return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep upstream HTML/proxy failures out of the rendering path.
  }
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload.data as T;
}

export default function FinanceAccountingWorkspace() {
  const [view, setView] = useState<View>('trial-balance');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [accountDialog, setAccountDialog] = useState(false);
  const [periodDialog, setPeriodDialog] = useState(false);
  const [journalDialog, setJournalDialog] = useState(false);
  const [reversalJournal, setReversalJournal] = useState<Journal | null>(null);
  const [reversalForm, setReversalForm] = useState({ entryDate: today(), reason: '' });
  const [periodAction, setPeriodAction] = useState<{ period: Period; action: 'close' | 'reopen' } | null>(null);

  const now = new Date();
  const year = now.getUTCFullYear();

  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    type: 'asset' as Account['type'],
    subtype: '',
    description: '',
    allowPosting: true,
  });
  const [periodForm, setPeriodForm] = useState({
    name: 'FY ' + year,
    startDate: year + '-01-01',
    endDate: year + '-12-31',
  });
  const [journalForm, setJournalForm] = useState({
    entryDate: today(),
    currency: 'GHS',
    description: '',
    reference: '',
    lines: [
      { accountId: '', description: '', debit: '', credit: '' },
      { accountId: '', description: '', debit: '', credit: '' },
    ] as JournalFormLine[],
  });

  const [trialAsOf, setTrialAsOf] = useState(today());
  const [trialCurrency, setTrialCurrency] = useState('');
  const [ledgerAccountId, setLedgerAccountId] = useState('');
  const [ledgerFrom, setLedgerFrom] = useState(year + '-01-01');
  const [ledgerTo, setLedgerTo] = useState(today());
  const [ledgerCurrency, setLedgerCurrency] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [nextAccounts, nextPeriods, nextJournals, nextTrial] = await Promise.all([
        api<Account[]>('/api/admin/finance/accounting/accounts'),
        api<Period[]>('/api/admin/finance/accounting/periods'),
        api<Journal[]>('/api/admin/finance/accounting/journals'),
        api<TrialBalance>(
          '/api/admin/finance/accounting/reports/trial-balance?asOf=' +
          encodeURIComponent(trialAsOf) +
          (trialCurrency ? '&currency=' + encodeURIComponent(trialCurrency) : ''),
        ),
      ]);
      setAccounts(nextAccounts);
      setPeriods(nextPeriods);
      setJournals(nextJournals);
      setTrialBalance(nextTrial);
      if (!ledgerAccountId && nextAccounts.length) {
        setLedgerAccountId(nextAccounts.find((item) => item.active)?.id || nextAccounts[0].id);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load accounting workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Initial ledger state is derived after the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTrialBalance = async () => {
    try {
      const data = await api<TrialBalance>(
        '/api/admin/finance/accounting/reports/trial-balance?asOf=' +
        encodeURIComponent(trialAsOf) +
        (trialCurrency ? '&currency=' + encodeURIComponent(trialCurrency) : ''),
      );
      setTrialBalance(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh trial balance');
    }
  };

  const loadLedger = async (accountId = ledgerAccountId) => {
    if (!accountId) {
      setLedger(null);
      return;
    }
    setLedgerLoading(true);
    try {
      const query = new URLSearchParams({
        accountId,
        from: ledgerFrom,
        to: ledgerTo,
      });
      if (ledgerCurrency) query.set('currency', ledgerCurrency);
      const data = await api<Ledger>('/api/admin/finance/accounting/reports/general-ledger?' + query.toString());
      setLedger(data);
    } catch (error) {
      setLedger(null);
      toast.error(error instanceof Error ? error.message : 'Unable to load general ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'general-ledger' && ledgerAccountId && !ledger) {
      void loadLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, ledgerAccountId]);

  const activeAccounts = useMemo(
    () => accounts.filter((item) => item.active && item.allowPosting),
    [accounts],
  );
  const openPeriods = useMemo(
    () => periods.filter((item) => item.status === 'open'),
    [periods],
  );

  const journalTotals = useMemo(() => {
    return journalForm.lines.reduce(
      (total, line) => ({
        debit: total.debit + Number(line.debit || 0),
        credit: total.credit + Number(line.credit || 0),
      }),
      { debit: 0, credit: 0 },
    );
  }, [journalForm.lines]);

  const postAccount = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api<Account>('/api/admin/finance/accounting/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });
      toast.success('Ledger account created');
      setAccountDialog(false);
      setAccountForm({ code: '', name: '', type: 'asset', subtype: '', description: '', allowPosting: true });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create ledger account');
    } finally {
      setSaving(false);
    }
  };

  const postPeriod = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api<Period>('/api/admin/finance/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodForm),
      });
      toast.success('Accounting period opened');
      setPeriodDialog(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create accounting period');
    } finally {
      setSaving(false);
    }
  };

  const applyPeriodAction = async () => {
    if (!periodAction) return;
    setSaving(true);
    try {
      await api<Period>('/api/admin/finance/accounting/periods/' + encodeURIComponent(periodAction.period.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: periodAction.action }),
      });
      toast.success(periodAction.action === 'close' ? 'Accounting period closed' : 'Accounting period reopened');
      setPeriodAction(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update accounting period');
    } finally {
      setSaving(false);
    }
  };

  const postJournal = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api<Journal>('/api/admin/finance/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...journalForm,
          lines: journalForm.lines.map((line) => ({
            ...line,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
          })),
        }),
      });
      toast.success('Balanced journal posted');
      setJournalDialog(false);
      setJournalForm({
        entryDate: today(),
        currency: 'GHS',
        description: '',
        reference: '',
        lines: [
          { accountId: '', description: '', debit: '', credit: '' },
          { accountId: '', description: '', debit: '', credit: '' },
        ],
      });
      await load();
      if (view === 'general-ledger' && ledgerAccountId) await loadLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to post journal');
    } finally {
      setSaving(false);
    }
  };

  const reverseJournal = async (event: FormEvent) => {
    event.preventDefault();
    if (!reversalJournal) return;
    setSaving(true);
    try {
      await api<Journal>(
        '/api/admin/finance/accounting/journals/' + encodeURIComponent(reversalJournal.id) + '/reverse',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reversalForm),
        },
      );
      toast.success('Journal reversed with a new balancing entry');
      setReversalJournal(null);
      setReversalForm({ entryDate: today(), reason: '' });
      setLedger(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reverse journal');
    } finally {
      setSaving(false);
    }
  };

  const updateJournalLine = (index: number, patch: Partial<JournalFormLine>) => {
    setJournalForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  const trialCurrencies = Object.entries(trialBalance?.byCurrency || {});

  if (loading && !accounts.length && !periods.length && !journals.length) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{loadError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Chart of accounts</p>
            <div className="mt-2 flex items-center justify-between">
              <div><p className="text-2xl font-bold">{accounts.length}</p><p className="text-xs text-muted-foreground">{activeAccounts.length} posting accounts active</p></div>
              <Landmark className="size-6 text-amber-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Posted journals</p>
            <div className="mt-2 flex items-center justify-between">
              <div><p className="text-2xl font-bold">{journals.length}</p><p className="text-xs text-muted-foreground">Immutable posted entries</p></div>
              <BookOpen className="size-6 text-amber-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Open periods</p>
            <div className="mt-2 flex items-center justify-between">
              <div><p className="text-2xl font-bold">{openPeriods.length}</p><p className="text-xs text-muted-foreground">Posting windows currently open</p></div>
              <CalendarRange className="size-6 text-amber-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trial balance control</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {trialCurrencies.length
                    ? trialCurrencies.every(([, value]) => value.closing.balanced) ? 'Balanced' : 'Review'
                    : 'No postings'}
                </p>
                <p className="text-xs text-muted-foreground">As of {date(trialBalance?.asOf || trialAsOf)}</p>
              </div>
              <Scale className="size-6 text-amber-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {([
          ['trial-balance', 'Trial balance'],
          ['general-ledger', 'General ledger'],
          ['journals', 'Journal entries'],
          ['accounts', 'Chart of accounts'],
          ['periods', 'Accounting periods'],
        ] as Array<[View, string]>).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={view === value ? 'default' : 'outline'}
            aria-pressed={view === value}
            className="shrink-0"
            onClick={() => setView(value)}
          >
            {label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" className="ml-auto shrink-0" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'mr-1.5 size-3.5 animate-spin' : 'mr-1.5 size-3.5'} /> Refresh
        </Button>
      </div>

      {view === 'trial-balance' && (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Scale className="size-4 text-amber-700" /> Trial balance</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Control report generated only from posted double-entry journal lines.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[150px_120px_auto]">
                  <div><Label className="text-[10px] uppercase tracking-[0.1em]">As of</Label><Input type="date" value={trialAsOf} onChange={(event) => setTrialAsOf(event.target.value)} /></div>
                  <div><Label className="text-[10px] uppercase tracking-[0.1em]">Currency</Label><Input value={trialCurrency} maxLength={3} placeholder="All" onChange={(event) => setTrialCurrency(event.target.value.toUpperCase())} /></div>
                  <Button type="button" className="self-end" onClick={() => void refreshTrialBalance()}>Run report</Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {trialCurrencies.map(([currency, report]) => (
            <Card key={currency} className="min-w-0 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><CardTitle className="text-base">{currency} trial balance</CardTitle><p className="mt-1 text-xs text-muted-foreground">{report.rows.length} accounts with posted activity</p></div>
                  <Badge className={report.closing.balanced ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}>
                    {report.closing.balanced ? 'Balanced' : 'Out of balance'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table exportFileName={'lightworld-trial-balance-' + currency.toLowerCase()} className="min-w-[760px]">
                  <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Debit movement</TableHead><TableHead className="text-right">Credit movement</TableHead><TableHead className="text-right">Debit balance</TableHead><TableHead className="text-right">Credit balance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.rows.map((row) => (
                      <TableRow
                        key={row.accountId}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer"
                        onClick={() => {
                          setLedgerAccountId(row.accountId);
                          setLedgerCurrency(currency);
                          setLedger(null);
                          setView('general-ledger');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setLedgerAccountId(row.accountId);
                            setLedgerCurrency(currency);
                            setLedger(null);
                            setView('general-ledger');
                          }
                        }}
                      >
                        <TableCell><p className="font-mono text-xs font-semibold">{row.code}</p><p className="text-sm">{row.name}</p></TableCell>
                        <TableCell><Badge className={accountTone(row.type)}>{pretty(row.type)}</Badge></TableCell>
                        <TableCell className="text-right">{money(row.debitMovement, currency)}</TableCell>
                        <TableCell className="text-right">{money(row.creditMovement, currency)}</TableCell>
                        <TableCell className="text-right font-semibold">{Number(row.debitBalance) ? money(row.debitBalance, currency) : '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{Number(row.creditBalance) ? money(row.creditBalance, currency) : '—'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/35 font-semibold">
                      <TableCell colSpan={2}>Totals</TableCell>
                      <TableCell className="text-right">{money(report.movement.debit, currency)}</TableCell>
                      <TableCell className="text-right">{money(report.movement.credit, currency)}</TableCell>
                      <TableCell className="text-right">{money(report.closing.debit, currency)}</TableCell>
                      <TableCell className="text-right">{money(report.closing.credit, currency)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {!trialCurrencies.length && (
            <Card className="border-dashed"><CardContent className="p-10 text-center"><Scale className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 font-medium">No posted ledger activity yet</p><p className="mt-1 text-xs text-muted-foreground">Open an accounting period and post the first balanced journal entry.</p></CardContent></Card>
          )}
        </div>
      )}

      {view === 'general-ledger' && (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-amber-700" /> General ledger</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_160px_160px_120px_auto]">
              <div><Label>Account</Label><select value={ledgerAccountId} onChange={(event) => { setLedgerAccountId(event.target.value); setLedger(null); }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></div>
              <div><Label>From</Label><Input type="date" value={ledgerFrom} onChange={(event) => setLedgerFrom(event.target.value)} /></div>
              <div><Label>To</Label><Input type="date" value={ledgerTo} onChange={(event) => setLedgerTo(event.target.value)} /></div>
              <div><Label>Currency</Label><Input value={ledgerCurrency} maxLength={3} placeholder="All" onChange={(event) => setLedgerCurrency(event.target.value.toUpperCase())} /></div>
              <Button type="button" className="self-end" onClick={() => void loadLedger()} disabled={ledgerLoading || !ledgerAccountId}>{ledgerLoading && <Loader2 className="mr-2 size-4 animate-spin" />}Run ledger</Button>
            </CardContent>
          </Card>

          {ledgerLoading && <Skeleton className="h-72 rounded-2xl" />}

          {!ledgerLoading && ledger && (
            <div className="space-y-4">
              {Object.entries(ledger.totals).map(([currency, totals]) => (
                <Card key={currency} className="border-border/60">
                  <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-muted/30 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Opening balance</p><p className="mt-1 font-semibold">{money(totals.openingBalance, currency)}</p></div>
                    <div className="rounded-xl bg-muted/30 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Period debits</p><p className="mt-1 font-semibold">{money(totals.debit, currency)}</p></div>
                    <div className="rounded-xl bg-muted/30 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Period credits</p><p className="mt-1 font-semibold">{money(totals.credit, currency)}</p></div>
                    <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20"><p className="text-[10px] uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">Closing balance</p><p className="mt-1 font-bold">{money(totals.closingBalance, currency)}</p></div>
                  </CardContent>
                </Card>
              ))}
              <Card className="min-w-0 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><CardTitle className="text-base">{ledger.account.code} · {ledger.account.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Normal balance: {pretty(ledger.normalSide)} · {ledger.rows.length} posted movements</p></div>
                  <Badge className={accountTone(ledger.account.type)}>{pretty(ledger.account.type)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table exportFileName={'lightworld-general-ledger-' + ledger.account.code.toLowerCase()} className="min-w-[900px]">
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Journal</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Running balance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ledger.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs">{date(row.entryDate)}</TableCell>
                        <TableCell><p className="font-mono text-xs font-semibold">{row.journalNumber}</p><p className="text-[10px] text-muted-foreground">{pretty(row.sourceType)}</p></TableCell>
                        <TableCell className="whitespace-normal"><p className="text-sm">{row.description}</p><p className="text-[10px] text-muted-foreground">{row.journalDescription}</p></TableCell>
                        <TableCell className="font-mono text-xs">{row.reference || '—'}</TableCell>
                        <TableCell>{row.currency}</TableCell>
                        <TableCell className="text-right">{Number(row.debit) ? money(row.debit, row.currency) : '—'}</TableCell>
                        <TableCell className="text-right">{Number(row.credit) ? money(row.credit, row.currency) : '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{money(row.runningBalance, row.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {!ledger.rows.length && <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No posted movements for this account and period.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {view === 'journals' && (
        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-amber-700" /> Posted journals</CardTitle><p className="mt-1 text-xs text-muted-foreground">Every posted journal is balanced before it enters the ledger.</p></div>
              <Button type="button" size="sm" onClick={() => setJournalDialog(true)}><Plus className="mr-2 size-4" /> Post journal</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-journal-register" className="min-w-[800px]">
              <TableHeader><TableRow><TableHead>Journal</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead>Posted by</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {journals.map((journal) => (
                  <TableRow key={journal.id}>
                    <TableCell><p className="font-mono text-xs font-semibold">{journal.journalNumber}</p><p className="text-[10px] text-muted-foreground">{pretty(journal.sourceType)}</p></TableCell>
                    <TableCell className="text-xs">{date(journal.entryDate)}</TableCell>
                    <TableCell className="max-w-[300px] whitespace-normal">{journal.description}</TableCell>
                    <TableCell className="font-mono text-xs">{journal.reference || '—'}</TableCell>
                    <TableCell><Badge className={journal.status === 'reversed' ? 'border-0 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}>{pretty(journal.status)}</Badge></TableCell>
                    <TableCell>{journal.currency}</TableCell>
                    <TableCell className="text-right">{money(journal.totalDebit, journal.currency)}</TableCell>
                    <TableCell className="text-right">{money(journal.totalCredit, journal.currency)}</TableCell>
                    <TableCell><p className="text-xs">{journal.postedBy}</p><p className="text-[10px] text-muted-foreground">{date(journal.postedAt, true)}</p></TableCell>
                    <TableCell className="text-right">
                      {journal.status === 'posted' && journal.sourceType !== 'reversal' ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                          setReversalJournal(journal);
                          setReversalForm({ entryDate: today(), reason: '' });
                        }}>Reverse</Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {!journals.length && <TableRow><TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">No journals have been posted yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === 'accounts' && (
        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2 text-base"><Landmark className="size-4 text-amber-700" /> Chart of accounts</CardTitle><p className="mt-1 text-xs text-muted-foreground">System accounts have stable accounting roles; custom accounts can be added for management detail.</p></div>
              <Button type="button" size="sm" onClick={() => setAccountDialog(true)}><Plus className="mr-2 size-4" /> Add account</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-chart-of-accounts" className="min-w-[720px]">
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Subtype</TableHead><TableHead>Posting</TableHead><TableHead className="text-right">Ledger lines</TableHead></TableRow></TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => { setLedgerAccountId(account.id); setLedger(null); setView('general-ledger'); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setLedgerAccountId(account.id);
                        setLedger(null);
                        setView('general-ledger');
                      }
                    }}
                  >
                    <TableCell className="font-mono text-xs font-semibold">{account.code}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div><p className="font-medium">{account.name}</p><p className="max-w-[360px] truncate text-[10px] text-muted-foreground">{account.description || '—'}</p></div>{account.systemKey && <ShieldCheck className="size-3.5 shrink-0 text-amber-700" />}</div></TableCell>
                    <TableCell><Badge className={accountTone(account.type)}>{pretty(account.type)}</Badge></TableCell>
                    <TableCell className="text-xs">{pretty(account.subtype || 'general')}</TableCell>
                    <TableCell><Badge variant="outline">{account.active && account.allowPosting ? 'Posting enabled' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-right">{account._count?.journalLines || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === 'periods' && (
        <Card className="min-w-0 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2 text-base"><CalendarRange className="size-4 text-amber-700" /> Accounting periods</CardTitle><p className="mt-1 text-xs text-muted-foreground">Posted dates must fall inside an open period. Reopening a closed period requires super-admin authority.</p></div>
              <Button type="button" size="sm" onClick={() => setPeriodDialog(true)}><Plus className="mr-2 size-4" /> Open period</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-accounting-periods" className="min-w-[680px]">
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Closed by</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell className="text-xs">{date(period.startDate)}</TableCell>
                    <TableCell className="text-xs">{date(period.endDate)}</TableCell>
                    <TableCell><Badge className={period.status === 'open' ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-0 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}>{pretty(period.status)}</Badge></TableCell>
                    <TableCell><p className="text-xs">{period.closedBy || '—'}</p>{period.closedAt && <p className="text-[10px] text-muted-foreground">{date(period.closedAt, true)}</p>}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => setPeriodAction({ period, action: period.status === 'open' ? 'close' : 'reopen' })}>
                        {period.status === 'open' ? <LockKeyhole className="mr-1.5 size-3.5" /> : <UnlockKeyhole className="mr-1.5 size-3.5" />}
                        {period.status === 'open' ? 'Close' : 'Reopen'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!periods.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No accounting periods exist yet. Open the current financial year before posting journals.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add ledger account</DialogTitle><DialogDescription>Create a custom posting account. System accounts remain protected.</DialogDescription></DialogHeader>
          <form onSubmit={postAccount} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Account code</Label><Input required value={accountForm.code} onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value.toUpperCase() })} placeholder="e.g. 6110" /></div>
              <div><Label>Account type</Label><select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value as Account['type'] })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{['asset','liability','equity','revenue','expense'].map((type) => <option key={type} value={type}>{pretty(type)}</option>)}</select></div>
            </div>
            <div><Label>Account name</Label><Input required value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} /></div>
            <div><Label>Subtype</Label><Input value={accountForm.subtype} onChange={(event) => setAccountForm({ ...accountForm, subtype: event.target.value })} placeholder="e.g. software subscriptions" /></div>
            <div><Label>Description</Label><Textarea value={accountForm.description} onChange={(event) => setAccountForm({ ...accountForm, description: event.target.value })} rows={3} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accountForm.allowPosting} onChange={(event) => setAccountForm({ ...accountForm, allowPosting: event.target.checked })} /> Allow journal posting to this account</label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setAccountDialog(false)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Create account</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={periodDialog} onOpenChange={setPeriodDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Open accounting period</DialogTitle><DialogDescription>Periods cannot overlap. Journal dates must fall inside an open period.</DialogDescription></DialogHeader>
          <form onSubmit={postPeriod} className="space-y-4">
            <div><Label>Period name</Label><Input required value={periodForm.name} onChange={(event) => setPeriodForm({ ...periodForm, name: event.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Start date</Label><Input required type="date" value={periodForm.startDate} onChange={(event) => setPeriodForm({ ...periodForm, startDate: event.target.value })} /></div><div><Label>End date</Label><Input required type="date" value={periodForm.endDate} onChange={(event) => setPeriodForm({ ...periodForm, endDate: event.target.value })} /></div></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setPeriodDialog(false)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Open period</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={journalDialog} onOpenChange={setJournalDialog}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Post balanced journal</DialogTitle><DialogDescription>Debits must equal credits exactly. Posted journals flow immediately to the General Ledger and Trial Balance.</DialogDescription></DialogHeader>
          <form onSubmit={postJournal} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><Label>Posting date</Label><Input required type="date" value={journalForm.entryDate} onChange={(event) => setJournalForm({ ...journalForm, entryDate: event.target.value })} /></div>
              <div><Label>Currency</Label><Input required maxLength={3} value={journalForm.currency} onChange={(event) => setJournalForm({ ...journalForm, currency: event.target.value.toUpperCase() })} /></div>
              <div className="sm:col-span-2"><Label>Reference</Label><Input value={journalForm.reference} onChange={(event) => setJournalForm({ ...journalForm, reference: event.target.value })} placeholder="Bank ref, memo, adjustment ref…" /></div>
            </div>
            <div><Label>Journal description</Label><Textarea required value={journalForm.description} onChange={(event) => setJournalForm({ ...journalForm, description: event.target.value })} rows={2} /></div>

            <div className="space-y-2">
              <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_140px_140px_40px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:grid"><span>Account</span><span>Line description</span><span>Debit</span><span>Credit</span><span /></div>
              {journalForm.lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border/60 p-3 md:grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_140px_140px_40px] md:items-center md:border-0 md:p-0">
                  <select required value={line.accountId} onChange={(event) => updateJournalLine(index, { accountId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select>
                  <Input value={line.description} onChange={(event) => updateJournalLine(index, { description: event.target.value })} placeholder="Optional line memo" />
                  <Input inputMode="decimal" value={line.debit} onChange={(event) => updateJournalLine(index, { debit: event.target.value, credit: event.target.value && Number(event.target.value) > 0 ? '' : line.credit })} placeholder="0.00" />
                  <Input inputMode="decimal" value={line.credit} onChange={(event) => updateJournalLine(index, { credit: event.target.value, debit: event.target.value && Number(event.target.value) > 0 ? '' : line.debit })} placeholder="0.00" />
                  <Button type="button" variant="ghost" size="icon" disabled={journalForm.lines.length <= 2} onClick={() => setJournalForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} aria-label="Remove journal line"><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setJournalForm((current) => ({ ...current, lines: [...current.lines, { accountId: '', description: '', debit: '', credit: '' }] }))}><Plus className="mr-2 size-3.5" /> Add line</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Total debit</p><p className="mt-1 font-semibold">{money(journalTotals.debit, journalForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Total credit</p><p className="mt-1 font-semibold">{money(journalTotals.credit, journalForm.currency)}</p></div>
              <div className={Math.abs(journalTotals.debit - journalTotals.credit) < 0.005 && journalTotals.debit > 0 ? 'rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200' : 'rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200'}><p className="text-[10px] uppercase tracking-[0.1em]">Control difference</p><p className="mt-1 font-semibold">{money(Math.abs(journalTotals.debit - journalTotals.credit), journalForm.currency)}</p></div>
            </div>

            {!openPeriods.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">No accounting period is open. Create an open period before posting.</div>}

            <DialogFooter><Button type="button" variant="outline" onClick={() => setJournalDialog(false)}>Cancel</Button><Button disabled={saving || !openPeriods.length || journalTotals.debit <= 0 || Math.abs(journalTotals.debit - journalTotals.credit) >= 0.005}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Post journal</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reversalJournal)} onOpenChange={(open) => { if (!open) setReversalJournal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reverse posted journal?</DialogTitle>
            <DialogDescription>
              The original journal will remain in history and a new journal with equal opposite entries will be posted. No ledger lines are edited or deleted.
            </DialogDescription>
          </DialogHeader>
          {reversalJournal && (
            <form onSubmit={reverseJournal} className="space-y-4">
              <div className="rounded-xl bg-muted/35 p-3">
                <p className="font-mono text-xs font-semibold">{reversalJournal.journalNumber}</p>
                <p className="mt-1 text-sm">{reversalJournal.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{money(reversalJournal.totalDebit, reversalJournal.currency)} · {date(reversalJournal.entryDate)}</p>
              </div>
              <div><Label>Reversal date</Label><Input required type="date" value={reversalForm.entryDate} min={reversalJournal.entryDate.slice(0, 10)} onChange={(event) => setReversalForm({ ...reversalForm, entryDate: event.target.value })} /></div>
              <div><Label>Reason</Label><Textarea required rows={3} value={reversalForm.reason} onChange={(event) => setReversalForm({ ...reversalForm, reason: event.target.value })} placeholder="Explain why this posted journal must be reversed." /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setReversalJournal(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Post reversal</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(periodAction)} onOpenChange={(open) => { if (!open) setPeriodAction(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{periodAction?.action === 'close' ? 'Close accounting period?' : 'Reopen accounting period?'}</DialogTitle>
            <DialogDescription>
              {periodAction?.action === 'close'
                ? 'Closing prevents any new journal from posting into this period. Existing posted journals remain unchanged.'
                : 'Reopening permits new postings into a previously closed period and requires super-admin authority.'}
            </DialogDescription>
          </DialogHeader>
          {periodAction && <div className="rounded-xl bg-muted/35 p-3 text-sm"><p className="font-semibold">{periodAction.period.name}</p><p className="mt-1 text-xs text-muted-foreground">{date(periodAction.period.startDate)} – {date(periodAction.period.endDate)}</p></div>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setPeriodAction(null)}>Cancel</Button><Button type="button" variant={periodAction?.action === 'close' ? 'destructive' : 'default'} disabled={saving} onClick={() => void applyPeriodAction()}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{periodAction?.action === 'close' ? 'Close period' : 'Reopen period'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
