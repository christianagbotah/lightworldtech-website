'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
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

interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  adminId: string | null;
  adminEmail: string;
  adminName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

interface GovernancePayload {
  actor: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  admins: AdminAccount[];
  auditLogs: AuditLog[];
  summary: {
    totalAdmins: number;
    activeAdmins: number;
    activeSuperAdmins: number;
  };
}

interface AdminForm {
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  active: boolean;
  password: string;
}

const blankCreate: AdminForm = {
  name: '',
  email: '',
  role: 'admin',
  active: true,
  password: '',
};

function roleLabel(role: string) {
  return role === 'super_admin' ? 'Super admin' : 'Admin';
}

function actionLabel(action: string) {
  return action
    .replace(/^admin\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeDetails(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function AdminGovernance() {
  const [data, setData] = useState<GovernancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState<AdminForm>(blankCreate);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState<AdminForm>(blankCreate);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/admin/governance', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to load admin governance');
      setData(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admin governance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (admin: AdminAccount) => {
    setEditing(admin);
    setEditForm({
      name: admin.name,
      email: admin.email,
      role: admin.role === 'super_admin' ? 'super_admin' : 'admin',
      active: admin.active,
      password: '',
    });
    setEditOpen(true);
  };

  const createAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/admin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          role: createForm.role,
          password: createForm.password,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to create administrator');

      toast.success('Administrator account created');
      setCreateOpen(false);
      setCreateForm(blankCreate);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create administrator');
    } finally {
      setCreating(false);
    }
  };

  const saveAdmin = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;

    const body: Record<string, unknown> = {
      name: editForm.name,
    };

    if (editing.id !== data?.actor.id) {
      body.email = editForm.email;
      body.role = editForm.role;
      body.active = editForm.active;
    }

    if (editForm.password.trim()) {
      body.newPassword = editForm.password;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/governance/' + encodeURIComponent(editing.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to update administrator');

      toast.success('Administrator account updated');
      setEditOpen(false);
      setEditing(null);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update administrator');
    } finally {
      setSaving(false);
    }
  };

  const visibleAudit = useMemo(() => data?.auditLogs || [], [data]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-[460px] rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Administrator governance is unavailable for this account.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-amber-600" />
            <h1 className="text-2xl font-bold">Admin Governance</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Super-admin controls for administrator accounts and governance-sensitive audit activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add administrator
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Administrators</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.totalAdmins}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                <Users className="size-5 text-slate-700 dark:text-slate-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active accounts</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.activeAdmins}</p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/25">
                <UserCog className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active super-admins</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.activeSuperAdmins}</p>
              </div>
              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/25">
                <ShieldCheck className="size-5 text-amber-700 dark:text-amber-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Administrator accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last login</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{admin.name || 'Unnamed admin'}</p>
                          {admin.id === data.actor.id && <Badge variant="outline">You</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={admin.role === 'super_admin'
                        ? 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
                        {roleLabel(admin.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.active ? 'default' : 'secondary'}>
                        {admin.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(admin)}>
                        <UserCog className="mr-2 size-3.5" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4" />
            Governance audit trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="hidden md:table-cell">Target / details</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAudit.length ? visibleAudit.map((entry) => {
                  const details = safeDetails(entry.details);
                  const targetEmail = typeof details.targetEmail === 'string' ? details.targetEmail : '';
                  const changedFields = Array.isArray(details.changedFields)
                    ? details.changedFields.filter((item): item is string => typeof item === 'string')
                    : [];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline">{actionLabel(entry.action)}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{entry.adminName || 'System'}</p>
                        <p className="text-xs text-muted-foreground">{entry.adminEmail || '—'}</p>
                      </TableCell>
                      <TableCell className="hidden max-w-[360px] md:table-cell">
                        <p className="truncate text-sm">{targetEmail || entry.entity || '—'}</p>
                        {changedFields.length > 0 && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            Changed: {changedFields.join(', ')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No governance audit records yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add administrator</DialogTitle>
          </DialogHeader>
          <form onSubmit={createAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input required minLength={2} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as AdminForm['role'] })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input required minLength={12} type="password" autoComplete="new-password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} />
              <p className="text-xs text-muted-foreground">Minimum 12 characters. Share it through a secure channel.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage administrator</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required minLength={2} value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  required
                  type="email"
                  disabled={editing.id === data.actor.id}
                  value={editForm.email}
                  onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                />
                {editing.id === data.actor.id && (
                  <p className="text-xs text-muted-foreground">Use another super-admin account to change your own email.</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    disabled={editing.id === data.actor.id}
                    value={editForm.role}
                    onChange={(event) => setEditForm({ ...editForm, role: event.target.value as AdminForm['role'] })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    disabled={editing.id === data.actor.id}
                    value={editForm.active ? 'active' : 'inactive'}
                    onChange={(event) => setEditForm({ ...editForm, active: event.target.value === 'active' })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reset password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    value={editForm.password}
                    onChange={(event) => setEditForm({ ...editForm, password: event.target.value })}
                    placeholder="Leave blank to keep the existing password"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                The system blocks self-deactivation, self-demotion and any change that would leave the site without an active super-admin.
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
