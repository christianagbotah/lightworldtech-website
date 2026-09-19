'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type PortalUser = {
  id: string; name: string; email: string; role: string; active: boolean;
  lastLogin: string | null; createdAt: string;
};
type Milestone = {
  id: string; title: string; description: string; status: string; order: number;
  dueDate: string | null; completedAt: string | null;
};
type Project = {
  id: string; name: string; summary: string; status: string; health: string;
  progress: number; manager: string; startDate: string | null; targetDate: string | null;
  milestones: Milestone[];
};
type Ticket = {
  id: string; projectId: string | null; subject: string; message: string;
  status: string; priority: string; createdAt: string; updatedAt: string;
};
type Organization = {
  id: string; name: string; status: string; primaryContactName: string;
  primaryEmail: string; primaryPhone: string; users: PortalUser[];
  projects: Project[]; tickets: Ticket[];
  _count: { users: number; projects: number; tickets: number };
};

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminClients() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  const [orgForm, setOrgForm] = useState({ name: '', primaryContactName: '', primaryEmail: '', primaryPhone: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'client_admin' });
  const [projectForm, setProjectForm] = useState({ name: '', summary: '', manager: '', targetDate: '' });
  const [milestoneForm, setMilestoneForm] = useState({ projectId: '', title: '', dueDate: '' });

  const selected = organizations.find((item) => item.id === selectedId) || organizations[0] || null;

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load client portal organizations');
      const payload = await response.json();
      const items: Organization[] = payload.data || [];
      setOrganizations(items);
      if (!selectedId && items.length) setSelectedId(items[0].id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchOrganizations(); }, []);

  const counts = useMemo(() => ({
    organizations: organizations.length,
    users: organizations.reduce((sum, item) => sum + item._count.users, 0),
    projects: organizations.reduce((sum, item) => sum + item._count.projects, 0),
    openTickets: organizations.reduce((sum, item) => sum + item.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length, 0),
  }), [organizations]);

  const patchOrganization = async (id: string, update: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/clients/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Could not update client organization');
      await fetchOrganizations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update client organization');
    }
  };

  const patchUser = async (id: string, update: Record<string, unknown>, success?: string) => {
    try {
      const response = await fetch('/api/admin/client-users/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not update portal user');
      await fetchOrganizations();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update portal user');
    }
  };

  const resetUserPassword = async (id: string) => {
    const password = resetPasswords[id] || '';
    if (password.length < 10) {
      toast.error('New password must be at least 10 characters');
      return;
    }
    await patchUser(id, { password }, 'Portal password reset');
    setResetPasswords((current) => ({ ...current, [id]: '' }));
  };

  const createOrganization = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orgForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create client organization');
      setOrgForm({ name: '', primaryContactName: '', primaryEmail: '', primaryPhone: '' });
      setSelectedId(payload.data.id);
      await fetchOrganizations();
      toast.success('Client organization created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create client organization');
    } finally { setSaving(false); }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create portal user');
      setUserForm({ name: '', email: '', password: '', role: 'client_admin' });
      await fetchOrganizations();
      toast.success('Portal user provisioned');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create portal user');
    } finally { setSaving(false); }
  };

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name,
          summary: projectForm.summary,
          manager: projectForm.manager,
          status: 'active',
          health: 'on_track',
          progress: 0,
          targetDate: projectForm.targetDate ? new Date(projectForm.targetDate).toISOString() : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create client project');
      setProjectForm({ name: '', summary: '', manager: '', targetDate: '' });
      setMilestoneForm((current) => ({ ...current, projectId: payload.data.id }));
      await fetchOrganizations();
      toast.success('Client project created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create client project');
    } finally { setSaving(false); }
  };

  const patchProject = async (projectId: string, update: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/client-projects/' + projectId, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Could not update project');
      await fetchOrganizations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update project');
    }
  };

  const createMilestone = async (event: FormEvent) => {
    event.preventDefault();
    if (!milestoneForm.projectId) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-projects/' + milestoneForm.projectId + '/milestones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: milestoneForm.title,
          dueDate: milestoneForm.dueDate ? new Date(milestoneForm.dueDate).toISOString() : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create milestone');
      setMilestoneForm({ projectId: milestoneForm.projectId, title: '', dueDate: '' });
      await fetchOrganizations();
      toast.success('Milestone published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create milestone');
    } finally { setSaving(false); }
  };

  const patchMilestone = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/client-milestones/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Could not update milestone');
      await fetchOrganizations();
    } catch { toast.error('Could not update milestone'); }
  };

  const patchTicket = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/client-tickets/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Could not update support ticket');
      await fetchOrganizations();
    } catch { toast.error('Could not update support ticket'); }
  };

  if (loading) {
    return <div className="space-y-5"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Client Portal</p>
          <h1 className="mt-1 text-2xl font-bold">Client organizations & delivery visibility</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Provision only real client organizations. Portal users see projects, milestones and support requests scoped to their organization.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchOrganizations()}><RefreshCw className="mr-2 size-4" /> Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Organizations', value: counts.organizations, icon: Building2 },
          { label: 'Portal users', value: counts.users, icon: Users },
          { label: 'Projects', value: counts.projects, icon: FolderKanban },
          { label: 'Open tickets', value: counts.openTickets, icon: LifeBuoy },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/60">
              <CardContent className="p-5">
                <Icon className="size-4 text-amber-600" />
                <p className="mt-4 text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Add client organization</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={createOrganization} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Input required placeholder="Organization name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            <Input placeholder="Primary contact" value={orgForm.primaryContactName} onChange={(e) => setOrgForm({ ...orgForm, primaryContactName: e.target.value })} />
            <Input type="email" placeholder="Primary email" value={orgForm.primaryEmail} onChange={(e) => setOrgForm({ ...orgForm, primaryEmail: e.target.value })} />
            <Input placeholder="Primary phone" value={orgForm.primaryPhone} onChange={(e) => setOrgForm({ ...orgForm, primaryPhone: e.target.value })} />
            <Button disabled={saving}><Plus className="mr-2 size-4" /> Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {organizations.length ? organizations.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={(selected?.id === item.id ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/[0.08] ' : 'border-border/60 ') + 'w-full rounded-xl border p-3 text-left transition'}>
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{item.name}</span><Badge variant="outline">{item.status}</Badge></div>
                <p className="mt-1 text-[10px] text-muted-foreground">{item._count.users} users · {item._count.projects} projects</p>
              </button>
            )) : <p className="text-sm text-muted-foreground">No client organizations yet.</p>}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>{selected.name}</CardTitle>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={selected.status}
                    onChange={(event) => void patchOrganization(selected.id, { status: event.target.value })}
                  >
                    <option value="active">Active organization</option>
                    <option value="inactive">Inactive / revoke portal</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-border/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Portal users</p>
                  <div className="mt-3 space-y-2">
                    {selected.users.map((user) => (
                      <div key={user.id} className="rounded-xl bg-muted/40 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{user.lastLogin ? 'Last login ' + new Date(user.lastLogin).toLocaleString() : 'Never signed in'}</p>
                          </div>
                          <Badge variant="outline">{user.active ? 'Active' : 'Revoked'}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                            value={user.role}
                            onChange={(event) => void patchUser(user.id, { role: event.target.value }, 'Portal role updated')}
                          >
                            <option value="client_admin">Client admin</option>
                            <option value="client_member">Client member</option>
                          </select>
                          <Button type="button" size="sm" variant="outline" onClick={() => void patchUser(user.id, { active: !user.active }, user.active ? 'Portal access revoked' : 'Portal access restored')}>
                            {user.active ? 'Revoke access' : 'Restore access'}
                          </Button>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Input
                            type="password"
                            minLength={10}
                            placeholder="New password (10+ chars)"
                            value={resetPasswords[user.id] || ''}
                            onChange={(event) => setResetPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                          />
                          <Button type="button" size="sm" variant="outline" onClick={() => void resetUserPassword(user.id)}>
                            Reset password
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!selected.users.length && <p className="text-xs text-muted-foreground">No portal users provisioned.</p>}
                  </div>
                  <form onSubmit={createUser} className="mt-4 space-y-3 border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold">Provision user</p>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /><Input required type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required minLength={10} type="password" placeholder="Initial password (10+ chars)" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="client_admin">Client admin</option><option value="client_member">Client member</option></select></div>
                    <Button disabled={saving} variant="outline"><KeyRound className="mr-2 size-4" /> Provision account</Button>
                    <p className="text-[10px] text-muted-foreground">Share initial credentials through an appropriate secure channel; the password is never returned by the API.</p>
                  </form>
                </div>

                <div className="rounded-2xl border border-border/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">New project</p>
                  <form onSubmit={createProject} className="mt-3 space-y-3">
                    <Input required placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
                    <Textarea rows={3} placeholder="Client-visible project summary" value={projectForm.summary} onChange={(e) => setProjectForm({ ...projectForm, summary: e.target.value })} />
                    <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Lightworld project lead" value={projectForm.manager} onChange={(e) => setProjectForm({ ...projectForm, manager: e.target.value })} /><Input type="date" value={projectForm.targetDate} onChange={(e) => setProjectForm({ ...projectForm, targetDate: e.target.value })} /></div>
                    <Button disabled={saving}><Plus className="mr-2 size-4" /> Create project</Button>
                  </form>

                  <form onSubmit={createMilestone} className="mt-5 space-y-3 border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold">Publish milestone</p>
                    <select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={milestoneForm.projectId} onChange={(e) => setMilestoneForm({ ...milestoneForm, projectId: e.target.value })}>
                      <option value="">Select project</option>{selected.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Milestone title" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} /><Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} /></div>
                    <Button disabled={saving} variant="outline"><CalendarClock className="mr-2 size-4" /> Add milestone</Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {selected.projects.map((project) => (
                <Card key={project.id} className="border-border/60">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="max-w-2xl"><p className="text-lg font-semibold">{project.name}</p><p className="mt-1 text-sm text-muted-foreground">{project.summary || 'No client-visible summary yet.'}</p></div>
                      <div className="grid grid-cols-3 gap-2">
                        <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={project.status} onChange={(e) => void patchProject(project.id, { status: e.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select>
                        <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={project.health} onChange={(e) => void patchProject(project.id, { health: e.target.value })}><option value="on_track">On track</option><option value="attention">Attention</option><option value="at_risk">At risk</option></select>
                        <Input type="number" min={0} max={100} value={project.progress} onChange={(e) => {
                          const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          setOrganizations((current) => current.map((org) => org.id !== selected.id ? org : ({ ...org, projects: org.projects.map((p) => p.id === project.id ? { ...p, progress: value } : p) })));
                        }} onBlur={(e) => void patchProject(project.id, { progress: Number(e.target.value) || 0 })} className="h-9 text-xs" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {project.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div><p className="text-sm font-medium">{milestone.title}</p><p className="text-[10px] text-muted-foreground">{milestone.dueDate ? 'Due ' + new Date(milestone.dueDate).toLocaleDateString() : 'No due date'}</p></div>
                          <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={milestone.status} onChange={(e) => void patchMilestone(milestone.id, e.target.value)}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select>
                        </div>
                      ))}
                      {!project.milestones.length && <p className="text-xs text-muted-foreground">No milestones published.</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!selected.projects.length && <Card className="border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">No projects created for this organization yet.</CardContent></Card>}
            </div>

            <Card className="border-border/60">
              <CardHeader><CardTitle className="text-base">Support tickets</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {selected.tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm font-semibold">{ticket.subject}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.message}</p></div>
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={ticket.status} onChange={(e) => void patchTicket(ticket.id, e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
                    </div>
                  </div>
                ))}
                {!selected.tickets.length && <p className="text-xs text-muted-foreground">No support tickets yet.</p>}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-8 text-sm text-muted-foreground">Create the first client organization to start provisioning the portal.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
