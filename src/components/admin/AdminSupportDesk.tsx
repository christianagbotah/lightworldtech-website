'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  StickyNote,
  UserRound,
  Paperclip,
  Download,
  Upload,
  Activity,
  Star,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SlaState = {
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  breached: boolean;
};

type TicketListItem = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  lastActivityAt: string;
  unreadByAdmin: boolean;
  unreadByClient: boolean;
  clientRating: number | null;
  clientFeedback: string;
  ratedAt: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  project: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  _count: { messages: number; internalNotes: number };
  sla: SlaState;
};

type TicketMessage = {
  id: string;
  authorType: string;
  authorName: string;
  message: string;
  createdAt: string;
};

type InternalNote = {
  id: string;
  authorName: string;
  note: string;
  createdAt: string;
};

type TicketAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByType: string;
  uploadedByName: string;
  createdAt: string;
};

type TicketEvent = {
  id: string;
  type: string;
  actorType: string;
  actorName: string;
  details: string;
  createdAt: string;
};

type TicketDetail = TicketListItem & {
  message: string;
  organization: {
    id: string;
    name: string;
    primaryContactName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
  project: { id: string; name: string; status: string } | null;
  createdBy: { id: string; name: string; email: string; role: string };
  messages: TicketMessage[];
  internalNotes: InternalNote[];
  attachments: TicketAttachment[];
  events: TicketEvent[];
};

type Summary = {
  total: number;
  open: number;
  unread: number;
  highPriority: number;
  breached: number;
  awaitingClient: number;
  performance: {
    windowDays: number;
    avgFirstResponseMinutes: number | null;
    avgResolutionMinutes: number | null;
    slaCompliancePct: number | null;
    csatAverage: number | null;
    csatResponses: number;
    resolvedSamples: number;
  };
};

type SupportAgent = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string | null;
};

