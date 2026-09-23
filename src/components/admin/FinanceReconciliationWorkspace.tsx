'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CheckCircle2,
  Landmark,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Unlink,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Batch = {
  id: string;
  batchNumber: string;
  channel: 'bank' | 'mobile_money';
  accountSystemKey: string;
  accountLabel: string;
  accountReference: string;
  currency: string;
  statementFrom: string;
  statementTo: string;
  openingBalance: string;
  closingBalance: string;
  status: 'open' | 'reconciled';
  importedBy: string;
  reconciledAt: string | null;
  reconciledBy: string;
  notes: string;
  statementMovement: string;
  expectedClosing: string;
  statementDifference: string;
  matchedCount: number;
  unmatchedCount: number;
  lineCount: number;
};

type Suggestion = {
  id: string;
  journalId: string;
  journalNumber: string;
  entryDate: string;
  description: string;
  reference: string;
  sourceType: string;
  debit: string;
  credit: string;
  accountCode: string;
  accountName: string;
  score: number;
};

type DetailLine = {
  id: string;
  transactionDate: string;
  description: string;
  reference: string;
  direction: 'in' | 'out';
  amount: string;
  status: 'unmatched' | 'matched';
  matchedJournalLineId: string | null;
  matchedJournalLine: null | {
    id: string;
    debit: string;
    credit: string;
    account: { code: string; name: string; systemKey: string };
    entry: {
      id: string;
      journalNumber: string;
      entryDate: string;
      currency: string;
      description: string;
      reference: string;
      sourceType: string;
    };
  };
  suggestions: Suggestion[];
};

type BatchDetail = Batch & {
  lines: DetailLine[];
};

type FormLine = {
  transactionDate: string;
  description: string;
  reference: string;
  direction: 'in' | 'out';
  amount: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
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

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function date(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep proxy HTML responses out of the rendering path.
  }
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload.data as T;
}

