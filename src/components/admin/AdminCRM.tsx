'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileSignature,
  Globe2,
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
import OperationalLoadError from '@/components/admin/OperationalLoadError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { readJsonResponse } from '@/lib/client-api';

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
  company: string;
  industry: string;
  countryRegion: string;
  timezone: string;
  serviceInterest: string;
  currency: string;
  budgetRange: string;
  deliveryWindow: string;
  engagementModel: string;
  international: boolean;
  expectedRevenue: string;
  probability: number;
  nextAction: string;
  nextFollowUp: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactMessage: ContactMessage;
  notes: LeadNote[];
  operatingIntelligence: {
    urgency: 'critical' | 'high' | 'normal' | 'low';
    readiness: 'closed' | 'needs_discovery' | 'proposal_ready' | 'proposal_in_progress' | 'follow_up' | 'closing';
    recommendedAction: string;
    rationale: string;
    gaps: string[];
    controls: string;
  };
};

type LeadSummary = {
  total: number;
  open: number;
  highPriority: number;
  international: number;
  internationalOpen: number;
  domesticOpen: number;
  actionGaps: number;
  valuedOpportunities: number;
  overdueFollowUps: number;
  execution: {
    decided: number;
    won: number;
    lost: number;
    winRatePct: number | null;
    avgOpenAgeDays: number | null;
    oldestOpenAgeDays: number | null;
    followUpCoveragePct: number | null;
    staleOpen: number;
    unassignedOpen: number;
    staleAfterDays: number;
    methodology: string;
  };
  pipelineByCurrency: Array<{
    currency: string;
    opportunities: number;
    expectedRevenue: number;
    weightedRevenue: number;
  }>;
  countries: Array<{ name: string; count: number }>;
  industries: Array<{ name: string; count: number }>;
  byStatus: Record<Stage, number>;
};

