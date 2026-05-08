'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
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
import { toast } from 'sonner';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  createdAt: string;
}

const emptyFAQ = { question: '', answer: '', order: 0, active: true };

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [deleting, setDeleting] = useState<FAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyFAQ);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchFAQs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/faqs');
      if (!res.ok) throw new Error('Failed to fetch');
      setFaqs(await res.json());
    } catch {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFAQs(); }, [fetchFAQs]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyFAQ, order: faqs.length });
    setDialogOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditing(faq);
    setForm({ question: faq.question, answer: faq.answer, order: faq.order, active: faq.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/faqs/${editing.id}` : '/api/admin/faqs';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      toast.success(editing ? 'FAQ updated' : 'FAQ created');
      setDialogOpen(false);
      fetchFAQs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/faqs/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('FAQ deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchFAQs();
    } catch {
      toast.error('Failed to delete FAQ');
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newFaqs = [...faqs];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];
    await reorderFaqs(newFaqs);
  };

  const moveDown = async (index: number) => {
    if (index === faqs.length - 1) return;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    await reorderFaqs(newFaqs);
  };

  const reorderFaqs = async (newFaqs: FAQ[]) => {
    try {
      await Promise.all(
        newFaqs.map((faq, i) =>
          fetch(`/api/admin/faqs/${faq.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: i }),
          })
        )
      );
      fetchFAQs();
    } catch {
      toast.error('Failed to reorder FAQs');
    }
  };

  const toggleActive = async (faq: FAQ) => {
    try {
      const res = await fetch(`/api/admin/faqs/${faq.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !faq.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchFAQs();
    } catch {
      toast.error('Failed to update FAQ');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          <h1 className="text-2xl font-bold text-foreground">FAQs</h1>
          <p className="text-muted-foreground text-sm mt-1">{faqs.length} questions</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Add FAQ
        </Button>
      </div>

      {/* Accordion Preview */}
      <div className="space-y-2">
        {faqs.length === 0 ? (
          <div className="border border-border rounded-xl bg-card p-8 text-center text-muted-foreground">
            No FAQs yet. Add your first FAQ!
          </div>
        ) : (
          faqs.map((faq, index) => (
            <div
              key={faq.id}
              className={`border rounded-xl overflow-hidden transition-colors ${faq.active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-70'}`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(index)} disabled={index === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(index)} disabled={index === faqs.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Accordion toggle */}
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  className="flex-1 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                    <span className="text-sm font-medium truncate">{faq.question}</span>
                  </div>
                  {expandedItems.has(faq.id) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(faq)}>
                    {faq.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(faq)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeleting(faq); setDeleteOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Expandable answer */}
              {expandedItems.has(faq.id) && (
                <div className="px-4 pb-3 pl-[4.5rem]">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Question</Label>
              <Input value={form.question} onChange={(e) => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter the question" />
            </div>
            <div className="grid gap-2">
              <Label>Answer</Label>
              <Textarea value={form.answer} onChange={(e) => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Enter the answer" rows={5} />
            </div>
            <div className="flex items-center gap-4">
              <div className="grid gap-2 flex-1">
                <Label>Order</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.active} onCheckedChange={(checked) => setForm(f => ({ ...f, active: checked }))} />
                <Label>Active</Label>
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
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
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