export default function FinanceReconciliationWorkspace() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    channel: 'bank' as 'bank' | 'mobile_money',
    accountLabel: '',
    accountReference: '',
    currency: 'GHS',
    statementFrom: firstDayOfMonth(),
    statementTo: today(),
    openingBalance: '',
    closingBalance: '',
    notes: '',
    lines: [
      {
        transactionDate: today(),
        description: '',
        reference: '',
        direction: 'in' as 'in' | 'out',
        amount: '',
      },
    ] as FormLine[],
  });

  const statementMovement = useMemo(
    () => form.lines.reduce(
      (sum, line) => sum + (line.direction === 'in' ? 1 : -1) * Number(line.amount || 0),
      0,
    ),
    [form.lines],
  );
  const calculatedClosing = Number(form.openingBalance || 0) + statementMovement;
  const createDifference = calculatedClosing - Number(form.closingBalance || 0);

  const load = async () => {
    setLoading(true);
    try {
      setBatches(await api<Batch[]>('/api/admin/finance/accounting/reconciliation'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load reconciliations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      setSelected(await api<BatchDetail>('/api/admin/finance/accounting/reconciliation/' + encodeURIComponent(id)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load reconciliation review');
    } finally {
      setDetailLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      channel: 'bank',
      accountLabel: '',
      accountReference: '',
      currency: 'GHS',
      statementFrom: firstDayOfMonth(),
      statementTo: today(),
      openingBalance: '',
      closingBalance: '',
      notes: '',
      lines: [{
        transactionDate: today(),
        description: '',
        reference: '',
        direction: 'in',
        amount: '',
      }],
    });
  };

  const createBatch = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await api<BatchDetail>('/api/admin/finance/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Statement batch created for reconciliation');
      setCreateOpen(false);
      resetForm();
      await load();
      await loadDetail(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create reconciliation batch');
    } finally {
      setSaving(false);
    }
  };

  const updateLine = (index: number, patch: Partial<FormLine>) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  const match = async (lineId: string, journalLineId: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await api('/api/admin/finance/accounting/reconciliation/' + encodeURIComponent(selected.id) + '/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'match', lineId, journalLineId }),
      });
      toast.success('Statement line matched to ledger movement');
      await Promise.all([load(), loadDetail(selected.id)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to match statement line');
    } finally {
      setSaving(false);
    }
  };

  const unmatch = async (lineId: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await api('/api/admin/finance/accounting/reconciliation/' + encodeURIComponent(selected.id) + '/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unmatch', lineId }),
      });
      toast.success('Ledger match removed');
      await Promise.all([load(), loadDetail(selected.id)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove reconciliation match');
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api('/api/admin/finance/accounting/reconciliation/' + encodeURIComponent(selected.id) + '/finalize', {
        method: 'POST',
      });
      toast.success('Bank/mobile-money reconciliation finalized');
      await Promise.all([load(), loadDetail(selected.id)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to finalize reconciliation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Bank & mobile-money reconciliation</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Match statement activity to posted cash-equivalent ledger movements and prove the closing balance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New statement batch
          </Button>
        </div>
      </div>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-base">Reconciliation register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table exportFileName="lightworld-reconciliation-register" className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Statement period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead className="text-right">Closing balance</TableHead>
                <TableHead className="text-right">Control difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow
                  key={batch.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => void loadDetail(batch.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void loadDetail(batch.id);
                    }
                  }}
                >
                  <TableCell>
                    <p className="font-mono text-xs font-semibold">{batch.batchNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{batch.currency}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {batch.channel === 'bank' ? <Landmark className="size-4 text-amber-700" /> : <Smartphone className="size-4 text-amber-700" />}
                      <div>
                        <p className="font-medium">{batch.accountLabel}</p>
                        <p className="text-[10px] text-muted-foreground">{batch.accountReference || pretty(batch.channel)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{date(batch.statementFrom)} – {date(batch.statementTo)}</TableCell>
                  <TableCell>
                    <Badge className={batch.status === 'reconciled'
                      ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}>
                      {pretty(batch.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{batch.matchedCount} / {batch.lineCount}</TableCell>
                  <TableCell className="text-right font-semibold">{money(batch.closingBalance, batch.currency)}</TableCell>
                  <TableCell className="text-right">
                    <span className={Math.abs(Number(batch.statementDifference)) <= 0.01 ? 'text-emerald-700' : 'text-rose-700'}>
                      {money(batch.statementDifference, batch.currency)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!batches.length && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No reconciliation batches recorded yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => !saving && setCreateOpen(open)}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New reconciliation statement batch</DialogTitle>
            <DialogDescription>
              Enter the statement opening/closing balances and transaction lines. The batch cannot be created unless the lines reproduce the closing balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createBatch} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label>Channel</Label>
                <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value as 'bank' | 'mobile_money' })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="bank">Bank</option>
                  <option value="mobile_money">Mobile money</option>
                </select>
              </div>
              <div><Label>Account / wallet name</Label><Input required value={form.accountLabel} onChange={(event) => setForm({ ...form, accountLabel: event.target.value })} placeholder={form.channel === 'bank' ? 'Main operating bank account' : 'MTN MoMo merchant wallet'} /></div>
              <div><Label>Account reference</Label><Input value={form.accountReference} onChange={(event) => setForm({ ...form, accountReference: event.target.value })} placeholder="Last 4 digits / wallet number" /></div>
              <div><Label>Currency</Label><Input required maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><Label>Statement from</Label><Input required type="date" value={form.statementFrom} onChange={(event) => setForm({ ...form, statementFrom: event.target.value })} /></div>
              <div><Label>Statement to</Label><Input required type="date" value={form.statementTo} onChange={(event) => setForm({ ...form, statementTo: event.target.value })} /></div>
              <div><Label>Opening balance</Label><Input required type="number" step="0.01" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: event.target.value })} /></div>
              <div><Label>Closing balance</Label><Input required type="number" step="0.01" value={form.closingBalance} onChange={(event) => setForm({ ...form, closingBalance: event.target.value })} /></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Statement movement</p><p className="mt-1 font-semibold">{money(statementMovement, form.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Calculated closing</p><p className="mt-1 font-semibold">{money(calculatedClosing, form.currency)}</p></div>
              <div className={Math.abs(createDifference) <= 0.01 ? 'rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200' : 'rounded-xl bg-rose-50 p-3 text-rose-800 dark:bg-rose-950/20 dark:text-rose-200'}>
                <p className="text-[10px] uppercase tracking-[0.1em]">Control difference</p>
                <p className="mt-1 font-semibold">{money(createDifference, form.currency)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="hidden grid-cols-[150px_110px_minmax(180px,1fr)_170px_140px_40px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:grid">
                <span>Date</span><span>Direction</span><span>Description</span><span>Reference</span><span>Amount</span><span />
              </div>
              {form.lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border/60 p-3 lg:grid-cols-[150px_110px_minmax(180px,1fr)_170px_140px_40px] lg:items-center lg:border-0 lg:p-0">
                  <Input required type="date" value={line.transactionDate} onChange={(event) => updateLine(index, { transactionDate: event.target.value })} />
                  <select value={line.direction} onChange={(event) => updateLine(index, { direction: event.target.value as 'in' | 'out' })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="in">Money in</option><option value="out">Money out</option></select>
                  <Input required value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="Statement narration" />
                  <Input value={line.reference} onChange={(event) => updateLine(index, { reference: event.target.value })} placeholder="Bank/MoMo reference" />
                  <Input required type="number" min="0.01" step="0.01" value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} />
                  <Button type="button" variant="ghost" size="icon" disabled={form.lines.length <= 1} onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} aria-label="Remove statement line"><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, { transactionDate: current.statementTo || today(), description: '', reference: '', direction: 'in', amount: '' }] }))}>
                <Plus className="mr-2 size-3.5" /> Add statement line
              </Button>
            </div>

            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
              <Button disabled={saving || Math.abs(createDifference) > 0.01 || !form.lines.length}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create reconciliation batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !saving && !open && setSelected(null)}>
        <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reconciliation review</DialogTitle>
            <DialogDescription>
              Match each statement transaction to one posted ledger movement. A ledger line cannot be matched twice.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && !selected && <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading reconciliation…</div>}

          {selected && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Batch</p><p className="mt-1 font-mono text-sm font-semibold">{selected.batchNumber}</p></div>
                <div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Statement closing</p><p className="mt-1 font-semibold">{money(selected.closingBalance, selected.currency)}</p></div>
                <div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Matched</p><p className="mt-1 font-semibold">{selected.matchedCount} / {selected.lineCount}</p></div>
                <div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Status</p><p className="mt-1 font-semibold">{pretty(selected.status)}</p></div>
              </div>

              <div className="space-y-3">
                {selected.lines.map((line) => (
                  <Card key={line.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{line.direction === 'in' ? 'Money in' : 'Money out'}</Badge>
                            <span className="text-xs text-muted-foreground">{date(line.transactionDate)}</span>
                            <strong>{money(line.amount, selected.currency)}</strong>
                          </div>
                          <p className="mt-2 text-sm font-medium">{line.description}</p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{line.reference || 'No statement reference'}</p>
                        </div>

                        {line.status === 'matched' && line.matchedJournalLine ? (
                          <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/10 xl:w-[420px]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-semibold">{line.matchedJournalLine.entry.journalNumber}</p>
                                <p className="mt-1 truncate text-xs">{line.matchedJournalLine.entry.description}</p>
                                <p className="mt-1 text-[10px] text-muted-foreground">{date(line.matchedJournalLine.entry.entryDate)} · {line.matchedJournalLine.entry.reference || pretty(line.matchedJournalLine.entry.sourceType)}</p>
                              </div>
                              <Button type="button" size="sm" variant="outline" onClick={() => void unmatch(line.id)} disabled={saving || selected.status === 'reconciled'}>
                                <Unlink className="mr-1.5 size-3.5" /> Unmatch
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0 xl:w-[520px]">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ledger candidates</p>
                            <div className="space-y-2">
                              {line.suggestions.map((suggestion) => (
                                <button
                                  type="button"
                                  key={suggestion.id}
                                  disabled={saving}
                                  onClick={() => void match(line.id, suggestion.id)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40 disabled:opacity-60 dark:hover:bg-amber-950/10"
                                >
                                  <div className="min-w-0">
                                    <p className="font-mono text-xs font-semibold">{suggestion.journalNumber}</p>
                                    <p className="mt-1 truncate text-xs">{suggestion.description}</p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">{date(suggestion.entryDate)} · {suggestion.reference || pretty(suggestion.sourceType)}</p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-xs font-semibold">{line.direction === 'in' ? money(suggestion.debit, selected.currency) : money(suggestion.credit, selected.currency)}</p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">Score {suggestion.score}</p>
                                  </div>
                                </button>
                              ))}
                              {!line.suggestions.length && (
                                <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                                  No exact amount/date ledger candidate was found within ±7 days.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Final reconciliation control</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Finalization requires every line matched and the General Ledger closing balance to equal the statement closing balance.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void finalize()}
                  disabled={saving || selected.status === 'reconciled' || selected.unmatchedCount > 0 || Math.abs(Number(selected.statementDifference)) > 0.01}
                >
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  {selected.status === 'reconciled' ? 'Reconciled' : 'Finalize reconciliation'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
