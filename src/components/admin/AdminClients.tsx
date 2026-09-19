'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ExternalLink,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ClientSummary = {
  id: string;
  leadId: string | null;
  email: string;
  name: string;
  organization: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { projects: number; tickets: number };
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
};

type Project = {
  id: string;
  title: string;
  summary: string;
  status: string;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  proposalId: string | null;
  milestones: Milestone[];
  documents: DocumentLink[];
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
  account: { id: string; name: string; organization: string; email: string };
  project: { id: string; title: string } | null;
  messages: TicketMessage[];
};

type Announcement = {
  id: string;
  accountId: string | null;
  title: string;
  message: string;
  active: boolean;
  publishedAt: string;
  account?: { id: string; name: string; organization: string } | null;
};

type ClientDetail = Omit<ClientSummary, '_count'> & {
  lead?: { id: string; summary: string; status: string } | null;
  projects: Project[];
  tickets: Ticket[];
  announcements: Announcement[];
};

type ClientSummaryStats = {
  total: number;
  active: number;
  projects: number;
  openTickets: number;
};

const clientDefaults = {
  name: '',
  organization: '',
  email: '',
  temporaryPassword: '',
};

const projectDefaults = {
  title: '',
  summary: '',
  status: 'planning',
  progress: 0,
};

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload;
}

