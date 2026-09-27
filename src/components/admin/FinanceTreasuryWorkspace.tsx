'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Landmark, Loader2, RefreshCw, Send, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireJson } from '@/lib/http-response';

type Vendor = { id: string; name: string };
type TreasuryLine = {
  id: string;
  vendorId: string;
  vendorName: string;
  payableNumber: string;
  dueDate: string;
  amount: string;
  status: string;
  approvalId: string;
  paymentId: string;
};
type TreasuryRun = {
  id: string;
  runNumber: string;
  status: string;
  currency: string;
  plannedDate: string;
  dueThrough: string;
  sourceSystemKey: 'cash' | 'bank' | 'mobile_money';
  sourceLabel: string;
  sourceReference: string;
  notes: string;
  preparedByName: string;
  submittedAt: string | null;
  totalAmount: string;
  lineCount: number;
  vendorCount: number;
  lines: TreasuryLine[];
};

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function money(value: string | number, currency: string) {
  try {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
  }
}
function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'executed') return 'default';
  if (status === 'needs_attention') return 'destructive';
  if (status === 'submitted') return 'secondary';
  return 'outline';
}

export default function FinanceTreasuryWorkspace({ vendors, onApprovals }: { vendors: Vendor[]; onApprovals: () => void }) {
  const [runs, setRuns] = useState<TreasuryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingId, setSubmittingId] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [confirmRun, setConfirmRun] = useState<TreasuryRun | null>(null);
  const [form, setForm] = useState({
    currency: 'GHS',
    plannedDate: today(),
    dueThrough: inDays(30),
    sourceSystemKey: 'bank' as 'cash' | 'bank' | 'mobile_money',
    sourceLabel: 'Primary operating account',
    sourceReference: '',
    vendorId: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/finance/treasury-runs', { cache: 'no-store' });
      const payload = await requireJson<any>(response, 'Unable to load treasury payment runs');
      setRuns(Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load treasury payment runs');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const activeTotal = useMemo(
    () => runs.filter((run) => ['draft', 'submitted'].includes(run.status)).reduce((sum, run) => sum + Number(run.totalAmount || 0), 0),
    [runs],
  );

  async function createRun(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/treasury-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await requireJson<any>(response, 'Unable to create treasury payment run');
      toast.success('Treasury payment run prepared', { description: payload.data.runNumber + ' · ' + money(payload.data.totalAmount, payload.data.currency) });
      setExpandedId(payload.data.id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create treasury payment run');
    } finally {
      setSaving(false);
    }
  }

  async function submitRun(run: TreasuryRun) {
    setSubmittingId(run.id);
    try {
      const response = await fetch('/api/admin/finance/treasury-runs/' + run.id + '/submit', { method: 'POST' });
      const payload = await requireJson<any>(response, 'Unable to submit treasury payment run');
      toast.success('Payment run submitted for independent approval', {
        description: String(payload?.data?.approvals?.length || 0) + ' supplier approval request(s) created.',
      });
      setConfirmRun(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit treasury payment run');
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4" /> Prepare supplier payment run</CardTitle>
            <p className="text-xs leading-5 text-muted-foreground">Build a controlled payment batch from evidenced open supplier bills. Draft and submitted runs reserve balances so the same payable cannot be planned twice.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRun} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><Label>Currency</Label><Input maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
                <div><Label>Planned payment date</Label><Input required type="date" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} /></div>
                <div><Label>Include bills due through</Label><Input required type="date" value={form.dueThrough} onChange={(e) => setForm({ ...form, dueThrough: e.target.value })} /></div>
                <div><Label>Supplier scope</Label><select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All eligible suppliers</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label>Cash channel</Label><select value={form.sourceSystemKey} onChange={(e) => setForm({ ...form, sourceSystemKey: e.target.value as typeof form.sourceSystemKey })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="bank">Bank</option><option value="mobile_money">Mobile money</option><option value="cash">Cash on hand</option></select></div>
                <div><Label>Source account / wallet label</Label><Input required value={form.sourceLabel} onChange={(e) => setForm({ ...form, sourceLabel: e.target.value })} /></div>
                <div><Label>Account reference</Label><Input placeholder="Bank suffix / MoMo wallet / cash desk" value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} /></div>
              </div>
              <div><Label>Planning notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Purpose, priority, funding constraints or reviewer context" /></div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">Only supplier bills with invoice evidence and an unreserved outstanding balance are included.</p>
                <Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />} Prepare payment run</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Treasury execution control</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Currently reserved in active runs</p>
              <p className="mt-1 text-2xl font-bold">{money(activeTotal, form.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Planning reservation only. Posted cash remains unchanged until supplier-payment approval executes.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase text-muted-foreground">Draft</p><strong>{runs.filter((run) => run.status === 'draft').length}</strong></div>
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase text-muted-foreground">In approval</p><strong>{runs.filter((run) => run.status === 'submitted').length}</strong></div>
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase text-muted-foreground">Needs attention</p><strong>{runs.filter((run) => run.status === 'needs_attention').length}</strong></div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={onApprovals}><CheckCircle2 className="mr-2 size-4" /> Open maker-checker approvals</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div><CardTitle className="text-base">Treasury payment runs</CardTitle><p className="mt-1 text-xs text-muted-foreground">Prepared → submitted for independent approval → executed into the posted supplier-payment ledger.</p></div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} /> Refresh</Button>
        </CardHeader>
        <CardContent>
          <div className="max-w-full overflow-x-auto rounded-xl border border-border/60">
            <Table exportFileName="lightworld-treasury-payment-runs" className="min-w-[980px]">
              <TableHeader><TableRow><TableHead>Run</TableHead><TableHead>Status</TableHead><TableHead>Planned</TableHead><TableHead>Source</TableHead><TableHead>Scope</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {runs.map((run) => <TableRow key={run.id}>
                  <TableCell><button type="button" onClick={() => setExpandedId(expandedId === run.id ? '' : run.id)} className="text-left font-semibold hover:underline">{run.runNumber}</button><p className="text-[10px] text-muted-foreground">{run.vendorCount} supplier{run.vendorCount === 1 ? '' : 's'} · {run.lineCount} bill{run.lineCount === 1 ? '' : 's'}</p></TableCell>
                  <TableCell><Badge variant={statusVariant(run.status)}>{run.status.replaceAll('_', ' ')}</Badge></TableCell>
                  <TableCell><p className="text-sm">{new Date(run.plannedDate).toLocaleDateString()}</p><p className="text-[10px] text-muted-foreground">Due through {new Date(run.dueThrough).toLocaleDateString()}</p></TableCell>
                  <TableCell><p className="flex items-center gap-1.5 text-sm">{run.sourceSystemKey === 'bank' ? <Landmark className="size-3.5" /> : <WalletCards className="size-3.5" />}{run.sourceLabel}</p><p className="text-[10px] text-muted-foreground">{run.sourceReference || run.sourceSystemKey.replaceAll('_', ' ')}</p></TableCell>
                  <TableCell><p className="text-sm">{run.preparedByName || 'Admin'}</p><p className="text-[10px] text-muted-foreground">{run.submittedAt ? 'Submitted ' + new Date(run.submittedAt).toLocaleString() : 'Prepared draft'}</p></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(run.totalAmount, run.currency)}</TableCell>
                  <TableCell className="text-right">{run.status === 'draft' ? <Button size="sm" onClick={() => setConfirmRun(run)} disabled={submittingId === run.id}>{submittingId === run.id ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Send className="mr-1 size-3.5" />} Submit</Button> : <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === run.id ? '' : run.id)}>Review</Button>}</TableCell>
                </TableRow>)}
                {!runs.length && !loading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No treasury payment runs have been prepared yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {expandedId && (() => {
            const run = runs.find((item) => item.id === expandedId);
            if (!run) return null;
            return <div className="mt-4 rounded-xl border border-border/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{run.runNumber} · bill detail</p><p className="text-xs text-muted-foreground">{run.notes || 'No planning notes.'}</p></div><strong>{money(run.totalAmount, run.currency)}</strong></div>
              <div className="max-w-full overflow-x-auto"><Table className="min-w-[720px]"><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Bill</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Planned amount</TableHead></TableRow></TableHeader><TableBody>{run.lines.map((line) => <TableRow key={line.id}><TableCell>{line.vendorName}</TableCell><TableCell>{line.payableNumber}</TableCell><TableCell>{new Date(line.dueDate).toLocaleDateString()}</TableCell><TableCell><Badge variant="outline">{line.status}</Badge></TableCell><TableCell className="text-right font-semibold tabular-nums">{money(line.amount, run.currency)}</TableCell></TableRow>)}</TableBody></Table></div>
            </div>;
          })()}
        </CardContent>
      </Card>

      <Dialog open={Boolean(confirmRun)} onOpenChange={(open) => !open && !submittingId && setConfirmRun(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit treasury payment run?</DialogTitle></DialogHeader>
          {confirmRun && <div className="space-y-3 text-sm">
            <p><strong>{confirmRun.runNumber}</strong> will create independent maker-checker approval requests for {confirmRun.vendorCount} supplier{confirmRun.vendorCount === 1 ? '' : 's'}.</p>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Planned amount</span><strong>{money(confirmRun.totalAmount, confirmRun.currency)}</strong></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Payment date</span><strong>{new Date(confirmRun.plannedDate).toLocaleDateString()}</strong></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Source</span><strong>{confirmRun.sourceLabel}</strong></div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Submitting reserves these payable amounts. It does not post cash or pay a supplier. Money leaves the posted ledger only after an independent finance approver completes the existing controlled supplier-payment workflow.</p>
          </div>}
          <DialogFooter><Button type="button" variant="outline" disabled={Boolean(submittingId)} onClick={() => setConfirmRun(null)}>Cancel</Button><Button type="button" disabled={!confirmRun || Boolean(submittingId)} onClick={() => confirmRun && void submitRun(confirmRun)}>{submittingId ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />} Submit for approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}