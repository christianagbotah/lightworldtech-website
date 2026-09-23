'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  Copy,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ClientCommercialAccount from '@/components/admin/ClientCommercialAccount';
import OperationalLoadError from '@/components/admin/OperationalLoadError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';

type PortalUser = {
  id: string; name: string; email: string; role: string; active: boolean;
  lastLogin: string | null; mustSetPassword: boolean; inviteExpiresAt: string | null; createdAt: string;
};
type Milestone = {
  id: string; title: string; description: string; status: string; order: number;
  dueDate: string | null; completedAt: string | null;
};
type DocumentItem = {
  id: string; title: string; description: string; url: string;
  category: string; visibleToClient: boolean; createdAt: string;
};
type Announcement = {
  id: string; projectId: string | null; title: string; body: string;
  active: boolean; publishAt: string; createdAt: string;
};
type Project = {
  id: string; name: string; summary: string; status: string; health: string;
  progress: number; manager: string; startDate: string | null; targetDate: string | null;
  expiryDate: string | null; nextRenewalDate: string | null; renewalCycle: string;
  renewalCurrency: string; renewalAmount: string; autoRenew: boolean;
  renewalNoticeDays: number; renewalNotes: string;
  milestones: Milestone[]; documents: DocumentItem[]; announcements: Announcement[];
};
type TicketMessage = {
  id: string; authorType: string; authorName: string; message: string; createdAt: string;
};
type Ticket = {
  id: string; ticketNumber: string; projectId: string | null; subject: string; message: string;
  category: string; status: string; priority: string; assignedTo: string;
  createdAt: string; updatedAt: string; lastActivityAt: string;
  messages: TicketMessage[];
};
type Organization = {
  id: string; name: string; status: string; primaryContactName: string;
  primaryEmail: string; primaryPhone: string; users: PortalUser[];
  projects: Project[]; tickets: Ticket[]; announcements: Announcement[];
  _count: { users: number; projects: number; tickets: number };
};

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminClients() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'document' | 'announcement'; id: string; label: string } | null>(null);
  const [activationLinks, setActivationLinks] = useState<Record<string, string>>({});

  const [orgForm, setOrgForm] = useState({ name: '', primaryContactName: '', primaryEmail: '', primaryPhone: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'client_admin' });
  const [projectForm, setProjectForm] = useState({
    name: '',
    summary: '',
    manager: '',
    targetDate: '',
    expiryDate: '',
    nextRenewalDate: '',
    renewalCycle: 'annual',
    renewalCurrency: 'GHS',
    renewalAmount: '',
    autoRenew: false,
    renewalNoticeDays: '30',
    renewalNotes: '',
  });
  const [milestoneForm, setMilestoneForm] = useState({ projectId: '', title: '', dueDate: '' });
  const [documentForms, setDocumentForms] = useState<Record<string, { title: string; url: string; description: string; category: string }>>({});
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', projectId: '' });
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  const selected = organizations.find((item) => item.id === selectedId) || organizations[0] || null;

  const fetchOrganizations = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load client portal organizations');
      const payload = await response.json();
      const items: Organization[] = payload.data || [];
      setOrganizations(items);
      if (!selectedId && items.length) setSelectedId(items[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load clients';
      setLoadError(message);
      toast.error(message);
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
      if (payload?.activationUrl) {
        setActivationLinks((current) => ({ ...current, [id]: String(payload.activationUrl) }));
      }
      await fetchOrganizations();
      if (success) toast.success(success);
      return payload;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update portal user');
      return null;
    }
  };

  const regenerateInvite = async (id: string) => {
    await patchUser(id, { regenerateInvite: true }, 'New activation link generated');
  };

  const copyActivationLink = async (id: string) => {
    const url = activationLinks[id];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Activation link copied');
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
      setUserForm({ name: '', email: '', role: 'client_admin' });
      if (payload?.activationUrl && payload?.data?.id) {
        setActivationLinks((current) => ({ ...current, [payload.data.id]: String(payload.activationUrl) }));
      }
      await fetchOrganizations();
      toast.success('Portal user provisioned — share the activation link securely');
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
          expiryDate: projectForm.expiryDate ? new Date(projectForm.expiryDate).toISOString() : null,
          nextRenewalDate: projectForm.nextRenewalDate ? new Date(projectForm.nextRenewalDate).toISOString() : null,
          renewalCycle: projectForm.renewalCycle,
          renewalCurrency: projectForm.renewalCurrency,
          renewalAmount: Number(projectForm.renewalAmount || 0),
          autoRenew: projectForm.autoRenew,
          renewalNoticeDays: Number(projectForm.renewalNoticeDays || 30),
          renewalNotes: projectForm.renewalNotes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not create client project');
      setProjectForm({
        name: '',
        summary: '',
        manager: '',
        targetDate: '',
        expiryDate: '',
        nextRenewalDate: '',
        renewalCycle: 'annual',
        renewalCurrency: 'GHS',
        renewalAmount: '',
        autoRenew: false,
        renewalNoticeDays: '30',
        renewalNotes: '',
      });
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

  const updateProjectLocal = (projectId: string, update: Partial<Project>) => {
    if (!selected) return;
    setOrganizations((current) => current.map((organization) =>
      organization.id !== selected.id
        ? organization
        : {
            ...organization,
            projects: organization.projects.map((project) =>
              project.id === projectId ? { ...project, ...update } : project,
            ),
          },
    ));
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

  const createDocument = async (event: FormEvent, projectId: string) => {
    event.preventDefault();
    const form = documentForms[projectId] || { title: '', url: '', description: '', category: 'document' };
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-projects/' + projectId + '/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, visibleToClient: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not publish document');
      setDocumentForms((current) => ({ ...current, [projectId]: { title: '', url: '', description: '', category: 'document' } }));
      await fetchOrganizations();
      toast.success('Client document published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish document');
    } finally { setSaving(false); }
  };

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch('/api/admin/client-documents/' + id, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove document');
      await fetchOrganizations();
      toast.success('Client document removed');
    } catch { toast.error('Could not remove document'); }
  };

  const createAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementForm.title,
          body: announcementForm.body,
          projectId: announcementForm.projectId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not publish announcement');
      setAnnouncementForm({ title: '', body: '', projectId: '' });
      await fetchOrganizations();
      toast.success('Client announcement published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish announcement');
    } finally { setSaving(false); }
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    try {
      const response = await fetch('/api/admin/client-announcements/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error('Could not update announcement');
      await fetchOrganizations();
    } catch { toast.error('Could not update announcement'); }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch('/api/admin/client-announcements/' + id, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete announcement');
      await fetchOrganizations();
      toast.success('Announcement deleted');
    } catch { toast.error('Could not delete announcement'); }
  };

  const replyTicket = async (ticketId: string) => {
    const message = (ticketReplies[ticketId] || '').trim();
    if (!message) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-tickets/' + ticketId + '/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not send reply');
      setTicketReplies((current) => ({ ...current, [ticketId]: '' }));
      await fetchOrganizations();
      toast.success('Support reply sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send reply');
    } finally { setSaving(false); }
  };

  if (loading && !organizations.length) {
    return <div className="space-y-5"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  if (loadError && !organizations.length) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Client Portal"
          title="Client organizations & delivery visibility"
          description="Provision only real client organizations. Portal users see projects, milestones and support requests scoped to their organization."
        />
        <OperationalLoadError
          title="Client organizations could not be loaded"
          message={loadError}
          retrying={loading}
          onRetry={() => void fetchOrganizations()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Client Portal"
        title="Client organizations & delivery visibility"
        description="Provision only real client organizations. Portal users see projects, milestones and support requests scoped to their organization."
        actions={
          <Button variant="outline" onClick={() => void fetchOrganizations()} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} /> Refresh
          </Button>
        }
      />

      {loadError && (
        <OperationalLoadError
          title="Client workspace refresh failed"
          message={loadError + '. Showing the last successfully loaded client records.'}
          retrying={loading}
          onRetry={() => void fetchOrganizations()}
        />
      )}

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
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">{item.value}</p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <Icon className="size-5" />
                </span>
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
            <Input type="email" autoComplete="email" placeholder="Primary email" value={orgForm.primaryEmail} onChange={(e) => setOrgForm({ ...orgForm, primaryEmail: e.target.value })} />
            <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="Primary phone" value={orgForm.primaryPhone} onChange={(e) => setOrgForm({ ...orgForm, primaryPhone: e.target.value })} />
            <Button disabled={saving}><Plus className="mr-2 size-4" /> Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {organizations.length ? organizations.map((item) => (
              <button key={item.id} type="button" aria-pressed={selected?.id === item.id} onClick={() => setSelectedId(item.id)} className={(selected?.id === item.id ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/[0.08] ' : 'border-border/60 ') + 'w-full rounded-xl border p-3 text-left transition'}>
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
                    className="h-9 rounded-lg border border-input bg-background px-3 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
                    value={selected.status}
                    onChange={(event) => void patchOrganization(selected.id, { status: event.target.value })}
                  >
                    <option value="active">Active organization</option>
                    <option value="inactive">Inactive / revoke portal</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-5 xl:grid-cols-2">
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
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">{user.active ? 'Active' : 'Revoked'}</Badge>
                            {user.mustSetPassword && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Activation pending</Badge>}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <select
                            className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
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
                        <div className="mt-2 space-y-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => void regenerateInvite(user.id)}>
                            <KeyRound className="mr-2 size-3.5" /> {user.mustSetPassword ? 'Generate new activation link' : 'Generate reset link'}
                          </Button>
                          {activationLinks[user.id] && (
                            <div className="flex gap-2">
                              <Input readOnly value={activationLinks[user.id]} className="h-9 text-xs" />
                              <Button type="button" size="icon" variant="outline" onClick={() => void copyActivationLink(user.id)} aria-label="Copy activation link">
                                <Copy className="size-3.5" />
                              </Button>
                            </div>
                          )}
                          {user.mustSetPassword && user.inviteExpiresAt && (
                            <p className="text-[10px] text-muted-foreground">Current activation window expires {new Date(user.inviteExpiresAt).toLocaleString()}.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {!selected.users.length && <p className="text-xs text-muted-foreground">No portal users provisioned.</p>}
                  </div>
                  <form onSubmit={createUser} className="mt-4 space-y-3 border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold">Provision user</p>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required autoComplete="name" placeholder="Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /><Input required type="email" autoComplete="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                    <select className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="client_admin">Client admin</option><option value="client_member">Client member</option></select>
                    <Button disabled={saving} variant="outline"><KeyRound className="mr-2 size-4" /> Provision & generate activation link</Button>
                    <p className="text-[10px] text-muted-foreground">Lightworld never sets the client’s password. The API returns a one-time activation URL that expires after 7 days.</p>
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
                    <select required className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={milestoneForm.projectId} onChange={(e) => setMilestoneForm({ ...milestoneForm, projectId: e.target.value })}>
                      <option value="">Select project</option>{selected.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Milestone title" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} /><Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} /></div>
                    <Button disabled={saving} variant="outline"><CalendarClock className="mr-2 size-4" /> Add milestone</Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <ClientCommercialAccount
              organizationId={selected.id}
              organizationName={selected.name}
            />

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="size-4 text-amber-600" /> Client announcements</CardTitle>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
                <form onSubmit={createAnnouncement} className="space-y-3">
                  <Input required placeholder="Announcement title" value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} />
                  <Textarea required rows={4} placeholder="Client-visible update…" value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} />
                  <select className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={announcementForm.projectId} onChange={(event) => setAnnouncementForm({ ...announcementForm, projectId: event.target.value })}>
                    <option value="">Organization-wide announcement</option>
                    {selected.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                  <Button disabled={saving}><Megaphone className="mr-2 size-4" /> Publish announcement</Button>
                </form>
                <div className="space-y-2">
                  {selected.announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{announcement.title}</p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{announcement.body}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">{announcement.projectId ? 'Project update' : 'Organization-wide'} · {new Date(announcement.publishAt).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline">{announcement.active ? 'Published' : 'Hidden'}</Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void toggleAnnouncement(announcement.id, !announcement.active)}>
                          {announcement.active ? 'Hide' : 'Publish'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDelete({ kind: 'announcement', id: announcement.id, label: announcement.title })}>
                          <Trash2 className="mr-1 size-3.5 text-destructive" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selected.announcements.length && <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No client announcements yet.</p>}
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
                        <select className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={project.status} onChange={(e) => void patchProject(project.id, { status: e.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select>
                        <select className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={project.health} onChange={(e) => void patchProject(project.id, { health: e.target.value })}><option value="on_track">On track</option><option value="attention">Attention</option><option value="at_risk">At risk</option></select>
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
                          <select className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={milestone.status} onChange={(e) => void patchMilestone(milestone.id, e.target.value)}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select>
                        </div>
                      ))}
                      {!project.milestones.length && <p className="text-xs text-muted-foreground">No milestones published.</p>}
                    </div>

                    <div className="mt-5 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><FileText className="size-3.5" /> Client documents</p>
                        <span className="text-[10px] text-muted-foreground">{project.documents.length} published</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {project.documents.map((document) => (
                          <div key={document.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                            <div className="min-w-0">
                              <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-amber-600 hover:underline">{document.title}</a>
                              {document.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{document.description}</p>}
                              <p className="mt-1 text-[10px] text-muted-foreground">{pretty(document.category)} · {document.visibleToClient ? 'Visible to client' : 'Internal'}</p>
                            </div>
                            <Button type="button" size="icon" variant="ghost" onClick={() => setPendingDelete({ kind: 'document', id: document.id, label: document.title })} aria-label="Remove document">
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(event) => void createDocument(event, project.id)} className="mt-3 grid gap-2 lg:grid-cols-2">
                        <Input
                          required
                          placeholder="Document title"
                          value={documentForms[project.id]?.title || ''}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { url: '', description: '', category: 'document' }), title: event.target.value } }))}
                        />
                        <Input
                          required
                          placeholder="https://… or /files/…"
                          value={documentForms[project.id]?.url || ''}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { title: '', description: '', category: 'document' }), url: event.target.value } }))}
                        />
                        <Input
                          placeholder="Category (document, invoice, guide…)"
                          value={documentForms[project.id]?.category || 'document'}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { title: '', url: '', description: '' }), category: event.target.value } }))}
                        />
                        <Input
                          placeholder="Short description"
                          value={documentForms[project.id]?.description || ''}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { title: '', url: '', category: 'document' }), description: event.target.value } }))}
                        />
                        <Button disabled={saving} variant="outline" className="lg:col-span-2"><Plus className="mr-2 size-4" /> Publish document link</Button>
                      </form>
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
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">{ticket.ticketNumber}</span>
                          <p className="text-sm font-semibold">{ticket.subject}</p>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{ticket.message}</p>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          {pretty(ticket.category)} · {pretty(ticket.priority)} priority
                          {ticket.assignedTo ? ' · ' + ticket.assignedTo : ' · Unassigned'}
                          {' · opened ' + new Date(ticket.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <select className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={ticket.status} onChange={(e) => void patchTicket(ticket.id, e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="awaiting_client">Awaiting client</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
                    </div>
                    {ticket.messages.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                        {ticket.messages.map((message) => (
                          <div key={message.id} className={message.authorType === 'admin' ? 'mr-8 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20' : 'ml-8 rounded-xl bg-muted/50 p-3'}>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <span>{message.authorName} · {message.authorType === 'admin' ? 'Lightworld' : 'Client'}</span>
                              <span>{new Date(message.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {ticket.status !== 'closed' && (
                      <div className="mt-3 flex gap-2">
                        <Input value={ticketReplies[ticket.id] || ''} onChange={(event) => setTicketReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Reply as Lightworld…" />
                        <Button type="button" size="icon" disabled={saving || !(ticketReplies[ticket.id] || '').trim()} onClick={() => void replyTicket(ticket.id)} aria-label="Send support reply">
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                      </div>
                    )}
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
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        tone="destructive"
        title={pendingDelete?.kind === 'document' ? 'Remove client document?' : 'Delete client announcement?'}
        description={
          pendingDelete?.kind === 'document'
            ? 'Remove “' + pendingDelete.label + '” from the client portal. The linked source file is not deleted by this action.'
            : pendingDelete
              ? 'Permanently delete the announcement “' + pendingDelete.label + '”. Clients will no longer be able to view it.'
              : 'Confirm this destructive action.'
        }
        confirmLabel={pendingDelete?.kind === 'document' ? 'Remove document' : 'Delete announcement'}
        onConfirm={async () => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === 'document') await deleteDocument(pendingDelete.id);
          else await deleteAnnouncement(pendingDelete.id);
        }}
      />
    </div>
  );
}
