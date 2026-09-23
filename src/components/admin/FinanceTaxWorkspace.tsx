'use client';

import { useEffect, useState } from 'react';
import { Landmark, Loader2, RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TaxProfile = {
  id: string;
  countryCode: string;
  enabled: boolean;
  vatRegistrationNumber: string;
  vatRate: string;
  nhilRate: string;
  getfundRate: string;
  effectiveFrom: string;
  updatedBy: string;
  canManage: boolean;
  effectiveRate: string;
};

type TaxCurrency = {
  standardSales: string;
  zeroRatedSales: string;
  exemptSales: string;
  nonTaxSales: string;
  output: { vat: string; nhil: string; getfund: string; total: string };
  creditNotes: { vat: string; nhil: string; getfund: string; total: string };
  input: {
    recoverablePurchases: string;
    nonRecoverablePurchases: string;
    vat: string;
    nhil: string;
    getfund: string;
    total: string;
  };
  net: {
    vat: string;
    nhil: string;
    getfund: string;
    total: string;
    position: 'payable' | 'credit' | 'nil';
  };
  legacy: { outputTax: string; creditTax: string; netTax: string };
  counts: { invoices: number; creditNotes: number; supplierBills: number };
};

type TaxReport = {
  from: string;
  to: string;
  currency: string | null;
  profile: Omit<TaxProfile, 'id' | 'updatedBy' | 'canManage'> | null;
  byCurrency: Record<string, TaxCurrency>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function money(value: string | number, currency: string) {
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

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

async function readApi<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const raw = await response.text();
  let payload: any = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload.data as T;
}

export default function FinanceTaxWorkspace() {
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [report, setReport] = useState<TaxReport | null>(null);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    vatRegistrationNumber: '',
    vatRate: '15.00',
    nhilRate: '2.50',
    getfundRate: '2.50',
    effectiveFrom: '2026-01-01',
  });

  const load = async () => {
    setLoading(true);
    try {
      const nextProfile = await readApi<TaxProfile>('/api/admin/finance/accounting/tax/profile');
      const query = new URLSearchParams({ from, to });
      if (currency) query.set('currency', currency);
      const nextReport = await readApi<TaxReport>('/api/admin/finance/accounting/tax/report?' + query.toString());
      setProfile(nextProfile);
      setReport(nextReport);
      setForm({
        enabled: nextProfile.enabled,
        vatRegistrationNumber: nextProfile.vatRegistrationNumber,
        vatRate: nextProfile.vatRate,
        nhilRate: nextProfile.nhilRate,
        getfundRate: nextProfile.getfundRate,
        effectiveFrom: nextProfile.effectiveFrom.slice(0, 10),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load tax control');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // initial period only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/accounting/tax/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vatRate: Number(form.vatRate),
          nhilRate: Number(form.nhilRate),
          getfundRate: Number(form.getfundRate),
        }),
      });
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (!response.ok) throw new Error(payload?.error || 'Unable to save tax profile');
      toast.success('Ghana statutory tax profile updated');
      setSettingsOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save tax profile');
    } finally {
      setSaving(false);
    }
  };

  const entries = Object.entries(report?.byCurrency || {});

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <Landmark className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Ghana VAT, NHIL & GETFund control</p>
                  <Badge className={profile?.enabled
                    ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}>
                    {profile?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Standard-rated invoices and eligible supplier input tax use the governed statutory profile and immutable transaction snapshots.
                </p>
                {profile && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    VAT {profile.vatRate}% · NHIL {profile.nhilRate}% · GETFund {profile.getfundRate}% · effective rate {profile.effectiveRate}% · effective {date(profile.effectiveFrom)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
                Refresh
              </Button>
              {profile?.canManage && (
                <Button type="button" size="sm" onClick={() => setSettingsOpen(true)}>
                  <SlidersHorizontal className="mr-2 size-3.5" />
                  Tax profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-base">Tax control report</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Output tax less credit-note reversals and eligible input tax. Currencies remain separate.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[150px_150px_110px_auto]">
              <div><Label className="text-[10px] uppercase tracking-[0.1em]">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label className="text-[10px] uppercase tracking-[0.1em]">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              <div><Label className="text-[10px] uppercase tracking-[0.1em]">Currency</Label><Input maxLength={3} placeholder="All" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></div>
              <Button type="button" className="self-end" onClick={() => void load()} disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}Run report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {entries.map(([code, row]) => (
        <div key={code} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Output tax</p><p className="mt-1 text-xl font-bold">{money(row.output.total, code)}</p></CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Credit-note reversal</p><p className="mt-1 text-xl font-bold">{money(row.creditNotes.total, code)}</p></CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Recoverable input tax</p><p className="mt-1 text-xl font-bold">{money(row.input.total, code)}</p></CardContent></Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Net tax position</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{money(Math.abs(Number(row.net.total)), code)}</p>
                  <Badge className={row.net.position === 'payable'
                    ? 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                    : row.net.position === 'credit'
                      ? 'border-0 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
                      : 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}>
                    {row.net.position}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <Card className="min-w-0 border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">{code} sales & output tax</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table exportFileName={'lightworld-output-tax-' + code.toLowerCase()}>
                  <TableHeader><TableRow><TableHead>Control</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Standard-rated taxable sales</TableCell><TableCell className="text-right">{money(row.standardSales, code)}</TableCell></TableRow>
                    <TableRow><TableCell>Zero-rated sales</TableCell><TableCell className="text-right">{money(row.zeroRatedSales, code)}</TableCell></TableRow>
                    <TableRow><TableCell>Exempt sales</TableCell><TableCell className="text-right">{money(row.exemptSales, code)}</TableCell></TableRow>
                    <TableRow><TableCell>VAT output</TableCell><TableCell className="text-right">{money(row.output.vat, code)}</TableCell></TableRow>
                    <TableRow><TableCell>NHIL output</TableCell><TableCell className="text-right">{money(row.output.nhil, code)}</TableCell></TableRow>
                    <TableRow><TableCell>GETFund output</TableCell><TableCell className="text-right">{money(row.output.getfund, code)}</TableCell></TableRow>
                    <TableRow><TableCell>Less credit-note tax reversals</TableCell><TableCell className="text-right">({money(row.creditNotes.total, code)})</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">{code} input tax & net control</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table exportFileName={'lightworld-input-tax-' + code.toLowerCase()}>
                  <TableHeader><TableRow><TableHead>Control</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Eligible taxable purchases</TableCell><TableCell className="text-right">{money(row.input.recoverablePurchases, code)}</TableCell></TableRow>
                    <TableRow><TableCell>Non-recoverable taxable purchases</TableCell><TableCell className="text-right">{money(row.input.nonRecoverablePurchases, code)}</TableCell></TableRow>
                    <TableRow><TableCell>VAT input</TableCell><TableCell className="text-right">{money(row.input.vat, code)}</TableCell></TableRow>
                    <TableRow><TableCell>NHIL input</TableCell><TableCell className="text-right">{money(row.input.nhil, code)}</TableCell></TableRow>
                    <TableRow><TableCell>GETFund input</TableCell><TableCell className="text-right">{money(row.input.getfund, code)}</TableCell></TableRow>
                    <TableRow className="font-semibold"><TableCell>Net VAT</TableCell><TableCell className="text-right">{money(row.net.vat, code)}</TableCell></TableRow>
                    <TableRow className="font-semibold"><TableCell>Net NHIL</TableCell><TableCell className="text-right">{money(row.net.nhil, code)}</TableCell></TableRow>
                    <TableRow className="font-semibold"><TableCell>Net GETFund</TableCell><TableCell className="text-right">{money(row.net.getfund, code)}</TableCell></TableRow>
                    <TableRow className="bg-muted/40 text-base font-bold"><TableCell>Net tax control</TableCell><TableCell className="text-right">{money(row.net.total, code)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {(Number(row.legacy.outputTax) !== 0 || Number(row.legacy.creditTax) !== 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              Legacy tax activity exists in this period ({money(row.legacy.netTax, code)} net). It is intentionally kept separate because the historical record does not carry VAT/NHIL/GETFund component snapshots.
            </div>
          )}
        </div>
      ))}

      {!loading && !entries.length && (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No tax-bearing activity exists for the selected period.</CardContent></Card>
      )}

      <Dialog open={settingsOpen} onOpenChange={(open) => !saving && setSettingsOpen(open)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ghana statutory tax profile</DialogTitle>
            <DialogDescription>
              These rates are snapshotted onto new invoices and supplier bills. Changing them never rewrites existing documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-border/60 p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              <span><span className="font-medium">Enable Ghana standard VAT treatment</span><span className="mt-0.5 block text-xs text-muted-foreground">Enable only when the company is authorized/required to issue VAT invoices.</span></span>
            </label>
            <div><Label>VAT registration number</Label><Input value={form.vatRegistrationNumber} onChange={(e) => setForm({ ...form, vatRegistrationNumber: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>VAT %</Label><Input type="number" min="0" step="0.01" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} /></div>
              <div><Label>NHIL %</Label><Input type="number" min="0" step="0.01" value={form.nhilRate} onChange={(e) => setForm({ ...form, nhilRate: e.target.value })} /></div>
              <div><Label>GETFund %</Label><Input type="number" min="0" step="0.01" value={form.getfundRate} onChange={(e) => setForm({ ...form, getfundRate: e.target.value })} /></div>
            </div>
            <div><Label>Effective from</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
            <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-amber-700" /><span>Only super admins can change this statutory profile.</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={() => void saveProfile()} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save tax profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
