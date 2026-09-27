'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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

type Vendor = {
  id: string;
  name: string;
};

type Bill = {
  id: string;
  payableNumber: string;
  vendorId: string;
  currency: string;
  dueDate: string;
  balance: string;
  derivedStatus: string;
  attachments: Array<{ id: string }>;
};

type TreasuryPlan = {
  id: string;
  planNumber: string;
  vendorId: string;
  sourceAccountId: string;
  currency: string;
  amount: string;
  scheduledFor: string;
  method: string;
  reference: string;
  notes: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'executed' | 'rejected' | 'cancelled';
  approvalId: string;
  requestedByName: string;
  submittedAt: string | null;
  approvedByName: string;
  approvedAt: string | null;
  decisionNotes: string;
  executedByName: string;
  executedAt: string | null;
  resultPaymentId: string;
  resultPaymentNumber: string;
  vendor: { id: string; name: string };
  sourceAccount: { id: string; code: string; name: string; subtype: string; systemKey: string | null };
  allocations: Array<{ billId: string; amount: number }>;
};

type TreasuryAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  systemKey: string | null;
  kind: string;
  balances: Array<{
    currency: string;
    postedBalance: string;
    pendingCommitments: string;
    approvedCommitments: string;
    availableAfterApproved: string;
  }>;
};

type TreasuryData = {
  plans: TreasuryPlan[];
  sourceAccounts: TreasuryAccount[];
};

const today = () => new Date().toISOString().slice(0, 10);

function money(value: string | number, currency = 'GHS') {
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

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(status: TreasuryPlan['status']) {
  if (status === 'executed') return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (status === 'approved') return 'border-0 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200';
  if (status === 'pending_approval') return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  if (status === 'rejected' || status === 'cancelled') return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

async function readData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const raw = await response.text();
  let payload: any = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error(payload?.error || 'Treasury request failed');
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error('Treasury endpoint returned an empty response');
  }
  return payload.data as T;
}

