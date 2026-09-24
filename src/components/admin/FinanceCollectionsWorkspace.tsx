'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CircleAlert,
  Clock3,
  HandCoins,
  History,
  Loader2,
  MessageSquareText,
  PhoneCall,
  RefreshCw,
  Send,
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

type Activity = {
  id: string;
  type: string;
  note: string;
  promisedAmount: string | null;
  promisedDate: string | null;
  nextFollowUpAt: string | null;
  completedAt: string | null;
  smsMessageId: string;
  createdBy: string;
  createdAt: string;
};

type CollectionItem = {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  customer: string;
  contactName: string;
  email: string;
  phone: string;
  service: string;
  planName: string;
  currency: string;
  total: string;
  balance: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  bucket: string;
  invoiceStatus: string;
  collectionState: string;
  openFollowUp: {
    id: string;
    nextFollowUpAt: string;
    createdBy: string;
  } | null;
  latestPromise: {
    promisedAmount: string | null;
    promisedDate: string;
    note: string;
  } | null;
  activities: Activity[];
};

type CollectionsData = {
  items: CollectionItem[];
  summary: {
    totalsByCurrency: Record<string, {
      outstanding: string;
      overdue: string;
      promised: string;
    }>;
    invoices: number;
    followUpDue: number;
    brokenPromises: number;
  };
  smsConfigured: boolean;
};

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

function stateTone(state: string): string {
  if (state === 'broken_promise') return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (state === 'follow_up_due') return 'border-0 bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200';
  if (state === 'promised') return 'border-0 bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
  if (state === 'overdue') return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload.data as T;
}

