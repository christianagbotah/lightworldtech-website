'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileSignature,
  Mail,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
  BookmarkPlus,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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
import { useAppStore } from '@/lib/store';
import { hasAdminPermission } from '@/lib/admin-permissions';

const stages = [
  { id: 'new', label: 'New' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
] as const;

type Stage = (typeof stages)[number]['id'];
type Priority = 'low' | 'normal' | 'high';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type LeadNote = {
  id: string;
  note: string;
  author: string;
  createdAt: string;
};

type Lead = {
  id: string;
  contactMessageId: string;
  status: Stage;
  priority: Priority;
  assignedTo: string;
  source: string;
  summary: string;
  tags: string;
  nextFollowUp: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactMessage: ContactMessage;
  notes: LeadNote[];
};

type LeadSummary = {
  total: number;
  open: number;
  highPriority: number;
  overdueFollowUps: number;
  byStatus: Record<Stage, number>;
};

type SavedCrmView = {
  id: string;
  name: string;
  status: string;
  priority: string;
  query: string;
  overdueOnly: boolean;
};

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function inputDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function apiDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isOverdue(lead: Lead): boolean {
  return Boolean(
    lead.nextFollowUp &&
      new Date(lead.nextFollowUp).getTime() < Date.now() &&
      !['won', 'lost'].includes(lead.status),
  );
}

function priorityClass(priority: Priority): string {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300';
  if (priority === 'low') return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/40';
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300';
}

export default function AdminCRM() {
  const { navigate, adminRole, adminPermissions } = useAppStore();
  const canManageProposals = hasAdminPermission(adminRole, adminPermissions, 'proposals.manage');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedCrmView[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState('');

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (query.trim()) params.set('q', query.trim());
      if (overdueOnly) params.set('overdue', 'true');

      const response = await fetch('/api/admin/leads?' + params.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load CRM');
      const payload = await response.json();
      setLeads(payload.data || []);
      setSummary(payload.summary || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load CRM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const requestedStatus = sessionStorage.getItem('lw-crm-status-filter');
      const requestedPriority = sessionStorage.getItem('lw-crm-priority-filter');
      const requestedOverdue = sessionStorage.getItem('lw-crm-overdue-filter');
      if (requestedStatus) {
        setStatusFilter(requestedStatus);
        sessionStorage.removeItem('lw-crm-status-filter');
      }
      if (requestedPriority) {
        setPriorityFilter(requestedPriority);
        sessionStorage.removeItem('lw-crm-priority-filter');
      }
      if (requestedOverdue === '1') {
        setOverdueOnly(true);
        sessionStorage.removeItem('lw-crm-overdue-filter');
      }

      try {
        const stored = JSON.parse(localStorage.getItem('lw-crm-saved-views') || '[]');
        if (Array.isArray(stored)) {
          setSavedViews(
            stored.filter((item): item is SavedCrmView =>
              Boolean(
                item &&
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                typeof item.status === 'string' &&
                typeof item.priority === 'string' &&
                typeof item.query === 'string' &&
                typeof item.overdueOnly === 'boolean',
              ),
            ).slice(0, 20),
          );
        }
      } catch {
        localStorage.removeItem('lw-crm-saved-views');
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLeads();
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, query, overdueOnly]);

  useEffect(() => {
    if (!leads.length || typeof window === 'undefined') return;
    const requestedId = sessionStorage.getItem('lw-open-lead-id');
    if (!requestedId) return;
    const match = leads.find((lead) => lead.id === requestedId || lead.contactMessageId === requestedId);
    sessionStorage.removeItem('lw-open-lead-id');
    if (match) setSelected(match);
  }, [leads]);

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setQuery('');
    setOverdueOnly(false);
  };

  const persistSavedViews = (views: SavedCrmView[]) => {
    setSavedViews(views);
    localStorage.setItem('lw-crm-saved-views', JSON.stringify(views));
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next: SavedCrmView[] = [
      ...savedViews.filter((view) => view.name.toLowerCase() !== name.toLowerCase()),
      {
        id: crypto.randomUUID(),
        name,
        status: statusFilter,
        priority: priorityFilter,
        query,
        overdueOnly,
      },
    ].slice(-20);
    persistSavedViews(next);
    setViewName('');
    setSaveViewOpen(false);
    toast.success('CRM view saved');
  };

  const applySavedView = (view: SavedCrmView) => {
    setStatusFilter(view.status);
    setPriorityFilter(view.priority);
    setQuery(view.query);
    setOverdueOnly(view.overdueOnly);
  };

  const deleteSavedView = (id: string) => {
    persistSavedViews(savedViews.filter((view) => view.id !== id));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (query.trim()) params.set('q', query.trim());
      if (overdueOnly) params.set('overdue', 'true');

      const response = await fetch('/api/admin/leads/export?' + params.toString(), {
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to export CRM');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'lightworld-crm-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('CRM export downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export CRM');
    } finally {
      setExporting(false);
    }
  };

  const refreshSelected = async (leadId: string) => {
    const response = await fetch('/api/admin/leads/' + leadId, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not refresh lead');
    const payload = await response.json();
    setSelected(payload.data);
  };

  const patchLead = async (lead: Lead, update: Record<string, unknown>, refresh = true) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/leads/' + lead.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Could not update lead');
      const payload = await response.json();
      if (selected?.id === lead.id) setSelected(payload.data);
      if (refresh) await fetchLeads();
      return payload.data as Lead;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update lead');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !note.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/leads/' + selected.id + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (!response.ok) throw new Error('Could not add note');
      setNote('');
      await refreshSelected(selected.id);
      await fetchLeads();
      toast.success('CRM note added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add note');
    } finally {
      setSaving(false);
    }
  };

  const openInternalReply = (lead: Lead) => {
    sessionStorage.setItem('lw-reply-message-id', lead.contactMessageId);
    setSelected(null);
    navigate('admin-messages');
  };

  const openProposal = async (lead: Lead) => {
    if (!canManageProposals) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!response.ok) throw new Error('Could not open proposal workspace');
      const payload = await response.json();
      if (payload?.data?.id) {
        sessionStorage.setItem('lw-open-proposal-id', String(payload.data.id));
      }
      navigate('admin-proposals');
      toast.success(payload.created ? 'Grounded proposal draft created' : 'Existing proposal opened');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open proposal workspace');
    } finally {
      setSaving(false);
    }
  };

  const stageColumns = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        leads: leads.filter((lead) => lead.status === stage.id),
      })),
    [leads],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Corporate CRM"
        title="Lead Pipeline"
        description="Website and assistant enquiries become trackable opportunities without changing the original inbox message."
        actions={
          <>
            <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
              {exporting ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => void fetchLeads()}>
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total leads', value: summary?.total || 0, icon: UsersRound, onClick: clearFilters },
          { label: 'Open pipeline', value: summary?.open || 0, icon: UserRound, onClick: () => { setStatusFilter('all'); setPriorityFilter('all'); setOverdueOnly(false); } },
          { label: 'High priority', value: summary?.highPriority || 0, icon: AlertTriangle, onClick: () => { setPriorityFilter('high'); setOverdueOnly(false); } },
          { label: 'Follow-ups overdue', value: summary?.overdueFollowUps || 0, icon: CalendarClock, onClick: () => setOverdueOnly(true) },
        ].map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} className="text-left">
            <Card className="h-full border-border/60 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <item.icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, subject, owner or summary"
              className="pl-9"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
            aria-label="Filter by status"
          >
            <option value="all">All stages</option>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="normal">Normal priority</option>
            <option value="low">Low priority</option>
          </select>
          <Button
            type="button"
            variant={overdueOnly ? 'default' : 'outline'}
            onClick={() => setOverdueOnly((value) => !value)}
            className={overdueOnly ? 'bg-rose-600 hover:bg-rose-700' : ''}
          >
            <CalendarClock className="mr-2 size-4" /> Overdue only
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Saved views</span>
          {savedViews.map((view) => (
            <span key={view.id} className="inline-flex items-center rounded-full border border-border bg-muted/40 pl-3 text-xs">
              <button type="button" onClick={() => applySavedView(view)} className="py-1.5 font-medium hover:text-amber-700 dark:hover:text-amber-300">
                {view.name}
              </button>
              <button type="button" onClick={() => deleteSavedView(view.id)} className="ml-1 rounded-full p-1.5 text-muted-foreground hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40" aria-label={'Delete saved view ' + view.name}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setSaveViewOpen(true)}>
            <BookmarkPlus className="mr-2 size-3.5" /> Save current view
          </Button>
          {(statusFilter !== 'all' || priorityFilter !== 'all' || query || overdueOnly) && (
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              <Trash2 className="mr-2 size-3.5" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-3">
        <div className="grid min-w-[1960px] grid-cols-7 gap-3">
          {stageColumns.map((column) => (
            <section key={column.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <p className="text-[11px] text-muted-foreground">{summary?.byStatus?.[column.id] || 0} total</p>
                </div>
                <Badge variant="secondary">{column.leads.length}</Badge>
              </div>

              <div className="space-y-3">
                {column.leads.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                )}
                {column.leads.map((lead) => {
                  const tags = parseTags(lead.tags);
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelected(lead)}
                      className="w-full rounded-xl border border-border/70 bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{lead.contactMessage.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lead.contactMessage.subject || lead.contactMessage.email}</p>
                        </div>
                        <span className={'shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ' + priorityClass(lead.priority)}>
                          {lead.priority}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {lead.summary || lead.contactMessage.message}
                      </p>

                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                        <span>{lead.assignedTo || 'Unassigned'}</span>
                        {lead.nextFollowUp ? (
                          <span className={isOverdue(lead) ? 'font-semibold text-rose-600' : ''}>
                            {isOverdue(lead) ? 'Overdue · ' : ''}
                            {new Date(lead.nextFollowUp).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>No follow-up</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save CRM view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="crm-view-name">View name</Label>
            <Input
              id="crm-view-name"
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="e.g. High Priority Web Leads"
              maxLength={80}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Saves the current search, stage, priority and overdue filters on this browser.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveViewOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveCurrentView} disabled={!viewName.trim()}>Save view</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-[min(96vw,1440px)] overflow-x-hidden overflow-y-auto p-0">
          {selected && (
            <>
              <DialogHeader className="border-b border-border px-6 py-5">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
                  {selected.contactMessage.name}
                  <Badge variant="secondary">{selected.source}</Badge>
                  <span className={'rounded-full border px-2 py-0.5 text-[10px] uppercase ' + priorityClass(selected.priority)}>
                    {selected.priority}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,.7fr)]">
                <div className="min-w-0 space-y-6 p-6">
                  <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openInternalReply(selected)}
                      className="flex min-w-0 items-center gap-2 text-left text-sm font-medium hover:text-amber-600"
                      title="Reply from the Lightworld admin portal"
                    >
                      <Mail className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{selected.contactMessage.email}</span>
                      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">Reply</span>
                    </button>
                    {selected.contactMessage.phone ? (
                      <a href={'tel:' + selected.contactMessage.phone} className="flex items-center gap-2 text-sm font-medium hover:text-amber-600">
                        <Phone className="size-4 text-muted-foreground" /> {selected.contactMessage.phone}
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" /> No phone provided</span>
                    )}
                  </div>

                  <div>
                    <Label>Intelligence summary</Label>
                    <Textarea
                      className="mt-2"
                      rows={4}
                      defaultValue={selected.summary}
                      onBlur={(event) => {
                        if (event.target.value !== selected.summary) {
                          void patchLead(selected, { summary: event.target.value });
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      disabled={saving}
                      onClick={() => void patchLead(selected, { regenerateIntelligence: true })}
                    >
                      <Sparkles className="mr-2 size-4" /> Refresh intelligence
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/10">
                    <div className="flex flex-col gap-2 border-b border-amber-200/70 pb-4 dark:border-amber-900/40 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Original customer enquiry</p>
                        <p className="mt-1 break-words text-base font-semibold">{selected.contactMessage.subject || 'No subject'}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(selected.contactMessage.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-5 max-h-[48vh] overflow-y-auto pr-2">
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">{selected.contactMessage.message}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <Label>Internal notes</Label>
                        <p className="text-xs text-muted-foreground">{selected.notes.length} note{selected.notes.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <form onSubmit={addNote} className="flex gap-2">
                      <Textarea
                        rows={2}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Add discovery notes, next steps, objections or decisions…"
                      />
                      <Button type="submit" size="icon" disabled={saving || !note.trim()} aria-label="Add note">
                        <MessageSquarePlus className="size-4" />
                      </Button>
                    </form>
                    <div className="mt-4 space-y-3">
                      {selected.notes.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <p className="whitespace-pre-wrap text-sm leading-6">{item.note}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {item.author} · {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="space-y-4 border-t border-border bg-muted/15 p-6 xl:border-l xl:border-t-0">
                  {canManageProposals && (
                    <Button
                      className="w-full"
                      disabled={saving}
                      onClick={() => void openProposal(selected)}
                    >
                      <FileSignature className="mr-2 size-4" /> Create / Open Proposal
                    </Button>
                  )}

                  <div>
                    <Label>Status</Label>
                    <select
                      value={selected.status}
                      onChange={(event) => void patchLead(selected, { status: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <select
                      value={selected.priority}
                      onChange={(event) => void patchLead(selected, { priority: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <Label>Assigned to</Label>
                    <Input
                      className="mt-2"
                      value={selected.assignedTo}
                      placeholder="e.g. Christian"
                      onChange={(event) => setSelected({ ...selected, assignedTo: event.target.value })}
                      onBlur={(event) => void patchLead(selected, { assignedTo: event.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Next follow-up</Label>
                    <Input
                      className="mt-2"
                      type="datetime-local"
                      value={inputDateTime(selected.nextFollowUp)}
                      onChange={(event) => {
                        const iso = apiDateTime(event.target.value);
                        setSelected({ ...selected, nextFollowUp: iso });
                        void patchLead(selected, { nextFollowUp: iso });
                      }}
                    />
                    {isOverdue(selected) && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-600">
                        <AlertTriangle className="size-3.5" /> Follow-up is overdue
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <Input
                      className="mt-2"
                      defaultValue={parseTags(selected.tags).join(', ')}
                      onBlur={(event) => {
                        const tags = event.target.value.split(',').map((value) => value.trim()).filter(Boolean);
                        void patchLead(selected, { tags });
                      }}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">Comma-separated</p>
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">Last contacted</p>
                    <p className="mt-1 text-sm font-medium">
                      {selected.lastContactedAt ? new Date(selected.lastContactedAt).toLocaleString() : 'Not recorded'}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      disabled={saving}
                      onClick={() => void patchLead(selected, { lastContactedAt: new Date().toISOString() })}
                    >
                      <CheckCircle2 className="mr-2 size-4" /> Mark contacted now
                    </Button>
                  </div>

                  <div className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><Clock3 className="size-3.5" /> Lead updated {new Date(selected.updatedAt).toLocaleString()}</p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
