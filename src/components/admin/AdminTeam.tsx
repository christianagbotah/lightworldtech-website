'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, ImageIcon, Loader2, Linkedin, Twitter } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/team');
      if (!res.ok) throw new Error('Failed to fetch');
      setMembers(await res.json());
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
      const url = editing ? `/api/admin/team/${editing.id}` : '/api/admin/team';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        const data = await res.json();
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
      const res = await fetch(`/api/admin/team/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Member deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchMembers();
    } catch {
      toast.error('Failed to delete member');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type. Use JPG, PNG, GIF, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setForm((f) => ({ ...f, image: data.data.url }));
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const toggleActive = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Members</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} members</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
                <TableHead className="text-xs font-semibold">Member</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold text-center">Order</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
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
                  <TableRow key={member.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200">
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(member)}>
                          {member.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(member)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleting(member); setDeleteOpen(true); }}>
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
            <div className="grid gap-2">
              <Label>Image</Label>
              <div className="flex gap-2 items-center">
                <Input value={form.image} onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://example.com/photo.jpg" className="flex-1" />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-shrink-0 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md"
                  aria-label="Upload image"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
              {uploading && (
                <div className="mt-1">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
                </div>
              )}
              {form.image && !uploading && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="size-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute -bottom-1 -right-1 size-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <ImageIcon className="size-2.5 text-white" />
                  </div>
                </div>
              )}
            </div>
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
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
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