export default function FinanceTreasuryWorkspace({
  vendors,
  bills,
  onOpenApprovals,
  onRefreshFinance,
}: {
  vendors: Vendor[];
  bills: Bill[];
  onOpenApprovals: () => void;
  onRefreshFinance: () => void | Promise<void>;
}) {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    vendorId: '',
    sourceAccountId: '',
    currency: 'GHS',
    amount: '',
    scheduledFor: today(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
    allocations: [{ billId: '', amount: '' }],
  });

  const load = async () => {
    setLoading(true);
    try {
      setData(await readData<TreasuryData>('/api/admin/finance/treasury/payment-plans'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load treasury workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const accountKind = form.method === 'cash'
    ? 'cash'
    : form.method === 'mobile_money'
      ? 'mobile_money'
      : 'bank';

  const sourceAccounts = useMemo(
    () => (data?.sourceAccounts || []).filter((account) =>
      account.systemKey === accountKind || account.subtype === accountKind
    ),
    [data?.sourceAccounts, accountKind],
  );

  const eligibleBills = useMemo(
    () => bills.filter((bill) =>
      bill.vendorId === form.vendorId &&
      bill.currency.toUpperCase() === form.currency.toUpperCase() &&
      Number(bill.balance || 0) > 0 &&
      !['paid', 'void'].includes(bill.derivedStatus)
    ),
    [bills, form.vendorId, form.currency],
  );

  const allocatedTotal = form.allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0,
  );

  useEffect(() => {
    if (form.sourceAccountId && !sourceAccounts.some((account) => account.id === form.sourceAccountId)) {
      setForm((current) => ({ ...current, sourceAccountId: '' }));
    }
  }, [form.sourceAccountId, sourceAccounts]);

  const resetForm = () => {
    setForm({
      vendorId: '',
      sourceAccountId: '',
      currency: 'GHS',
      amount: '',
      scheduledFor: today(),
      method: 'bank_transfer',
      reference: '',
      notes: '',
      allocations: [{ billId: '', amount: '' }],
    });
  };

  const createPlan = async (event: FormEvent) => {
    event.preventDefault();
    setWorkingId('create');
    try {
      await readData<TreasuryPlan>('/api/admin/finance/treasury/payment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount || 0),
          allocations: form.allocations
            .filter((item) => item.billId && Number(item.amount) > 0)
            .map((item) => ({ billId: item.billId, amount: Number(item.amount) })),
        }),
      });
      toast.success('Treasury payment plan created as draft');
      setDialogOpen(false);
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create treasury plan');
    } finally {
      setWorkingId('');
    }
  };

  const act = async (plan: TreasuryPlan, action: 'submit' | 'cancel' | 'execute') => {
    setWorkingId(plan.id + ':' + action);
    try {
      const response = await fetch(
        '/api/admin/finance/treasury/payment-plans/' + encodeURIComponent(plan.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (!response.ok) throw new Error(payload?.error || 'Treasury plan update failed');

      if (action === 'submit') {
        toast.success(
          'Treasury plan submitted for independent approval' +
          (payload?.data?.approvalNumber ? ' · ' + payload.data.approvalNumber : ''),
        );
      } else if (action === 'execute') {
        toast.success(
          'Treasury payment executed' +
          (payload?.data?.paymentNumber ? ' · ' + payload.data.paymentNumber : ''),
        );
        await onRefreshFinance();
      } else {
        toast.success('Treasury payment plan cancelled');
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update treasury plan');
    } finally {
      setWorkingId('');
    }
  };

  const allBalances = (data?.sourceAccounts || []).flatMap((account) =>
    account.balances.map((balance) => ({ account, ...balance }))
  );
  const approvedPlanCount = (data?.plans || []).filter((plan) => plan.status === 'approved').length;
  const pendingPlanCount = (data?.plans || []).filter((plan) => plan.status === 'pending_approval').length;

  return (
    <div className="space-y-5">
      <Card className="border-sky-300/60 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/10">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/80">
                <ShieldCheck className="size-5 text-sky-700 dark:text-sky-300" />
              </span>
              <div>
                <p className="font-semibold">Governed treasury execution</p>
                <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">
                  Planning does not change posted cash. A treasury plan becomes a commitment after independent approval,
                  and cash, supplier balances and journals change only when an authorized user explicitly executes the approved plan.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {pendingPlanCount} awaiting approval · {approvedPlanCount} approved for execution
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onOpenApprovals}>
                <ShieldCheck className="mr-2 size-4" /> Review approvals
              </Button>
              <Button type="button" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" /> New payment plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Liquidity & approved commitments</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Posted ledger liquidity is shown separately from pending and approved treasury commitments. Currencies are never converted.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? 'mr-1.5 size-3.5 animate-spin' : 'mr-1.5 size-3.5'} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-treasury-liquidity">
              <TableHeader>
                <TableRow>
                  <TableHead>Source account</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Posted liquidity</TableHead>
                  <TableHead className="text-right">Pending approval</TableHead>
                  <TableHead className="text-right">Approved commitments</TableHead>
                  <TableHead className="text-right">After approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBalances.map(({ account, currency, postedBalance, pendingCommitments, approvedCommitments, availableAfterApproved }) => (
                  <TableRow key={account.id + ':' + currency}>
                    <TableCell>
                      <p className="font-medium">{account.code} · {account.name}</p>
                      <p className="text-[10px] text-muted-foreground">{pretty(account.systemKey || account.subtype || 'asset')}</p>
                    </TableCell>
                    <TableCell className="font-semibold">{currency}</TableCell>
                    <TableCell className="text-right">{money(postedBalance, currency)}</TableCell>
                    <TableCell className="text-right">{money(pendingCommitments, currency)}</TableCell>
                    <TableCell className="text-right font-medium">{money(approvedCommitments, currency)}</TableCell>
                    <TableCell className={Number(availableAfterApproved) < 0 ? 'text-right font-semibold text-rose-700 dark:text-rose-300' : 'text-right font-semibold'}>
                      {money(availableAfterApproved, currency)}
                    </TableCell>
                  </TableRow>
                ))}
                {!allBalances.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No active cash, bank or mobile-money treasury accounts are available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Supplier payment plans</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Draft, approve and execute supplier cash-outs with a complete maker-checker and source-account audit trail.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-treasury-payment-plans">
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Source account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.plans || []).map((plan) => {
                  const due = new Date(plan.scheduledFor).getTime() <= Date.now();
                  const busy = workingId.startsWith(plan.id + ':');
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <p className="font-mono text-xs">{plan.planNumber}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{plan.allocations.length} bill allocation{plan.allocations.length === 1 ? '' : 's'}</p>
                      </TableCell>
                      <TableCell className="font-medium">{plan.vendor.name}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(plan.scheduledFor).toLocaleDateString()}
                        <p className="text-[10px] text-muted-foreground">{pretty(plan.method)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{plan.sourceAccount.code} · {plan.sourceAccount.name}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.reference || 'No payment reference yet'}</p>
                      </TableCell>
                      <TableCell><Badge className={statusTone(plan.status)}>{pretty(plan.status)}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{money(plan.amount, plan.currency)}</TableCell>
                      <TableCell className="text-xs">
                        {plan.resultPaymentNumber || '—'}
                        {plan.executedAt && <p className="text-[10px] text-muted-foreground">Executed {new Date(plan.executedAt).toLocaleString()}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {plan.status === 'draft' && (
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void act(plan, 'submit')}>
                              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                              <span className="ml-1.5">Submit</span>
                            </Button>
                          )}
                          {plan.status === 'approved' && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy || !due}
                              title={!due ? 'Execution is locked until the scheduled date' : 'Post the approved payment'}
                              onClick={() => void act(plan, 'execute')}
                            >
                              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                              <span className="ml-1.5">Execute</span>
                            </Button>
                          )}
                          {['draft', 'pending_approval', 'approved'].includes(plan.status) && (
                            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void act(plan, 'cancel')}>
                              <XCircle className="size-3.5" />
                              <span className="sr-only">Cancel plan</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!data?.plans.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No treasury payment plans have been created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prepare supplier treasury payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={createPlan} className="space-y-4">
            <div className="rounded-xl border border-sky-200/70 bg-sky-50/60 p-3 text-xs leading-5 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/15 dark:text-sky-100">
              This creates a draft only. It does not change posted liquidity, supplier balances, or the general ledger.
              Invoice evidence is required before the draft can be submitted for maker-checker approval.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Supplier</Label>
                <select
                  required
                  value={form.vendorId}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    vendorId: event.target.value,
                    allocations: [{ billId: '', amount: '' }],
                  }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select supplier</option>
                  {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Payment method</Label>
                <select
                  value={form.method}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    method: event.target.value,
                    sourceAccountId: '',
                  }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card / bank</option>
                  <option value="cheque">Cheque / bank</option>
                  <option value="other">Other / bank</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Source account</Label>
                <select
                  required
                  value={form.sourceAccountId}
                  onChange={(event) => setForm((current) => ({ ...current, sourceAccountId: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select {pretty(accountKind)} account</option>
                  {sourceAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  required
                  maxLength={3}
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    currency: event.target.value.toUpperCase(),
                    allocations: [{ billId: '', amount: '' }],
                  }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Planned amount</Label>
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>
              <div>
                <Label>Scheduled payment date</Label>
                <Input
                  required
                  type="date"
                  min={today()}
                  value={form.scheduledFor}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Payment / bank reference</Label>
              <Input
                value={form.reference}
                onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                placeholder={form.method === 'cash' ? 'Optional for cash' : 'Required before execution'}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Allocate to supplier bills</Label>
                  <p className="text-[10px] text-muted-foreground">Allocated: {money(allocatedTotal, form.currency)}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setForm((current) => ({
                    ...current,
                    allocations: [...current.allocations, { billId: '', amount: '' }],
                  }))}
                >
                  <Plus className="mr-1 size-3.5" /> Allocation
                </Button>
              </div>

              {form.allocations.map((allocation, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
                  <select
                    value={allocation.billId}
                    onChange={(event) => {
                      const billId = event.target.value;
                      const selected = eligibleBills.find((bill) => bill.id === billId);
                      setForm((current) => ({
                        ...current,
                        allocations: current.allocations.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, billId, amount: selected ? selected.balance : item.amount }
                            : item
                        ),
                      }));
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Unallocated supplier advance / choose bill</option>
                    {eligibleBills.map((bill) => (
                      <option
                        key={bill.id}
                        value={bill.id}
                        disabled={!bill.attachments.length || form.allocations.some((item, itemIndex) => itemIndex !== index && item.billId === bill.id)}
                      >
                        {bill.payableNumber} · {money(bill.balance, bill.currency)} · {new Date(bill.dueDate).toLocaleDateString()}
                        {bill.attachments.length ? '' : ' · invoice evidence required'}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={allocation.amount}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      allocations: current.allocations.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, amount: event.target.value } : item
                      ),
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm((current) => ({
                      ...current,
                      allocations: current.allocations.filter((_, itemIndex) => itemIndex !== index),
                    }))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label>Treasury notes</Label>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Purpose, supplier context, payment instruction or approval note"
              />
            </div>

            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-3">
              <div className="flex gap-2">
                <Landmark className="mt-0.5 size-4 text-sky-600" />
                <div><p className="text-[10px] text-muted-foreground">Source</p><p className="text-xs font-medium">{sourceAccounts.find((account) => account.id === form.sourceAccountId)?.name || 'Not selected'}</p></div>
              </div>
              <div className="flex gap-2">
                <CalendarClock className="mt-0.5 size-4 text-amber-600" />
                <div><p className="text-[10px] text-muted-foreground">Schedule</p><p className="text-xs font-medium">{form.scheduledFor || 'Not selected'}</p></div>
              </div>
              <div className="flex gap-2">
                <WalletCards className="mt-0.5 size-4 text-emerald-600" />
                <div><p className="text-[10px] text-muted-foreground">Plan</p><p className="text-xs font-medium">{money(form.amount || 0, form.currency)}</p></div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={workingId === 'create'}>
                {workingId === 'create' && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save draft
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}