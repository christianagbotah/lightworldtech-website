'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ProposalStatus = 'draft' | 'approved' | 'archived';

type ProposalDraft = {
  id: string;
  leadId: string;
  version: number;
  status: ProposalStatus;
  title: string;
  executiveSummary: string;
  problemStatement: string;
  proposedSolution: string;
  capabilities: string;
  phases: string;
  assumptions: string;
  exclusions: string;
  discoveryQuestions: string;
  nextSteps: string;
  commercialNotes: string;
  createdBy: string;
  approvedBy: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EditableProposal = Pick<
  ProposalDraft,
  | 'title'
  | 'executiveSummary'
  | 'problemStatement'
  | 'proposedSolution'
  | 'capabilities'
  | 'phases'
  | 'assumptions'
  | 'exclusions'
  | 'discoveryQuestions'
  | 'nextSteps'
  | 'commercialNotes'
>;

const textAreas: Array<{
  key: keyof EditableProposal;
  label: string;
  help: string;
  rows: number;
}> = [
  {
    key: 'executiveSummary',
    label: 'Executive summary',
    help: 'Concise context and proposed engagement framing.',
    rows: 5,
  },
  {
    key: 'problemStatement',
    label: 'Problem statement',
    help: 'Grounded in the original enquiry and CRM notes.',
    rows: 5,
  },
  {
    key: 'proposedSolution',
    label: 'Proposed solution',
    help: 'Working solution direction. Final modules and architecture remain subject to discovery.',
    rows: 6,
  },
  {
    key: 'capabilities',
    label: 'Relevant Lightworld capabilities',
    help: 'One capability per line. Generated from active CMS services when possible.',
    rows: 5,
  },
  {
    key: 'phases',
    label: 'Delivery approach',
    help: 'One phase per line. These are not committed delivery dates.',
    rows: 6,
  },
  {
    key: 'assumptions',
    label: 'Assumptions',
    help: 'Items that must be validated with the prospective client.',
    rows: 6,
  },
  {
    key: 'exclusions',
    label: 'Exclusions & boundaries',
    help: 'Important controls against accidental commercial or compliance commitments.',
    rows: 7,
  },
  {
    key: 'discoveryQuestions',
    label: 'Discovery questions',
    help: 'Questions to resolve before final scope and commercial terms.',
    rows: 8,
  },
  {
    key: 'nextSteps',
    label: 'Next steps',
    help: 'Internal and client-facing actions before issuing a proposal.',
    rows: 5,
  },
  {
    key: 'commercialNotes',
    label: 'Commercial terms & reviewer notes',
    help: 'Human-owned field for approved pricing, payment terms, commercial validity and timing assumptions.',
    rows: 6,
  },
];

function editable(proposal: ProposalDraft): EditableProposal {
  return {
    title: proposal.title,
    executiveSummary: proposal.executiveSummary,
    problemStatement: proposal.problemStatement,
    proposedSolution: proposal.proposedSolution,
    capabilities: proposal.capabilities,
    phases: proposal.phases,
    assumptions: proposal.assumptions,
    exclusions: proposal.exclusions,
    discoveryQuestions: proposal.discoveryQuestions,
    nextSteps: proposal.nextSteps,
    commercialNotes: proposal.commercialNotes,
  };
}

function proposalText(proposal: EditableProposal, version: number, status: ProposalStatus): string {
  const sections: Array<[string, string]> = [
    ['Executive summary', proposal.executiveSummary],
    ['Problem statement', proposal.problemStatement],
    ['Proposed solution', proposal.proposedSolution],
    ['Relevant capabilities', proposal.capabilities],
    ['Delivery approach', proposal.phases],
    ['Assumptions', proposal.assumptions],
    ['Exclusions & boundaries', proposal.exclusions],
    ['Discovery questions', proposal.discoveryQuestions],
    ['Next steps', proposal.nextSteps],
    ['Commercial terms & reviewer notes', proposal.commercialNotes],
  ];

  return [
    proposal.title,
    'Version ' + version + ' · ' + status.toUpperCase(),
    status === 'approved'
      ? 'Approved proposal version.'
      : 'DRAFT — HUMAN REVIEW REQUIRED. This is not a quotation, contract, price or delivery-date commitment.',
    '',
    ...sections.flatMap(([title, value]) => value.trim() ? [title.toUpperCase(), value.trim(), ''] : []),
  ].join('\n');
}

export default function AdminProposalPanel({ leadId }: { leadId: string }) {
  const [proposals, setProposals] = useState<ProposalDraft[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<EditableProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selected = useMemo(
    () => proposals.find((proposal) => proposal.id === selectedId) || null,
    [proposals, selectedId],
  );

  const load = async (preferredId?: string) => {
    try {
      const response = await fetch('/api/admin/leads/' + leadId + '/proposals', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not load proposal drafts');

      const items = (payload.data || []) as ProposalDraft[];
      setProposals(items);
      const id = preferredId || (selectedId && items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id || '');
      setSelectedId(id);
      const current = items.find((item) => item.id === id);
      setForm(current ? editable(current) : null);
      setDirty(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load proposal drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSelectedId('');
    setForm(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    if (!selected) return;
    setForm(editable(selected));
    setDirty(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setWorking(true);
    try {
      const response = await fetch('/api/admin/leads/' + leadId + '/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not generate proposal draft');
      toast.success('Proposal draft v' + payload.data.version + ' generated', {
        description: 'Review every section before approval or external issue.',
      });
      await load(payload.data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate proposal draft');
    } finally {
      setWorking(false);
    }
  };

  const save = async () => {
    if (!selected || !form) return;
    setWorking(true);
    try {
      const response = await fetch(
        '/api/admin/leads/' + leadId + '/proposals/' + selected.id,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not save proposal');
      toast.success('Proposal draft saved');
      await load(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save proposal');
    } finally {
      setWorking(false);
    }
  };

  const setStatus = async (status: ProposalStatus) => {
    if (!selected) return;
    if (dirty) {
      toast.error('Save your edits before changing approval status.');
      return;
    }

    setWorking(true);
    try {
      const response = await fetch(
        '/api/admin/leads/' + leadId + '/proposals/' + selected.id,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not update proposal status');

      toast.success(
        status === 'approved'
          ? 'Proposal approved by authenticated reviewer'
          : status === 'archived'
            ? 'Proposal archived'
            : 'Proposal returned to draft',
      );
      await load(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update proposal status');
    } finally {
      setWorking(false);
    }
  };

  const copy = async () => {
    if (!selected || !form) return;
    try {
      await navigator.clipboard.writeText(proposalText(form, selected.version, selected.status));
      toast.success('Proposal copied to clipboard');
    } catch {
      toast.error('Could not copy proposal');
    }
  };

  const print = () => {
    if (!selected) return;
    window.open('/api/admin/proposals/' + selected.id + '/print', '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <div className="rounded-2xl border border-border/60 p-5"><Loader2 className="size-5 animate-spin text-amber-500" /></div>;
  }

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">Proposal Assistant</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-amber-500" />
              Grounded proposal drafts
            </CardTitle>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Generates scope from this lead, CRM notes and active CMS services. Pricing, committed dates and contractual terms stay human-owned.
            </p>
          </div>
          <Button onClick={generate} disabled={working}>
            {working ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {proposals.length ? 'Generate new version' : 'Generate first draft'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {proposals.length === 0 || !selected || !form ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <FileText className="mx-auto size-7 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">No proposal draft yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generate a grounded internal draft after the lead has enough context for review.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                  aria-label="Proposal version"
                >
                  {proposals.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      Version {proposal.version} · {proposal.status}
                    </option>
                  ))}
                </select>
                <Badge
                  className={
                    selected.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : selected.status === 'archived'
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                  }
                >
                  {selected.status === 'approved' ? 'Approved' : selected.status === 'archived' ? 'Archived' : 'Draft · Human review required'}
                </Badge>
                {dirty && <Badge variant="outline">Unsaved changes</Badge>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copy}>
                  <ClipboardCopy className="mr-2 size-3.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={print}>
                  <ExternalLink className="mr-2 size-3.5" /> Print / PDF
                </Button>
                <Button size="sm" onClick={save} disabled={working || !dirty}>
                  <Save className="mr-2 size-3.5" /> Save
                </Button>
              </div>
            </div>

            {selected.status !== 'approved' && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold">Human approval required before external issue.</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This draft is not a quotation, contract, price commitment or delivery-date commitment. Review scope, assumptions, exclusions and commercial terms before approval.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={'proposal-title-' + selected.id}>Proposal title</Label>
              <Input
                id={'proposal-title-' + selected.id}
                value={form.title}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value });
                  setDirty(true);
                }}
              />
            </div>

            <div className="grid gap-5">
              {textAreas.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
                    <Label htmlFor={'proposal-' + field.key + '-' + selected.id}>{field.label}</Label>
                    <span className="text-[10px] text-muted-foreground">{field.help}</span>
                  </div>
                  <Textarea
                    id={'proposal-' + field.key + '-' + selected.id}
                    rows={field.rows}
                    value={form[field.key]}
                    onChange={(event) => {
                      setForm({ ...form, [field.key]: event.target.value });
                      setDirty(true);
                    }}
                    className={field.key === 'commercialNotes' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : ''}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                <p>Created by {selected.createdBy} · {new Date(selected.createdAt).toLocaleString()}</p>
                {selected.approvedAt && (
                  <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                    Approved by {selected.approvedBy || 'authorized reviewer'} · {new Date(selected.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.status !== 'draft' && (
                  <Button variant="outline" size="sm" disabled={working} onClick={() => void setStatus('draft')}>
                    <RefreshCw className="mr-2 size-3.5" /> Return to draft
                  </Button>
                )}
                {selected.status !== 'archived' && (
                  <Button variant="outline" size="sm" disabled={working} onClick={() => void setStatus('archived')}>
                    <Archive className="mr-2 size-3.5" /> Archive
                  </Button>
                )}
                {selected.status !== 'approved' && (
                  <Button
                    size="sm"
                    disabled={working || dirty}
                    onClick={() => void setStatus('approved')}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="mr-2 size-3.5" /> Approve reviewed version
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