export default function FinanceCollectionsWorkspace({
  onOpenInvoice,
  initialQuery = '',
}: {
  onOpenInvoice: (invoiceId: string) => void;
  initialQuery?: string;
}) {
  const [data, setData] = useState<CollectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQuery);
  const [bucket, setBucket] = useState('all');
  const [state, setState] = useState('all');
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState('');
  const [form, setForm] = useState({
    type: 'call',
    note: '',
    promisedAmount: '',
    promisedDate: '',
    nextFollowUpAt: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (bucket !== 'all') params.set('bucket', bucket);
      if (state !== 'all') params.set('state', state);
      const result = await request<CollectionsData>('/api/admin/finance/collections?' + params.toString());
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load collection queue');
    } finally {
      setLoading(false);
    }
  }, [q, bucket, state]);

  useEffect(() => {
    if (initialQuery) setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals = useMemo(() => Object.entries(data?.summary.totalsByCurrency || {}), [data]);
  const totalText = (key: 'outstanding' | 'overdue' | 'promised') =>
    totals.length ? totals.map(([currency, item]) => money(item[key], currency)).join(' · ') : '—';

  const openActivity = (item: CollectionItem) => {
    setSelected(item);
    setForm({
      type: 'call',
      note: '',
      promisedAmount: '',
      promisedDate: '',
      nextFollowUpAt: '',
    });
    setActivityOpen(true);
  };

  const submitActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await request('/api/admin/finance/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selected.id,
          type: form.type,
          note: form.note,
          promisedAmount: form.type === 'promise_to_pay' ? Number(form.promisedAmount || 0) : null,
          promisedDate: form.type === 'promise_to_pay' && form.promisedDate ? form.promisedDate : null,
          nextFollowUpAt: form.nextFollowUpAt || null,
        }),
      });
      toast.success(form.type === 'sms_reminder' ? 'Payment reminder sent and logged' : 'Collection activity logged');
      setActivityOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to log collection activity');
    } finally {
      setSaving(false);
    }
  };

  const completeFollowUp = async (activityId: string) => {
    setCompletingId(activityId);
    try {
      await request('/api/admin/finance/collections/' + activityId, { method: 'PATCH' });
      toast.success('Follow-up marked complete');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete follow-up');
    } finally {
      setCompletingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Outstanding', totalText('outstanding'), HandCoins],
          ['Overdue', totalText('overdue'), CircleAlert],
          ['Promised', totalText('promised'), CalendarCheck2],
          ['Follow-ups due', String(data?.summary.followUpDue || 0), Clock3],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)} className="border-border/60">
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p>
                <p className="mt-2 truncate text-xl font-bold">{String(value)}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Receivables collection queue</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Work outstanding invoices, promises to pay and scheduled follow-ups from one auditable queue.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
              Refresh
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search customer, invoice, service, phone or email" />
            <select value={bucket} onChange={(event) => setBucket(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All ageing buckets</option>
              <option value="current">Current</option>
              <option value="1_30">1–30 days</option>
              <option value="31_60">31–60 days</option>
              <option value="61_90">61–90 days</option>
              <option value="90_plus">90+ days</option>
            </select>
            <select value={state} onChange={(event) => setState(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All collection states</option>
              <option value="follow_up_due">Follow-up due</option>
              <option value="broken_promise">Broken promise</option>
              <option value="promised">Promised</option>
              <option value="overdue">Overdue</option>
              <option value="current">Current</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-receivables-collection-queue" className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / invoice</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead data-export-ignore className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <button type="button" onClick={() => onOpenInvoice(item.id)} className="text-left">
                        <p className="font-medium hover:underline">{item.customer}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{item.invoiceNumber}</p>
                      </button>
                      <p className="mt-1 text-[10px] text-muted-foreground">{item.contactName || item.email || item.phone || 'No contact details'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.service || 'General account'}</p>
                      <p className="text-[10px] text-muted-foreground">{item.planName || '—'}</p>
                    </TableCell>
                    <TableCell>
                      {item.daysOverdue > 0 ? (
                        <><p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{item.daysOverdue} days overdue</p><p className="text-[10px] text-muted-foreground">Due {new Date(item.dueDate).toLocaleDateString()}</p></>
                      ) : (
                        <><p className="text-sm font-medium">Current</p><p className="text-[10px] text-muted-foreground">Due {new Date(item.dueDate).toLocaleDateString()}</p></>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={stateTone(item.collectionState)}>{pretty(item.collectionState)}</Badge>
                      {item.latestPromise?.promisedDate && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Promise {item.latestPromise.promisedAmount ? money(item.latestPromise.promisedAmount, item.currency) : ''} · {new Date(item.latestPromise.promisedDate).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.openFollowUp?.nextFollowUpAt ? (
                        <div>
                          <p className="text-xs font-medium">{new Date(item.openFollowUp.nextFollowUpAt).toLocaleDateString()}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-7 px-2 text-[11px]"
                            disabled={completingId === item.openFollowUp.id}
                            onClick={() => void completeFollowUp(item.openFollowUp!.id)}
                          >
                            {completingId === item.openFollowUp.id && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                            Mark complete
                          </Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Not scheduled</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{money(item.balance, item.currency)}</TableCell>
                    <TableCell data-export-ignore>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => { setSelected(item); setHistoryOpen(true); }}>
                          <History className="mr-1.5 size-3.5" /> History
                        </Button>
                        <Button type="button" size="sm" onClick={() => openActivity(item)}>
                          <MessageSquareText className="mr-1.5 size-3.5" /> Log action
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !data?.items.length && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No outstanding invoices match these filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collection action · {selected?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitActivity} className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>{selected?.customer}</span>
                <strong>{selected ? money(selected.balance, selected.currency) : '—'}</strong>
              </div>
            </div>
            <div>
              <Label>Action</Label>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="call">Phone call</option>
                <option value="email">Email contact</option>
                <option value="follow_up">Follow-up note</option>
                <option value="promise_to_pay">Promise to pay</option>
                <option value="note">Internal note</option>
                <option value="sms_reminder">Send Hubtel payment reminder</option>
              </select>
            </div>
            {form.type === 'promise_to_pay' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Promised amount</Label><Input required type="number" min="0.01" step="0.01" max={selected?.balance || undefined} value={form.promisedAmount} onChange={(event) => setForm({ ...form, promisedAmount: event.target.value })} /></div>
                <div><Label>Promise date</Label><Input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.promisedDate} onChange={(event) => setForm({ ...form, promisedDate: event.target.value })} /></div>
              </div>
            )}
            <div>
              <Label>Next follow-up</Label>
              <Input type="date" min={new Date().toISOString().slice(0, 10)} value={form.nextFollowUpAt} onChange={(event) => setForm({ ...form, nextFollowUpAt: event.target.value })} />
            </div>
            <div>
              <Label>{form.type === 'sms_reminder' ? 'Internal note (optional)' : 'Notes'}</Label>
              <Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} rows={4} placeholder="Record what was discussed, agreed or needs to happen next." />
            </div>
            {form.type === 'sms_reminder' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <div className="flex gap-2">
                  <Send className="mt-0.5 size-4 shrink-0" />
                  <span>
                    This sends the approved payment-due template immediately to the client&apos;s primary phone through Hubtel and logs the reminder. Duplicate reminders are blocked for 12 hours.
                    {!data?.smsConfigured && ' Hubtel SMS is currently not configured.'}
                  </span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || (form.type === 'sms_reminder' && !data?.smsConfigured)}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {form.type === 'sms_reminder' ? 'Send reminder & log' : 'Save activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Collection history · {selected?.invoiceNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {selected?.activities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {activity.type === 'call' ? <PhoneCall className="size-4 text-amber-700" /> : <MessageSquareText className="size-4 text-amber-700" />}
                    <p className="text-sm font-semibold">{pretty(activity.type)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                </div>
                {activity.note && <p className="mt-2 text-sm leading-6">{activity.note}</p>}
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
                  <span>By {activity.createdBy}</span>
                  {activity.promisedAmount && selected && <span>Promised {money(activity.promisedAmount, selected.currency)}</span>}
                  {activity.promisedDate && <span>Promise date {new Date(activity.promisedDate).toLocaleDateString()}</span>}
                  {activity.nextFollowUpAt && <span>Follow-up {new Date(activity.nextFollowUpAt).toLocaleDateString()}{activity.completedAt ? ' · completed' : ''}</span>}
                  {activity.smsMessageId && <span>SMS logged</span>}
                </div>
              </div>
            ))}
            {!selected?.activities.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No collection activity has been recorded yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
