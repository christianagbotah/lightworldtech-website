'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  FolderKanban,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageSquareText,
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
  dueDate: string | null;
  order: number;
};

type Deliverable = {
  id: string;
  title: string;
  description: string;
  url: string;
  status: string;
  deliveredAt: string | null;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
  summary: string;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
  deliverables: Deliverable[];
};

type Ticket = {
  id: string;
  projectId: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminResponse: string;
  createdAt: string;
  updatedAt: string;
};

type PortalData = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  lastLogin: string | null;
  projects: Project[];
  tickets: Ticket[];
};

function pretty(value: string) {
  return value
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (['completed', 'approved', 'resolved', 'closed'].includes(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300';
  }
  if (['on-hold', 'waiting-client'].includes(status)) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300';
  }
  return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300';
}

function dateLabel(value: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ClientPortalPage() {
  const [checking, setChecking] = useState(true);
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [ticketProjectId, setTicketProjectId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [sendingTicket, setSendingTicket] = useState(false);

  const loadPortal = async () => {
    const response = await fetch('/api/client/portal', { cache: 'no-store' });
    if (response.status === 401) {
      setPortal(null);
      return false;
    }
    if (!response.ok) throw new Error('Could not load the client portal.');
    const payload = await response.json();
    setPortal(payload.data);
    return true;
  };

  useEffect(() => {
    fetch('/api/client/auth', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return false;
        return loadPortal();
      })
      .catch(() => false)
      .finally(() => setChecking(false));
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    try {
      const response = await fetch('/api/client/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not sign in.');
      await loadPortal();
      setPassword('');
      toast.success('Welcome to your Lightworld client portal.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/client/auth', { method: 'DELETE' }).catch(() => undefined);
    setPortal(null);
    setPassword('');
  };

  const submitTicket = async (event: FormEvent) => {
    event.preventDefault();
    setSendingTicket(true);
    try {
      const response = await fetch('/api/client/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: ticketProjectId || null,
          subject: ticketSubject,
          message: ticketMessage,
          priority: ticketPriority,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create support request.');
      setTicketProjectId('');
      setTicketSubject('');
      setTicketMessage('');
      setTicketPriority('normal');
      await loadPortal();
      toast.success('Support request submitted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create support request.');
    } finally {
      setSendingTicket(false);
    }
  };

  const metrics = useMemo(() => {
    const projects = portal?.projects || [];
    const deliverables = projects.reduce((count, project) => count + project.deliverables.length, 0);
    const openTickets = (portal?.tickets || []).filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length;
    const pendingMilestones = projects.reduce(
      (count, project) => count + project.milestones.filter((milestone) => milestone.status !== 'completed').length,
      0,
    );
    return { projects: projects.length, deliverables, openTickets, pendingMilestones };
  }, [portal]);

  if (checking) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#050b10] text-white">
        <Loader2 className="size-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="relative min-h-[78vh] overflow-hidden bg-[#050b10] text-white">
        <div className="lw-hero-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute left-1/2 top-20 size-[420px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[140px]" />
        <div className="container-main relative flex min-h-[78vh] items-center justify-center py-16">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.035] shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
            <div className="hidden border-r border-white/[0.07] p-10 lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Client Portal</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em]">
                One place for the work after the project starts.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/45">
                Review project progress, milestones, published deliverables and support updates in a private workspace linked to your Lightworld engagement.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  ['Projects & progress', FolderKanban],
                  ['Milestones & deliverables', FileText],
                  ['Support requests', LifeBuoy],
                  ['Secure client-only access', ShieldCheck],
                ].map(([label, Icon]) => (
                  <div key={String(label)} className="flex items-center gap-3 text-sm text-white/55">
                    <span className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                      <Icon className="size-4 text-emerald-300" />
                    </span>
                    {String(label)}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <div className="mx-auto max-w-md">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                  <LockKeyhole className="size-5" />
                </span>
                <h2 className="mt-6 text-2xl font-semibold">Sign in to your workspace</h2>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  Use the client credentials supplied by Lightworld Technologies Ltd.
                </p>

                <form onSubmit={signIn} className="mt-7 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-email" className="text-white/70">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 border-white/[0.1] bg-black/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password" className="text-white/70">Password</Label>
                    <Input
                      id="client-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 border-white/[0.1] bg-black/20 text-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={signingIn}
                    className="h-11 w-full bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300"
                  >
                    {signingIn && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Sign in securely
                  </Button>
                </form>

                <p className="mt-6 text-xs leading-6 text-white/30">
                  Need access or a password reset? Contact <a href="mailto:mail@lightworldtech.com" className="text-emerald-300">mail@lightworldtech.com</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="border-b border-slate-200/70 bg-white dark:border-white/[0.06] dark:bg-[#071017]">
        <div className="container-main flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Client workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{portal.companyName}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-white/40">
              Welcome, {portal.contactName}. Project information published by the Lightworld team appears here.
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </div>
      </section>

      <div className="container-main space-y-8 py-8 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Projects', value: metrics.projects, icon: FolderKanban },
            { label: 'Open milestones', value: metrics.pendingMilestones, icon: Clock3 },
            { label: 'Deliverables', value: metrics.deliverables, icon: FileText },
            { label: 'Open support', value: metrics.openTickets, icon: LifeBuoy },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-slate-200/70 dark:border-white/[0.07]">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold">{item.value}</p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Projects</p>
            <h2 className="mt-1 text-2xl font-semibold">Current project workspace</h2>
          </div>

          {portal.projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No project has been published to your portal yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {portal.projects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-slate-200/70 dark:border-white/[0.07]">
                  <CardHeader className="border-b border-border/60 bg-muted/20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-xl">{project.name}</CardTitle>
                          <span className={'rounded-full border px-2.5 py-1 text-[10px] font-semibold ' + statusClass(project.status)}>
                            {pretty(project.status)}
                          </span>
                        </div>
                        {project.summary && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{project.summary}</p>}
                      </div>
                      <div className="min-w-40">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span className="font-semibold text-foreground">{project.progress}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: Math.max(0, Math.min(100, project.progress)) + '%' }} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-7 p-5 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</p>
                        <p className="mt-1 text-sm font-medium">{dateLabel(project.startDate)}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Target</p>
                        <p className="mt-1 text-sm font-medium">{dateLabel(project.targetDate)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <CalendarDays className="size-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold">Milestones</h3>
                      </div>
                      {project.milestones.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No milestones published yet.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {project.milestones.map((milestone) => (
                            <div key={milestone.id} className="rounded-xl border border-border/60 p-4">
                              <div className="flex items-start gap-3">
                                {milestone.status === 'completed'
                                  ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                  : <CircleDot className="mt-0.5 size-4 shrink-0 text-sky-500" />}
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">{milestone.title}</p>
                                  {milestone.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{milestone.description}</p>}
                                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                    <span>{pretty(milestone.status)}</span>
                                    {milestone.dueDate && <span>· Due {dateLabel(milestone.dueDate)}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <FileText className="size-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold">Deliverables</h3>
                      </div>
                      {project.deliverables.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No deliverables published yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {project.deliverables.map((item) => (
                            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold">{item.title}</p>
                                  <Badge variant="secondary">{pretty(item.status)}</Badge>
                                </div>
                                {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
                                <p className="mt-2 text-[10px] text-muted-foreground">
                                  {item.deliveredAt ? 'Delivered ' + dateLabel(item.deliveredAt) : 'Published ' + dateLabel(item.createdAt)}
                                </p>
                              </div>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold transition hover:border-emerald-400 hover:text-emerald-600"
                                >
                                  Open <ArrowUpRight className="size-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
          <Card className="border-slate-200/70 dark:border-white/[0.07]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LifeBuoy className="size-5 text-emerald-600" /> New support request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <select
                    value={ticketProjectId}
                    onChange={(event) => setTicketProjectId(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">General / not project-specific</option>
                    {portal.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="space-y-2">
                    <Label htmlFor="support-subject">Subject</Label>
                    <Input
                      id="support-subject"
                      required
                      minLength={3}
                      value={ticketSubject}
                      onChange={(event) => setTicketSubject(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <select
                      value={ticketPriority}
                      onChange={(event) => setTicketPriority(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-message">What do you need help with?</Label>
                  <Textarea
                    id="support-message"
                    rows={5}
                    required
                    minLength={10}
                    value={ticketMessage}
                    onChange={(event) => setTicketMessage(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={sendingTicket}>
                  {sendingTicket && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Submit support request
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 dark:border-white/[0.07]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquareText className="size-5 text-emerald-600" /> Support history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {portal.tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No support requests yet.</p>
              ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {portal.tickets.map((ticket) => (
                    <article key={ticket.id} className="rounded-xl border border-border/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{ticket.subject}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{dateLabel(ticket.createdAt)} · {pretty(ticket.priority)} priority</p>
                        </div>
                        <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold ' + statusClass(ticket.status)}>
                          {pretty(ticket.status)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{ticket.message}</p>
                      {ticket.adminResponse && (
                        <div className="mt-3 rounded-lg bg-emerald-500/[0.08] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Lightworld response</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{ticket.adminResponse}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
