'use client';

import { useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Approval = {
  id: string;
  requestNumber: string;
  outflowType: 'vendor_payment' | 'customer_refund';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  counterpartyId: string;
  counterpartyName: string;
  sourceId: string;
  sourceReference: string;
  currency: string;
  amount: string;
  effectiveDate: string;
  method: string;
  reference: string;
  reason: string;
  requestedByAdminId: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedAt: string;
  decidedByAdminId: string;
  decidedByName: string;
  decidedByEmail: string;
  decidedAt: string | null;
  decisionNotes: string;
  resultId: string;
  resultNumber: string;
  allocations: Array<{ billId: string; amount: number }>;
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    createdAt: string;
  }>;
};

type CreditApproval = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentTermsDays: number;
  creditLimitCurrency: string;
  creditLimit: string;
  creditHold: boolean;
  creditHoldReason: string;
  requestedByAdminId: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedAt: string;
  decidedByName: string;
  decidedAt: string | null;
  decisionNotes: string;
  organization: {
    id: string;
    name: string;
  };
};

type Inbox = {
  policy: {
    enabled: boolean;
    requireSecondApprover: boolean;
  };
  canApprove: boolean;
  currentAdminId: string;
  approvals: Approval[];
  creditApprovals: CreditApproval[];
};

type Policy = {
  enabled: boolean;
  requireSecondApprover: boolean;
  eligibleApprovers: number;
  canManagePolicy: boolean;
  canApprove: boolean;
};

function money(value: string | number, currency = 'GHS') {
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return currency + ' ' + Number(value || 0).toFixed(2);
  }
}

function date(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function approvalAge(value: string) {
  const requested = new Date(value).getTime();
  const hours = Math.max(0, Math.floor((Date.now() - requested) / 3_600_000));
  return {
    hours,
    label: hours < 1 ? '<1h waiting' : hours < 48 ? hours + 'h waiting' : Math.floor(hours / 24) + 'd waiting',
  };
}

function statusTone(status: Approval['status']) {
  if (status === 'approved') return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (status === 'rejected') return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (status === 'cancelled') return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
}

async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const raw = await response.text();
  let payload: any = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload;
}

