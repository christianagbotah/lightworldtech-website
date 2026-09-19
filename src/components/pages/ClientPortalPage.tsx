'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Account = {
  id: string;
  email: string;
  name: string;
  organization: string;
  mustChangePassword: boolean;
  lastLogin?: string | null;
};

type Milestone = {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  order: number;
};

type DocumentLink = {
  id: string;
  title: string;
  url: string;
  category: string;
  visible: boolean;
  updatedAt: string;
};

type Project = {
  id: string;
  title: string;
  summary: string;
  status: string;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  milestones: Milestone[];
  documents: DocumentLink[];
  updatedAt: string;
};

type TicketMessage = {
  id: string;
  authorType: string;
  authorName: string;
  message: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; title: string } | null;
  messages: TicketMessage[];
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  publishedAt: string;
};

type PortalData = {
  account: Account;
  projects: Project[];
  tickets: Ticket[];
  announcements: Announcement[];
};

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload;
}

const statusLabel = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function ClientPortalPage() {
  const [checking, setChecking] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'support'>('overview');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketProjectId, setTicketProjectId] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketBusy, setTicketBusy] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const loadPortal = useCallback(async () => {
    const payload = await requestJson('/api/client/portal');
    const data = payload.data as PortalData;
    setPortal(data);
    setAccount(data.account);
    if (payload.requiresPasswordChange || data.account.mustChangePassword) {
      setPasswordOpen(true);
    }
  }, []);

  const verifySession = useCallback(async () => {
    setChecking(true);
    try {
      const payload = await requestJson('/api/client/auth');
      setAccount(payload.data);
      await loadPortal();
    } catch {
      setAccount(null);
      setPortal(null);
    } finally {
      setChecking(false);
    }
  }, [loadPortal]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginBusy(true);
    try {
      const payload = await requestJson('/api/client/auth', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setAccount(payload.data);
      setLoginPassword('');
      await loadPortal();
      toast.success('Signed in securely');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/client/auth', { method: 'DELETE' });
    } finally {
      setAccount(null);
      setPortal(null);
      setSelectedTicket(null);
      setPasswordOpen(false);
      toast.success('Signed out');
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 12) {
      toast.error('Use at least 12 characters');
      return;
    }

    setPasswordBusy(true);
    try {
      await requestJson('/api/client/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      await loadPortal();
      toast.success('Password updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update password');
    } finally {
      setPasswordBusy(false);
    }
  };

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    setTicketBusy(true);
    try {
      const payload = await requestJson('/api/client/tickets', {
        method: 'POST',
        body: JSON.stringify({
          projectId: ticketProjectId || null,
          subject: ticketSubject,
          priority: ticketPriority,
          message: ticketMessage,
        }),
      });
      toast.success('Support request created');
      setTicketSubject('');
      setTicketProjectId('');
      setTicketPriority('normal');
      setTicketMessage('');
      setTicketOpen(false);
      await loadPortal();
      setSelectedTicket(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create support request');
    } finally {
      setTicketBusy(false);
    }
  };

  const replyTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || !reply.trim()) return;

    setReplyBusy(true);
    try {
      await requestJson('/api/client/tickets/' + selectedTicket.id + '/messages', {
        method: 'POST',
        body: JSON.stringify({ message: reply }),
      });
      setReply('');
      await loadPortal();
      const refreshed = await requestJson('/api/client/portal');
      const next = (refreshed.data?.tickets || []).find((ticket: Ticket) => ticket.id === selectedTicket.id);
      if (next) setSelectedTicket(next);
      toast.success('Reply sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send reply');
    } finally {
      setReplyBusy(false);
    }
  };

  const projectStats = useMemo(() => {
    const projects = portal?.projects || [];
    return {
      total: projects.length,
      active: projects.filter((project) => project.status === 'active').length,
      completed: projects.filter((project) => project.status === 'completed').length,
    };
  }, [portal?.projects]);

  const openTicketCount = useMemo(
    () => (portal?.tickets || []).filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
    [portal?.tickets],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b10] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-emerald-300" />
          <p className="mt-4 text-sm text-white/45">Checking secure client session…</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#050b10] text-white">
        <div className="lw-dot-grid pointer-events-none fixed inset-0 opacity-[0.08]" />
        <div className="pointer-events-none fixed -right-24 top-20 size-96 rounded-full bg-emerald-400/10 blur-[130px]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 sm:px-6">
          <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div className="max-w-2xl">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-white/[0.09] bg-black/25">
                  <Image src="/logo.png" alt="" width={42} height={42} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Lightworld Technologies</span>
                  <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-emerald-300/65">Secure client portal</span>
                </span>
              </Link>

              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <LockKeyhole className="size-3.5" />
                Private workspace
              </div>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Your projects, milestones, documents and support—one place.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/42">
                Client Portal access is provisioned directly by Lightworld. There is no public registration flow.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  [FolderKanban, 'Project visibility'],
                  [FileText, 'Approved documents'],
                  [LifeBuoy, 'Support threads'],
                ].map(([Icon, label]) => (
                  <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <Icon className="size-4 text-emerald-300" />
                    <p className="mt-3 text-xs font-semibold text-white/65">{String(label)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-white/[0.08] bg-white/[0.045] text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                  <ShieldCheck className="size-5" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold">Client sign in</h2>
                <p className="mt-2 text-sm leading-6 text-white/38">
                  Use the email and temporary password issued to you by Lightworld.
                </p>

                <form onSubmit={login} className="mt-7 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-email" className="text-white/70">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      className="border-white/[0.1] bg-black/20 text-white placeholder:text-white/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password" className="text-white/70">Password</Label>
                    <Input
                      id="client-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className="border-white/[0.1] bg-black/20 text-white"
                      required
                    />
                  </div>
                  <Button disabled={loginBusy} className="h-11 w-full bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300">
                    {loginBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LockKeyhole className="mr-2 size-4" />}
                    Sign in
                  </Button>
                </form>

                <div className="mt-6 border-t border-white/[0.07] pt-5 text-xs leading-6 text-white/32">
                  Need portal access or a password reset? Contact{' '}
                  <a href="mailto:mail@lightworldtech.com" className="font-semibold text-emerald-300">mail@lightworldtech.com</a>.
                </div>
                <Link href="/" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white/45 transition hover:text-white/75">
                  <ArrowLeft className="size-3.5" /> Back to public website
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const requiresPasswordChange = Boolean(account.mustChangePassword || portal?.account.mustChangePassword);

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#071018]/92">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950">
              <Image src="/logo.png" alt="" width={32} height={32} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Lightworld Client Portal</p>
              <p className="truncate text-[10px] text-slate-400 dark:text-white/28">
                {account.organization || account.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPasswordOpen(true)}>
              <KeyRound className="mr-2 size-4" />
              <span className="hidden sm:inline">Password</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="mr-2 size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Client workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Welcome, {account.name}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-white/38">
              Track project progress, access approved resources and keep support conversations connected to the work.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadPortal()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Projects', projectStats.total, FolderKanban],
            ['Active', projectStats.active, RefreshCw],
            ['Completed', projectStats.completed, CheckCircle2],
            ['Open support', openTicketCount, LifeBuoy],
          ].map(([label, value, Icon]) => (
            <Card key={String(label)} className="border-slate-200/70 dark:border-white/[0.07]">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-slate-400 dark:text-white/28">{String(label)}</p>
                  <p className="mt-1 text-2xl font-semibold">{String(value)}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto">
          {[
            ['overview', 'Overview'],
            ['projects', 'Projects & Documents'],
            ['support', 'Support'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={
                activeTab === id
                  ? 'shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-slate-950'
                  : 'shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white/38'
              }
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <Card className="border-slate-200/70 dark:border-white/[0.07]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="size-4 text-amber-500" /> Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(portal?.announcements || []).length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 dark:border-white/[0.07] dark:text-white/25">
                    No current announcements.
                  </p>
                ) : (
                  portal?.announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                      <p className="font-semibold">{announcement.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-white/38">{announcement.message}</p>
                      <p className="mt-3 text-[10px] text-slate-400 dark:text-white/22">{new Date(announcement.publishedAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 dark:border-white/[0.07]">
              <CardHeader>
                <CardTitle className="text-base">Project snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(portal?.projects || []).length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 dark:border-white/[0.07] dark:text-white/25">
                    No project has been published to your portal yet.
                  </p>
                ) : (
                  portal?.projects.slice(0, 3).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setActiveTab('projects')}
                      className="w-full rounded-2xl border border-slate-200/70 p-4 text-left transition hover:border-emerald-300 dark:border-white/[0.07]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{project.title}</p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-white/25">{statusLabel(project.status)}</p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{project.progress}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: project.progress + '%' }} />
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="mt-6 space-y-5">
            {(portal?.projects || []).length === 0 ? (
              <Card className="border-dashed border-slate-300 dark:border-white/[0.08]">
                <CardContent className="p-10 text-center text-sm text-slate-400 dark:text-white/25">
                  No project has been published to your portal yet.
                </CardContent>
              </Card>
            ) : (
              portal?.projects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-slate-200/70 dark:border-white/[0.07]">
                  <CardContent className="p-0">
                    <div className="border-b border-slate-200/70 p-6 dark:border-white/[0.07]">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold">{project.title}</h2>
                            <Badge variant="outline">{statusLabel(project.status)}</Badge>
                          </div>
                          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-white/38">{project.summary || 'Project summary will be added by the Lightworld team.'}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{project.progress}%</p>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-white/20">Progress</p>
                        </div>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: project.progress + '%' }} />
                      </div>
                      {(project.startDate || project.targetDate) && (
                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 dark:text-white/28">
                          {project.startDate && <span>Started {new Date(project.startDate).toLocaleDateString()}</span>}
                          {project.targetDate && <span>Target {new Date(project.targetDate).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-0 lg:grid-cols-2">
                      <div className="border-b border-slate-200/70 p-6 dark:border-white/[0.07] lg:border-b-0 lg:border-r">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-white/25">Milestones</p>
                        <div className="mt-4 space-y-3">
                          {project.milestones.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-white/25">Milestones have not been published yet.</p>
                          ) : project.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex gap-3 rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                              <span className={
                                milestone.status === 'completed'
                                  ? 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white'
                                  : 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 dark:border-white/[0.09]'
                              }>
                                {milestone.status === 'completed' ? <CheckCircle2 className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                              </span>
                              <div>
                                <p className="text-sm font-semibold">{milestone.title}</p>
                                {milestone.description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/35">{milestone.description}</p>}
                                <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-400 dark:text-white/22">
                                  <span>{statusLabel(milestone.status)}</span>
                                  {milestone.dueDate && <span><CalendarDays className="mr-1 inline size-3" />{new Date(milestone.dueDate).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-white/25">Approved documents & resources</p>
                        <div className="mt-4 space-y-3">
                          {project.documents.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-white/25">No client-visible document links yet.</p>
                          ) : project.documents.map((document) => (
                            <a
                              key={document.id}
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 p-4 transition hover:border-emerald-300 dark:border-white/[0.07]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{document.title}</p>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-white/22">{document.category}</p>
                              </div>
                              <ExternalLink className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                            </a>
                          ))}
                        </div>
                        {project.documents.length > 0 && (
                          <p className="mt-4 text-[10px] leading-5 text-slate-400 dark:text-white/22">
                            Document links are approved by Lightworld for portal visibility, but the linked service may have its own access controls.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <Card className="border-slate-200/70 dark:border-white/[0.07]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LifeBuoy className="size-4 text-emerald-600 dark:text-emerald-300" /> Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(portal?.tickets || []).length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-400 dark:border-white/[0.07] dark:text-white/25">
                    No support conversations yet.
                  </p>
                ) : portal?.tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/70 p-4 text-left transition hover:border-emerald-300 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{ticket.subject}</p>
                        <Badge variant="outline">{statusLabel(ticket.status)}</Badge>
                        <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>{statusLabel(ticket.priority)}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-white/25">{ticket.project?.title || 'General support'} · {ticket.messages.length} messages</p>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-white/25">{new Date(ticket.updatedAt).toLocaleString()}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Button onClick={() => setTicketOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:text-slate-950">
              <Plus className="mr-2 size-4" /> New support request
            </Button>
          </div>
        )}
      </main>

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          if (requiresPasswordChange && !open) return;
          setPasswordOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{requiresPasswordChange ? 'Secure your client account' : 'Change password'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            {requiresPasswordChange
              ? 'Your temporary password must be replaced before project or support data can be displayed.'
              : 'Enter your current password and choose a new password of at least 12 characters.'}
          </p>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button disabled={passwordBusy} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {passwordBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
              Update password
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New support request</DialogTitle></DialogHeader>
          <form onSubmit={createTicket} className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <select
                value={ticketProjectId}
                onChange={(e) => setTicketProjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">General support</option>
                {(portal?.projects || []).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} required /></div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Message</Label><Textarea rows={5} value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} required /></div>
            <Button disabled={ticketBusy} className="w-full">
              {ticketBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Send support request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedTicket?.subject || 'Support conversation'}</DialogTitle></DialogHeader>
          {selectedTicket && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{statusLabel(selectedTicket.status)}</Badge>
                <Badge variant={selectedTicket.priority === 'high' ? 'destructive' : 'secondary'}>{statusLabel(selectedTicket.priority)}</Badge>
                {selectedTicket.project && <Badge variant="secondary">{selectedTicket.project.title}</Badge>}
              </div>

              <div className="space-y-2">
                {selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.authorType === 'client'
                        ? 'ml-7 rounded-2xl bg-emerald-500/10 p-4'
                        : 'mr-7 rounded-2xl bg-muted p-4'
                    }
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                      <span>{message.authorName} · {message.authorType === 'client' ? 'You' : 'Lightworld'}</span>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                  </div>
                ))}
              </div>

              {!['resolved', 'closed'].includes(selectedTicket.status) && (
                <form onSubmit={replyTicket} className="space-y-3">
                  <Label>Reply</Label>
                  <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add to this support conversation…" />
                  <Button disabled={replyBusy || !reply.trim()}>
                    {replyBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquare className="mr-2 size-4" />}
                    Send reply
                  </Button>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