export default function AdminClients() {
  const [section, setSection] = useState<'clients' | 'support' | 'announcements'>('clients');
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [summary, setSummary] = useState<ClientSummaryStats>({ total: 0, active: 0, projects: 0, openTickets: 0 });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [clientForm, setClientForm] = useState(clientDefaults);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [projectForm, setProjectForm] = useState(projectDefaults);
  const [resetPassword, setResetPassword] = useState('');
  const [milestoneDraft, setMilestoneDraft] = useState({ projectId: '', title: '', description: '', dueDate: '' });
  const [documentDraft, setDocumentDraft] = useState({ projectId: '', title: '', url: '', category: 'general' });

  const [ticketOpen, setTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketReply, setTicketReply] = useState('');

  const [announcementForm, setAnnouncementForm] = useState({
    accountId: '',
    title: '',
    message: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientPayload, ticketPayload, announcementPayload] = await Promise.all([
        requestJson('/api/admin/clients'),
        requestJson('/api/admin/client-tickets'),
        requestJson('/api/admin/client-announcements'),
      ]);
      setClients(clientPayload.data || []);
      setSummary(clientPayload.summary || { total: 0, active: 0, projects: 0, openTickets: 0 });
      setTickets(ticketPayload.data || []);
      setAnnouncements(announcementPayload.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load client workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openClient = async (id: string) => {
    try {
      const payload = await requestJson('/api/admin/clients/' + id);
      setSelectedClient(payload.data);
      setProjectForm(projectDefaults);
      setResetPassword('');
      setMilestoneDraft({ projectId: '', title: '', description: '', dueDate: '' });
      setDocumentDraft({ projectId: '', title: '', url: '', category: 'general' });
      setDetailOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load client');
    }
  };

  const refreshSelected = async () => {
    if (!selectedClient) return;
    const payload = await requestJson('/api/admin/clients/' + selectedClient.id);
    setSelectedClient(payload.data);
  };

  const createClient = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await requestJson('/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(clientForm),
      });
      toast.success('Client portal account created');
      setClientForm(clientDefaults);
      setCreateOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create client');
    } finally {
      setSaving(false);
    }
  };

  const updateClient = async (patch: Record<string, unknown>, success?: string) => {
    if (!selectedClient) return;
    try {
      await requestJson('/api/admin/clients/' + selectedClient.id, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      if (success) toast.success(success);
      await Promise.all([refreshSelected(), load()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update client');
    }
  };

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClient) return;
    setSaving(true);
    try {
      await requestJson('/api/admin/clients/' + selectedClient.id + '/projects', {
        method: 'POST',
        body: JSON.stringify(projectForm),
      });
      toast.success('Project added to client portal');
      setProjectForm(projectDefaults);
      await Promise.all([refreshSelected(), load()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create project');
    } finally {
      setSaving(false);
    }
  };

  const patchProject = async (projectId: string, patch: Record<string, unknown>) => {
    try {
      await requestJson('/api/admin/client-projects/' + projectId, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update project');
    }
  };

  const addMilestone = async (event: FormEvent) => {
    event.preventDefault();
    if (!milestoneDraft.projectId) return;
    try {
      await requestJson('/api/admin/client-projects/' + milestoneDraft.projectId + '/milestones', {
        method: 'POST',
        body: JSON.stringify({
          title: milestoneDraft.title,
          description: milestoneDraft.description,
          dueDate: milestoneDraft.dueDate ? new Date(milestoneDraft.dueDate).toISOString() : null,
        }),
      });
      toast.success('Milestone added');
      setMilestoneDraft({ projectId: '', title: '', description: '', dueDate: '' });
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add milestone');
    }
  };

  const patchMilestone = async (milestoneId: string, status: string) => {
    try {
      await requestJson('/api/admin/client-milestones/' + milestoneId, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update milestone');
    }
  };

  const addDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!documentDraft.projectId) return;
    try {
      await requestJson('/api/admin/client-projects/' + documentDraft.projectId + '/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: documentDraft.title,
          url: documentDraft.url,
          category: documentDraft.category,
          visible: true,
        }),
      });
      toast.success('Document link added');
      setDocumentDraft({ projectId: '', title: '', url: '', category: 'general' });
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add document link');
    }
  };

  const toggleDocument = async (document: DocumentLink) => {
    try {
      await requestJson('/api/admin/client-documents/' + document.id, {
        method: 'PUT',
        body: JSON.stringify({ visible: !document.visible }),
      });
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update document visibility');
    }
  };

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketReply('');
    setTicketOpen(true);
  };

  const patchTicket = async (ticketId: string, patch: Record<string, unknown>) => {
    try {
      const payload = await requestJson('/api/admin/client-tickets/' + ticketId, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      setSelectedTicket(payload.data);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update ticket');
    }
  };

  const replyTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || !ticketReply.trim()) return;
    try {
      await requestJson('/api/admin/client-tickets/' + selectedTicket.id + '/messages', {
        method: 'POST',
        body: JSON.stringify({ message: ticketReply }),
      });
      toast.success('Reply added');
      setTicketReply('');
      await load();
      const refreshed = await requestJson('/api/admin/client-tickets');
      const next = (refreshed.data || []).find((item: Ticket) => item.id === selectedTicket.id);
      if (next) setSelectedTicket(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send reply');
    }
  };

  const createAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await requestJson('/api/admin/client-announcements', {
        method: 'POST',
        body: JSON.stringify({
          accountId: announcementForm.accountId || null,
          title: announcementForm.title,
          message: announcementForm.message,
        }),
      });
      toast.success('Announcement published');
      setAnnouncementForm({ accountId: '', title: '', message: '' });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish announcement');
    }
  };

  const toggleAnnouncement = async (announcement: Announcement) => {
    try {
      await requestJson('/api/admin/client-announcements/' + announcement.id, {
        method: 'PUT',
        body: JSON.stringify({ active: !announcement.active }),
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update announcement');
    }
  };

  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
    [tickets],
  );

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Secure client operations</p>
          <h1 className="mt-1 text-2xl font-bold">Client Portal</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Provision client access, publish project progress, share approved HTTPS document links, and manage support conversations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 size-4" /> New Client
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Clients', summary.total, Users],
          ['Active', summary.active, ShieldCheck],
          ['Projects', summary.projects, FolderKanban],
          ['Open tickets', openTicketCount || summary.openTickets, LifeBuoy],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)} className="border-border/60">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{String(label)}</p>
                <p className="mt-1 text-2xl font-bold">{String(value)}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Icon className="size-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {[
          ['clients', 'Clients & Projects'],
          ['support', 'Support'],
          ['announcements', 'Announcements'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSection(id as typeof section)}
            className={
              section === id
                ? 'shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-slate-950'
                : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'clients' && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Portal accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No client portal accounts yet. Create one when a client is ready for project access.
              </div>
            ) : (
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => void openClient(client.id)}
                  className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{client.name}</p>
                      <Badge variant={client.active ? 'default' : 'secondary'}>{client.active ? 'Active' : 'Disabled'}</Badge>
                      {client.mustChangePassword && <Badge variant="outline">Password change required</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {client.organization || 'No organization'} · {client.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
                    <span>{client._count.projects} projects</span>
                    <span>{client._count.tickets} tickets</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {section === 'support' && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Support queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No client support tickets yet.
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 p-4 text-left transition hover:border-amber-300 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{ticket.subject}</p>
                      <Badge variant="outline">{ticket.status.replaceAll('_', ' ')}</Badge>
                      <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>{ticket.priority}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.account.name} · {ticket.account.organization || ticket.account.email}
                      {ticket.project ? ' · ' + ticket.project.title : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(ticket.updatedAt).toLocaleString()}</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {section === 'announcements' && (
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Publish announcement</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createAnnouncement} className="space-y-4">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <select
                    value={announcementForm.accountId}
                    onChange={(event) => setAnnouncementForm({ ...announcementForm, accountId: event.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All portal clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name} — {client.organization || client.email}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea rows={5} value={announcementForm.message} onChange={(event) => setAnnouncementForm({ ...announcementForm, message: event.target.value })} required />
                </div>
                <Button className="w-full bg-amber-600 hover:bg-amber-700"><Bell className="mr-2 size-4" /> Publish</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Published announcements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{announcement.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {announcement.account ? announcement.account.name : 'All clients'} · {new Date(announcement.publishedAt).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => void toggleAnnouncement(announcement)}>
                      <Badge variant={announcement.active ? 'default' : 'secondary'}>{announcement.active ? 'Active' : 'Hidden'}</Badge>
                    </button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{announcement.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create client portal account</DialogTitle></DialogHeader>
          <form onSubmit={createClient} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Organization</Label><Input value={clientForm.organization} onChange={(e) => setClientForm({ ...clientForm, organization: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input type="password" minLength={12} value={clientForm.temporaryPassword} onChange={(e) => setClientForm({ ...clientForm, temporaryPassword: e.target.value })} required />
              <p className="text-xs text-muted-foreground">Minimum 12 characters. Share it out-of-band; the API never returns it. The client must replace it on first login.</p>
            </div>
            <Button disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />} Create account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedClient?.name || 'Client workspace'}</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-2xl border border-border/60 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{selectedClient.organization || selectedClient.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedClient.email}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last login: {selectedClient.lastLogin ? new Date(selectedClient.lastLogin).toLocaleString() : 'Never'}
                  </p>
                </div>
                <Button
                  variant={selectedClient.active ? 'outline' : 'default'}
                  onClick={() => void updateClient({ active: !selectedClient.active }, selectedClient.active ? 'Client access disabled' : 'Client access enabled')}
                >
                  {selectedClient.active ? 'Disable access' : 'Enable access'}
                </Button>
              </div>

              <Card className="border-border/60">
                <CardHeader><CardTitle className="text-sm">Reset temporary password</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row">
                  <Input type="password" minLength={12} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New temporary password (12+ chars)" />
                  <Button
                    variant="outline"
                    disabled={resetPassword.length < 12}
                    onClick={() => {
                      void updateClient({ temporaryPassword: resetPassword }, 'Temporary password reset');
                      setResetPassword('');
                    }}
                  >
                    <KeyRound className="mr-2 size-4" /> Reset
                  </Button>
                </CardContent>
              </Card>

              <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
                <Card className="border-border/60">
                  <CardHeader><CardTitle className="text-sm">Add project</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={createProject} className="space-y-3">
                      <div className="space-y-2"><Label>Project title</Label><Input value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Summary</Label><Textarea rows={4} value={projectForm.summary} onChange={(e) => setProjectForm({ ...projectForm, summary: e.target.value })} /></div>
                      <Button disabled={saving} className="w-full"><Plus className="mr-2 size-4" /> Add project</Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {selectedClient.projects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No portal projects yet.</div>
                  ) : selectedClient.projects.map((project) => (
                    <Card key={project.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold">{project.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{project.summary || 'No project summary yet.'}</p>
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={project.status}
                              onChange={(e) => void patchProject(project.id, { status: e.target.value })}
                              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              <option value="planning">Planning</option>
                              <option value="active">Active</option>
                              <option value="on_hold">On hold</option>
                              <option value="completed">Completed</option>
                            </select>
                            <select
                              value={project.progress}
                              onChange={(e) => void patchProject(project.id, { progress: Number(e.target.value) })}
                              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              {[0,10,20,30,40,50,60,70,80,90,100].map((value) => <option key={value} value={value}>{value}%</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Milestones</p>
                              <Button size="sm" variant="ghost" onClick={() => setMilestoneDraft({ projectId: project.id, title: '', description: '', dueDate: '' })}>+ Add</Button>
                            </div>
                            <div className="mt-2 space-y-2">
                              {project.milestones.map((milestone) => (
                                <div key={milestone.id} className="rounded-xl border border-border/50 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">{milestone.title}</span>
                                    <select value={milestone.status} onChange={(e) => void patchMilestone(milestone.id, e.target.value)} className="rounded border border-input bg-background px-2 py-1 text-[10px]">
                                      <option value="pending">Pending</option>
                                      <option value="in_progress">In progress</option>
                                      <option value="completed">Completed</option>
                                    </select>
                                  </div>
                                  {milestone.dueDate && <p className="mt-1 text-[10px] text-muted-foreground"><CalendarDays className="mr-1 inline size-3" />{new Date(milestone.dueDate).toLocaleDateString()}</p>}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Document links</p>
                              <Button size="sm" variant="ghost" onClick={() => setDocumentDraft({ projectId: project.id, title: '', url: '', category: 'general' })}>+ Add</Button>
                            </div>
                            <div className="mt-2 space-y-2">
                              {project.documents.map((document) => (
                                <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3">
                                  <div className="min-w-0">
                                    <a href={document.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-sm font-medium hover:text-amber-600">
                                      {document.title} <ExternalLink className="size-3" />
                                    </a>
                                    <p className="text-[10px] text-muted-foreground">{document.category}</p>
                                  </div>
                                  <button onClick={() => void toggleDocument(document)}>
                                    <Badge variant={document.visible ? 'default' : 'secondary'}>{document.visible ? 'Visible' : 'Hidden'}</Badge>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {milestoneDraft.projectId && (
                <Card className="border-amber-200/70">
                  <CardHeader><CardTitle className="text-sm">New milestone</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={addMilestone} className="grid gap-3 md:grid-cols-2">
                      <Input placeholder="Milestone title" value={milestoneDraft.title} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, title: e.target.value })} required />
                      <Input type="date" value={milestoneDraft.dueDate} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, dueDate: e.target.value })} />
                      <Textarea className="md:col-span-2" placeholder="Description" value={milestoneDraft.description} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, description: e.target.value })} />
                      <div className="flex gap-2 md:col-span-2">
                        <Button type="submit">Add milestone</Button>
                        <Button type="button" variant="ghost" onClick={() => setMilestoneDraft({ projectId: '', title: '', description: '', dueDate: '' })}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {documentDraft.projectId && (
                <Card className="border-amber-200/70">
                  <CardHeader><CardTitle className="text-sm">New document link</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={addDocument} className="grid gap-3 md:grid-cols-2">
                      <Input placeholder="Document title" value={documentDraft.title} onChange={(e) => setDocumentDraft({ ...documentDraft, title: e.target.value })} required />
                      <Input placeholder="Category" value={documentDraft.category} onChange={(e) => setDocumentDraft({ ...documentDraft, category: e.target.value })} />
                      <Input className="md:col-span-2" type="url" placeholder="https://secure.example.com/document" value={documentDraft.url} onChange={(e) => setDocumentDraft({ ...documentDraft, url: e.target.value })} required />
                      <p className="text-xs text-muted-foreground md:col-span-2">Only approved HTTPS links are accepted. Phase 7 does not pretend an external link is privately hosted by Lightworld.</p>
                      <div className="flex gap-2 md:col-span-2">
                        <Button type="submit">Add document</Button>
                        <Button type="button" variant="ghost" onClick={() => setDocumentDraft({ projectId: '', title: '', url: '', category: 'general' })}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedTicket?.subject || 'Support ticket'}</DialogTitle></DialogHeader>
          {selectedTicket && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => void patchTicket(selectedTicket.id, { status: e.target.value })}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="waiting_client">Waiting client</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => void patchTicket(selectedTicket.id, { priority: e.target.value })}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.authorType === 'admin'
                        ? 'ml-8 rounded-2xl bg-amber-500/10 p-4'
                        : 'mr-8 rounded-2xl bg-muted p-4'
                    }
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                      <span>{message.authorName} · {message.authorType}</span>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={replyTicket} className="space-y-3">
                <Label>Reply</Label>
                <Textarea rows={4} value={ticketReply} onChange={(e) => setTicketReply(e.target.value)} placeholder="Write a client-visible support reply…" />
                <Button disabled={!ticketReply.trim()}><MessageSquare className="mr-2 size-4" /> Send reply</Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
