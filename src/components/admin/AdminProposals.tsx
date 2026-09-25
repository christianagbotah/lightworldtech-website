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
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';

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
  readiness: {
    level: 'blocked' | 'review' | 'ready';
    readyForApproval: boolean;
    blockers: string[];
    warnings: string[];
    recommendedAction: string;
    controls: string;
  };
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
  const { navigate, adminRole, adminPermissions } = useAppStore();
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
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [activationLinks, setActivationLinks] = useState<Record<string, string>>({});
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    organizationName: '',
    projectName: '',
    manager: '',
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: '',
    expiryDate: '',
    nextRenewalDate: '',
    renewalCycle: 'annual',
    renewalCurrency: 'GHS',
    renewalAmount: '',
    budgetCurrency: 'GHS',
    budgetAmount: '',
    autoRenew: false,
    renewalNoticeDays: '30',
    renewalNotes: '',
  });

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
    await patchProposal({ regenerateDraft: true }, 'Proposal regenerated as a new draft version');
  };

  const openConversion = () => {
    if (!selected) return;
    setConversionForm({
      organizationName: selected.lead.contactMessage.name,
      projectName: selected.title,
      manager: '',
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: '',
      expiryDate: '',
      nextRenewalDate: '',
      renewalCycle: 'annual',
      renewalCurrency: 'GHS',
      renewalAmount: '',
      budgetCurrency: 'GHS',
      budgetAmount: '',
      autoRenew: false,
      renewalNoticeDays: '30',
      renewalNotes: selected.commercialNotes || '',
    });
    setConversionOpen(true);
  };

  const convertAcceptedProposal = async () => {
    if (!canManageClients || !selected || selected.status !== 'accepted') return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/proposals/' + selected.id + '/convert-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...conversionForm,
          renewalAmount: Number(conversionForm.renewalAmount || 0),
          budgetAmount: Number(conversionForm.budgetAmount || 0),
          renewalNoticeDays: Number(conversionForm.renewalNoticeDays || 30),
        }),
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
      setConversionOpen(false);
      await fetchData();
      toast.success(payload?.created ? 'Client workspace created with commercial terms' : 'Client workspace already exists');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create client workspace');
    } finally {
      setSaving(false);
    }
  };

  const openProspectReply = (messageId: string) => {
    sessionStorage.setItem('lw-reply-message-id', messageId);
    setSelected(null);
    navigate('admin-messages');
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
      <AdminPageHeader
        eyebrow="Proposal & discovery workspace"
        title="Human-reviewed proposal drafts"
        description="Turn qualified CRM enquiries into structured discovery and solution proposals. Assisted content never creates pricing or binding delivery commitments."
        actions={
          <Button variant="outline" onClick={() => void fetchData()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
        }
      />

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
            className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
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
          className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
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
              <div className="flex flex-col items-end gap-1">
                <Badge className={statusClass(proposal.status)}>
                  {statuses.find((item) => item.id === proposal.status)?.label || proposal.status}
                </Badge>
                <Badge variant="outline" className={proposal.readiness.level === 'blocked' ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300' : proposal.readiness.level === 'review' ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300' : 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300'}>
                  {proposal.readiness.level}
                </Badge>
              </div>
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
                      disabled={['sent', 'accepted'].includes(selected.status)}
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
                        disabled={['sent', 'accepted'].includes(selected.status)}
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
                        disabled={['sent', 'accepted'].includes(selected.status)}
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
                  <div className="rounded-xl border border-border/60 bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">Proposal readiness</p>
                      <Badge variant="outline" className={selected.readiness.level === 'blocked' ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300' : selected.readiness.level === 'review' ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300' : 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300'}>
                        {selected.readiness.level}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{selected.readiness.recommendedAction}</p>
                    {selected.readiness.blockers.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700 dark:text-rose-300">Approval blockers</p>
                        <ul className="mt-1 space-y-1 text-[10px] text-muted-foreground">
                          {selected.readiness.blockers.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                    )}
                    {selected.readiness.warnings.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">Qualification warnings</p>
                        <ul className="mt-1 space-y-1 text-[10px] text-muted-foreground">
                          {selected.readiness.warnings.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="mt-3 border-t border-border/60 pt-2 text-[9px] leading-4 text-muted-foreground">{selected.readiness.controls}</p>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
                      value={selected.status}
                      onChange={(event) => void patchProposal({ status: event.target.value }, 'Proposal status updated')}
                    >
                      {statuses.map((status) => (
                        <option
                          key={status.id}
                          value={status.id}
                          disabled={
                            (status.id === 'ready' && !selected.readiness.readyForApproval)
                            || (status.id === 'sent' && !selected.approvedAt)
                            || (status.id === 'accepted' && !selected.sentAt)
                          }
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                      “Ready” records the approving admin. “Sent” records the first sent timestamp.
                    </p>
                  </div>

                  <Button variant="outline" className="w-full" disabled={saving || ['sent', 'accepted'].includes(selected.status)} onClick={() => setRegenerateConfirmOpen(true)}>
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
                    <Button className="w-full" disabled={saving} onClick={openConversion}>
                      <Building2 className="mr-2 size-4" /> Review & create client workspace
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
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center gap-2 text-left text-xs text-amber-700 hover:underline dark:text-amber-300"
                      onClick={() => openProspectReply(selected.lead.contactMessage.id)}
                    >
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{selected.lead.contactMessage.email}</span>
                      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em]">Reply internally</span>
                    </button>
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
      <Dialog open={conversionOpen} onOpenChange={(open) => !saving && setConversionOpen(open)}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Accepted proposal → client & project handoff</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void convertAcceptedProposal();
            }}
          >
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
              Review these commercial fields before conversion. Nothing here is inferred as a binding commitment from the assisted proposal text.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Client / organization name</Label><Input required value={conversionForm.organizationName} onChange={(e) => setConversionForm({ ...conversionForm, organizationName: e.target.value })} /></div>
              <div><Label>Project name</Label><Input required value={conversionForm.projectName} onChange={(e) => setConversionForm({ ...conversionForm, projectName: e.target.value })} /></div>
              <div><Label>Project manager</Label><Input value={conversionForm.manager} onChange={(e) => setConversionForm({ ...conversionForm, manager: e.target.value })} /></div>
              <div><Label>Start date</Label><Input type="date" value={conversionForm.startDate} onChange={(e) => setConversionForm({ ...conversionForm, startDate: e.target.value })} /></div>
              <div><Label>Target date</Label><Input type="date" value={conversionForm.targetDate} onChange={(e) => setConversionForm({ ...conversionForm, targetDate: e.target.value })} /></div>
              <div><Label>Project expiry date</Label><Input type="date" value={conversionForm.expiryDate} onChange={(e) => setConversionForm({ ...conversionForm, expiryDate: e.target.value })} /></div>
              <div><Label>Next renewal date</Label><Input type="date" value={conversionForm.nextRenewalDate} onChange={(e) => setConversionForm({ ...conversionForm, nextRenewalDate: e.target.value })} /></div>
              <div><Label>Renewal cycle</Label><select value={conversionForm.renewalCycle} onChange={(e) => setConversionForm({ ...conversionForm, renewalCycle: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semiannual">Semiannual</option><option value="annual">Annual</option><option value="one_time">One-time</option><option value="custom">Custom</option></select></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><Label>Budget CCY</Label><Input maxLength={3} value={conversionForm.budgetCurrency} onChange={(e) => setConversionForm({ ...conversionForm, budgetCurrency: e.target.value.toUpperCase() })} /></div>
              <div><Label>Project budget</Label><Input type="number" min="0" step="0.01" value={conversionForm.budgetAmount} onChange={(e) => setConversionForm({ ...conversionForm, budgetAmount: e.target.value })} /></div>
              <div><Label>Renewal CCY</Label><Input maxLength={3} value={conversionForm.renewalCurrency} onChange={(e) => setConversionForm({ ...conversionForm, renewalCurrency: e.target.value.toUpperCase() })} /></div>
              <div><Label>Renewal amount</Label><Input type="number" min="0" step="0.01" value={conversionForm.renewalAmount} onChange={(e) => setConversionForm({ ...conversionForm, renewalAmount: e.target.value })} /></div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={conversionForm.autoRenew} onChange={(e) => setConversionForm({ ...conversionForm, autoRenew: e.target.checked })} /> Auto-renew flag</label>
              <div className="sm:ml-auto"><Label>Renewal notice days</Label><Input type="number" min="0" max="365" className="mt-1 w-28" value={conversionForm.renewalNoticeDays} onChange={(e) => setConversionForm({ ...conversionForm, renewalNoticeDays: e.target.value })} /></div>
            </div>

            <div><Label>Commercial / renewal notes</Label><Textarea rows={4} value={conversionForm.renewalNotes} onChange={(e) => setConversionForm({ ...conversionForm, renewalNotes: e.target.value })} /></div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConversionOpen(false)} disabled={saving}>Cancel</Button>
              <Button disabled={saving}>{saving ? 'Creating…' : 'Create client & project'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        tone="warning"
        title="Regenerate assisted proposal?"
        description="This replaces the title, executive summary, solution, scope, deliverables, assumptions, timeline, commercial notes and next steps from the current CRM lead. The proposal will return to Draft as a new version."
        confirmLabel="Regenerate draft"
        onConfirm={regenerate}
      />
    </div>
  );
}
