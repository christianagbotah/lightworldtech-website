'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  MailCheck,
  MailWarning,
  Power,
  RefreshCw,
  Send,
  Server,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Subscriber {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  recipient: string;
  kind: string;
  subject: string;
  status: string;
  transport: string;
  error: string;
  createdAt: string;
}

interface Summary {
  totalSubscribers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  sentDeliveries: number;
  failedDeliveries: number;
}

interface TransportStatus {
  mode: 'smtp' | 'sendmail';
  configured: boolean;
  host: string;
  port: number | null;
  secure: boolean;
  authConfigured: boolean;
  from: string;
  replyTo: string;
  warning: string;
}

interface NewsletterData {
  subscribers: Subscriber[];
  deliveries: Delivery[];
  summary: Summary;
  transport: TransportStatus;
}

function label(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type NewsletterApiPayload<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
};

async function readNewsletterApiPayload<T = unknown>(response: Response): Promise<NewsletterApiPayload<T>> {
  const raw = await response.text();
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw) as NewsletterApiPayload<T>;
  } catch {
    const status = response.status ? 'HTTP ' + response.status : 'an unknown status';
    if (!response.ok) {
      return {
        success: false,
        error:
          'The website gateway returned ' +
          status +
          ' without a JSON response. The mail request may have been interrupted before the application could report the transport error.',
      };
    }

    throw new Error('The newsletter API returned an unexpected non-JSON response (' + status + ').');
  }
}

export default function AdminNewsletter() {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/admin/newsletter?limit=100', { cache: 'no-store' });
      const payload = await readNewsletterApiPayload<NewsletterData>(response);
      if (!response.ok) throw new Error(payload?.details || payload?.error || 'Failed to load newsletter operations');
      if (!payload.data) throw new Error('Newsletter operations returned no workspace data');
      setData(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load newsletter operations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendTest = async (event: FormEvent) => {
    event.preventDefault();
    const email = testEmail.trim();
    if (!email) return;

    setSendingTest(true);
    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', email }),
      });
      const payload = await readNewsletterApiPayload(response);
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || 'Mail transport test failed');
      }

      toast.success('Test email accepted by the outbound mail transport');
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mail transport test failed');
      await load(true);
    } finally {
      setSendingTest(false);
    }
  };

  const toggleSubscriber = async (subscriber: Subscriber) => {
    setUpdatingId(subscriber.id);
    try {
      const response = await fetch('/api/admin/newsletter/' + encodeURIComponent(subscriber.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !subscriber.active }),
      });
      const payload = await readNewsletterApiPayload(response);
      if (!response.ok) throw new Error(payload?.details || payload?.error || 'Failed to update subscriber');

      setData((current) => {
        if (!current) return current;
        const subscribers = current.subscribers.map((item) =>
          item.id === subscriber.id ? { ...item, active: !subscriber.active } : item,
        );
        const activeSubscribers = subscribers.filter((item) => item.active).length;
        return {
          ...current,
          subscribers,
          summary: {
            ...current.summary,
            activeSubscribers,
            inactiveSubscribers: Math.max(0, current.summary.totalSubscribers - activeSubscribers),
          },
        };
      });
      toast.success(subscriber.active ? 'Subscriber paused' : 'Subscriber reactivated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subscriber');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const summary = data?.summary || {
    totalSubscribers: 0,
    activeSubscribers: 0,
    inactiveSubscribers: 0,
    sentDeliveries: 0,
    failedDeliveries: 0,
  };
  const transport = data?.transport;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Communications"
        title="Newsletter & Mail"
        description="Manage subscribers, inspect delivery health and verify the website outbound mail transport."
        actions={
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active subscribers</p>
                <p className="mt-1 text-2xl font-bold">{summary.activeSubscribers}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.totalSubscribers} total · {summary.inactiveSubscribers} paused
                </p>
              </div>
              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/25">
                <Users className="size-5 text-amber-700 dark:text-amber-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted deliveries</p>
                <p className="mt-1 text-2xl font-bold">{summary.sentDeliveries}</p>
                <p className="mt-1 text-xs text-muted-foreground">Confirmation + transport test history</p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/25">
                <MailCheck className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed deliveries</p>
                <p className="mt-1 text-2xl font-bold">{summary.failedDeliveries}</p>
                <p className="mt-1 text-xs text-muted-foreground">Inspect recent errors below</p>
              </div>
              <div className="rounded-xl bg-rose-100 p-3 dark:bg-rose-900/25">
                <MailWarning className="size-5 text-rose-700 dark:text-rose-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="size-4 text-amber-600" />
                Outbound mail transport
              </CardTitle>
              <Badge
                className={
                  transport?.configured
                    ? 'border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'border-0 bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300'
                }
              >
                {transport?.configured ? 'Configured' : 'Needs attention'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mode</p>
                <p className="mt-1 font-semibold">{transport?.mode?.toUpperCase() || 'Unknown'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Endpoint</p>
                <p className="mt-1 break-all font-semibold">
                  {transport?.host || 'Not configured'}
                  {transport?.port ? ':' + transport.port : ''}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">TLS</p>
                <p className="mt-1 font-semibold">
                  {transport?.mode === 'smtp'
                    ? transport.secure
                      ? 'Implicit TLS'
                      : 'STARTTLS'
                    : 'Handled by local MTA'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Authentication</p>
                <p className="mt-1 font-semibold">
                  {transport?.mode === 'smtp'
                    ? transport.authConfigured
                      ? 'Configured'
                      : 'No SMTP auth'
                    : 'Local server'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-4 text-sm">
              <p><span className="text-muted-foreground">From:</span> {transport?.from || '—'}</p>
              <p className="mt-1"><span className="text-muted-foreground">Reply-To:</span> {transport?.replyTo || '—'}</p>
            </div>

            {transport?.warning && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                {transport.warning}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4 text-amber-600" />
              Send transport test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendTest} className="space-y-4">
              <div>
                <label htmlFor="mail-test-email" className="text-sm font-medium">Recipient email</label>
                <Input
                  id="mail-test-email"
                  type="email"
                  required
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2"
                />
              </div>
              <Button type="submit" disabled={sendingTest || !testEmail.trim()} className="w-full">
                {sendingTest ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Send test email
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                The test uses the same transport as newsletter confirmations. No SMTP password or secret is exposed in this screen.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Subscribers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[460px] max-w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subscribers.length ? (
                  data.subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {new Date(subscriber.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subscriber.active ? 'default' : 'secondary'}>
                          {subscriber.active ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === subscriber.id}
                          onClick={() => void toggleSubscriber(subscriber)}
                        >
                          <Power className="mr-2 size-3.5" />
                          {subscriber.active ? 'Pause' : 'Reactivate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No newsletter subscribers yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Recent delivery activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] max-w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="hidden lg:table-cell">Transport</TableHead>
                  <TableHead className="hidden xl:table-cell">Details</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.deliveries.length ? (
                  data.deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">{delivery.recipient}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {label(delivery.kind)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            delivery.status === 'sent'
                              ? 'border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'border-0 bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300'
                          }
                        >
                          {label(delivery.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm uppercase text-muted-foreground lg:table-cell">
                        {delivery.transport || '—'}
                      </TableCell>
                      <TableCell className="hidden max-w-[320px] truncate text-xs text-muted-foreground xl:table-cell" title={delivery.error || delivery.subject}>
                        {delivery.error || delivery.subject}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(delivery.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No delivery attempts have been recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
