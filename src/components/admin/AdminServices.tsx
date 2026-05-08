'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Briefcase } from 'lucide-react';
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

interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  features: string;
  order: number;
  active: boolean;
  createdAt: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const emptyService = {
  title: '', slug: '', description: '', icon: '', features: '', order: 0, active: true,
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyService);
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/services');
      if (!res.ok) throw new Error('Failed to fetch');
      setServices(await res.json());
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleTitleChange = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      ...(autoSlug ? { slug: slugify(title) } : {}),
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyService);
    setAutoSlug(true);
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      title: service.title,
      slug: service.slug,
      description: service.description,
      icon: service.icon,
      features: Array.isArray(JSON.parse(service.features || '[]')) ? (JSON.parse(service.features) as string[]).join('\n') : service.features,
      order: service.order,
      active: service.active,
    });
    setAutoSlug(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error('Title and slug are required');
      return;
    }
    setSaving(true);
    try {
      const featuresArray = form.features.split('\n').filter(f => f.trim());
      const payload = {
        ...form,
        features: JSON.stringify(featuresArray),
      };

      const res = editing
        ? await fetch(`/api/admin/services/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(editing ? 'Service updated' : 'Service created');
      setDialogOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/services/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Service deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchServices();
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !service.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchServices();
    } catch {
      toast.error('Failed to update service');
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
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground text-sm mt-1">{services.length} services total</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Add Service
        </Button>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
                <TableHead className="text-xs font-semibold">Service</TableHead>
                <TableHead className="text-xs font-semibold">Slug</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Icon</TableHead>
                <TableHead className="text-xs font-semibold text-center">Order</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No services yet. Create your first service!
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id} className="hover:bg-emerald-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200">
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20 flex items-center justify-center shrink-0">
                          <Briefcase className="size-4 text-emerald-600 dark:text-amber-400" />
                        </div>
                        {service.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono text-xs">{service.slug}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{service.icon}</code>
                    </TableCell>
                    <TableCell className="text-sm text-center">{service.order}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={service.active ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-sm' : 'bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500 text-white border-0'}>
                        {service.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(service)} title={service.active ? 'Deactivate' : 'Activate'}>
                          {service.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleting(service); setDeleteOpen(true); }}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service' : 'New Service'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="svc-title">Title</Label>
              <Input id="svc-title" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Service title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-slug">Slug</Label>
              <Input id="svc-slug" value={form.slug} onChange={(e) => { setForm(f => ({ ...f, slug: e.target.value })); setAutoSlug(false); }} placeholder="service-slug" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea id="svc-desc" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Service description" rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-icon">Icon (Lucide name)</Label>
              <Input id="svc-icon" value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="e.g., Code, Globe, Shield" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-features">Features (one per line)</Label>
              <Textarea id="svc-features" value={form.features} onChange={(e) => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="svc-order">Order</Label>
                <Input id="svc-order" type="number" value={form.order} onChange={(e) => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <div className={`relative ${form.active ? '' : ''}`}>
                  <Switch checked={form.active} onCheckedChange={(checked) => setForm(f => ({ ...f, active: checked }))} className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500 data-[state=checked]:to-amber-400" />
                </div>
                <Label className={form.active ? 'text-emerald-600 dark:text-amber-400 font-medium' : ''}>Active</Label>
              </div>
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
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