type SavedCrmView = {
  id: string;
  name: string;
  status: string;
  priority: string;
  query: string;
  overdueOnly: boolean;
  industry?: string;
  globalOnly?: boolean;
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

function formatPipelineAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function priorityClass(priority: Priority): string {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300';
  if (priority === 'low') return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/40';
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300';
}

function operatingTone(urgency: Lead['operatingIntelligence']['urgency']): string {
  if (urgency === 'critical') return 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200';
  if (urgency === 'high') return 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200';
  if (urgency === 'low') return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/50';
  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200';
}

export default function AdminCRM() {
  const { navigate, adminRole, adminPermissions } = useAppStore();
  const canManageProposals = hasAdminPermission(adminRole, adminPermissions, 'proposals.manage');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [globalOnly, setGlobalOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedCrmView[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState('');

  const fetchLeads = async () => {
    setLoadError('');
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (industryFilter !== 'all') params.set('industry', industryFilter);
      if (globalOnly) params.set('international', 'true');
      if (query.trim()) params.set('q', query.trim());
      if (overdueOnly) params.set('overdue', 'true');

      const response = await fetch('/api/admin/leads?' + params.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load CRM');
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      setLeads(payload.data || []);
      setSummary(payload.summary || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load CRM';
      setLoadError(message);
      toast.error(message);
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
  }, [statusFilter, priorityFilter, industryFilter, globalOnly, query, overdueOnly]);

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
    setIndustryFilter('all');
    setGlobalOnly(false);
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
        industry: industryFilter,
        globalOnly,
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
    setIndustryFilter(view.industry || 'all');
    setGlobalOnly(Boolean(view.globalOnly));
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
      if (industryFilter !== 'all') params.set('industry', industryFilter);
      if (globalOnly) params.set('international', 'true');
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
    const payload = await readJsonResponse<any>(response, 'Invalid server response');
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
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
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
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
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

  if (loadError && !summary) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Corporate CRM"
          title="Lead Pipeline"
          description="Website and assistant enquiries become trackable opportunities without changing the original inbox message."
        />
        <OperationalLoadError
          title="CRM pipeline could not be loaded"
          message={loadError}
          onRetry={() => void fetchLeads()}
        />
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

      {loadError && (
        <OperationalLoadError
          title="CRM refresh failed"
          message={loadError + '. Showing the last successfully loaded pipeline.'}
          onRetry={() => void fetchLeads()}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total leads', value: summary?.total || 0, icon: UsersRound, onClick: clearFilters },
          { label: 'Open pipeline', value: summary?.open || 0, icon: UserRound, onClick: () => { setStatusFilter('all'); setPriorityFilter('all'); setGlobalOnly(false); setOverdueOnly(false); } },
          { label: 'Global opportunities', value: summary?.international || 0, icon: Globe2, onClick: () => { setGlobalOnly(true); setOverdueOnly(false); } },
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

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Opportunity value</p>
                <h2 className="mt-1 text-lg font-semibold">Weighted pipeline by currency</h2>
                <p className="mt-1 text-xs text-muted-foreground">Expected values stay separated by currency. Weighted value = expected revenue × probability.</p>
              </div>
              <Badge variant="secondary">{summary?.valuedOpportunities || 0} valued</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {(summary?.pipelineByCurrency || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Add expected revenue, currency and probability to open opportunities to build the forecast.
                </div>
              ) : (
                summary?.pipelineByCurrency.map((row) => (
                  <div key={row.currency} className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold">{row.currency === 'UNSPECIFIED' ? 'Currency not set' : row.currency}</p>
                      <p className="text-[11px] text-muted-foreground">{row.opportunities} open valued opportunit{row.opportunities === 1 ? 'y' : 'ies'}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Expected</p>
                      <p className="text-sm font-semibold">{formatPipelineAmount(row.expectedRevenue)} {row.currency === 'UNSPECIFIED' ? '' : row.currency}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Weighted</p>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatPipelineAmount(row.weightedRevenue)} {row.currency === 'UNSPECIFIED' ? '' : row.currency}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">Market coverage</p>
                <h2 className="mt-1 text-lg font-semibold">Open opportunity intelligence</h2>
              </div>
              <Globe2 className="size-5 text-emerald-600" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setGlobalOnly(true)} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-left transition hover:border-amber-300">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Global</p>
                <p className="mt-1 text-xl font-bold">{summary?.internationalOpen || 0}</p>
              </button>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Domestic</p>
                <p className="mt-1 text-xl font-bold">{summary?.domesticOpen || 0}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Action gaps</p>
                <p className={'mt-1 text-xl font-bold ' + ((summary?.actionGaps || 0) > 0 ? 'text-rose-600' : 'text-emerald-600')}>{summary?.actionGaps || 0}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top countries / regions</p>
                <div className="mt-2 space-y-1.5">
                  {(summary?.countries || []).slice(0, 5).map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{item.name}</span><span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                  {(summary?.countries || []).length === 0 && <p className="text-xs text-muted-foreground">No market data yet.</p>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top industries</p>
                <div className="mt-2 space-y-1.5">
                  {(summary?.industries || []).slice(0, 5).map((item) => (
                    <button key={item.name} type="button" onClick={() => item.name !== 'Unspecified' && setIndustryFilter(item.name)} className="flex w-full items-center justify-between gap-3 text-left text-xs hover:text-amber-700 dark:hover:text-amber-300">
                      <span className="truncate">{item.name}</span><span className="font-semibold">{item.count}</span>
                    </button>
                  ))}
                  {(summary?.industries || []).length === 0 && <p className="text-xs text-muted-foreground">No industry data yet.</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary?.execution && (
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Sales execution</p>
                <h2 className="mt-1 text-lg font-semibold">Pipeline discipline & conversion</h2>
                <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">{summary.execution.methodology}</p>
              </div>
              <Badge variant="secondary">{summary.execution.decided} decided opportunit{summary.execution.decided === 1 ? 'y' : 'ies'}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ['Win rate', summary.execution.winRatePct === null ? '—' : summary.execution.winRatePct.toFixed(1) + '%', summary.execution.won + ' won · ' + summary.execution.lost + ' lost'],
                ['Avg open age', summary.execution.avgOpenAgeDays === null ? '—' : summary.execution.avgOpenAgeDays.toFixed(1) + 'd', 'Oldest ' + (summary.execution.oldestOpenAgeDays === null ? '—' : summary.execution.oldestOpenAgeDays.toFixed(1) + 'd')],
                ['Follow-up coverage', summary.execution.followUpCoveragePct === null ? '—' : summary.execution.followUpCoveragePct.toFixed(1) + '%', 'Open leads with a scheduled follow-up'],
                ['Dormant ' + summary.execution.staleAfterDays + 'd+', String(summary.execution.staleOpen), 'Open opportunities without a recent CRM update'],
                ['Unassigned', String(summary.execution.unassignedOpen), 'Open opportunities without an owner'],
                ['Action gaps', String(summary.actionGaps), 'Open opportunities without a recorded next action'],
              ].map(([label, value, detail]) => (
                <div key={String(label)} className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums">{String(value)}</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{String(detail)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="grid min-w-0 gap-3 md:grid-cols-12 md:items-center">
          <label className="relative md:col-span-5 xl:col-span-6">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search person, company, country, industry, service, owner or summary"
              className="pl-9"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 md:col-span-2"
            aria-label="Filter by status"
          >
            <option value="all">All stages</option>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 md:col-span-2"
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
            className={
              overdueOnly
                ? 'md:col-span-3 xl:col-span-2 bg-rose-600 hover:bg-rose-700'
                : 'md:col-span-3 xl:col-span-2'
            }
          >
            <CalendarClock className="mr-2 size-4" /> Overdue only
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Market</span>
          <select
            value={industryFilter}
            onChange={(event) => setIndustryFilter(event.target.value)}
            className="h-9 rounded-xl border border-input bg-background px-3 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
            aria-label="Filter by industry"
          >
            <option value="all">All industries</option>
            <option value="Education">Education</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Logistics & transport">Logistics & transport</option>
            <option value="Retail & commerce">Retail & commerce</option>
            <option value="Professional services">Professional services</option>
            <option value="Technology / startup">Technology / startup</option>
            <option value="Public / nonprofit">Public / nonprofit</option>
            <option value="Other">Other</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant={globalOnly ? 'default' : 'outline'}
            onClick={() => setGlobalOnly((value) => !value)}
          >
            <Globe2 className="mr-2 size-3.5" /> Global only
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
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
          {(statusFilter !== 'all' || priorityFilter !== 'all' || industryFilter !== 'all' || globalOnly || query || overdueOnly) && (
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
                          {(lead.company || lead.countryRegion) && (
                            <p className="mt-1 truncate text-[10px] font-medium text-amber-700/80 dark:text-amber-300/70">
                              {[lead.company, lead.countryRegion].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ' + priorityClass(lead.priority)}>
                            {lead.priority}
                          </span>
                          <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ' + operatingTone(lead.operatingIntelligence.urgency)}>
                            {lead.operatingIntelligence.urgency}
                          </span>
                        </div>
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
            <DialogDescription>
              Save the current search, stage, priority and overdue filters for quick reuse on this browser.
            </DialogDescription>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveViewOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveCurrentView} disabled={!viewName.trim()}>Save view</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-x-hidden overflow-y-auto p-0">
          {selected && (
            <>
              <DialogHeader className="border-b border-border px-5 py-4 sm:px-6">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
                  {selected.contactMessage.name}
                  <Badge variant="secondary">{selected.source}</Badge>
                  <span className={'rounded-full border px-2 py-0.5 text-[10px] uppercase ' + priorityClass(selected.priority)}>
                    {selected.priority}
                  </span>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Review the customer enquiry, CRM intelligence, notes, assignment and follow-up details.
                </DialogDescription>
              </DialogHeader>

              <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
                <div className="min-w-0 space-y-5 p-5 sm:p-6">
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

                  <div className="rounded-2xl border border-indigo-200/70 bg-indigo-500/[0.04] p-4 dark:border-indigo-900/40">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Sparkles className="size-4 text-indigo-600 dark:text-indigo-300" />
                          <p className="text-sm font-semibold">Operating intelligence</p>
                          <Badge variant="outline" className={operatingTone(selected.operatingIntelligence.urgency)}>
                            {selected.operatingIntelligence.urgency}
                          </Badge>
                          <Badge variant="outline">{selected.operatingIntelligence.readiness.replaceAll('_', ' ')}</Badge>
                        </div>
                        <p className="mt-3 text-sm font-medium">{selected.operatingIntelligence.recommendedAction}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.operatingIntelligence.rationale}</p>
                        {selected.operatingIntelligence.gaps.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {selected.operatingIntelligence.gaps.map((gap) => (
                              <span key={gap} className="rounded-full border border-border/60 bg-background px-2 py-1 text-[10px] text-muted-foreground">
                                Gap: {gap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={saving || selected.nextAction === selected.operatingIntelligence.recommendedAction}
                        onClick={() => void patchLead(selected, { nextAction: selected.operatingIntelligence.recommendedAction })}
                      >
                        Use as next action
                      </Button>
                    </div>
                    <p className="mt-3 border-t border-border/60 pt-3 text-[10px] leading-5 text-muted-foreground">
                      {selected.operatingIntelligence.controls}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Commercial qualification</p>
                        <p className="mt-1 text-xs text-muted-foreground">Structured market and opportunity context. The original customer enquiry below is never rewritten.</p>
                      </div>
                      <label className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={selected.international}
                          onChange={(event) => {
                            const value = event.target.checked;
                            setSelected({ ...selected, international: value });
                            void patchLead(selected, { international: value });
                          }}
                        />
                        International
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Company / organization</Label>
                        <Input className="mt-2" value={selected.company} onChange={(event) => setSelected({ ...selected, company: event.target.value })} onBlur={(event) => void patchLead(selected, { company: event.target.value })} />
                      </div>
                      <div>
                        <Label>Industry</Label>
                        <Input className="mt-2" value={selected.industry} onChange={(event) => setSelected({ ...selected, industry: event.target.value })} onBlur={(event) => void patchLead(selected, { industry: event.target.value })} />
                      </div>
                      <div>
                        <Label>Country / region</Label>
                        <Input className="mt-2" value={selected.countryRegion} onChange={(event) => setSelected({ ...selected, countryRegion: event.target.value })} onBlur={(event) => void patchLead(selected, { countryRegion: event.target.value })} />
                      </div>
                      <div>
                        <Label>Time zone</Label>
                        <Input className="mt-2" value={selected.timezone} onChange={(event) => setSelected({ ...selected, timezone: event.target.value })} onBlur={(event) => void patchLead(selected, { timezone: event.target.value })} />
                      </div>
                      <div>
                        <Label>Service interest</Label>
                        <Input className="mt-2" value={selected.serviceInterest} onChange={(event) => setSelected({ ...selected, serviceInterest: event.target.value })} onBlur={(event) => void patchLead(selected, { serviceInterest: event.target.value })} />
                      </div>
                      <div>
                        <Label>Engagement model</Label>
                        <Input className="mt-2" value={selected.engagementModel} onChange={(event) => setSelected({ ...selected, engagementModel: event.target.value })} onBlur={(event) => void patchLead(selected, { engagementModel: event.target.value })} />
                      </div>
                      <div>
                        <Label>Budget range</Label>
                        <Input className="mt-2" value={selected.budgetRange} onChange={(event) => setSelected({ ...selected, budgetRange: event.target.value })} onBlur={(event) => void patchLead(selected, { budgetRange: event.target.value })} />
                      </div>
                      <div>
                        <Label>Delivery window</Label>
                        <Input className="mt-2" value={selected.deliveryWindow} onChange={(event) => setSelected({ ...selected, deliveryWindow: event.target.value })} onBlur={(event) => void patchLead(selected, { deliveryWindow: event.target.value })} />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Input className="mt-2" value={selected.currency} onChange={(event) => setSelected({ ...selected, currency: event.target.value.toUpperCase().slice(0, 12) })} onBlur={(event) => void patchLead(selected, { currency: event.target.value.toUpperCase() })} />
                      </div>
                      <div>
                        <Label>Expected revenue</Label>
                        <Input
                          className="mt-2"
                          type="number"
                          min="0"
                          step="0.01"
                          value={selected.expectedRevenue}
                          onChange={(event) => setSelected({ ...selected, expectedRevenue: event.target.value })}
                          onBlur={(event) => void patchLead(selected, { expectedRevenue: Number(event.target.value || 0) })}
                        />
                      </div>
                      <div>
                        <Label>Probability (%)</Label>
                        <Input
                          className="mt-2"
                          type="number"
                          min="0"
                          max="100"
                          value={selected.probability}
                          onChange={(event) => setSelected({ ...selected, probability: Math.max(0, Math.min(100, Number(event.target.value || 0))) })}
                          onBlur={(event) => void patchLead(selected, { probability: Number(event.target.value || 0) })}
                        />
                      </div>
                      <div>
                        <Label>Next action</Label>
                        <Input className="mt-2" value={selected.nextAction} onChange={(event) => setSelected({ ...selected, nextAction: event.target.value })} onBlur={(event) => void patchLead(selected, { nextAction: event.target.value })} placeholder="e.g. Confirm discovery call" />
                      </div>
                    </div>
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
                    <div className="mt-5 max-h-[36vh] overflow-y-auto pr-2">
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

                <aside className="space-y-4 border-t border-border bg-muted/15 p-5 sm:p-6 lg:border-l lg:border-t-0">
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
