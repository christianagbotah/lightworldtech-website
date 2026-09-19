'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type ClientSummary = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { projects: number; tickets: number };
  openTickets: number;
};

type Milestone = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  order: number;
};

type Deliverable = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  url: string;
  status: string;
  deliveredAt: string | null;
};

type Ticket = {
  id: string;
  clientId: string;
  projectId: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminResponse: string;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string;
  clientId: string;
  name: string;
  status: string;
  summary: string;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  milestones: Milestone[];
  deliverables: Deliverable[];
  tickets: Ticket[];
};

type ClientDetail = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  projects: Project[];
  tickets: Ticket[];
};

function dateInput(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function apiDate(value: string) {
  return value ? new Date(value + 'T12:00:00').toISOString() : null;
}

function pretty(value: string) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export default function AdminClients() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [createClient, setCreateClient] = useState({
    companyName: '',
    contactName: '',
    email: '',
    password: '',
  });
  const [accountDraft, setAccountDraft] = useState({
    companyName: '',
    contactName: '',
    email: '',
    active: true,
    password: '',
  });
  const [newProject, setNewProject] = useState({
    name: '',
    summary: '',
    status: 'active',
    progress: '0',
    startDate: '',
    targetDate: '',
  });
  const [milestoneDraft, setMilestoneDraft] = useState({
    projectId: '',
    title: '',
    description: '',
    dueDate: '',
  });
  const [deliverableDraft, setDeliverableDraft] = useState({
    projectId: '',
    title: '',
    description: '',
    url: '',
    status: 'available',
  });
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  const loadClients = async () => {
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load portal clients');
      const payload = await response.json();
      setClients(payload.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load portal clients');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    const response = await fetch('/api/admin/clients/' + id, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load client workspace');
    const payload = await response.json();
    const value = payload.data as ClientDetail;
    setDetail(value);
    setAccountDraft({
      companyName: value.companyName,
      contactName: value.contactName,
      email: value.email,
      active: value.active,
      password: '',
    });
    const replies: Record<string, string> = {};
    [...value.tickets, ...value.projects.flatMap((project) => project.tickets)].forEach((ticket) => {
      replies[ticket.id] = ticket.adminResponse || '';
    });
    setTicketReplies(replies);
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const createPortalClient = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createClient),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create portal client');
      setCreateClient({ companyName: '', contactName: '', email: '', password: '' });
      await loadClients();
      await loadDetail(payload.data.id);
      toast.success('Client portal access created. Share the temporary password securely.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create portal client');
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        companyName: accountDraft.companyName,
        contactName: accountDraft.contactName,
        email: accountDraft.email,
        active: accountDraft.active,
      };
      if (accountDraft.password.trim()) body.password = accountDraft.password;

      const response = await fetch('/api/admin/clients/' + detail.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not update client');
      setDetail(payload.data);
      setAccountDraft((current) => ({ ...current, password: '' }));
      await loadClients();
      toast.success('Client account updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update client');
    } finally {
      setSaving(false);
    }
  };

  const portalAction = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/admin/client-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || 'Could not update client workspace');
    return payload.data;
  };

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    try {
      await portalAction({
        action: 'create-project',
        clientId: detail.id,
        name: newProject.name,
        summary: newProject.summary,
        status: newProject.status,
        progress: Number(newProject.progress || 0),
        startDate: apiDate(newProject.startDate),
        targetDate: apiDate(newProject.targetDate),
      });
      setNewProject({ name: '', summary: '', status: 'active', progress: '0', startDate: '', targetDate: '' });
      await loadDetail(detail.id);
      await loadClients();
      toast.success('Project added to client portal.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create project');
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async (project: Project, patch: Record<string, unknown>) => {
    if (!detail) return;
    setSaving(true);
    try {
      await portalAction({ action: 'update-project', id: project.id, ...patch });
      await loadDetail(detail.id);
      toast.success('Project updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update project');
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || !milestoneDraft.projectId) return;
    setSaving(true);
    try {
      await portalAction({
        action: 'create-milestone',
        projectId: milestoneDraft.projectId,
        title: milestoneDraft.title,
        description: milestoneDraft.description,
        dueDate: apiDate(milestoneDraft.dueDate),
        status: 'pending',
        order: 0,
      });
      setMilestoneDraft({ projectId: '', title: '', description: '', dueDate: '' });
      await loadDetail(detail.id);
      toast.success('Milestone published.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add milestone');
    } finally {
      setSaving(false);
    }
  };

  const updateMilestoneStatus = async (milestone: Milestone, status: string) => {
    if (!detail) return;
    try {
      await portalAction({ action: 'update-milestone', id: milestone.id, status });
      await loadDetail(detail.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update milestone');
    }
  };

  const addDeliverable = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || !deliverableDraft.projectId) return;
    setSaving(true);
    try {
      await portalAction({
        action: 'create-deliverable',
        projectId: deliverableDraft.projectId,
        title: deliverableDraft.title,
        description: deliverableDraft.description,
        url: deliverableDraft.url,
        status: deliverableDraft.status,
        deliveredAt: new Date().toISOString(),
      });
      setDeliverableDraft({ projectId: '', title: '', description: '', url: '', status: 'available' });
      await loadDetail(detail.id);
      toast.success('Deliverable published.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add deliverable');
    } finally {
      setSaving(false);
    }
  };

  const updateDeliverableStatus = async (deliverable: Deliverable, status: string) => {
    if (!detail) return;
    try {
      await portalAction({ action: 'update-deliverable', id: deliverable.id, status });
      await loadDetail(detail.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update deliverable');
    }
  };

  const saveTicket = async (ticket: Ticket, status = ticket.status) => {
    if (!detail) return;
    setSaving(true);
    try {
      await portalAction({
        action: 'update-ticket',
        id: ticket.id,
        status,
        priority: ticket.priority,
        adminResponse: ticketReplies[ticket.id] || '',
      });
      await loadDetail(detail.id);
      await loadClients();
      toast.success('Support request updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update support request');
    } finally {
      setSaving(false);
    }
  };

  const metrics = useMemo(() => ({
    total: clients.length,
    active: clients.filter((client) => client.active).length,
    projects: clients.reduce((sum, client) => sum + client._count.projects, 0),
    openTickets: clients.reduce((sum, client) => sum + client.openTickets, 0),
  }), [clients]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  const allTickets = detail
    ? [...detail.tickets, ...detail.projects.flatMap((project) => project.tickets)]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Client operations</p>
          <h1 className="mt-1 text-2xl font-bold">Client Portal Manager</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Provision secure client access and publish only the project information clients should see.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadClients()}>
          <RefreshCw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Portal clients', value: metrics.total, icon: UsersRound },
          { label: 'Active access', value: metrics.active, icon: ShieldCheck },
          { label: 'Projects', value: metrics.projects, icon: FolderKanban },
          { label: 'Open support', value: metrics.openTickets, icon: LifeBuoy },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/60">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Create client access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createPortalClient} className="space-y-4">
              <div className="space-y-2">
                <Label>Company / organization</Label>
                <Input required minLength={2} value={createClient.companyName} onChange={(e) => setCreateClient((v) => ({ ...v, companyName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Primary contact</Label>
                <Input required minLength={2} value={createClient.contactName} onChange={(e) => setCreateClient((v) => ({ ...v, contactName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" required value={createClient.email} onChange={(e) => setCreateClient((v) => ({ ...v, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <Input type="password" required minLength={12} value={createClient.password} onChange={(e) => setCreateClient((v) => ({ ...v, password: e.target.value }))} />
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Minimum 12 characters. Share it with the client through a secure channel. The password is not shown again after save.
                </p>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                Create portal access
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Portal clients</CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No client portal accounts yet.
              </div>
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => void loadDetail(client.id).catch((error) => toast.error(error.message))}
                    className="flex w-full flex-col gap-3 rounded-xl border border-border/60 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{client.companyName}</p>
                        <Badge variant={client.active ? 'default' : 'secondary'}>{client.active ? 'Active' : 'Disabled'}</Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{client.contactName} · {client.email}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {client._count.projects} projects · {client.openTickets} open support · Last login {client.lastLogin ? new Date(client.lastLogin).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline">
                      <UserRound className="mr-2 size-4" /> Open
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.companyName} · Client workspace</DialogTitle>
              </DialogHeader>

              <div className="space-y-7">
                <section className="rounded-2xl border border-border/60 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <KeyRound className="size-4 text-amber-600" />
                    <h2 className="font-semibold">Access & client identity</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input value={accountDraft.companyName} onChange={(e) => setAccountDraft((v) => ({ ...v, companyName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact name</Label>
                      <Input value={accountDraft.contactName} onChange={(e) => setAccountDraft((v) => ({ ...v, contactName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={accountDraft.email} onChange={(e) => setAccountDraft((v) => ({ ...v, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Access</Label>
                      <select value={accountDraft.active ? 'active' : 'disabled'} onChange={(e) => setAccountDraft((v) => ({ ...v, active: e.target.value === 'active' }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Reset password</Label>
                      <Input type="password" minLength={12} placeholder="Leave blank to keep current password" value={accountDraft.password} onChange={(e) => setAccountDraft((v) => ({ ...v, password: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={saveAccount} disabled={saving}>
                      <Save className="mr-2 size-4" /> Save client access
                    </Button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border/60 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FolderKanban className="size-4 text-amber-600" />
                    <h2 className="font-semibold">Add project</h2>
                  </div>
                  <form onSubmit={createProject} className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Project name</Label>
                      <Input required minLength={2} value={newProject.name} onChange={(e) => setNewProject((v) => ({ ...v, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select value={newProject.status} onChange={(e) => setNewProject((v) => ({ ...v, status: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="planned">Planned</option>
                        <option value="active">Active</option>
                        <option value="on-hold">On hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <Label>Client-facing summary</Label>
                      <Textarea rows={3} value={newProject.summary} onChange={(e) => setNewProject((v) => ({ ...v, summary: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start date</Label>
                      <Input type="date" value={newProject.startDate} onChange={(e) => setNewProject((v) => ({ ...v, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Target date</Label>
                      <Input type="date" value={newProject.targetDate} onChange={(e) => setNewProject((v) => ({ ...v, targetDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Initial progress (%)</Label>
                      <Input type="number" min={0} max={100} value={newProject.progress} onChange={(e) => setNewProject((v) => ({ ...v, progress: e.target.value }))} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={saving}>
                        <Plus className="mr-2 size-4" /> Add project
                      </Button>
                    </div>
                  </form>
                </section>

                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Published projects</p>
                    <h2 className="mt-1 text-lg font-semibold">Project progress, milestones & deliverables</h2>
                  </div>

                  {detail.projects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No projects yet.</div>
                  ) : detail.projects.map((project) => (
                    <Card key={project.id} className="border-border/60">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">{project.summary || 'No client-facing summary yet.'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <select value={project.status} onChange={(e) => void updateProject(project, { status: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                              <option value="planned">Planned</option>
                              <option value="active">Active</option>
                              <option value="on-hold">On hold</option>
                              <option value="completed">Completed</option>
                            </select>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={project.progress}
                              className="h-9 w-24 text-xs"
                              onBlur={(e) => {
                                const value = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                if (value !== project.progress) void updateProject(project, { progress: value });
                              }}
                              aria-label="Project progress percentage"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-5 xl:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="size-4 text-amber-600" />
                            <h3 className="text-sm font-semibold">Milestones</h3>
                          </div>
                          {project.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{milestone.title}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{milestone.dueDate ? 'Due ' + dateInput(milestone.dueDate) : 'No due date'}</p>
                              </div>
                              <select value={milestone.status} onChange={(e) => void updateMilestoneStatus(milestone, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-[11px]">
                                <option value="pending">Pending</option>
                                <option value="in-progress">In progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                          ))}
                          <form onSubmit={addMilestone} className="rounded-xl bg-muted/30 p-3">
                            <p className="mb-3 text-xs font-semibold">Publish milestone</p>
                            <input type="hidden" value={project.id} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input required placeholder="Milestone title" value={milestoneDraft.projectId === project.id ? milestoneDraft.title : ''} onFocus={() => setMilestoneDraft((v) => ({ ...v, projectId: project.id }))} onChange={(e) => setMilestoneDraft((v) => ({ ...v, projectId: project.id, title: e.target.value }))} />
                              <Input type="date" value={milestoneDraft.projectId === project.id ? milestoneDraft.dueDate : ''} onFocus={() => setMilestoneDraft((v) => ({ ...v, projectId: project.id }))} onChange={(e) => setMilestoneDraft((v) => ({ ...v, projectId: project.id, dueDate: e.target.value }))} />
                            </div>
                            <Textarea className="mt-2" rows={2} placeholder="Optional description" value={milestoneDraft.projectId === project.id ? milestoneDraft.description : ''} onFocus={() => setMilestoneDraft((v) => ({ ...v, projectId: project.id }))} onChange={(e) => setMilestoneDraft((v) => ({ ...v, projectId: project.id, description: e.target.value }))} />
                            <Button size="sm" className="mt-2" type="submit" disabled={saving || milestoneDraft.projectId !== project.id || !milestoneDraft.title.trim()}>
                              <Plus className="mr-1.5 size-3.5" /> Add milestone
                            </Button>
                          </form>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-amber-600" />
                            <h3 className="text-sm font-semibold">Deliverables</h3>
                          </div>
                          {project.deliverables.map((deliverable) => (
                            <div key={deliverable.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{deliverable.title}</p>
                                <p className="mt-1 truncate text-[11px] text-muted-foreground">{deliverable.url || 'No URL attached'}</p>
                              </div>
                              <select value={deliverable.status} onChange={(e) => void updateDeliverableStatus(deliverable, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-[11px]">
                                <option value="available">Available</option>
                                <option value="review">Review</option>
                                <option value="approved">Approved</option>
                                <option value="archived">Archived</option>
                              </select>
                            </div>
                          ))}
                          <form onSubmit={addDeliverable} className="rounded-xl bg-muted/30 p-3">
                            <p className="mb-3 text-xs font-semibold">Publish deliverable</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input required placeholder="Deliverable title" value={deliverableDraft.projectId === project.id ? deliverableDraft.title : ''} onFocus={() => setDeliverableDraft((v) => ({ ...v, projectId: project.id }))} onChange={(e) => setDeliverableDraft((v) => ({ ...v, projectId: project.id, title: e.target.value }))} />
                              <Input placeholder="https://…" value={deliverableDraft.projectId === project.id ? deliverableDraft.url : ''} onFocus={() => setDeliverableDraft((v) => ({ ...v, projectId: project.id }))} onChange={(e) => setDeliverableDraft((v) => ({ ...v, projectId: project.id, url: e.target.value }))} />
                            </div>
                            <Textarea className="mt-2" rows={2} placeholder="Optional description" value={deliverableDraft.projectId === project.id ? deliverableDraft.description : ''} onFocus={() => setDeliverableDraft((v) => ({ ...v, projectId: project.id }))} onChange={(e) => setDeliverableDraft((v) => ({ ...v, projectId: project.id, description: e.target.value }))} />
                            <Button size="sm" className="mt-2" type="submit" disabled={saving || deliverableDraft.projectId !== project.id || !deliverableDraft.title.trim()}>
                              <Plus className="mr-1.5 size-3.5" /> Add deliverable
                            </Button>
                          </form>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>

                <section className="rounded-2xl border border-border/60 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <LifeBuoy className="size-4 text-amber-600" />
                    <h2 className="font-semibold">Support requests</h2>
                  </div>
                  {allTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No client support requests yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {allTickets.map((ticket) => (
                        <div key={ticket.id} className="rounded-xl border border-border/60 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">{ticket.subject}</p>
                                <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold ' + statusClass(ticket.status)}>{pretty(ticket.status)}</span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{ticket.message}</p>
                            </div>
                            <select value={ticket.status} onChange={(e) => void saveTicket(ticket, e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                              <option value="open">Open</option>
                              <option value="in-progress">In progress</option>
                              <option value="waiting-client">Waiting client</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                            <Textarea rows={3} placeholder="Response visible to client" value={ticketReplies[ticket.id] || ''} onChange={(e) => setTicketReplies((v) => ({ ...v, [ticket.id]: e.target.value }))} />
                            <Button variant="outline" onClick={() => void saveTicket(ticket)} disabled={saving}>
                              <Save className="mr-2 size-4" /> Save response
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