export default function FinanceOutflowApprovals() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [decision, setDecision] = useState<{
    approval: Approval;
    action: 'approve' | 'reject' | 'cancel';
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [creditDecision, setCreditDecision] = useState<{
    approval: CreditApproval;
    action: 'approve' | 'reject' | 'cancel';
  } | null>(null);
  const [creditNotes, setCreditNotes] = useState('');
  const [approvalProofFiles, setApprovalProofFiles] = useState<Record<string, File | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [inboxPayload, policyPayload] = await Promise.all([
        readJson('/api/admin/finance/approvals'),
        readJson('/api/admin/finance/approvals/policy'),
      ]);
      setInbox(inboxPayload.data as Inbox);
      setPolicy(policyPayload.data as Policy);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load finance approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePolicy = async (enabled: boolean) => {
    setWorking(true);
    try {
      await readJson('/api/admin/finance/approvals/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      toast.success(enabled ? 'Maker-checker approval enabled' : 'Maker-checker approval disabled');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update approval policy');
    } finally {
      setWorking(false);
    }
  };

  const uploadApprovalProof = async (approvalId: string) => {
    const file = approvalProofFiles[approvalId];
    if (!file) {
      toast.error('Choose a payment proof file');
      return;
    }
    setWorking(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await readJson('/api/admin/finance/approvals/' + encodeURIComponent(approvalId) + '/attachments', {
        method: 'POST',
        body: formData,
      });
      setApprovalProofFiles((current) => ({ ...current, [approvalId]: null }));
      toast.success('Payment proof added to approval request');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload payment proof');
    } finally {
      setWorking(false);
    }
  };

  const decide = async () => {
    if (!decision) return;
    setWorking(true);
    try {
      const payload = await readJson(
        '/api/admin/finance/approvals/' + encodeURIComponent(decision.approval.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: decision.action, notes }),
        },
      );
      if (decision.action === 'approve') {
        toast.success(
          'Outflow approved' +
          (payload?.data?.resultNumber ? ' · ' + payload.data.resultNumber : ''),
        );
      } else if (decision.action === 'reject') {
        toast.success('Outflow request rejected');
      } else {
        toast.success('Outflow request cancelled');
      }
      setDecision(null);
      setNotes('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to decide approval request');
    } finally {
      setWorking(false);
    }
  };

  const decideCredit = async () => {
    if (!creditDecision) return;
    setWorking(true);
    try {
      await readJson(
        '/api/admin/finance/credit-approvals/' + encodeURIComponent(creditDecision.approval.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: creditDecision.action, notes: creditNotes }),
        },
      );
      toast.success(
        creditDecision.action === 'approve'
          ? 'Customer credit policy approved and applied'
          : creditDecision.action === 'reject'
            ? 'Customer credit policy request rejected'
            : 'Customer credit policy request cancelled',
      );
      setCreditDecision(null);
      setCreditNotes('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to decide customer credit approval');
    } finally {
      setWorking(false);
    }
  };

  const approvals = inbox?.approvals || [];
  const pending = approvals.filter((item) => item.status === 'pending');
  const history = approvals.filter((item) => item.status !== 'pending');
  const creditApprovals = inbox?.creditApprovals || [];
  const pendingCredit = creditApprovals.filter((item) => item.status === 'pending');
  const creditHistory = creditApprovals.filter((item) => item.status !== 'pending');

  return (
    <div className="space-y-5">
      <Card className={policy?.enabled
        ? 'border-emerald-300/70 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'
        : 'border-amber-300/70 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10'}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/75">
                <ShieldCheck className={policy?.enabled ? 'size-5 text-emerald-700' : 'size-5 text-amber-700'} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Maker-checker cash-out approval</p>
                  <Badge className={policy?.enabled
                    ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}>
                    {policy?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                  When enabled, supplier payments and customer refunds are requested first and only post cash after approval by a different authorized administrator.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Eligible approvers: <strong className="text-foreground">{policy?.eligibleApprovers ?? 0}</strong>
                  {' · '}Second-person approval: <strong className="text-foreground">Required</strong>
                </p>
                {!policy?.enabled && (policy?.eligibleApprovers ?? 0) < 2 && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                    Assign Finance Approvals permission to at least two active administrators before enabling this control.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading || working}>
                <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
                Refresh
              </Button>
              {policy?.canManagePolicy && (
                <Button
                  type="button"
                  size="sm"
                  variant={policy.enabled ? 'outline' : 'default'}
                  disabled={working || (!policy.enabled && policy.eligibleApprovers < 2)}
                  onClick={() => void updatePolicy(!policy.enabled)}
                >
                  {policy.enabled ? 'Disable maker-checker' : 'Enable maker-checker'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Pending customer credit approvals</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Sensitive credit-limit, currency and hold changes require a different Finance approver before they take effect.
              </p>
            </div>
            <Badge variant="outline">{pendingCredit.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-pending-customer-credit-approvals" className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Payment terms</TableHead>
                  <TableHead>Credit status</TableHead>
                  <TableHead className="text-right">Credit limit</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCredit.map((approval) => {
                  const mine = approval.requestedByAdminId === inbox?.currentAdminId;
                  const canDecide = Boolean(inbox?.canApprove) && !mine;
                  return (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">{approval.organization.name}</TableCell>
                      <TableCell>
                        <p className="text-xs">{approval.requestedByName || 'Finance'}</p>
                        <p className="text-[10px] text-muted-foreground">{approval.requestedByEmail}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{date(approval.requestedAt)}</p>
                        {(() => {
                          const age = approvalAge(approval.requestedAt);
                          return (
                            <Badge
                              variant="outline"
                              className={
                                age.hours >= 48
                                  ? 'mt-1 border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                                  : age.hours >= 24
                                    ? 'mt-1 border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'
                                    : 'mt-1'
                              }
                            >
                              {age.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs">{approval.paymentTermsDays} days</TableCell>
                      <TableCell>
                        <Badge className={approval.creditHold ? 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200' : 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}>
                          {approval.creditHold ? 'Credit hold' : 'Credit active'}
                        </Badge>
                        {approval.creditHoldReason && <p className="mt-1 max-w-[260px] truncate text-[10px] text-muted-foreground">{approval.creditHoldReason}</p>}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{money(approval.creditLimit, approval.creditLimitCurrency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {canDecide && (
                            <>
                              <Button type="button" size="sm" onClick={() => { setCreditDecision({ approval, action: 'approve' }); setCreditNotes(''); }}>
                                <CheckCircle2 className="mr-1.5 size-3.5" /> Approve
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => { setCreditDecision({ approval, action: 'reject' }); setCreditNotes(''); }}>
                                <XCircle className="mr-1.5 size-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {mine && (
                            <Button type="button" size="sm" variant="outline" onClick={() => { setCreditDecision({ approval, action: 'cancel' }); setCreditNotes(''); }}>
                              <Ban className="mr-1.5 size-3.5" /> Cancel
                            </Button>
                          )}
                          {!mine && !canDecide && <span className="text-[10px] text-muted-foreground">Approval permission required</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!pendingCredit.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No sensitive customer credit changes are waiting for approval.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Pending cash-out approvals</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                A requester cannot approve or reject their own request. They may cancel it before another approver acts.
              </p>
            </div>
            <Badge variant="outline">{pending.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-pending-finance-approvals" className="min-w-[1280px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Counterparty / source</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Effective date</TableHead>
                  <TableHead>Method / reference</TableHead>
                  <TableHead>Payment proof</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((approval) => {
                  const mine = approval.requestedByAdminId === inbox?.currentAdminId;
                  const canDecide = Boolean(inbox?.canApprove) && !mine;
                  return (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold">{approval.requestNumber}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{date(approval.requestedAt)}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline">{pretty(approval.outflowType)}</Badge></TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{approval.counterpartyName}</p>
                        <p className="text-[10px] text-muted-foreground">{approval.sourceReference || 'No source reference'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{approval.requestedByName}</p>
                        <p className="text-[10px] text-muted-foreground">{approval.requestedByEmail}</p>
                      </TableCell>
                      <TableCell className="text-xs">{date(approval.effectiveDate)}</TableCell>
                      <TableCell>
                        <p className="text-xs">{pretty(approval.method)}</p>
                        <p className="text-[10px] text-muted-foreground">{approval.reference || 'No reference'}</p>
                      </TableCell>
                      <TableCell>
                        {approval.outflowType === 'vendor_payment' ? (
                          <div className="min-w-[210px] space-y-2">
                            {approval.attachments.length ? (
                              <div className="flex flex-col gap-1">
                                {approval.attachments.slice(0, 2).map((attachment) => (
                                  <button
                                    key={attachment.id}
                                    type="button"
                                    className="max-w-[190px] truncate text-left text-[10px] font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                                    onClick={() => window.open('/api/admin/finance/approval-attachments/' + attachment.id, '_blank', 'noopener,noreferrer')}
                                  >
                                    {attachment.originalName}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline">{proofRequired ? 'Proof required' : 'Proof optional'}</Badge>
                            )}
                            {approval.status === 'pending' && (
                              <div className="flex gap-1">
                                <Input
                                  type="file"
                                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                                  className="h-8 max-w-[140px] text-[10px]"
                                  onChange={(event) => setApprovalProofFiles((current) => ({ ...current, [approval.id]: event.target.files?.[0] || null }))}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-[10px]"
                                  disabled={working || !approvalProofFiles[approval.id]}
                                  onClick={() => void uploadApprovalProof(approval.id)}
                                >
                                  Add proof
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : <span className="text-[10px] text-muted-foreground">Not required</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{money(approval.amount, approval.currency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {canDecide && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={!proofReady}
                                title={!proofReady ? 'Attach payment proof before approval' : undefined}
                                onClick={() => { setDecision({ approval, action: 'approve' }); setNotes(''); }}
                              >
                                <CheckCircle2 className="mr-1.5 size-3.5" /> Approve
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => { setDecision({ approval, action: 'reject' }); setNotes(''); }}>
                                <XCircle className="mr-1.5 size-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {mine && (
                            <Button type="button" size="sm" variant="outline" onClick={() => { setDecision({ approval, action: 'cancel' }); setNotes(''); }}>
                              <Ban className="mr-1.5 size-3.5" /> Cancel
                            </Button>
                          )}
                          {!mine && !canDecide && (
                            <span className="text-[10px] text-muted-foreground">Approval permission required</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!pending.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      No supplier payments or customer refunds are waiting for approval.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Approval history</CardTitle>
            <Badge variant="outline">{history.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-finance-approval-history" className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type / counterparty</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-mono text-xs">{approval.requestNumber}</TableCell>
                    <TableCell><Badge className={statusTone(approval.status)}>{pretty(approval.status)}</Badge></TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{pretty(approval.outflowType)}</p>
                      <p className="text-[10px] text-muted-foreground">{approval.counterpartyName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{approval.requestedByName}</p>
                      <p className="text-[10px] text-muted-foreground">{date(approval.requestedAt)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{approval.decidedByName || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{date(approval.decidedAt)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{approval.resultNumber || '—'}</p>
                      {approval.decisionNotes && <p className="max-w-[260px] truncate text-[10px] text-muted-foreground">{approval.decisionNotes}</p>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{money(approval.amount, approval.currency)}</TableCell>
                  </TableRow>
                ))}
                {!history.length && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No approval history yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Customer credit approval history</CardTitle>
            <Badge variant="outline">{creditHistory.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-customer-credit-approval-history" className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Credit status</TableHead>
                  <TableHead className="text-right">Credit limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditHistory.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">{approval.organization.name}</TableCell>
                    <TableCell><Badge className={statusTone(approval.status)}>{pretty(approval.status)}</Badge></TableCell>
                    <TableCell>
                      <p className="text-xs">{approval.requestedByName || 'Finance'}</p>
                      <p className="text-[10px] text-muted-foreground">{date(approval.requestedAt)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{approval.decidedByName || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{date(approval.decidedAt)}</p>
                      {approval.decisionNotes && <p className="max-w-[260px] truncate text-[10px] text-muted-foreground">{approval.decisionNotes}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{approval.creditHold ? 'Credit hold' : 'Credit active'}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{money(approval.creditLimit, approval.creditLimitCurrency)}</TableCell>
                  </TableRow>
                ))}
                {!creditHistory.length && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No customer credit approval history yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(decision)} onOpenChange={(open) => !working && !open && setDecision(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === 'approve'
                ? 'Approve cash outflow?'
                : decision?.action === 'reject'
                  ? 'Reject cash outflow?'
                  : 'Cancel cash outflow request?'}
            </DialogTitle>
            <DialogDescription>
              {decision?.action === 'approve'
                ? 'Approval will execute the supplier payment or customer refund, update balances and post the cash journal.'
                : decision?.action === 'reject'
                  ? 'Rejection keeps cash unchanged and records this decision in the audit history.'
                  : 'Cancellation removes this pending request before another approver acts. Cash remains unchanged.'}
            </DialogDescription>
          </DialogHeader>

          {decision && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold">{decision.approval.requestNumber}</p>
                  <p className="mt-1 text-sm">{decision.approval.counterpartyName}</p>
                </div>
                <p className="font-bold">{money(decision.approval.amount, decision.approval.currency)}</p>
              </div>
            </div>
          )}

          <div>
            <Label>Decision notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={decision?.action === 'reject' ? 'Reason for rejection…' : 'Optional approval/cancellation note…'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDecision(null)} disabled={working}>Back</Button>
            <Button
              type="button"
              variant={decision?.action === 'reject' || decision?.action === 'cancel' ? 'outline' : 'default'}
              onClick={() => void decide()}
              disabled={working || (decision?.action === 'reject' && !notes.trim())}
            >
              {working && <Loader2 className="mr-2 size-4 animate-spin" />}
              {decision?.action === 'approve' ? <UserCheck className="mr-2 size-4" /> : null}
              {decision?.action ? pretty(decision.action) : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(creditDecision)} onOpenChange={(open) => !working && !open && setCreditDecision(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creditDecision?.action === 'approve'
                ? 'Approve customer credit policy?'
                : creditDecision?.action === 'reject'
                  ? 'Reject customer credit policy?'
                  : 'Cancel customer credit policy request?'}
            </DialogTitle>
            <DialogDescription>
              {creditDecision?.action === 'approve'
                ? 'Approval applies the proposed credit limit, currency and hold state to the customer account.'
                : creditDecision?.action === 'reject'
                  ? 'Rejection leaves the current customer credit controls unchanged and records the decision.'
                  : 'Cancellation withdraws this pending request before another Finance approver acts.'}
            </DialogDescription>
          </DialogHeader>

          {creditDecision && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-sm font-semibold">{creditDecision.approval.organization.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{creditDecision.approval.paymentTermsDays} day terms</span>
                <span>·</span>
                <span>{money(creditDecision.approval.creditLimit, creditDecision.approval.creditLimitCurrency)}</span>
                <span>·</span>
                <span>{creditDecision.approval.creditHold ? 'Credit hold' : 'Credit active'}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Decision notes</Label>
            <Textarea
              rows={3}
              value={creditNotes}
              onChange={(event) => setCreditNotes(event.target.value)}
              placeholder={creditDecision?.action === 'reject' ? 'Reason for rejection…' : 'Optional approval/cancellation note…'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreditDecision(null)} disabled={working}>Back</Button>
            <Button
              type="button"
              variant={creditDecision?.action === 'reject' || creditDecision?.action === 'cancel' ? 'outline' : 'default'}
              onClick={() => void decideCredit()}
              disabled={working || (creditDecision?.action === 'reject' && !creditNotes.trim())}
            >
              {working && <Loader2 className="mr-2 size-4 animate-spin" />}
              {creditDecision?.action === 'approve' ? <UserCheck className="mr-2 size-4" /> : null}
              {creditDecision?.action ? pretty(creditDecision.action) : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}