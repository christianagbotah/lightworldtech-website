'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
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
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import OperationalLoadError from '@/components/admin/OperationalLoadError';

type SmsTemplate = {
  id: string;
  name: string;
  key: string;
  category: string;
  body: string;
  variables: string[];
  active: boolean;
  system: boolean;
  segmentEstimate: number;
};

type SmsCampaign = {
  id: string;
  name: string;
  senderId: string;
  body: string;
  status: string;
  audienceType: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  template: { id: string; name: string; key: string } | null;
};

type SmsMessage = {
  id: string;
  recipient: string;
  senderId: string;
  content: string;
  clientReference: string;
  status: string;
  providerMessageId: string;
  error: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  segmentEstimate: number;
  template: { id: string; name: string; key: string } | null;
  campaign: { id: string; name: string } | null;
};

type SmsOverview = {
  configuration: {
    sms: boolean;
    otp: boolean;
    payments: boolean;
    senderId: string;
    merchantAccountNumber: string;
  };
  automation: {
    dispatcherConfigured: boolean;
    serviceRenewals: { enabled: boolean; batchSize: number };
    projectRenewals: { enabled: boolean; batchSize: number };
    renewalDrafts: { enabled: boolean; batchSize: number; dueDays: number };
    collectionEmail: { enabled: boolean; configured: boolean; batchSize: number; intervalDays: number; minDaysOverdue: number };
    collections: { enabled: boolean; batchSize: number; intervalDays: number; minDaysOverdue: number };
  };
  activeClients: number;
  templates: SmsTemplate[];
  campaigns: SmsCampaign[];
  messages: SmsMessage[];
};

