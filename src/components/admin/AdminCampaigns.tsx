'use client';

import { readJsonResponse } from '@/lib/client-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CheckCircle2,
  Eye,
  FilePlus2,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Users,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface CampaignSummary {
  id: string;
  title: string;
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  status: 'draft' | 'ready' | 'sending' | 'sent';
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryCount: number;
}

interface CampaignDetail {
  campaign: CampaignSummary;
  summary: {
    activeSubscribers: number;
    sent: number;
    failed: number;
    remaining: number;
  };
  deliveries: Array<{
    id: string;
    recipient: string;
    status: string;
    transport: string;
    error: string;
    attempts: number;
    sentAt: string | null;
    updatedAt: string;
  }>;
}

interface CampaignForm {
  title: string;
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

const blankForm: CampaignForm = {
  title: '',
  subject: '',
  preheader: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
};

function statusBadge(status: CampaignSummary['status']) {
  const classes: Record<CampaignSummary['status'], string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    ready: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    sending: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
    sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  };
  return <Badge className={'border-0 ' + classes[status]}>{status}</Badge>;
}

function formFromCampaign(campaign: CampaignSummary): CampaignForm {
  return {
    title: campaign.title,
    subject: campaign.subject,
    preheader: campaign.preheader,
    body: campaign.body,
    ctaLabel: campaign.ctaLabel,
    ctaUrl: campaign.ctaUrl,
  };
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [form, setForm] = useState<CampaignForm>(blankForm);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CampaignForm>(blankForm);

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/newsletter/campaigns', { cache: 'no-store' });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Failed to load campaigns');
      setCampaigns(payload.data.campaigns || []);
      setActiveSubscribers(payload.data.activeSubscribers || 0);
      setSelectedId((current) => current || payload.data.campaigns?.[0]?.id || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/campaigns/' + encodeURIComponent(id), {
        cache: 'no-store',
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Failed to load campaign');
      setDetail(payload.data);
      setForm(formFromCampaign(payload.data.campaign));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaign');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selected = detail?.campaign;
  const immutable = selected?.status === 'sending' || selected?.status === 'sent';

  const dirty = useMemo(() => {
    if (!selected) return false;
    return JSON.stringify(form) !== JSON.stringify(formFromCampaign(selected));
  }, [form, selected]);

  const save = async (status?: 'draft' | 'ready') => {
    if (!selectedId || !selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/newsletter/campaigns/' + encodeURIComponent(selectedId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(status ? { status } : {}) }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Failed to save campaign');
      toast.success(status === 'ready' ? 'Campaign marked ready' : status === 'draft' ? 'Campaign returned to draft' : 'Campaign saved');
      await Promise.all([loadCampaigns(), loadDetail(selectedId)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Failed to create campaign');
      setCreateOpen(false);
      setCreateForm(blankForm);
      setSelectedId(payload.data.id);
      toast.success('Campaign draft created');
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const sendTest = async () => {
    if (!selectedId || !testEmail.trim()) return;
    if (dirty && !immutable) {
      toast.error('Save your changes before sending a test');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(
        '/api/admin/newsletter/campaigns/' + encodeURIComponent(selectedId) + '/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'test', email: testEmail.trim() }),
        },
      );
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.details || payload?.error || 'Campaign test failed');
      toast.success('Campaign test accepted by the mail transport');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign test failed');
    } finally {
      setTesting(false);
    }
  };

  const sendBatch = async () => {
    if (!selectedId || !selected) return;
    setSending(true);
    try {
      const response = await fetch(
        '/api/admin/newsletter/campaigns/' + encodeURIComponent(selectedId) + '/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'batch', batchSize: 10 }),
        },
      );
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Campaign batch failed');

      const result = payload.data;
      toast.success(
        result.status === 'sent'
          ? 'Campaign delivery complete'
          : 'Batch complete: ' + result.sentThisBatch + ' sent, ' + result.failedThisBatch + ' failed, ' + result.remaining + ' remaining',
      );
      await Promise.all([loadCampaigns(), loadDetail(selectedId)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign batch failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Communications"
        title="Newsletter Campaign Studio"
        description={'Draft, preview, test and deliver campaigns to ' + activeSubscribers + ' active subscriber' + (activeSubscribers === 1 ? '.' : 's.')}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadCampaigns()}>
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <FilePlus2 className="mr-2 size-4" /> New campaign
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns.length ? campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => setSelectedId(campaign.id)}
                className={
                  'w-full rounded-xl border p-3 text-left transition ' +
                  (selectedId === campaign.id
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
                    : 'border-border/60 hover:bg-muted/50')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold">{campaign.title}</p>
                  {statusBadge(campaign.status)}
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{campaign.subject}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Updated {new Date(campaign.updatedAt).toLocaleString()}
                </p>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No campaigns yet.
              </div>
            )}
          </CardContent>
        </Card>

        {!selectedId ? (
          <Card className="border-border/50">
            <CardContent className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
              Create a campaign to begin.
            </CardContent>
          </Card>
        ) : detailLoading || !detail ? (
          <Skeleton className="h-[620px] rounded-xl" />
        ) : (
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{selected?.title}</CardTitle>
                    <div className="mt-2 flex items-center gap-2">
                      {selected && statusBadge(selected.status)}
                      {dirty && !immutable && <Badge variant="outline">Unsaved changes</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!immutable && (
                      <>
                        <Button variant="outline" disabled={saving || !dirty} onClick={() => void save()}>
                          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                          Save
                        </Button>
                        {selected?.status === 'draft' ? (
                          <Button disabled={saving || dirty} onClick={() => void save('ready')}>
                            <CheckCircle2 className="mr-2 size-4" /> Mark ready
                          </Button>
                        ) : (
                          <Button variant="outline" disabled={saving || dirty} onClick={() => void save('draft')}>
                            Return to draft
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Internal campaign title</Label>
                      <Input disabled={immutable} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email subject</Label>
                      <Input disabled={immutable} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preheader</Label>
                      <Input disabled={immutable} value={form.preheader} onChange={(event) => setForm({ ...form, preheader: event.target.value })} placeholder="Short inbox preview text" />
                    </div>
                    <div className="space-y-2">
                      <Label>Message body</Label>
                      <Textarea disabled={immutable} rows={12} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
                      <p className="text-xs text-muted-foreground">Blank lines create paragraphs. HTML entered here is escaped for safety.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>CTA label</Label>
                        <Input disabled={immutable} value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} placeholder="Explore our services" />
                      </div>
                      <div className="space-y-2">
                        <Label>CTA URL</Label>
                        <Input disabled={immutable} value={form.ctaUrl} onChange={(event) => setForm({ ...form, ctaUrl: event.target.value })} placeholder="https://lightworldtech.com/services" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Eye className="size-4" /> Content preview
                    </div>
                    <div className="overflow-hidden rounded-2xl border bg-slate-50 p-4 dark:bg-slate-950">
                      <div className="mx-auto max-w-lg rounded-2xl border bg-white p-6 text-slate-900 shadow-sm">
                        {form.preheader && <p className="mb-3 text-xs text-slate-400">{form.preheader}</p>}
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600">Lightworld Technologies</p>
                        <h2 className="mt-3 text-2xl font-bold">{form.title || 'Campaign title'}</h2>
                        <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {form.body || 'Campaign content will appear here.'}
                        </div>
                        {form.ctaLabel && form.ctaUrl && (
                          <span className="mt-6 inline-block rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">
                            {form.ctaLabel}
                          </span>
                        )}
                        <div className="mt-7 border-t pt-4 text-[11px] text-slate-400">
                          Every live campaign includes a signed unsubscribe link and one-click unsubscribe headers.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base">Test & delivery controls</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold">{detail.summary.sent}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold">{detail.summary.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold">{detail.summary.remaining}</p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Test recipient</Label>
                    <div className="flex gap-2">
                      <Input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" />
                      <Button variant="outline" disabled={testing || !testEmail.trim()} onClick={() => void sendTest()}>
                        {testing ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Test messages do not change subscriber preferences or campaign status.</p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                    <div className="flex gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                      <span>Live delivery is enabled only after the campaign is marked Ready. Each click processes at most 10 active subscribers and safely retries failed recipients.</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={sending || !['ready', 'sending'].includes(selected?.status || '') || dirty}
                    onClick={() => void sendBatch()}
                  >
                    {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                    {selected?.status === 'sending' ? 'Send next batch' : 'Start live delivery'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="size-4" /> Recent delivery records
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[420px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Attempts</TableHead>
                          <TableHead className="hidden lg:table-cell">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.deliveries.length ? detail.deliveries.map((delivery) => (
                          <TableRow key={delivery.id}>
                            <TableCell className="max-w-[210px] truncate text-sm font-medium">{delivery.recipient}</TableCell>
                            <TableCell>
                              <Badge variant={delivery.status === 'sent' ? 'default' : delivery.status === 'failed' ? 'destructive' : 'secondary'}>
                                {delivery.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{delivery.attempts}</TableCell>
                            <TableCell className="hidden max-w-[280px] truncate text-xs text-muted-foreground lg:table-cell" title={delivery.error}>
                              {delivery.error || delivery.transport || '—'}
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                              No live delivery records yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create newsletter campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={createCampaign} className="space-y-4">
            <div className="space-y-2">
              <Label>Internal title</Label>
              <Input required minLength={2} value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email subject</Label>
              <Input required minLength={2} value={createForm.subject} onChange={(event) => setCreateForm({ ...createForm, subject: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preheader</Label>
              <Input value={createForm.preheader} onChange={(event) => setCreateForm({ ...createForm, preheader: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Message body</Label>
              <Textarea required minLength={2} rows={7} value={createForm.body} onChange={(event) => setCreateForm({ ...createForm, body: event.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>CTA label</Label>
                <Input value={createForm.ctaLabel} onChange={(event) => setCreateForm({ ...createForm, ctaLabel: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input type="url" value={createForm.ctaUrl} onChange={(event) => setCreateForm({ ...createForm, ctaUrl: event.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />} Create draft
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
