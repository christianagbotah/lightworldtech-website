'use client';

import { readJsonResponse } from '@/lib/client-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
  ShieldAlert,
  Download,
  Search,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import AdminPermissionPicker from '@/components/admin/AdminPermissionPicker';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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
  recoveryEmail: string;
  name: string;
  role: string;
  permissions: string[];
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
    permissions: string[];
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
  recoveryEmail: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  active: boolean;
  password: string;
}

const blankCreate: AdminForm = {
  name: '',
  email: '',
  recoveryEmail: '',
  role: 'admin',
  permissions: [],
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
  const [revoking, setRevoking] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AdminForm>(blankCreate);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState<AdminForm>(blankCreate);
  const [auditQuery, setAuditQuery] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditEntity, setAuditEntity] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditExporting, setAuditExporting] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/admin/governance', { cache: 'no-store' });
      const payload = await readJsonResponse(response);
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
      recoveryEmail: admin.recoveryEmail,
      role: admin.role === 'super_admin' ? 'super_admin' : 'admin',
      permissions: admin.permissions || [],
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
          recoveryEmail: createForm.recoveryEmail || createForm.email,
          role: createForm.role,
          permissions: createForm.permissions,
          password: createForm.password,
        }),
      });
      const payload = await readJsonResponse(response);
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
      recoveryEmail: editForm.recoveryEmail,
    };

    if (editing.id !== data?.actor.id) {
      body.email = editForm.email;
      body.role = editForm.role;
      body.permissions = editForm.permissions;
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
      const payload = await readJsonResponse(response);
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

  const revokeSessions = async () => {
    if (!editing || editing.id === data?.actor.id) return;
    setRevoking(true);
    try {
      const response = await fetch('/api/admin/governance/' + encodeURIComponent(editing.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeSessions: true }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Failed to revoke administrator sessions');

      toast.success('Administrator sessions revoked');
      setRevokeOpen(false);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke administrator sessions');
    } finally {
      setRevoking(false);
    }
  };

  const visibleAudit = useMemo(() => {
    const query = auditQuery.trim().toLowerCase();
    const action = auditAction.trim().toLowerCase();
    const entity = auditEntity.trim().toLowerCase();
    const from = auditFrom ? new Date(auditFrom + 'T00:00:00') : null;
    const to = auditTo ? new Date(auditTo + 'T23:59:59.999') : null;

    return (data?.auditLogs || []).filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      if (query && ![entry.adminName, entry.adminEmail, entry.entityId, entry.details].join(' ').toLowerCase().includes(query)) return false;
      if (action && !entry.action.toLowerCase().includes(action)) return false;
      if (entity && !entry.entity.toLowerCase().includes(entity)) return false;
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      return true;
    });
  }, [data, auditQuery, auditAction, auditEntity, auditFrom, auditTo]);

  const exportAudit = async () => {
    setAuditExporting(true);
    try {
      const params = new URLSearchParams();
      if (auditQuery.trim()) params.set('actor', auditQuery.trim());
      if (auditAction.trim()) params.set('action', auditAction.trim());
      if (auditEntity.trim()) params.set('entity', auditEntity.trim());
      if (auditFrom) params.set('from', auditFrom);
      if (auditTo) params.set('to', auditTo);

      const response = await fetch('/api/admin/governance/audit-export?' + params.toString(), { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to export governance audit trail');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || 'lightworld-governance-audit.csv';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Governance audit export downloaded');
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export governance audit trail');
    } finally {
      setAuditExporting(false);
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
      <AdminPageHeader
        eyebrow="Administration"
        title="Admin Governance"
        description="Super-admin controls for administrator accounts and governance-sensitive audit activity."
        actions={
          <>
            <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add administrator
            </Button>
          </>
        }
      />

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
          <div className="max-w-full overflow-x-auto">
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
                        <p className="mt-0.5 text-[11px] text-muted-foreground/75">
                          Recovery: {admin.recoveryEmail || 'Not configured'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={admin.role === 'super_admin'
                        ? 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
                        {roleLabel(admin.role)}
                      </Badge>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {admin.role === 'super_admin'
                          ? 'Full access'
                          : admin.permissions.length + ' permission' + (admin.permissions.length === 1 ? '' : 's')}
                      </p>
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
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4" />
                Governance audit trail
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Filter the recent view or export up to 5,000 matching governance events for compliance review.</p>
            </div>
            <Button variant="outline" onClick={() => void exportAudit()} disabled={auditExporting}>
              {auditExporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Export audit CSV
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(160px,.7fr)_minmax(150px,.6fr)_150px_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Actor, email, target or details" className="pl-9" />
            </div>
            <Input value={auditAction} onChange={(event) => setAuditAction(event.target.value)} placeholder="Action contains…" />
            <Input value={auditEntity} onChange={(event) => setAuditEntity(event.target.value)} placeholder="Entity contains…" />
            <Input type="date" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} aria-label="Audit from date" />
            <Input type="date" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} aria-label="Audit to date" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] max-w-full overflow-auto">
            <Table exportFileName="lightworld-governance-visible-audit">
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
              <Label>Recovery email</Label>
              <Input
                required
                type="email"
                value={createForm.recoveryEmail}
                onChange={(event) => setCreateForm({ ...createForm, recoveryEmail: event.target.value })}
                placeholder="Mailbox that receives password reset links"
              />
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
              <Label>Access permissions</Label>
              {createForm.role === 'super_admin' ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                  Super-admin accounts automatically have full access to every CMS and governance area.
                </p>
              ) : (
                <>
                  <AdminPermissionPicker
                    value={createForm.permissions}
                    onChange={(permissions) => setCreateForm({ ...createForm, permissions })}
                  />
                  <p className="text-xs text-muted-foreground">Assign only the areas this administrator needs.</p>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input required minLength={12} type="password" autoComplete="new-password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} />
              <p className="text-xs text-muted-foreground">Minimum 12 characters. Share it through a secure channel.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={creating || (createForm.role === 'admin' && createForm.permissions.length === 0)}
              >
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
              <div className="space-y-2">
                <Label>Recovery email</Label>
                <Input
                  required
                  type="email"
                  value={editForm.recoveryEmail}
                  onChange={(event) => setEditForm({ ...editForm, recoveryEmail: event.target.value })}
                  placeholder="Mailbox that receives password reset links"
                />
                <p className="text-xs text-muted-foreground">
                  Password reset links are delivered here; it can differ from the CMS login email.
                </p>
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
                <Label>Access permissions</Label>
                {editForm.role === 'super_admin' ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                    Super-admin accounts automatically have full access to every CMS and governance area.
                  </p>
                ) : (
                  <>
                    <AdminPermissionPicker
                      value={editForm.permissions}
                      onChange={(permissions) => setEditForm({ ...editForm, permissions })}
                      disabled={editing.id === data.actor.id}
                    />
                    <p className="text-xs text-muted-foreground">
                      Permission changes revoke the target administrator&apos;s current session.
                    </p>
                  </>
                )}
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
                The system blocks self-deactivation, self-demotion and any change that would leave the site without an active super-admin. Role, email, permission, password and account-status changes now invalidate existing sessions automatically.
              </div>
              {editing.id !== data.actor.id && (
                <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
                      <ShieldAlert className="size-4" /> Active sessions
                    </p>
                    <p className="mt-1 text-xs leading-5 text-rose-700/80 dark:text-rose-200/70">
                      Force this administrator to sign in again on every device without changing the password.
                    </p>
                  </div>
                  <Button type="button" variant="destructive" onClick={() => setRevokeOpen(true)} className="shrink-0">
                    Revoke sessions
                  </Button>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={saving || (editForm.role === 'admin' && editForm.permissions.length === 0)}
                >
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke all active sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              {editing?.name || editing?.email || 'This administrator'} will be signed out on their next protected request and must authenticate again. Their password will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void revokeSessions();
              }}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking && <Loader2 className="mr-2 size-4 animate-spin" />}
              Revoke sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
