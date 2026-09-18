'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type LeadNote = {
  id: string;
  note: string;
  author: string;
  createdAt: string;
};

type Lead = {
  id: string;
  status: string;
  priority: string;
  assignedTo: string;
  source: string;
  summary: string;
  tags: string;
  nextFollowUp: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactMessage: {
    id: string;
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    read: boolean;
    createdAt: string;
  };
  notes: LeadNote[];
};

type LeadSummary = {
  total: number;
  open: number;
  highPriority: number;
  overdueFollowUps: number;
  byStatus: Record<string, number>;
};

const STAGES = [
  ['new', 'New'],
  ['qualified', 'Qualified'],
  ['discovery', 'Discovery'],
  ['proposal', 'Proposal'],
  ['negotiation', 'Negotiation'],
  ['won', 'Won'],
  ['lost', 'Lost'],
] as const;

const PRIORITIES = ['low', 'normal', 'high'] as const;

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function badgeClass(priority: string) {
  if (priority === 'high') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (priority === 'low') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState({
    status: 'new',
    priority: 'normal',
    assignedTo: '',
    nextFollowUp: '',
    lastContactedAt: '',
    summary: '',
    tags: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (query.trim()) params.set('q', query.trim());

      const response = await fetch('/api/admin/leads?' + params.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load CRM pipeline');
      const payload = await response.json();
      setLeads(Array.isArray(payload.data) ? payload.data : []);
      setSummary(payload.summary || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load CRM pipeline');
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, query, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const openLead = (lead: Lead) => {
    setSelected(lead);
    setDraft({
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assignedTo || '',
      nextFollowUp: toLocalInput(lead.nextFollowUp),
      lastContactedAt: toLocalInput(lead.lastContactedAt),
      summary: lead.summary || '',
      tags: parseTags(lead.tags).join(', '),
    });
    setNote('');
  };

  const updateLead = async (leadId: string, data: Record<string, unknown>, quiet = false) => {
    const response = await fetch('/api/admin/leads/' + leadId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Unable to update lead');
    const payload = await response.json();
    if (!quiet) toast.success('Lead updated');
    return payload.data as Lead;
  };

  const saveSelected = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateLead(selected.id, {
        status: draft.status,
        priority: draft.priority,
        assignedTo: draft.assignedTo.trim(),
        nextFollowUp: draft.nextFollowUp ? new Date(draft.nextFollowUp).toISOString() : null,
        lastContactedAt: draft.lastContactedAt ? new Date(draft.lastContactedAt).toISOString() : null,
        summary: draft.summary.trim(),
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      setSelected(updated);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save lead');
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!selected || !note.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/leads/' + selected.id + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (!response.ok) throw new Error('Unable to add note');
      const refreshed = await fetch('/api/admin/leads/' + selected.id, { cache: 'no-store' });
      const payload = await refreshed.json();
      setSelected(payload.data || selected);
      setNote('');
      toast.success('CRM note added');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add CRM note');
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateLead(selected.id, { regenerateIntelligence: true });
      setSelected(updated);
      setDraft((current) => ({
        ...current,
        summary: updated.summary,
        priority: updated.priority,
        tags: parseTags(updated.tags).join(', '),
      }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh intelligence');
    } finally {
      setSaving(false);
    }
  };

  const overdueIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      leads
        .filter((lead) => lead.nextFollowUp && new Date(lead.nextFollowUp).getTime() < now && !['won', 'lost'].includes(lead.status))
        .map((lead) => lead.id),
    );
  }, [leads]);

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Corporate CRM</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Lead Pipeline</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Every website enquiry becomes a trackable lead with pipeline stage, priority, ownership, follow-up and operational notes.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={'mr-2 size-4 ' + (loading ? 'animate-spin' : '')} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Open Leads', summary?.open || 0, UserRound],
          ['High Priority', summary?.highPriority || 0, Sparkles],
          ['Overdue Follow-ups', summary?.overdueFollowUps || 0, CalendarClock],
          ['Total Enquiries', summary?.total || 0, Mail],
        ].map(([label, value, Icon]) => {
          const Comp = Icon as typeof Mail;
          return (
            <Card key={String(label)} className="border-border/60">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{String(label)}</p>
                  <p className="mt-1 text-2xl font-bold">{String(value)}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <Comp className="size-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {STAGES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(statusFilter === value ? 'all' : value)}
            className={
              'rounded-2xl border p-3 text-left transition ' +
              (statusFilter === value
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                : 'border-border/60 bg-card hover:border-amber-300')
            }
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold">{summary?.byStatus?.[value] || 0}</p>
          </button>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="gap-4 border-b border-border/60 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Enquiries & opportunities</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{leads.length} leads in this view</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, subject…" className="pl-9" />
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="normal">Normal</option>
              <option value="low">Low priority</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No leads match the current filters.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {leads.map((lead) => {
                const tags = parseTags(lead.tags);
                return (
                  <div key={lead.id} className="grid gap-4 p-4 transition hover:bg-muted/30 lg:grid-cols-[1.1fr_.8fr_.7fr_auto] lg:items-center">
                    <button className="min-w-0 text-left" onClick={() => openLead(lead)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{lead.contactMessage.name}</p>
                        <Badge variant="outline" className={badgeClass(lead.priority)}>{lead.priority}</Badge>
                        {lead.source === 'assistant' && <Badge variant="outline">Assistant</Badge>}
                        {overdueIds.has(lead.id) && <Badge variant="destructive">Follow-up overdue</Badge>}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{lead.contactMessage.email} · {lead.contactMessage.subject || 'No subject'}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lead.summary || lead.contactMessage.message}</p>
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>)}
                        </div>
                      )}
                    </button>

                    <div>
                      <select
                        value={lead.status}
                        onChange={async (event) => {
                          try {
                            await updateLead(lead.id, { status: event.target.value }, true);
                            await load();
                          } catch {
                            toast.error('Unable to change stage');
                          }
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                      >
                        {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{lead.assignedTo || 'Unassigned'}</p>
                      <p className="mt-1">
                        {lead.nextFollowUp ? 'Follow up ' + new Date(lead.nextFollowUp).toLocaleString() : 'No follow-up scheduled'}
                      </p>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => openLead(lead)}>Manage</Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" aria-describedby={undefined}>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {selected.contactMessage.name}
                  <Badge variant="outline" className={badgeClass(draft.priority)}>{draft.priority}</Badge>
                  {selected.source === 'assistant' && <Badge variant="outline">Assistant brief</Badge>}
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 lg:grid-cols-[1fr_.95fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Original enquiry</p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <a className="font-medium text-amber-700 dark:text-amber-300" href={'mailto:' + selected.contactMessage.email}>{selected.contactMessage.email}</a>
                      <span>{selected.contactMessage.phone || 'No phone provided'}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{selected.contactMessage.subject || 'No subject'}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.contactMessage.message}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Lead intelligence summary</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={regenerate} disabled={saving}>
                        <Sparkles className="mr-1 size-3.5" /> Refresh
                      </Button>
                    </div>
                    <Textarea rows={4} value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <Input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="enterprise, education, ai" />
                  </div>

                  <div className="space-y-3">
                    <Label>CRM notes</Label>
                    <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add discovery notes, decisions, next steps…" />
                    <Button type="button" variant="outline" onClick={addNote} disabled={saving || !note.trim()}>
                      <MessageSquareText className="mr-2 size-4" /> Add note
                    </Button>
                    <div className="space-y-2">
                      {selected.notes?.length ? selected.notes.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 p-3">
                          <p className="whitespace-pre-wrap text-sm">{item.note}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">{item.author} · {new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      )) : <p className="text-xs text-muted-foreground">No CRM notes yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/60 p-4">
                  <div className="space-y-2">
                    <Label>Pipeline stage</Label>
                    <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned to</Label>
                    <Input value={draft.assignedTo} onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Name or team" />
                  </div>

                  <div className="space-y-2">
                    <Label>Next follow-up</Label>
                    <Input type="datetime-local" value={draft.nextFollowUp} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUp: event.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Last contacted</Label>
                    <Input type="datetime-local" value={draft.lastContactedAt} onChange={(event) => setDraft((current) => ({ ...current, lastContactedAt: event.target.value }))} />
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p><strong className="text-foreground">Source:</strong> {selected.source}</p>
                    <p className="mt-1"><strong className="text-foreground">Created:</strong> {new Date(selected.createdAt).toLocaleString()}</p>
                    <p className="mt-1"><strong className="text-foreground">Updated:</strong> {new Date(selected.updatedAt).toLocaleString()}</p>
                  </div>

                  <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={saveSelected} disabled={saving}>
                    <CheckCircle2 className="mr-2 size-4" /> {saving ? 'Saving…' : 'Save lead'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
