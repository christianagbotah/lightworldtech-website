'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type LeadStatus = 'new' | 'qualified' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
type LeadPriority = 'normal' | 'medium' | 'high';

type Lead = {
  id: string;
  contactMessageId: string | null;
  name: string;
  email: string;
  phone: string;
  source: string;
  category: string;
  status: LeadStatus;
  priority: LeadPriority;
  score: number;
  summary: string;
  assignedTo: string;
  nextAction: string;
  notes: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

const stages: Array<{ id: LeadStatus; label: string }> = [
  { id: 'new', label: 'New' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

const priorities: LeadPriority[] = ['normal', 'medium', 'high'];

function titleCase(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/w/g, (char) => char.toUpperCase());
}

function priorityClass(priority: LeadPriority) {
  if (priority === 'high') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  if (priority === 'medium') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
}

function scoreClass(score: number) {
  if (score >= 75) return 'text-emerald-700 dark:text-emerald-300';
  if (score >= 55) return 'text-amber-700 dark:text-amber-300';
  return 'text-slate-500 dark:text-slate-300';
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<'all' | LeadStatus>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Lead | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'manual',
    subject: '',
    message: '',
  });

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/admin/leads', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load lead pipeline');
      const payload = await response.json();
      setLeads(Array.isArray(payload?.data) ? payload.data : []);
      setStageCounts(payload?.stageCounts || {});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeads();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (selectedStage !== 'all' && lead.status !== selectedStage) return false;
      if (!query) return true;
      return [
        lead.name,
        lead.email,
        lead.phone,
        lead.category,
        lead.summary,
        lead.assignedTo,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [leads, search, selectedStage]);

  const openLead = (lead: Lead) => {
    setEditing({ ...lead });
    setEditorOpen(true);
  };

  const saveLead = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/leads/' + editing.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editing.status,
          priority: editing.priority,
          category: editing.category,
          assignedTo: editing.assignedTo,
          nextAction: editing.nextAction,
          notes: editing.notes,
          score: editing.score,
        }),
      });
      if (!response.ok) throw new Error('Could not update lead');
      toast.success('Lead updated');
      setEditorOpen(false);
      setEditing(null);
      await fetchLeads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update lead');
    } finally {
      setSaving(false);
    }
  };

  const createLead = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Could not create lead');
      }
      toast.success('Lead created and qualified');
      setNewLead({ name: '', email: '', phone: '', source: 'manual', subject: '', message: '' });
      setNewOpen(false);
      await fetchLeads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create lead');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const openCount = leads.filter((lead) => !['won', 'lost'].includes(lead.status)).length;
  const highPriority = leads.filter((lead) => lead.priority === 'high' && !['won', 'lost'].includes(lead.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Corporate CRM</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Lead Intelligence</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Enquiries are qualified automatically using explicit business signals, then remain under human control throughout the sales pipeline.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-2 size-4" /> Add lead
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total leads', value: leads.length, icon: Target },
          { label: 'Open pipeline', value: openCount, icon: BriefcaseBusiness },
          { label: 'High priority', value: highPriority, icon: Sparkles },
          { label: 'Won', value: stageCounts.won || 0, icon: ArrowRight },
        ].map((item) => (
          <Card key={item.label} className="border-border/60">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                <item.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <button
          onClick={() => setSelectedStage('all')}
          className={selectedStage === 'all' ? 'rounded-2xl border border-amber-400 bg-amber-500/10 p-3 text-left' : 'rounded-2xl border border-border/60 bg-card p-3 text-left'}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">All</p>
          <p className="mt-1 text-lg font-bold">{leads.length}</p>
        </button>
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            className={selectedStage === stage.id ? 'rounded-2xl border border-amber-400 bg-amber-500/10 p-3 text-left' : 'rounded-2xl border border-border/60 bg-card p-3 text-left'}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stage.label}</p>
            <p className="mt-1 text-lg font-bold">{stageCounts[stage.id] || 0}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, category, summary or owner…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No leads match this view.</div>
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => openLead(lead)}
                className="grid w-full gap-4 p-4 text-left transition hover:bg-muted/40 md:grid-cols-[1.1fr_.8fr_.55fr_.55fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{lead.name}</p>
                    <Badge variant="outline" className="text-[10px]">{lead.category}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{lead.summary || 'No summary'}</p>
                </div>

                <div className="min-w-0 text-xs text-muted-foreground">
                  {lead.email && <p className="truncate"><Mail className="mr-1 inline size-3" />{lead.email}</p>}
                  {lead.phone && <p className="mt-1 truncate"><Phone className="mr-1 inline size-3" />{lead.phone}</p>}
                </div>

                <div>
                  <p className={"text-xl font-bold " + scoreClass(lead.score)}>{lead.score}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Score</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={priorityClass(lead.priority)}>{titleCase(lead.priority)}</Badge>
                  <Badge variant="outline">{titleCase(lead.status)}</Badge>
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(lead.createdAt).toLocaleDateString()}</p>
                  {lead.assignedTo && <p className="mt-1 truncate"><UserRound className="mr-1 inline size-3" />{lead.assignedTo}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Lead workspace</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{editing.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{editing.email || 'No email'}{editing.phone ? ' · ' + editing.phone : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={"text-3xl font-bold " + scoreClass(editing.score)}>{editing.score}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Qualification score</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{editing.summary}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <Label>Status</Label>
                  <select
                    value={editing.status}
                    onChange={(event) => setEditing({ ...editing, status: event.target.value as LeadStatus })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                  </select>
                </label>

                <label className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    value={editing.priority}
                    onChange={(event) => setEditing({ ...editing, priority: event.target.value as LeadPriority })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {priorities.map((priority) => <option key={priority} value={priority}>{titleCase(priority)}</option>)}
                  </select>
                </label>

                <label className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} />
                </label>

                <label className="space-y-2">
                  <Label>Assigned to</Label>
                  <Input
                    value={editing.assignedTo}
                    onChange={(event) => setEditing({ ...editing, assignedTo: event.target.value })}
                    placeholder="Name or team"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <Label>Next action</Label>
                <Textarea
                  rows={3}
                  value={editing.nextAction}
                  onChange={(event) => setEditing({ ...editing, nextAction: event.target.value })}
                  placeholder="What should happen next?"
                />
              </label>

              <label className="block space-y-2">
                <Label>Internal notes</Label>
                <Textarea
                  rows={5}
                  value={editing.notes}
                  onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
                  placeholder="Discovery notes, decision makers, constraints, commercial context…"
                />
              </label>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span><CalendarClock className="mr-1 inline size-3.5" />Created {new Date(editing.createdAt).toLocaleString()}</span>
                <span>Source: {editing.source}</span>
                {editing.contactMessageId && <span>Linked to website message</span>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveLead} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? 'Saving…' : 'Save lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={createLead} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <Label>Name</Label>
                <Input required value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
              </label>
              <label className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
              </label>
              <label className="space-y-2">
                <Label>Phone</Label>
                <Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
              </label>
              <label className="space-y-2">
                <Label>Source</Label>
                <Input value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} />
              </label>
            </div>
            <label className="block space-y-2">
              <Label>Subject / opportunity</Label>
              <Input value={newLead.subject} onChange={(e) => setNewLead({ ...newLead, subject: e.target.value })} />
            </label>
            <label className="block space-y-2">
              <Label>Context</Label>
              <Textarea
                required
                rows={5}
                value={newLead.message}
                onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                placeholder="Describe the opportunity, customer need, timeline or constraints."
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700">
                {creating ? 'Creating…' : 'Create & qualify'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
