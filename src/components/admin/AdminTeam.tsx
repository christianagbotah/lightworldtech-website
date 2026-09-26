'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import AdminMediaField from '@/components/admin/AdminMediaField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { readJsonResponse } from '@/lib/client-api';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string;
  linkedin: string;
  twitter: string;
  image: string;
  order: number;
  active: boolean;
  createdAt: string;
}

const emptyMember = {
  name: '', role: '', bio: '', email: '', linkedin: '', twitter: '', image: '', order: 0, active: true,
};

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyMember);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch');
      const payload = await readJsonResponse<any>(res, 'Invalid server response');
      setMembers(payload.data || []);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyMember);
    setDialogOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setForm({
      name: member.name, role: member.role, bio: member.bio,
      email: member.email, linkedin: member.linkedin, twitter: member.twitter,
      image: member.image, order: member.order, active: member.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim()) {
      toast.error('Name and role are required');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/team/${editing.id}` : '/api/team';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        const data = await readJsonResponse<any>(res, 'Invalid server response');
        throw new Error(data.error || 'Failed to save');
      }
      toast.success(editing ? 'Member updated' : 'Member created');
      setDialogOpen(false);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/team/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Member deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchMembers();
    } catch {
      toast.error('Failed to delete member');
    }
  };

  const toggleActive = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !member.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchMembers();
    } catch {
      toast.error('Failed to update member');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <AdminPageHeader
        eyebrow="Website & content"
        title="Team Members"
        description={members.length + ' team member' + (members.length === 1 ? '' : 's') + ' available for public presentation.'}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" /> Add Member
          </Button>
        }
      />

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="max-w-full overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table exportFileName="lightworld-team-members">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
                <TableHead className="text-xs font-semibold">Member</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold text-center">Order</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead data-export-ignore className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No team members yet. Add your first team member!
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} onClick={(event) => { event.stopPropagation(); openEdit(member); }} className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200">
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2.5">
                        {member.image ? (
                          <div className="relative shrink-0">
                            <img src={member.image} alt={member.name} className="size-8 rounded-full object-cover ring-2 ring-amber-500/30 dark:ring-amber-400/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div className="size-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-500 flex items-center justify-center shrink-0 ring-2 ring-amber-500/20 dark:ring-amber-400/20">
                            <span className="text-xs font-bold text-white">{member.name.charAt(0)}</span>
                          </div>
                        )}
                        {member.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{member.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{member.email || '—'}</TableCell>
                    <TableCell className="text-sm text-center">{member.order}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={member.active ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-sm' : 'bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500 text-white border-0'}>
                        {member.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell data-export-ignore className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void toggleActive(member); }}>
                          {member.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); openEdit(member); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setDeleting(member); setDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Job title" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Order</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <AdminMediaField
              label="Profile image"
              value={form.image}
              onChange={(image) => setForm((current) => ({ ...current, image }))}
              help="Choose an existing team image or upload a new one to the shared Media Library."
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">LinkedIn <Linkedin className="size-3.5 text-blue-600" /></Label>
                <Input value={form.linkedin} onChange={(e) => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="LinkedIn URL" className="focus-visible:ring-blue-500/30" />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">Twitter <Twitter className="size-3.5 text-sky-500" /></Label>
                <Input value={form.twitter} onChange={(e) => setForm(f => ({ ...f, twitter: e.target.value }))} placeholder="Twitter URL" className="focus-visible:ring-sky-500/30" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm(f => ({ ...f, active: checked }))} className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500 data-[state=checked]:to-amber-400" />
              <Label className={form.active ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
