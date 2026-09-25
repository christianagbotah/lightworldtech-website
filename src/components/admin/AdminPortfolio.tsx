'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, StarOff } from 'lucide-react';
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

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  category: string;
  technologies: string;
  featured: boolean;
  active: boolean;
  order: number;
  caseStudyPublished: boolean;
  caseStudySlug: string | null;
  caseStudyClientName: string;
  caseStudyChallenge: string;
  caseStudySolution: string;
  caseStudyOutcomes: string;
  caseStudyApprovalReference: string;
  caseStudyPublishedAt: string | null;
  createdAt: string;
}

const emptyProject = {
  title: '', description: '', image: '', url: '', category: '',
  technologies: '', featured: false, active: true, order: 0,
  caseStudyPublished: false, caseStudySlug: '', caseStudyClientName: '',
  caseStudyChallenge: '', caseStudySolution: '', caseStudyOutcomes: '',
  caseStudyApprovalReference: '',
};

export default function AdminPortfolio() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioProject | null>(null);
  const [deleting, setDeleting] = useState<PortfolioProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyProject);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio');
      if (!res.ok) throw new Error('Failed to fetch');
      const payload = await res.json();
      setProjects(payload.data || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProject);
    setDialogOpen(true);
  };

  const openEdit = (p: PortfolioProject) => {
    setEditing(p);
    setForm({
      title: p.title, description: p.description, image: p.image,
      url: p.url, category: p.category,
      technologies: Array.isArray(JSON.parse(p.technologies || '[]')) ? (JSON.parse(p.technologies) as string[]).join(', ') : p.technologies,
      featured: p.featured, active: p.active, order: p.order,
      caseStudyPublished: p.caseStudyPublished,
      caseStudySlug: p.caseStudySlug || '',
      caseStudyClientName: p.caseStudyClientName,
      caseStudyChallenge: p.caseStudyChallenge,
      caseStudySolution: p.caseStudySolution,
      caseStudyOutcomes: p.caseStudyOutcomes,
      caseStudyApprovalReference: p.caseStudyApprovalReference,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (form.caseStudyPublished) {
      if (!form.caseStudySlug.trim() || !form.caseStudyChallenge.trim() || !form.caseStudySolution.trim() || !form.caseStudyOutcomes.trim() || !form.caseStudyApprovalReference.trim()) {
        toast.error('Case study publication requires a slug, challenge, solution, outcomes and approval reference.');
        return;
      }
    }
    setSaving(true);
    try {
      const techArray = form.technologies.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        ...form,
        technologies: JSON.stringify(techArray),
        caseStudySlug: form.caseStudySlug.trim() || null,
      };
      const url = editing ? `/api/portfolio/${editing.id}` : '/api/portfolio';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      toast.success(editing ? 'Project updated' : 'Project created');
      setDialogOpen(false);
      fetchProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/portfolio/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Project deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchProjects();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const toggleActive = async (p: PortfolioProject) => {
    try {
      const res = await fetch(`/api/portfolio/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchProjects();
    } catch {
      toast.error('Failed to update');
    }
  };

  const toggleFeatured = async (p: PortfolioProject) => {
    try {
      const res = await fetch(`/api/portfolio/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !p.featured }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchProjects();
    } catch {
      toast.error('Failed to update');
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
        title="Portfolio"
        description={projects.length + ' portfolio project' + (projects.length === 1 ? '' : 's') + ' available for showcasing.'}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" /> Add Project
          </Button>
        }
      />

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="max-w-full overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Title</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-xs font-semibold text-center">Featured</TableHead>
                <TableHead className="text-xs font-semibold text-center">Case study</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No projects yet. Add your first portfolio project!
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id} onClick={(event) => { event.stopPropagation(); openEdit(p); }} className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors">
                    <TableCell className="font-medium text-sm">{p.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{p.category || '—'}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={(event) => { event.stopPropagation(); void toggleFeatured(p); }} className="cursor-pointer">
                        {p.featured ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500 mx-auto" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={p.caseStudyPublished ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : ''}>
                        {p.caseStudyPublished ? 'Published' : 'Not published'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={p.active ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}>
                        {p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void toggleActive(p); }}>
                          {p.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); openEdit(p); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setDeleting(p); setDeleteOpen(true); }}>
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
            <DialogTitle>{editing ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Project title" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Project description" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AdminMediaField
                label="Project image"
                value={form.image}
                onChange={(image) => setForm((current) => ({ ...current, image }))}
              />
              <div className="grid gap-2">
                <Label>Project URL</Label>
                <Input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Web App" />
              </div>
              <div className="grid gap-2">
                <Label>Order</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Technologies (comma-separated)</Label>
              <Input value={form.technologies} onChange={(e) => setForm(f => ({ ...f, technologies: e.target.value }))} placeholder="React, Node.js, PostgreSQL" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={(checked) => setForm(f => ({ ...f, featured: checked }))} />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(checked) => setForm(f => ({ ...f, active: checked }))} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-semibold">Evidence-governed case study</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Publishing is blocked until challenge, solution, outcomes and an internal approval reference are recorded.</p>
                </div>
                <Switch checked={form.caseStudyPublished} onCheckedChange={(checked) => setForm(f => ({ ...f, caseStudyPublished: checked }))} />
              </div>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Public case-study slug</Label>
                    <Input value={form.caseStudySlug} onChange={(e) => setForm(f => ({ ...f, caseStudySlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') }))} placeholder="school-platform-modernization" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Public client name <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input value={form.caseStudyClientName} onChange={(e) => setForm(f => ({ ...f, caseStudyClientName: e.target.value }))} placeholder="Leave blank for anonymized case study" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Challenge</Label>
                  <Textarea value={form.caseStudyChallenge} onChange={(e) => setForm(f => ({ ...f, caseStudyChallenge: e.target.value }))} rows={4} placeholder="What verified problem or operational constraint was being addressed?" />
                </div>
                <div className="grid gap-2">
                  <Label>Solution delivered</Label>
                  <Textarea value={form.caseStudySolution} onChange={(e) => setForm(f => ({ ...f, caseStudySolution: e.target.value }))} rows={4} placeholder="What did Lightworld actually design, build, integrate or improve?" />
                </div>
                <div className="grid gap-2">
                  <Label>Outcomes / evidence</Label>
                  <Textarea value={form.caseStudyOutcomes} onChange={(e) => setForm(f => ({ ...f, caseStudyOutcomes: e.target.value }))} rows={4} placeholder="State only outcomes that can be substantiated. Avoid invented percentages or results." />
                </div>
                <div className="grid gap-2">
                  <Label>Internal approval reference</Label>
                  <Input value={form.caseStudyApprovalReference} onChange={(e) => setForm(f => ({ ...f, caseStudyApprovalReference: e.target.value }))} placeholder="Email/thread/document/ticket reference — never shown publicly" />
                  <p className="text-[11px] leading-5 text-muted-foreground">This reference stays internal and is required before public publication.</p>
                </div>
              </div>
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
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.title}&quot;?
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
