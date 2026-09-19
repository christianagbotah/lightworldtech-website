'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  LifeBuoy,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Milestone = {
  id: string;
  title: string;
  description: string;
  status: string;
  order: number;
  dueDate: string | null;
  completedAt: string | null;
};

type Project = {
  id: string;
  name: string;
  summary: string;
  status: string;
  health: string;
  progress: number;
  manager: string;
  startDate: string | null;
  targetDate: string | null;
  milestones: Milestone[];
};

type Ticket = {
  id: string;
  projectId: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

type PortalData = {
  user: { name: string; email: string; role: string };
  organization: {
    id: string;
    name: string;
    primaryContactName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
  projects: Project[];
  tickets: Ticket[];
};

function statusLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function healthClass(value: string): string {
  if (value === 'at_risk') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (value === 'attention') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
}

export default function ClientPortalPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [ticket, setTicket] = useState({ subject: '', message: '', priority: 'normal', projectId: '' });
  const [ticketSending, setTicketSending] = useState(false);

  const loadPortal = async () => {
    const response = await fetch('/api/client/portal', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load the client portal');
    const payload = await response.json();
    setData(payload.data);
  };

  useEffect(() => {
    fetch('/api/client/auth', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No session');
        setSignedIn(true);
        await loadPortal();
      })
      .catch(() => setSignedIn(false))
      .finally(() => setSessionChecked(true));
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/client/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to sign in');
      setSignedIn(true);
      await loadPortal();
      setLogin((current) => ({ ...current, password: '' }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/client/auth', { method: 'DELETE' }).catch(() => undefined);
    setSignedIn(false);
    setData(null);
    setLogin({ email: '', password: '' });
  };

  const submitTicket = async (event: FormEvent) => {
    event.preventDefault();
    setTicketSending(true);
    try {
      const response = await fetch('/api/client/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticket.subject,
          message: ticket.message,
          priority: ticket.priority,
          projectId: ticket.projectId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to create ticket');
      setTicket({ subject: '', message: '', priority: 'normal', projectId: '' });
      await loadPortal();
      toast.success('Support request submitted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create ticket');
    } finally {
      setTicketSending(false);
    }
  };

  const activeProjects = useMemo(
    () => data?.projects.filter((project) => project.status !== 'completed').length || 0,
    [data],
  );

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b10] text-white/45">
        <Loader2 className="mr-2 size-4 animate-spin" /> Checking secure client session…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-[#050b10] px-4 py-12 text-white">
        <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-10 lg:grid-cols-[1fr_.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <ShieldCheck className="size-3.5" /> Secure Client Portal
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
              Your Lightworld project workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/45">
              View project progress, milestones and support requests for your organization. Access is provisioned by the Lightworld team for active clients.
            </p>
            <a href="/" className="mt-7 inline-flex text-sm font-semibold text-emerald-300">← Back to lightworldtech.com</a>
          </div>

          <Card className="border-white/[0.08] bg-white/[0.035] text-white">
            <CardHeader>
              <CardTitle>Client sign in</CardTitle>
              <p className="text-sm text-white/38">Use the portal account issued to your organization.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input id="client-email" type="email" required autoComplete="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} className="border-white/10 bg-black/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password</Label>
                  <Input id="client-password" type="password" required autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} className="border-white/10 bg-black/20 text-white" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-white/[0.07] dark:bg-[#071018]/90">
        <div className="container-main flex min-h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Building2 className="size-4" /></span>
            <div>
              <p className="text-sm font-semibold">{data?.organization.name || 'Client Portal'}</p>
              <p className="text-[10px] text-slate-400 dark:text-white/30">Lightworld client workspace</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-2 size-4" /> Sign out</Button>
        </div>
      </header>

      <main className="container-main py-8 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Client portal</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Welcome, {data?.user.name}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-white/38">Project visibility and support for {data?.organization.name}.</p>
          </div>
          <div className="text-xs text-slate-400 dark:text-white/28">{data?.user.email}</div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Active projects', value: activeProjects, icon: FolderKanban },
            { label: 'Total milestones', value: data?.projects.reduce((sum, project) => sum + project.milestones.length, 0) || 0, icon: CheckCircle2 },
            { label: 'Open support tickets', value: data?.tickets.filter((item) => !['resolved', 'closed'].includes(item.status)).length || 0, icon: LifeBuoy },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <CardContent className="p-5">
                  <Icon className="size-4 text-emerald-600" />
                  <p className="mt-5 text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-slate-500 dark:text-white/35">{item.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Projects</h2>
            <span className="text-xs text-slate-400">{data?.projects.length || 0} total</span>
          </div>
          {data?.projects.length ? (
            <div className="mt-4 grid gap-5">
              {data.projects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <CardContent className="p-0">
                    <div className="grid gap-6 p-6 lg:grid-cols-[.75fr_1.25fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{statusLabel(project.status)}</Badge>
                          <Badge className={healthClass(project.health)}>{statusLabel(project.health)}</Badge>
                        </div>
                        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{project.name}</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/38">{project.summary || 'Project summary will appear here as it is published by the Lightworld team.'}</p>

                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs">
                            <span>Progress</span><span className="font-semibold">{project.progress}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: project.progress + '%' }} />
                          </div>
                        </div>

                        <div className="mt-5 space-y-2 text-xs text-slate-500 dark:text-white/35">
                          {project.manager && <p>Lightworld lead: <span className="font-medium text-foreground">{project.manager}</span></p>}
                          {project.targetDate && <p className="flex items-center gap-2"><CalendarDays className="size-3.5" /> Target: {new Date(project.targetDate).toLocaleDateString()}</p>}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Milestones</p>
                        {project.milestones.length ? (
                          <div className="mt-3 space-y-2">
                            {project.milestones.map((milestone) => (
                              <div key={milestone.id} className="flex gap-3 rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                  {milestone.status === 'completed' ? <CheckCircle2 className="size-4" /> : milestone.status === 'in_progress' ? <CircleDot className="size-4" /> : <Clock3 className="size-4" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">{milestone.title}</p>
                                  {milestone.description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/35">{milestone.description}</p>}
                                  <p className="mt-2 text-[10px] text-slate-400">{statusLabel(milestone.status)}{milestone.dueDate ? ' · Due ' + new Date(milestone.dueDate).toLocaleDateString() : ''}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-xs text-slate-400 dark:border-white/10">Milestones will appear here when published by the Lightworld team.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[28px] border border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-white/10 dark:text-white/35">
              No client projects have been published to this organization yet.
            </div>
          )}
        </section>

        <section className="mt-9 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <Card className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <CardHeader><CardTitle>Request support</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <select value={ticket.projectId} onChange={(event) => setTicket({ ...ticket, projectId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">General / no project</option>
                    {data?.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input required minLength={3} value={ticket.subject} onChange={(event) => setTicket({ ...ticket, subject: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select value={ticket.priority} onChange={(event) => setTicket({ ...ticket, priority: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Details</Label>
                  <Textarea required minLength={3} rows={5} value={ticket.message} onChange={(event) => setTicket({ ...ticket, message: event.target.value })} />
                </div>
                <Button disabled={ticketSending} className="bg-emerald-600 hover:bg-emerald-700">
                  {ticketSending && <Loader2 className="mr-2 size-4 animate-spin" />} Submit support request
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <CardHeader><CardTitle>Support requests</CardTitle></CardHeader>
            <CardContent>
              {data?.tickets.length ? (
                <div className="space-y-3">
                  {data.tickets.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{item.subject}</p>
                        <div className="flex gap-2"><Badge variant="outline">{statusLabel(item.status)}</Badge><Badge variant="outline">{statusLabel(item.priority)}</Badge></div>
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-white/35">{item.message}</p>
                      <p className="mt-3 text-[10px] text-slate-400">Opened {new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-xs text-slate-400 dark:border-white/10">No support requests yet.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
