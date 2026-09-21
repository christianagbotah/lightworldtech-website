'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  FileSignature,
  Mail,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { hasAdminPermission } from '@/lib/admin-permissions';

type ProposalStatus = 'draft' | 'review' | 'ready' | 'sent' | 'accepted' | 'declined';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
};

type Lead = {
  id: string;
  status: string;
  priority: string;
  source: string;
  summary: string;
  tags: string;
  contactMessage: ContactMessage;
  proposal?: { id: string } | null;
};

type Proposal = {
  id: string;
  leadId: string;
  status: ProposalStatus;
  title: string;
  executiveSummary: string;
  solution: string;
  scope: string;
  deliverables: string;
  assumptions: string;
  timeline: string;
  commercialNotes: string;
  nextSteps: string;
  version: number;
  approvedBy: string;
  approvedAt: string | null;
  sentAt: string | null;
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead: Lead;
  clientProject?: {
    id: string;
    name: string;
    organizationId: string;
    organization: { id: string; name: string };
  } | null;
};

type Summary = {
  total: number;
  byStatus: Record<ProposalStatus, number>;
};

const statuses: Array<{ id: ProposalStatus; label: string }> = [
  { id: 'draft', label: 'Draft' },
  { id: 'review', label: 'In review' },
  { id: 'ready', label: 'Approved / ready' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
];

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function statusClass(status: ProposalStatus): string {
  if (status === 'accepted') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'declined') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (status === 'ready') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300';
  if (status === 'sent') return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
  if (status === 'review') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/55';
}