type WorkspaceTab = 'single' | 'campaigns' | 'scheduled' | 'templates' | 'otp';

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (['sent', 'delivered', 'ready'].includes(status)) {
    return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (['failed', 'cancelled'].includes(status)) {
    return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  }
  if (['scheduled', 'sending'].includes(status)) {
    return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  }
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function renderTemplate(body: string, variables: Record<string, string>) {
  return body.replace(/{{([a-zA-Z0-9_]+)}}/g, (_match, key: string) => variables[key] || '').replace(/\s+/g, ' ').trim();
}

function segmentEstimate(content: string) {
  if (!content) return 0;
  return Math.max(1, Math.ceil(content.length / (content.length <= 160 ? 160 : 153)));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload.data;
}

export default function AdminSms() {
  const [tab, setTab] = useState<WorkspaceTab>('single');
  const [data, setData] = useState<SmsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

  const [single, setSingle] = useState({
    recipient: '',
    templateId: '',
    content: '',
    scheduledAt: '',
    variables: {} as Record<string, string>,
  });

  const [campaign, setCampaign] = useState({
    name: '',
    templateId: '',
    body: '',
    audienceType: 'clients' as 'clients' | 'manual',
    recipients: '',
    scheduledAt: '',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    key: '',
    category: 'general',
    body: '',
  });

  const [otp, setOtp] = useState({
    phoneNumber: '',
    requestId: '',
    prefix: '',
    code: '',
    verified: null as boolean | null,
  });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setData(await request<SmsOverview>('/api/admin/sms/overview'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load SMS workspace';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const recipient = sessionStorage.getItem('lw-sms-recipient') || '';
    if (!recipient) return;

    const customerName = sessionStorage.getItem('lw-sms-customer-name') || '';
    sessionStorage.removeItem('lw-sms-recipient');
    sessionStorage.removeItem('lw-sms-customer-name');
    sessionStorage.removeItem('lw-sms-organization-id');

    setTab('single');
    setSingle((current) => ({
      ...current,
      recipient,
      content: current.content || (customerName ? 'Hello ' + customerName + ', ' : ''),
    }));

    window.setTimeout(() => {
      document.getElementById('lw-single-sms-content')?.focus();
    }, 0);
  }, []);

  const selectedSingleTemplate = useMemo(
    () => data?.templates.find((item) => item.id === single.templateId) || null,
    [data?.templates, single.templateId],
  );

  const selectedCampaignTemplate = useMemo(
    () => data?.templates.find((item) => item.id === campaign.templateId) || null,
    [data?.templates, campaign.templateId],
  );

  const singlePreview = selectedSingleTemplate
    ? renderTemplate(selectedSingleTemplate.body, single.variables)
    : single.content.trim();

  const scheduledCampaigns = data?.campaigns.filter((item) => item.status === 'scheduled') || [];
  const scheduledMessages = data?.messages.filter((item) => item.status === 'scheduled' && !item.campaign) || [];

  const chooseSingleTemplate = (templateId: string) => {
    const template = data?.templates.find((item) => item.id === templateId);
    setSingle({
      ...single,
      templateId,
      variables: template
        ? Object.fromEntries(template.variables.map((variable) => [variable, single.variables[variable] || '']))
        : {},
    });
  };

  const sendSingle = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('single');
    try {
      await request('/api/admin/sms/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: single.recipient,
          templateId: single.templateId || null,
          content: single.templateId ? '' : single.content,
          variables: single.variables,
          scheduledAt: single.scheduledAt ? new Date(single.scheduledAt).toISOString() : null,
        }),
      });
      toast.success(single.scheduledAt ? 'SMS scheduled' : 'SMS sent to Hubtel');
      setSingle({ recipient: '', templateId: '', content: '', scheduledAt: '', variables: {} });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send SMS');
    } finally {
      setBusy('');
    }
  };

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('campaign');
    const recipients = campaign.audienceType === 'manual'
      ? campaign.recipients
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [phone, ...nameParts] = line.split(',');
            return { phone: phone.trim(), name: nameParts.join(',').trim() };
          })
      : [];

    try {
      await request('/api/admin/sms/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          templateId: campaign.templateId || null,
          body: campaign.templateId ? '' : campaign.body,
          audienceType: campaign.audienceType,
          recipients,
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString() : null,
        }),
      });
      toast.success(campaign.scheduledAt ? 'SMS campaign scheduled' : 'SMS campaign created and ready');
      setCampaign({
        name: '',
        templateId: '',
        body: '',
        audienceType: 'clients',
        recipients: '',
        scheduledAt: '',
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create SMS campaign');
    } finally {
      setBusy('');
    }
  };

  const dispatchCampaign = async (campaignId: string) => {
    setBusy('dispatch-' + campaignId);
    try {
      const result = await request<{ sentThisBatch: number; failedThisBatch: number; remaining: number }>(
        '/api/admin/sms/campaigns/' + encodeURIComponent(campaignId) + '/dispatch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 5 }),
        },
      );
      toast.success(
        result.remaining
          ? result.sentThisBatch + ' sent, ' + result.failedThisBatch + ' failed, ' + result.remaining + ' remaining'
          : 'SMS campaign delivery complete',
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign delivery failed');
    } finally {
      setBusy('');
    }
  };

  const cancelCampaign = async (campaignId: string) => {
    setBusy('cancel-' + campaignId);
    try {
      await request('/api/admin/sms/campaigns/' + encodeURIComponent(campaignId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      toast.success('Scheduled SMS campaign cancelled');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to cancel campaign');
    } finally {
      setBusy('');
    }
  };

  const openTemplate = (template?: SmsTemplate) => {
    setEditingTemplate(template || null);
    setTemplateForm(template
      ? { name: template.name, key: template.key, category: template.category, body: template.body }
      : { name: '', key: '', category: 'general', body: '' });
    setTemplateDialog(true);
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('template');
    try {
      if (editingTemplate) {
        await request('/api/admin/sms/templates/' + encodeURIComponent(editingTemplate.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateForm.name,
            category: templateForm.category,
            body: templateForm.body,
          }),
        });
      } else {
        await request('/api/admin/sms/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm),
        });
      }
      toast.success(editingTemplate ? 'SMS template updated' : 'SMS template created');
      setTemplateDialog(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save SMS template');
    } finally {
      setBusy('');
    }
  };

  const sendOtp = async () => {
    setBusy('otp-send');
    try {
      const result = await request<{ requestId: string; prefix: string }>('/api/admin/sms/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phoneNumber: otp.phoneNumber, countryCode: 'GH' }),
      });
      setOtp({ ...otp, requestId: result.requestId, prefix: result.prefix, code: '', verified: null });
      toast.success('OTP sent through Hubtel');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP');
    } finally {
      setBusy('');
    }
  };

  const verifyOtp = async () => {
    setBusy('otp-verify');
    try {
      const result = await request<{ verified: boolean }>('/api/admin/sms/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          requestId: otp.requestId,
          prefix: otp.prefix,
          code: otp.code,
        }),
      });
      setOtp({ ...otp, verified: result.verified });
      if (result.verified) toast.success('OTP verified successfully');
      else toast.error('OTP was not verified');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP');
    } finally {
      setBusy('');
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-[520px]" />
      </div>
    );
  }

  if (!data) {
    return (
      <OperationalLoadError
        title="SMS workspace is unavailable"
        message={loadError || 'Messaging configuration and delivery history could not be loaded.'}
        retrying={loading}
        onRetry={() => void load()}
      />
    );
  }

  const tabs: Array<[WorkspaceTab, string]> = [
    ['single', 'Single SMS'],
    ['campaigns', 'Campaign / Bulk'],
    ['scheduled', 'Scheduled'],
    ['templates', 'Templates'],
    ['otp', 'OTP'],
  ];

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <AdminPageHeader
        eyebrow="Hubtel Messaging"
        title="SMS, campaigns, scheduling & OTP"
        description="Send transactional SMS, bulk campaigns, scheduled messages and reusable templates from one auditable workspace."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            Refresh
          </Button>
        }
      />

      {loadError && (
        <OperationalLoadError
          title="SMS workspace refresh failed"
          message={loadError + '. Showing the last successfully loaded messaging data.'}
          retrying={loading}
          onRetry={() => void load()}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Programmable SMS', data.configuration.sms, data.configuration.senderId || 'Sender ID not configured', MessageSquareText],
          ['OTP', data.configuration.otp, data.configuration.otp ? 'Send & verify ready' : 'OTP endpoints required', KeyRound],
          ['Online payments', data.configuration.payments, data.configuration.payments ? 'Hubtel checkout ready' : 'Checkout configuration required', Smartphone],
          ['Active client phones', true, String(data.activeClients) + ' available for client campaigns', Users],
        ].map(([label, ready, detail, Icon]) => (
          <Card key={String(label)} className="border-border/60">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{String(label)}</p>
                <p className="mt-1 truncate text-sm font-semibold">{String(detail)}</p>
              </div>
              <span className={'flex size-10 shrink-0 items-center justify-center rounded-xl ' + (ready ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')}>
                {ready ? <CheckCircle2 className="size-5" /> : <Clock3 className="size-5" />}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Communication automation readiness</CardTitle>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Live configuration for the protected scheduler. Secrets remain server-only; this view exposes status and safe operating limits only.
              </p>
            </div>
            <Badge variant="outline" className={data.automation.dispatcherConfigured ? 'w-fit border-emerald-300 text-emerald-700 dark:text-emerald-300' : 'w-fit border-amber-300 text-amber-700 dark:text-amber-300'}>
              {data.automation.dispatcherConfigured ? 'Dispatcher ready' : 'Dispatcher secret missing'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Service renewals',
                enabled: data.automation.serviceRenewals.enabled,
                detail: 'Up to ' + data.automation.serviceRenewals.batchSize + ' reminders per scheduler run',
                Icon: CalendarClock,
              },
              {
                label: 'Project renewals',
                enabled: data.automation.projectRenewals.enabled,
                detail: 'Up to ' + data.automation.projectRenewals.batchSize + ' reminders per scheduler run',
                Icon: ShieldCheck,
              },
              {
                label: 'Renewal invoice drafts',
                enabled: data.automation.renewalDrafts.enabled,
                detail:
                  'Draft only · batch ' +
                  data.automation.renewalDrafts.batchSize +
                  ' · overdue-cycle due offset ' +
                  data.automation.renewalDrafts.dueDays +
                  ' day(s)',
                Icon: FileText,
              },
              {
                label: 'Collection email',
                enabled: data.automation.collectionEmail.enabled,
                readyOverride: data.automation.collectionEmail.configured,
                detail:
                  'From ' +
                  data.automation.collectionEmail.minDaysOverdue +
                  ' day(s) overdue · repeat guard ' +
                  data.automation.collectionEmail.intervalDays +
                  ' day(s) · batch ' +
                  data.automation.collectionEmail.batchSize,
                Icon: Send,
              },
              {
                label: 'Overdue collections',
                enabled: data.automation.collections.enabled,
                detail:
                  'From ' +
                  data.automation.collections.minDaysOverdue +
                  ' day(s) overdue · repeat guard ' +
                  data.automation.collections.intervalDays +
                  ' day(s) · batch ' +
                  data.automation.collections.batchSize,
                Icon: RefreshCw,
              },
            ].map(({ label, enabled, detail, Icon, readyOverride }) => {
              const channelReady = readyOverride === undefined ? data.configuration.sms : readyOverride;
              const ready = enabled && data.automation.dispatcherConfigured && channelReady;
              return (
                <div key={label} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={'flex size-9 shrink-0 items-center justify-center rounded-lg ' + (ready ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')}>
                      <Icon className="size-4.5" />
                    </span>
                    <Badge variant="outline" className={ready ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300' : 'border-amber-300 text-amber-700 dark:text-amber-300'}>
                      {ready ? 'Active' : enabled ? 'Needs configuration' : 'Off'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{detail}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {tabs.map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? 'default' : 'outline'}
            className="shrink-0"
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'single' && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">Send or schedule one SMS</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={sendSingle} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Recipient</Label>
                    <Input
                      id="lw-single-sms-recipient"
                      required
                      value={single.recipient}
                      onChange={(event) => setSingle({ ...single, recipient: event.target.value })}
                      placeholder="0243618186 or 233243618186"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <select
                      value={single.templateId}
                      onChange={(event) => chooseSingleTemplate(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Custom message</option>
                      {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                  </div>
                </div>

                {selectedSingleTemplate ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedSingleTemplate.variables.map((variable) => (
                      <div className="space-y-2" key={variable}>
                        <Label>{pretty(variable)}</Label>
                        <Input
                          value={single.variables[variable] || ''}
                          onChange={(event) => setSingle({
                            ...single,
                            variables: { ...single.variables, [variable]: event.target.value },
                          })}
                          placeholder={'{{' + variable + '}}'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      id="lw-single-sms-content"
                      required
                      rows={6}
                      maxLength={2000}
                      value={single.content}
                      onChange={(event) => setSingle({ ...single, content: event.target.value })}
                      placeholder="Type the customer message…"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
                  <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Preview</p>
                    <p className="mt-2 text-sm leading-6">{singlePreview || 'Your SMS preview will appear here.'}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {singlePreview.length} characters · approximately {segmentEstimate(singlePreview)} SMS segment{segmentEstimate(singlePreview) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule for later</Label>
                    <Input
                      type="datetime-local"
                      value={single.scheduledAt}
                      onChange={(event) => setSingle({ ...single, scheduledAt: event.target.value })}
                    />
                  </div>
                </div>

                <Button disabled={busy === 'single' || !data.configuration.sms}>
                  {busy === 'single' ? <Loader2 className="mr-2 size-4 animate-spin" /> : single.scheduledAt ? <CalendarClock className="mr-2 size-4" /> : <Send className="mr-2 size-4" />}
                  {single.scheduledAt ? 'Schedule SMS' : 'Send SMS'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">Recent single messages</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.messages.filter((message) => !message.campaign).slice(0, 12).map((message) => (
                <div key={message.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs font-semibold">{message.recipient}</p>
                    <Badge className={statusClass(message.status)}>{pretty(message.status)}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{message.content}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {message.sentAt ? 'Sent ' + new Date(message.sentAt).toLocaleString() : message.scheduledAt ? 'Scheduled ' + new Date(message.scheduledAt).toLocaleString() : new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {!data.messages.some((message) => !message.campaign) && <p className="text-sm text-muted-foreground">No single SMS records yet.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Create bulk SMS campaign</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createCampaign} className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Campaign name</Label>
                    <Input required value={campaign.name} onChange={(event) => setCampaign({ ...campaign, name: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <select value={campaign.templateId} onChange={(event) => setCampaign({ ...campaign, templateId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Custom campaign message</option>
                      {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                    {selectedCampaignTemplate?.key === 'google_review_request' && (
                      <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                        Send this only to genuine clients. Ask for an honest review; never offer incentives or filter recipients by satisfaction rating.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <select value={campaign.audienceType} onChange={(event) => setCampaign({ ...campaign, audienceType: event.target.value as 'clients' | 'manual' })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="clients">Active clients with phone numbers ({data.activeClients})</option>
                      <option value="manual">Manual recipient list</option>
                    </select>
                  </div>
                </div>

                {!campaign.templateId && (
                  <div className="space-y-2">
                    <Label>Campaign message</Label>
                    <Textarea
                      required
                      rows={5}
                      maxLength={2000}
                      value={campaign.body}
                      onChange={(event) => setCampaign({ ...campaign, body: event.target.value })}
                      placeholder="Use {{name}} to personalize the recipient name."
                    />
                  </div>
                )}

                {campaign.audienceType === 'manual' && (
                  <div className="space-y-2">
                    <Label>Recipients — one per line</Label>
                    <Textarea
                      required
                      rows={7}
                      value={campaign.recipients}
                      onChange={(event) => setCampaign({ ...campaign, recipients: event.target.value })}
                      placeholder={'0243618186, Christian\n0550000000, Ama Mensah'}
                    />
                    <p className="text-xs text-muted-foreground">Format: phone, name. Duplicate numbers are removed automatically.</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-end">
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Input type="datetime-local" value={campaign.scheduledAt} onChange={(event) => setCampaign({ ...campaign, scheduledAt: event.target.value })} />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Leave the schedule blank to create a Ready campaign. Delivery runs in bounded batches and records success/failure for every recipient.
                  </p>
                </div>

                <Button disabled={busy === 'campaign'}>
                  {busy === 'campaign' && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {campaign.scheduledAt ? 'Create scheduled campaign' : 'Create ready campaign'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">SMS campaigns</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table exportFileName="lightworld-sms-campaigns">
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead data-export-ignore className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><p className="font-medium">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.template?.name || 'Custom message'}</p></TableCell>
                      <TableCell><Badge className={statusClass(item.status)}>{pretty(item.status)}</Badge></TableCell>
                      <TableCell className="text-xs">{pretty(item.audienceType)} · {item.recipientCount}</TableCell>
                      <TableCell className="text-xs">{item.sentCount} sent · {item.failedCount} failed</TableCell>
                      <TableCell className="text-xs">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'Manual'}</TableCell>
                      <TableCell data-export-ignore className="text-right">
                        <div className="flex justify-end gap-2">
                          {['ready', 'sending'].includes(item.status) && (
                            <Button size="sm" variant="outline" disabled={busy === 'dispatch-' + item.id || !data.configuration.sms} onClick={() => void dispatchCampaign(item.id)}>
                              {busy === 'dispatch-' + item.id ? <Loader2 className="size-3.5 animate-spin" /> : 'Send next batch'}
                            </Button>
                          )}
                          {item.status === 'scheduled' && (
                            <Button size="sm" variant="ghost" disabled={busy === 'cancel-' + item.id} onClick={() => void cancelCampaign(item.id)}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data.campaigns.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No SMS campaigns yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-amber-600" /> Scheduled single SMS</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table exportFileName="lightworld-scheduled-sms">
                <TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Message</TableHead><TableHead>Schedule</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scheduledMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-mono text-xs">{message.recipient}</TableCell>
                      <TableCell className="max-w-[340px] truncate text-xs">{message.content}</TableCell>
                      <TableCell className="text-xs">{message.scheduledAt ? new Date(message.scheduledAt).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!scheduledMessages.length && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No scheduled single messages.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-amber-600" /> Scheduled campaigns</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table exportFileName="lightworld-scheduled-sms-campaigns">
                <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Recipients</TableHead><TableHead>Schedule</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scheduledCampaigns.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.recipientCount}</TableCell>
                      <TableCell className="text-xs">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!scheduledCampaigns.length && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No scheduled campaigns.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'templates' && (
        <Card className="min-w-0 border-border/60">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Reusable SMS templates</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Variables use the format {'{{name}}'}, {'{{amount}}'}, {'{{dueDate}}'} and similar placeholders.</p>
              </div>
              <Button onClick={() => openTemplate()}><Plus className="mr-2 size-4" /> New template</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table exportFileName="lightworld-sms-templates">
              <TableHeader><TableRow><TableHead>Template</TableHead><TableHead>Category</TableHead><TableHead>Variables</TableHead><TableHead>Segments</TableHead><TableHead data-export-ignore className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell><p className="font-medium">{template.name}</p><p className="max-w-[420px] truncate text-[10px] text-muted-foreground">{template.body}</p></TableCell>
                    <TableCell><Badge variant="outline">{pretty(template.category)}</Badge></TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs">{template.variables.length ? template.variables.map((variable) => '{{' + variable + '}}').join(', ') : 'None'}</TableCell>
                    <TableCell>{template.segmentEstimate}</TableCell>
                    <TableCell data-export-ignore className="text-right"><Button size="sm" variant="outline" onClick={() => openTemplate(template)}>Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'otp' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Hubtel OTP diagnostics</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-2">
                  <Label>Phone number</Label>
                  <Input value={otp.phoneNumber} onChange={(event) => setOtp({ ...otp, phoneNumber: event.target.value })} placeholder="0243618186" />
                </div>
                <Button type="button" disabled={!data.configuration.otp || busy === 'otp-send' || !otp.phoneNumber.trim()} onClick={() => void sendOtp()}>
                  {busy === 'otp-send' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
                  Send OTP
                </Button>
              </div>

              {otp.requestId && (
                <div className="rounded-2xl border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">OTP session created. Prefix: <strong>{otp.prefix || '—'}</strong></p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input value={otp.code} onChange={(event) => setOtp({ ...otp, code: event.target.value, verified: null })} placeholder="Enter OTP code" />
                    <Button variant="outline" disabled={busy === 'otp-verify' || !otp.code.trim()} onClick={() => void verifyOtp()}>
                      {busy === 'otp-verify' && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Verify OTP
                    </Button>
                  </div>
                  {otp.verified !== null && (
                    <p className={'mt-3 flex items-center gap-2 text-sm font-semibold ' + (otp.verified ? 'text-emerald-700' : 'text-rose-700')}>
                      {otp.verified ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                      {otp.verified ? 'OTP verified' : 'OTP not verified'}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700"><ShieldCheck className="size-5" /></span>
              <h3 className="mt-4 font-semibold">Production safety</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                OTP credentials stay on the server. This panel is for controlled diagnostics; application login/payment flows can reuse the same provider adapter without exposing Hubtel secrets to browsers.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTemplate ? 'Edit SMS template' : 'Create SMS template'}</DialogTitle></DialogHeader>
          <form onSubmit={saveTemplate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input required value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label><Input required value={templateForm.category} onChange={(event) => setTemplateForm({ ...templateForm, category: event.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Template key</Label>
              <Input
                required
                disabled={Boolean(editingTemplate)}
                value={templateForm.key}
                onChange={(event) => setTemplateForm({ ...templateForm, key: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') })}
                placeholder="renewal_followup"
              />
            </div>
            <div className="space-y-2">
              <Label>SMS body</Label>
              <Textarea required rows={7} maxLength={2000} value={templateForm.body} onChange={(event) => setTemplateForm({ ...templateForm, body: event.target.value })} />
              <p className="text-xs text-muted-foreground">{templateForm.body.length} characters · approximately {segmentEstimate(templateForm.body)} SMS segment{segmentEstimate(templateForm.body) === 1 ? '' : 's'}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTemplateDialog(false)}>Cancel</Button>
              <Button disabled={busy === 'template'}>{busy === 'template' && <Loader2 className="mr-2 size-4 animate-spin" />}Save template</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