const categories = [
  ['all', 'All categories'],
  ['technical', 'Technical support'],
  ['billing', 'Billing'],
  ['hosting', 'Hosting'],
  ['project_change', 'Project change'],
  ['training', 'Training'],
  ['account', 'Account'],
  ['general', 'General'],
] as const;

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string): string {
  if (status === 'resolved' || status === 'closed') {
    return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (status === 'awaiting_client') {
    return 'border-0 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200';
  }
  if (status === 'in_progress') {
    return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  }
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'No data';
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return hours + 'h' + (remainder ? ' ' + remainder + 'm' : '');
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return days + 'd' + (remainingHours ? ' ' + remainingHours + 'h' : '');
}

function priorityClass(priority: string): string {
  if (priority === 'high') return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (priority === 'low') return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
}

export default function AdminSupportDesk() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    open: 0,
    unread: 0,
    highPriority: 0,
    breached: 0,
    awaitingClient: 0,
    performance: {
      windowDays: 90,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      slaCompliancePct: null,
      csatAverage: null,
      csatResponses: 0,
      resolvedSamples: 0,
    },
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [sla, setSla] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');

  const params = useMemo(() => {
    const value = new URLSearchParams({ limit: '100' });
    if (query.trim()) value.set('q', query.trim());
    if (status !== 'all') value.set('status', status);
    if (priority !== 'all') value.set('priority', priority);
    if (category !== 'all') value.set('category', category);
    if (sla !== 'all') value.set('sla', sla);
    if (assignedToFilter !== 'all') value.set('assignedTo', assignedToFilter);
    return value;
  }, [query, status, priority, category, sla, assignedToFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/support-tickets?' + params.toString(), {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load Support Desk');
      const nextTickets: TicketListItem[] = payload.data || [];
      setTickets(nextTickets);
      setSelectedIds((current) => new Set([...current].filter((id) => nextTickets.some((ticket) => ticket.id === id))));
      setSummary(payload.summary || {
        total: 0,
        open: 0,
        unread: 0,
        highPriority: 0,
        breached: 0,
        awaitingClient: 0,
        performance: {
          windowDays: 90,
          avgFirstResponseMinutes: null,
          avgResolutionMinutes: null,
          slaCompliancePct: null,
          csatAverage: null,
          csatResponses: 0,
          resolvedSamples: 0,
        },
      });

      if (typeof window !== 'undefined') {
        const requestedId = sessionStorage.getItem('lw-support-ticket-id');
        if (requestedId) {
          sessionStorage.removeItem('lw-support-ticket-id');
          void openTicket(requestedId);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load Support Desk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTickets(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  useEffect(() => {
    fetch('/api/admin/support-agents', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load support agents');
        setAgents(payload.data || []);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to load support agents');
      });
  }, []);

  const agentLabel = (email: string) => {
    if (!email) return 'Unassigned';
    const agent = agents.find((item) => item.email === email);
    return agent ? agent.name + ' · ' + agent.email : email;
  };

  const allVisibleSelected = tickets.length > 0 && tickets.every((ticket) => selectedIds.has(ticket.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(tickets.map((ticket) => ticket.id)));
  };

  const applyBulk = async (patch: Record<string, unknown>) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkUpdating(true);
    try {
      const response = await fetch('/api/admin/support-tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ...patch }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to update selected tickets');
      toast.success(String(payload?.data?.updated || ids.length) + ' support ticket(s) updated');
      setSelectedIds(new Set());
      setBulkPriority('');
      setBulkStatus('');
      setBulkAssignee('');
      await loadTickets();
      if (selected) await openTicket(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update selected tickets');
    } finally {
      setBulkUpdating(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/admin/support-tickets/export?' + params.toString(), {
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to export Support Desk');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'lightworld-support-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Support Desk export downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export Support Desk');
    } finally {
      setExporting(false);
    }
  };

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch('/api/admin/support-tickets/' + encodeURIComponent(id), {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load support ticket');
      setSelected(payload.data);
      setReply('');
      setNote('');
      setTickets((current) => current.map((ticket) =>
        ticket.id === id ? { ...ticket, unreadByAdmin: false } : ticket
      ));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load support ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    await openTicket(selected.id);
    await loadTickets();
  };

  const updateTicket = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-tickets/' + encodeURIComponent(selected.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to update support ticket');
      toast.success('Ticket updated');
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update support ticket');
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-tickets/' + encodeURIComponent(selected.id) + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to send support reply');
      setReply('');
      toast.success('Reply sent to client portal');
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send support reply');
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (file: File | null) => {
    if (!selected || !file) return;
    setAttachmentUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/admin/support-tickets/' + encodeURIComponent(selected.id) + '/attachments', {
        method: 'POST',
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to upload attachment');
      toast.success('Evidence attached to ticket');
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload attachment');
    } finally {
      setAttachmentUploading(false);
    }
  };

  const addInternalNote = async () => {
    if (!selected || !note.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/support-tickets/' + encodeURIComponent(selected.id) + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to add internal note');
      setNote('');
      toast.success('Private note added');
      await refreshSelected();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add internal note');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setPriority('all');
    setCategory('all');
    setSla('all');
    setAssignedToFilter('all');
  };

  const kpis = [
    { label: 'Open', value: summary.open, icon: Inbox, action: () => { setStatus('all'); setSla('all'); } },
    { label: 'Unread', value: summary.unread, icon: BellRing, action: () => resetFilters() },
    { label: 'High priority', value: summary.highPriority, icon: AlertTriangle, action: () => { setPriority('high'); setSla('all'); } },
    { label: 'SLA breached', value: summary.breached, icon: ShieldAlert, action: () => setSla('breached') },
    { label: 'Awaiting client', value: summary.awaitingClient, icon: Clock3, action: () => { setStatus('awaiting_client'); setSla('all'); } },
  ];

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Enterprise Support Desk</p>
          <h1 className="mt-1 text-2xl font-bold">Client support operations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage client cases, SLA response deadlines, assignment, conversations and private staff notes from one queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => void loadTickets()}>
            <RefreshCw className="mr-2 size-4" /> Refresh queue
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={item.action} className="text-left">
              <Card className="h-full border-border/60 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Gauge className="size-4 text-amber-600" /> Service performance
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Rolling {summary.performance.windowDays}-day operational metrics from actual ticket timestamps.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[760px]">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Avg first response</p>
                <p className="mt-1 text-lg font-bold">{formatDuration(summary.performance.avgFirstResponseMinutes)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Avg resolution</p>
                <p className="mt-1 text-lg font-bold">{formatDuration(summary.performance.avgResolutionMinutes)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">SLA compliance</p>
                <p className="mt-1 text-lg font-bold">{summary.performance.slaCompliancePct === null ? 'No data' : summary.performance.slaCompliancePct + '%'}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">CSAT</p>
                <p className="mt-1 flex items-center gap-1 text-lg font-bold">
                  {summary.performance.csatAverage === null ? 'No data' : summary.performance.csatAverage + '/5'}
                  {summary.performance.csatAverage !== null && <Star className="size-4 fill-current text-amber-500" />}
                </p>
                <p className="text-[10px] text-muted-foreground">{summary.performance.csatResponses} response{summary.performance.csatResponses === 1 ? '' : 's'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,2fr)_repeat(4,minmax(0,1fr))_minmax(140px,1.2fr)_auto] xl:items-center">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, client, subject, email or assignee" className="pl-9" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="awaiting_client">Awaiting client</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={sla} onChange={(event) => setSla(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
          <option value="all">All SLA states</option>
          <option value="breached">SLA breached</option>
        </select>
        <select value={assignedToFilter} onChange={(event) => setAssignedToFilter(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
          <option value="all">All agents</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((agent) => <option key={agent.id} value={agent.email}>{agent.name}</option>)}
        </select>
        <Button type="button" variant="ghost" onClick={resetFilters}>Clear</Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold">{selectedIds.size} ticket{selectedIds.size === 1 ? '' : 's'} selected</p>
              <p className="mt-1 text-xs text-muted-foreground">Bulk status changes are limited to 25 cases per request; assignment/priority can update up to 100.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[760px]">
              <div className="flex gap-2">
                <select value={bulkAssignee} onChange={(event) => setBulkAssignee(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
                  <option value="">Choose assignee</option>
                  <option value="__unassigned__">Unassigned</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.email}>{agent.name}</option>)}
                </select>
                <Button size="sm" variant="outline" disabled={bulkUpdating || !bulkAssignee} onClick={() => void applyBulk({ assignedTo: bulkAssignee === '__unassigned__' ? '' : bulkAssignee })}>Assign</Button>
              </div>
              <div className="flex gap-2">
                <select value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
                  <option value="">Choose priority</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <Button size="sm" variant="outline" disabled={bulkUpdating || !bulkPriority} onClick={() => void applyBulk({ priority: bulkPriority })}>Apply</Button>
              </div>
              <div className="flex gap-2">
                <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
                  <option value="">Choose status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="awaiting_client">Awaiting client</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <Button size="sm" variant="outline" disabled={bulkUpdating || !bulkStatus || selectedIds.size > 25} onClick={() => void applyBulk({ status: bulkStatus })}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="max-w-full overflow-x-auto">
          <Table hideExport exportFileName="lightworld-support-desk">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible support tickets"
                    className="size-4 rounded border-border accent-amber-600"
                  />
                </TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="text-right">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No tickets match this view.</TableCell></TableRow>
              ) : tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  onClick={() => void openTicket(ticket.id)}
                  className={'cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-950/10 ' + (ticket.unreadByAdmin ? 'border-l-[3px] border-l-amber-500' : '')}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => toggleSelected(ticket.id)}
                      aria-label={'Select ' + ticket.ticketNumber}
                      className="size-4 rounded border-border accent-amber-600"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ticket.unreadByAdmin && <span className="size-2 rounded-full bg-amber-500" />}
                      <span className="font-mono text-xs font-semibold">{ticket.ticketNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[180px] truncate text-sm font-medium">{ticket.organization.name}</p>
                    <p className="max-w-[180px] truncate text-[10px] text-muted-foreground">{ticket.createdBy.email}</p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[260px] truncate text-sm">{ticket.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{pretty(ticket.category)} · {ticket._count.messages} replies</p>
                  </TableCell>
                  <TableCell><Badge className={statusClass(ticket.status)}>{pretty(ticket.status)}</Badge></TableCell>
                  <TableCell><Badge className={priorityClass(ticket.priority)}>{pretty(ticket.priority)}</Badge></TableCell>
                  <TableCell>
                    {ticket.sla.breached ? (
                      <Badge className="border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">Breached</Badge>
                    ) : (
                      <Badge variant="outline">Within SLA</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs">{agentLabel(ticket.assignedTo)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{new Date(ticket.lastActivityAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={Boolean(selected) || detailLoading} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[95vh] w-[calc(100vw-1.5rem)] max-w-[min(96vw,1500px)] overflow-x-hidden overflow-y-auto p-0">
          {detailLoading && !selected ? (
            <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="size-7 animate-spin text-amber-600" /></div>
          ) : selected ? (
            <>
              <DialogHeader className="border-b border-border px-6 py-5">
                <DialogTitle className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-base text-amber-700">{selected.ticketNumber}</span>
                  <span className="text-xl">{selected.subject}</span>
                  <Badge className={statusClass(selected.status)}>{pretty(selected.status)}</Badge>
                  <Badge className={priorityClass(selected.priority)}>{pretty(selected.priority)}</Badge>
                  {selected.sla.breached && <Badge className="border-0 bg-rose-600 text-white">SLA breached</Badge>}
                </DialogTitle>
              </DialogHeader>

              <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                <div className="min-w-0 space-y-6 p-6">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Original request</p>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{selected.message}</p>
                    <p className="mt-4 text-[11px] text-muted-foreground">
                      Opened by {selected.createdBy.name} · {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="size-4 text-amber-600" /> Conversation</h3>
                      <Badge variant="outline">{selected.messages.length} replies</Badge>
                    </div>
                    <div className="mt-3 max-h-[46vh] space-y-3 overflow-y-auto rounded-2xl border border-border/60 p-4">
                      {selected.messages.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No replies yet.</p>
                      ) : selected.messages.map((message) => (
                        <div key={message.id} className={message.authorType === 'admin' ? 'mr-8 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/20' : 'ml-8 rounded-2xl bg-muted/60 p-4'}>
                          <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                            <span>{message.authorName} · {message.authorType === 'admin' ? 'Lightworld' : 'Client'}</span>
                            <span>{new Date(message.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>
                        </div>
                      ))}
                    </div>

                    {selected.status !== 'closed' && (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="support-reply">Reply to client</Label>
                        <Textarea id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} rows={5} maxLength={8000} placeholder="Write a client-visible reply…" />
                        <div className="flex justify-end">
                          <Button onClick={() => void sendReply()} disabled={saving || !reply.trim()}>
                            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                            Send reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4 text-amber-600" /> Evidence & attachments</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Private ticket files. JPG, PNG, WebP or PDF, max 10MB.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted">
                        {attachmentUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                        Add evidence
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          className="sr-only"
                          disabled={attachmentUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            void uploadAttachment(file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {selected.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={'/api/support-attachments/' + attachment.id}
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 transition hover:border-amber-300"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700"><Paperclip className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">{attachment.originalName}</span>
                            <span className="block text-[10px] text-muted-foreground">
                              {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB · {attachment.uploadedByName}
                            </span>
                          </span>
                          <Download className="size-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      ))}
                      {!selected.attachments.length && <p className="text-xs text-muted-foreground">No evidence attached yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-amber-600" /> Activity timeline</h3>
                      <Badge variant="outline">{selected.events.length}</Badge>
                    </div>
                    <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {selected.events.map((event) => (
                        <div key={event.id} className="flex gap-3 rounded-xl bg-muted/40 p-3">
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">{pretty(event.type)}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {event.actorName} · {event.actorType === 'admin' ? 'Lightworld' : 'Client'} · {new Date(event.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {!selected.events.length && <p className="text-xs text-muted-foreground">No activity events recorded yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold"><StickyNote className="size-4 text-amber-600" /> Private staff notes</h3>
                      <Badge variant="outline">{selected.internalNotes.length}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Never visible to the client.</p>
                    <div className="mt-4 space-y-2">
                      {selected.internalNotes.map((item) => (
                        <div key={item.id} className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span>{item.authorName}</span>
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.note}</p>
                        </div>
                      ))}
                      {!selected.internalNotes.length && <p className="text-xs text-muted-foreground">No internal notes yet.</p>}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a private note…" maxLength={8000} />
                      <Button type="button" variant="outline" onClick={() => void addInternalNote()} disabled={saving || !note.trim()}>Add note</Button>
                    </div>
                  </div>
                </div>

                <aside className="space-y-6 border-t border-border bg-muted/15 p-6 xl:border-l xl:border-t-0">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Client</p>
                    <div className="mt-3 rounded-xl border border-border/60 bg-background p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-amber-600" /> {selected.organization.name}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{selected.createdBy.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{selected.createdBy.email}</p>
                      {selected.organization.primaryPhone && <p className="mt-1 text-xs text-muted-foreground">{selected.organization.primaryPhone}</p>}
                      {selected.project && <p className="mt-3 text-xs"><span className="text-muted-foreground">Project:</span> {selected.project.name}</p>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Status</Label>
                      <select value={selected.status} onChange={(event) => void updateTicket({ status: event.target.value })} disabled={saving} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="awaiting_client">Awaiting client</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <select value={selected.priority} onChange={(event) => void updateTicket({ priority: event.target.value })} disabled={saving} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select value={selected.category} onChange={(event) => void updateTicket({ category: event.target.value })} disabled={saving} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {categories.filter(([value]) => value !== 'all').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="support-assignee">Assignee</Label>
                      <select
                        id="support-assignee"
                        value={selected.assignedTo}
                        onChange={(event) => void updateTicket({ assignedTo: event.target.value })}
                        disabled={saving}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {selected.assignedTo && !agents.some((agent) => agent.email === selected.assignedTo) && (
                          <option value={selected.assignedTo}>{selected.assignedTo}</option>
                        )}
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.email}>{agent.name} · {agent.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"><CalendarClock className="size-4" /> SLA</p>
                    <div className="mt-3 space-y-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">First response due</p>
                        <p className={selected.sla.firstResponseBreached ? 'font-semibold text-rose-600' : 'font-medium'}>
                          {selected.firstRespondedAt
                            ? 'Responded ' + new Date(selected.firstRespondedAt).toLocaleString()
                            : selected.firstResponseDueAt
                              ? new Date(selected.firstResponseDueAt).toLocaleString()
                              : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Resolution due</p>
                        <p className={selected.sla.resolutionBreached ? 'font-semibold text-rose-600' : 'font-medium'}>
                          {selected.resolvedAt
                            ? 'Resolved ' + new Date(selected.resolvedAt).toLocaleString()
                            : selected.resolutionDueAt
                              ? new Date(selected.resolutionDueAt).toLocaleString()
                              : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selected.clientRating && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                      <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                        <Star className="size-4 fill-current" /> Client satisfaction
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{selected.clientRating}/5</p>
                      {selected.clientFeedback && <p className="mt-2 whitespace-pre-wrap leading-5 text-amber-900/75 dark:text-amber-200/70">{selected.clientFeedback}</p>}
                      {selected.ratedAt && <p className="mt-2 text-[10px] text-amber-900/60 dark:text-amber-200/55">Submitted {new Date(selected.ratedAt).toLocaleString()}</p>}
                    </div>
                  )}

                  <div className="rounded-xl border border-border/60 bg-background p-4 text-xs">
                    <p className="flex items-center gap-2 font-semibold"><UserRound className="size-4 text-amber-600" /> Ownership</p>
                    <p className="mt-2 text-muted-foreground">{agentLabel(selected.assignedTo)}</p>
                    <p className="mt-3 text-muted-foreground">Last activity</p>
                    <p className="font-medium">{new Date(selected.lastActivityAt).toLocaleString()}</p>
                  </div>
                </aside>
              </div>

              <DialogFooter className="border-t border-border px-6 py-4">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