export default function AdminProposals() {
  const { adminRole, adminPermissions } = useAppStore();
  const canManageClients = hasAdminPermission(adminRole, adminPermissions, 'clients.manage');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [leadId, setLeadId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activationLinks, setActivationLinks] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (query.trim()) params.set('q', query.trim());

      const [proposalsRes, leadsRes] = await Promise.all([
        fetch('/api/admin/proposals?' + params.toString(), { cache: 'no-store' }),
        fetch('/api/admin/leads?limit=200', { cache: 'no-store' }),
      ]);

      if (!proposalsRes.ok || !leadsRes.ok) throw new Error('Could not load proposal workspace');

      const [proposalPayload, leadPayload] = await Promise.all([proposalsRes.json(), leadsRes.json()]);
      const nextProposals: Proposal[] = proposalPayload.data || [];
      const nextLeads: Lead[] = leadPayload.data || [];

      setProposals(nextProposals);
      setSummary(proposalPayload.summary || null);
      setLeads(nextLeads);

      const requested = sessionStorage.getItem('lw-open-proposal-id');
      if (requested) {
        const match = nextProposals.find((item) => item.id === requested);
        if (match) {
          setSelected(match);
          sessionStorage.removeItem('lw-open-proposal-id');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load proposal workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, query]);

  const unavailableLeadIds = useMemo(() => new Set(proposals.map((item) => item.leadId)), [proposals]);
  const availableLeads = leads.filter((lead) => !unavailableLeadIds.has(lead.id));

  const createProposal = async (event: FormEvent) => {
    event.preventDefault();
    if (!leadId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!response.ok) throw new Error('Could not create proposal draft');
      const payload = await response.json();
      setLeadId('');
      await fetchData();
      setSelected(payload.data);
      toast.success(payload.created ? 'Proposal draft created' : 'Existing proposal opened');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create proposal draft');
    } finally {
      setSaving(false);
    }
  };

  const patchProposal = async (update: Record<string, unknown>, success?: string) => {
    if (!selected) return null;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/proposals/' + selected.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Could not update proposal');
      const payload = await response.json();
      setSelected(payload.data);
      await fetchData();
      if (success) toast.success(success);
      return payload.data as Proposal;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update proposal');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!selected) return;
    const ok = window.confirm(
      'Regenerate assisted sections from the current CRM lead? This replaces the title, summary, solution, scope, deliverables, assumptions, timeline, commercial notes and next steps, and returns the proposal to Draft.',
    );
    if (!ok) return;
    await patchProposal({ regenerateDraft: true }, 'Proposal regenerated as a new draft version');
  };

  const convertAcceptedProposal = async () => {
    if (!canManageClients || !selected || selected.status !== 'accepted') return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/proposals/' + selected.id + '/convert-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to create client workspace');

      const project = payload?.data?.project;
      const organization = payload?.data?.organization;
      if (project && organization) {
        setSelected((current) => current ? {
          ...current,
          clientProject: {
            id: String(project.id),
            name: String(project.name),
            organizationId: String(project.organizationId),
            organization: { id: String(organization.id), name: String(organization.name) },
          },
        } : current);
      }
      if (payload?.activationUrl) {
        setActivationLinks((current) => ({ ...current, [selected.id]: String(payload.activationUrl) }));
      }
      await fetchData();
      toast.success(payload?.created ? 'Client workspace created' : 'Client workspace already exists');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create client workspace');
    } finally {
      setSaving(false);
    }
  };

  const copyActivationLink = async (proposalId: string) => {
    const url = activationLinks[proposalId];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Client activation link copied');
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Proposal & discovery workspace</p>
          <h1 className="mt-1 text-2xl font-bold">Human-reviewed proposal drafts</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Turn qualified CRM enquiries into structured discovery and solution proposals. Assisted content never creates pricing or binding delivery commitments.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchData()}>
          <RefreshCw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total proposals', summary?.total || 0],
          ['Draft / review', (summary?.byStatus?.draft || 0) + (summary?.byStatus?.review || 0)],
          ['Ready / sent', (summary?.byStatus?.ready || 0) + (summary?.byStatus?.sent || 0)],
          ['Accepted', summary?.byStatus?.accepted || 0],
        ].map(([label, value]) => (
          <Card key={String(label)} className="border-border/60">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form onSubmit={createProposal} className="grid min-w-0 gap-3 rounded-2xl border border-border/60 bg-card p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <Label htmlFor="proposal-lead">Create proposal from CRM lead</Label>
          <select
            id="proposal-lead"
            value={leadId}
            onChange={(event) => setLeadId(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a lead without a proposal</option>
            {availableLeads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.contactMessage.name} — {lead.contactMessage.subject || lead.contactMessage.email}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="self-end" disabled={!leadId || saving}>
          <Sparkles className="mr-2 size-4" /> Generate grounded draft
        </Button>
      </form>

      <div className="grid min-w-0 gap-3 rounded-2xl border border-border/60 bg-card p-4 lg:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search proposal, prospect, email or lead summary…"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {proposals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground lg:col-span-2 2xl:col-span-3">
            No proposal drafts yet. Create one from a CRM lead above.
          </div>
        )}
        {proposals.map((proposal) => (
          <button
            key={proposal.id}
            type="button"
            onClick={() => setSelected(proposal)}
            className="rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <FileSignature className="size-5" />
              </span>
              <Badge className={statusClass(proposal.status)}>
                {statuses.find((item) => item.id === proposal.status)?.label || proposal.status}
              </Badge>
            </div>
            <p className="mt-4 line-clamp-2 text-base font-semibold">{proposal.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{proposal.lead.contactMessage.name}</p>
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{proposal.executiveSummary}</p>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
              <span>Version {proposal.version}</span>
              <span>{new Date(proposal.updatedAt).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-5xl overflow-x-hidden overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <FileSignature className="size-5 text-amber-600" />
                  {selected.lead.contactMessage.name}
                  <Badge className={statusClass(selected.status)}>
                    {statuses.find((item) => item.id === selected.status)?.label || selected.status}
                  </Badge>
                  <Badge variant="secondary">v{selected.version}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-5">
                  <div>
                    <Label>Proposal title</Label>
                    <Input
                      className="mt-2"
                      value={selected.title}
                      onChange={(event) => setSelected({ ...selected, title: event.target.value })}
                      onBlur={(event) => void patchProposal({ title: event.target.value })}
                    />
                  </div>

                  {[
                    ['Executive summary', 'executiveSummary', 6],
                    ['Recommended solution', 'solution', 6],
                    ['Scope / discovery plan', 'scope', 7],
                    ['Timeline', 'timeline', 4],
                    ['Commercial notes — manual approval required', 'commercialNotes', 5],
                    ['Next steps', 'nextSteps', 5],
                  ].map(([label, key, rows]) => (
                    <div key={String(key)}>
                      <Label>{label}</Label>
                      <Textarea
                        className="mt-2"
                        rows={Number(rows)}
                        value={String(selected[key as keyof Proposal] || '')}
                        onChange={(event) => setSelected({ ...selected, [String(key)]: event.target.value })}
                        onBlur={(event) => void patchProposal({ [String(key)]: event.target.value })}
                      />
                    </div>
                  ))}

                  {[
                    ['Deliverables', 'deliverables'],
                    ['Assumptions & dependencies', 'assumptions'],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Textarea
                        className="mt-2"
                        rows={7}
                        value={parseList(selected[key as 'deliverables' | 'assumptions']).join('\n')}
                        onChange={(event) => {
                          const list = event.target.value.split('\n').map((item) => item.trim()).filter(Boolean);
                          setSelected({ ...selected, [key]: JSON.stringify(list) });
                        }}
                        onBlur={(event) => {
                          const list = event.target.value.split('\n').map((item) => item.trim()).filter(Boolean);
                          void patchProposal({ [key]: list });
                        }}
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">One item per line</p>
                    </div>
                  ))}
                </div>

                <aside className="space-y-4 rounded-2xl border border-border/60 bg-muted/15 p-4">
                  <div>
                    <Label>Status</Label>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={selected.status}
                      onChange={(event) => void patchProposal({ status: event.target.value }, 'Proposal status updated')}
                    >
                      {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                    </select>
                    <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                      “Ready” records the approving admin. “Sent” records the first sent timestamp.
                    </p>
                  </div>

                  <Button variant="outline" className="w-full" disabled={saving} onClick={() => void regenerate()}>
                    <Sparkles className="mr-2 size-4" /> Regenerate assisted draft
                  </Button>

                  {selected.clientProject ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <div className="flex items-center gap-2 font-semibold">
                        <Building2 className="size-3.5" /> Client workspace active
                      </div>
                      <p className="mt-2">{selected.clientProject.organization.name} · {selected.clientProject.name}</p>
                    </div>
                  ) : canManageClients && selected.status === 'accepted' ? (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={() => void convertAcceptedProposal()}>
                      <Building2 className="mr-2 size-4" /> Create client workspace
                    </Button>
                  ) : canManageClients ? (
                    <p className="rounded-xl border border-dashed border-border p-3 text-[10px] leading-4 text-muted-foreground">
                      Mark the proposal Accepted before creating a client workspace.
                    </p>
                  ) : null}

                  {activationLinks[selected.id] && (
                    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">One-time client activation link</p>
                      <div className="flex gap-2">
                        <Input readOnly value={activationLinks[selected.id]} className="h-9 text-[10px]" />
                        <Button type="button" size="icon" variant="outline" onClick={() => void copyActivationLink(selected.id)} aria-label="Copy activation link">
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/60 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Prospect</p>
                    <p className="mt-2 text-sm font-semibold">{selected.lead.contactMessage.name}</p>
                    <a className="mt-2 flex items-center gap-2 text-xs text-amber-700 hover:underline dark:text-amber-300" href={'mailto:' + selected.lead.contactMessage.email}>
                      <Mail className="size-3.5" /> {selected.lead.contactMessage.email}
                    </a>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{selected.lead.summary}</p>
                  </div>

                  <div className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
                    {selected.approvedAt ? (
                      <p className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        Approved by {selected.approvedBy || 'Admin'} on {new Date(selected.approvedAt).toLocaleString()}
                      </p>
                    ) : (
                      <p>No approval recorded yet.</p>
                    )}
                    {selected.sentAt && (
                      <p className="mt-3 flex gap-2">
                        <Send className="mt-0.5 size-3.5 shrink-0" />
                        Marked sent {new Date(selected.sentAt).toLocaleString()}
                      </p>
                    )}
                    <p className="mt-3 flex gap-2">
                      <Clock3 className="mt-0.5 size-3.5 shrink-0" />
                      Updated {new Date(selected.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    Assisted drafts are internal working material until an authorized Lightworld representative reviews the scope, commercial terms and delivery commitments.
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
