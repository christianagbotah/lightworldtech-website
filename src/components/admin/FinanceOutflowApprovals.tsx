'use client';

import { useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  PlayCircle,
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
  outflowType: 'vendor_payment' | 'customer_refund' | 'direct_expense_payment';
  status: 'pending' | 'scheduled' | 'approved' | 'rejected' | 'cancelled';
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

type ReceiptApproval = {
  id: string;
  requestNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  organizationId: string;
  currency: string;
  amount: string;
  paidAt: string;
  method: string;
  reference: string;
  notes: string;
  requestedByAdminId: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedAt: string;
  decidedByAdminId: string;
  decidedByName: string;
  decidedByEmail: string;
  decidedAt: string | null;
  decisionNotes: string;
  resultPaymentId: string;
  resultReceiptNumber: string;
  allocations: Array<{ invoiceId: string; amount: number }>;
  organization: { id: string; name: string };
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

type InvoiceDraftApproval = {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  projectId: string | null;
  agreementId: string | null;
  billingMilestoneId: string | null;
  currency: string;
  total: string;
  issueDate: string;
  dueDate: string;
  createdByAdminId: string;
  createdBy: string;
  createdAt: string;
  makerCanIssue: boolean;
  organization: { id: string; name: string };
  project: { id: string; name: string } | null;
  agreement: { id: string; title: string; referenceNumber: string } | null;
  billingMilestone: { id: string; title: string } | null;
};

type CreditNoteDraftApproval = {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  issueDate: string;
  reason: string;
  createdByAdminId: string;
  createdBy: string;
  createdAt: string;
  mine: boolean;
  makerCanApprove: boolean;
  organization: { id: string; name: string };
  invoice: { id: string; invoiceNumber: string; status: string };
};

type SupplierBillDraftApproval = {
  id: string;
  payableNumber: string;
  vendorId: string;
  vendorReference: string;
  category: string;
  currency: string;
  taxableAmount: string;
  total: string;
  issueDate: string;
  dueDate: string;
  purchaseOrderId: string | null;
  createdByAdminId: string;
  createdBy: string;
  createdAt: string;
  mine: boolean;
  makerCanApprove: boolean;
  evidenceAttached: boolean;
  vendor: { id: string; name: string };
  purchaseOrder: { id: string; poNumber: string } | null;
  attachments: Array<{ id: string; originalName: string; createdAt: string }>;
};

type RejectedInvoiceDraft = {
  id: string;
  invoiceNumber: string;
  currency: string;
  total: string;
  createdByAdminId: string;
  createdBy: string;
  createdAt: string;
  rejectedByAdminId: string;
  rejectedBy: string;
  rejectedAt: string;
  rejectionReason: string;
  mine: boolean;
  organization: { id: string; name: string };
  project: { id: string; name: string } | null;
  agreement: { id: string; title: string; referenceNumber: string } | null;
  billingMilestone: { id: string; title: string } | null;
};

type Inbox = {
  policy: {
    enabled: boolean;
    requireSecondApprover: boolean;
  };
  canApprove: boolean;
  currentAdminId: string;
  approvals: Approval[];
  receiptApprovals: ReceiptApproval[];
  creditApprovals: CreditApproval[];
  invoiceDrafts: InvoiceDraftApproval[];
  rejectedInvoiceDrafts: RejectedInvoiceDraft[];
  creditNoteDrafts: CreditNoteDraftApproval[];
  supplierBillDrafts: SupplierBillDraftApproval[];
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
  if (status === 'scheduled') return 'border-0 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200';
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

export default function FinanceOutflowApprovals({
  onOpenInvoice,
  onOpenBill,
  onPrepareReplacement,
}: {
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenBill?: (billId: string) => void;
  onPrepareReplacement?: (invoiceId: string) => void;
}) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [decision, setDecision] = useState<{
    approval: Approval;
    action: 'approve' | 'reject' | 'cancel' | 'execute';
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [receiptDecision, setReceiptDecision] = useState<{
    approval: ReceiptApproval;
    action: 'approve' | 'reject' | 'cancel';
  } | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [creditDecision, setCreditDecision] = useState<{
    approval: CreditApproval;
    action: 'approve' | 'reject' | 'cancel' | 'execute';
  } | null>(null);
  const [creditNotes, setCreditNotes] = useState('');
  const [invoiceReject, setInvoiceReject] = useState<InvoiceDraftApproval | null>(null);
  const [invoiceRejectReason, setInvoiceRejectReason] = useState('');
  const [creditNoteReject, setCreditNoteReject] = useState<CreditNoteDraftApproval | null>(null);
  const [creditNoteRejectReason, setCreditNoteRejectReason] = useState('');
  const [supplierBillReject, setSupplierBillReject] = useState<SupplierBillDraftApproval | null>(null);
  const [supplierBillRejectReason, setSupplierBillRejectReason] = useState('');
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
          payload?.scheduled
            ? 'Outflow approved and scheduled for ' + new Date(decision.approval.effectiveDate).toLocaleDateString()
            : 'Outflow approved' + (payload?.data?.resultNumber ? ' · ' + payload.data.resultNumber : ''),
        );
      } else if (decision.action === 'execute') {
        toast.success('Scheduled outflow executed' + (payload?.data?.resultNumber ? ' · ' + payload.data.resultNumber : ''));
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

  const decideReceipt = async () => {
    if (!receiptDecision) return;
    setWorking(true);
    try {
      const payload = await readJson(
        '/api/admin/finance/receipt-approvals/' + encodeURIComponent(receiptDecision.approval.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: receiptDecision.action, notes: receiptNotes }),
        },
      );
      toast.success(
        receiptDecision.action === 'approve'
          ? 'Customer receipt approved and posted' + (payload?.data?.payment?.paymentNumber ? ' · ' + payload.data.payment.paymentNumber : '')
          : receiptDecision.action === 'reject'
            ? 'Customer receipt request rejected'
            : 'Customer receipt request cancelled',
      );
      setReceiptDecision(null);
      setReceiptNotes('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to decide customer receipt request');
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

  const rejectInvoiceDraft = async () => {
    if (!invoiceReject) return;
    const reason = invoiceRejectReason.trim();
    if (reason.length < 3) {
      toast.error('Enter a clear rejection reason');
      return;
    }

    setWorking(true);
    try {
      await readJson(
        '/api/admin/finance/invoices/' + encodeURIComponent(invoiceReject.id) + '/reject',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
      toast.success('Invoice draft rejected. A corrected replacement can now be prepared.');
      setInvoiceReject(null);
      setInvoiceRejectReason('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reject invoice draft');
    } finally {
      setWorking(false);
    }
  };

  const postCreditNoteDraft = async (note: CreditNoteDraftApproval) => {
    setWorking(true);
    try {
      await readJson('/api/admin/finance/credit-notes/' + encodeURIComponent(note.id) + '/post', {
        method: 'POST',
      });
      toast.success('Credit note posted and customer balance updated');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to post credit note');
    } finally {
      setWorking(false);
    }
  };

  const rejectCreditNoteDraft = async () => {
    if (!creditNoteReject) return;
    const reason = creditNoteRejectReason.trim();
    if (reason.length < 3) {
      toast.error('Enter a clear rejection reason');
      return;
    }
    setWorking(true);
    try {
      await readJson('/api/admin/finance/credit-notes/' + encodeURIComponent(creditNoteReject.id) + '/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      toast.success('Credit note draft rejected without changing the customer balance');
      setCreditNoteReject(null);
      setCreditNoteRejectReason('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reject credit note draft');
    } finally {
      setWorking(false);
    }
  };

  const postSupplierBillDraft = async (bill: SupplierBillDraftApproval) => {
    setWorking(true);
    try {
      await readJson('/api/admin/finance/bills/' + encodeURIComponent(bill.id) + '/post', {
        method: 'POST',
      });
      toast.success('Supplier bill approved, posted and added to payables');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to post supplier bill');
    } finally {
      setWorking(false);
    }
  };

  const rejectSupplierBillDraft = async () => {
    if (!supplierBillReject) return;
    const reason = supplierBillRejectReason.trim();
    if (reason.length < 3) {
      toast.error('Enter a clear rejection reason');
      return;
    }
    setWorking(true);
    try {
      await readJson('/api/admin/finance/bills/' + encodeURIComponent(supplierBillReject.id) + '/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      toast.success('Supplier bill draft rejected without posting a payable');
      setSupplierBillReject(null);
      setSupplierBillRejectReason('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reject supplier bill');
    } finally {
      setWorking(false);
    }
  };

  const approvals = inbox?.approvals || [];
  const pending = approvals.filter((item) => item.status === 'pending');
  const scheduled = approvals.filter((item) => item.status === 'scheduled');
  const history = approvals.filter((item) => !['pending', 'scheduled'].includes(item.status));
  const receiptApprovals = inbox?.receiptApprovals || [];
  const pendingReceipts = receiptApprovals.filter((item) => item.status === 'pending');
  const receiptHistory = receiptApprovals.filter((item) => item.status !== 'pending');
  const invoiceDrafts = inbox?.invoiceDrafts || [];
  const rejectedInvoiceDrafts = inbox?.rejectedInvoiceDrafts || [];
  const creditNoteDrafts = inbox?.creditNoteDrafts || [];
  const supplierBillDrafts = inbox?.supplierBillDrafts || [];
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
                  <p className="font-semibold">Finance maker-checker approval</p>
                  <Badge className={policy?.enabled
                    ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}>
                    {policy?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                  When enabled, invoice, credit-note and supplier-bill drafts require a different authorized approver before posting; manual customer receipts, supplier payments and customer refunds only post cash after second-person approval.
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Pending customer receipt approvals</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Manual cash-in remains unposted until a different Finance approver revalidates the customer, currency and invoice allocations.
              </p>
            </div>
            <Badge variant="outline">{pendingReceipts.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-pending-customer-receipt-approvals" className="min-w-[1080px]">
              <TableHeader><TableRow>
                <TableHead>Request</TableHead><TableHead>Customer</TableHead><TableHead>Requested by</TableHead>
                <TableHead>Paid / method</TableHead><TableHead>Allocations</TableHead><TableHead>Age</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pendingReceipts.map((approval) => {
                  const mine = approval.requestedByAdminId === inbox?.currentAdminId;
                  const canDecide = Boolean(inbox?.canApprove) && !mine;
                  const age = approvalAge(approval.requestedAt);
                  return (
                    <TableRow key={approval.id}>
                      <TableCell><p className="font-mono text-xs font-semibold">{approval.requestNumber}</p><p className="mt-1 text-[10px] text-muted-foreground">{date(approval.requestedAt)}</p></TableCell>
                      <TableCell><p className="text-xs font-medium">{approval.organization.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{approval.reference || 'No external reference'}</p></TableCell>
                      <TableCell><p className="text-xs">{approval.requestedByName || 'Finance'}</p>{mine && <Badge variant="outline" className="mt-1">Requested by you</Badge>}</TableCell>
                      <TableCell><p className="text-xs">{date(approval.paidAt)}</p><p className="mt-1 text-[10px] text-muted-foreground">{pretty(approval.method)}</p></TableCell>
                      <TableCell><p className="text-xs">{approval.allocations.length} invoice{approval.allocations.length === 1 ? '' : 's'}</p><p className="mt-1 text-[10px] text-muted-foreground">{approval.allocations.length ? 'Revalidated at approval' : 'Unallocated customer credit'}</p></TableCell>
                      <TableCell><Badge variant="outline" className={age.hours >= 48 ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300' : age.hours >= 24 ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300' : ''}>{age.label}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{money(approval.amount, approval.currency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {canDecide && <>
                            <Button type="button" size="sm" onClick={() => { setReceiptDecision({ approval, action: 'approve' }); setReceiptNotes(''); }}><CheckCircle2 className="mr-1.5 size-3.5" /> Approve</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => { setReceiptDecision({ approval, action: 'reject' }); setReceiptNotes(''); }}><XCircle className="mr-1.5 size-3.5" /> Reject</Button>
                          </>}
                          {mine && <Button type="button" size="sm" variant="outline" onClick={() => { setReceiptDecision({ approval, action: 'cancel' }); setReceiptNotes(''); }}><Ban className="mr-1.5 size-3.5" /> Cancel</Button>}
                          {!mine && !canDecide && <span className="text-[10px] text-muted-foreground">Approval permission required</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!pendingReceipts.length && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No manual customer receipts are waiting for approval.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Pending supplier bill approvals</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Draft supplier bills stay out of payables, tax reporting and the ledger until a different authorized approver posts them. Supplier invoice evidence is required before posting.
              </p>
            </div>
            <Badge variant="outline">{supplierBillDrafts.length} draft{supplierBillDrafts.length === 1 ? '' : 's'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-pending-supplier-bill-approvals" className="min-w-[1180px]">
              <TableHeader><TableRow>
                <TableHead>Bill</TableHead><TableHead>Supplier / PO</TableHead><TableHead>Prepared by</TableHead><TableHead>Evidence</TableHead><TableHead>Age</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {supplierBillDrafts.map((bill) => {
                  const canDecide = Boolean(inbox?.canApprove) && bill.makerCanApprove;
                  const age = approvalAge(bill.createdAt);
                  return (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <button type="button" className="text-left" onClick={() => onOpenBill?.(bill.id)}>
                          <p className="font-mono text-xs font-semibold hover:underline">{bill.payableNumber}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{date(bill.issueDate)}</p>
                        </button>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{bill.vendor.name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{bill.purchaseOrder?.poNumber ? 'PO ' + bill.purchaseOrder.poNumber : 'No linked purchase order'}{bill.vendorReference ? ' · Ref ' + bill.vendorReference : ''}</p>
                      </TableCell>
                      <TableCell><p className="text-xs">{bill.createdBy || 'Finance'}</p>{bill.mine && <Badge variant="outline" className="mt-1">Prepared by you</Badge>}</TableCell>
                      <TableCell>
                        <Badge className={bill.evidenceAttached ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}>
                          {bill.evidenceAttached ? 'Attached' : 'Required'}
                        </Badge>
                        {bill.attachments[0]?.originalName && <p className="mt-1 max-w-[180px] truncate text-[10px] text-muted-foreground">{bill.attachments[0].originalName}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{age.label}</Badge></TableCell>
                      <TableCell className="text-xs">{date(bill.dueDate)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(bill.total, bill.currency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => onOpenBill?.(bill.id)}><FileText className="mr-1.5 size-3.5" /> Open bill</Button>
                          {canDecide && (
                            <>
                              <Button type="button" size="sm" disabled={working || !bill.evidenceAttached} title={!bill.evidenceAttached ? 'Attach supplier invoice evidence before posting' : undefined} onClick={() => void postSupplierBillDraft(bill)}>
                                <CheckCircle2 className="mr-1.5 size-3.5" /> Post
                              </Button>
                              <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => { setSupplierBillReject(bill); setSupplierBillRejectReason(''); }}>
                                <XCircle className="mr-1.5 size-3.5" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                        {!canDecide && <p className="mt-1 text-[10px] text-muted-foreground">{bill.mine && policy?.enabled ? 'A different approver must decide this draft.' : 'Finance Approvals permission required.'}</p>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!supplierBillDrafts.length && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No supplier bill drafts are waiting for approval.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Pending invoice approvals</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Review saved invoice drafts before issuance. When maker-checker is enabled, the preparer cannot issue their own draft.
              </p>
            </div>
            <Badge variant="outline">{invoiceDrafts.length} draft{invoiceDrafts.length === 1 ? '' : 's'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-pending-invoice-approvals" className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer / context</TableHead>
                  <TableHead>Prepared by</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceDrafts.map((invoice) => {
                  const mine = invoice.createdByAdminId === inbox?.currentAdminId;
                  const canIssue = Boolean(inbox?.canApprove) && invoice.makerCanIssue;
                  const canReject = Boolean(inbox?.canApprove) && (!policy?.enabled || !mine);
                  const age = approvalAge(invoice.createdAt);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold">{invoice.invoiceNumber}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{date(invoice.issueDate)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{invoice.organization.name}</p>
                        <p className="mt-1 max-w-[320px] truncate text-[10px] text-muted-foreground">
                          {invoice.billingMilestone?.title
                            ? 'Milestone: ' + invoice.billingMilestone.title
                            : invoice.agreement?.title
                              ? 'Agreement: ' + invoice.agreement.title + (invoice.agreement.referenceNumber ? ' · ' + invoice.agreement.referenceNumber : '')
                              : invoice.project?.name
                                ? 'Project: ' + invoice.project.name
                                : 'General account invoice'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{invoice.createdBy || 'Finance'}</p>
                        {mine && <Badge variant="outline" className="mt-1">Prepared by you</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            age.hours >= 48
                              ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                              : age.hours >= 24
                                ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'
                                : ''
                          }
                        >
                          {age.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{date(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(invoice.total, invoice.currency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={canIssue ? 'default' : 'outline'}
                            onClick={() => onOpenInvoice?.(invoice.id)}
                          >
                            <FileText className="mr-1.5 size-3.5" /> Review invoice
                          </Button>
                          {canReject && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setInvoiceReject(invoice);
                                setInvoiceRejectReason('');
                              }}
                            >
                              <XCircle className="mr-1.5 size-3.5" /> Reject draft
                            </Button>
                          )}
                        </div>
                        {policy?.enabled && mine && (
                          <p className="mt-1 text-[10px] text-muted-foreground">A different approver must issue this draft.</p>
                        )}
                        {policy?.enabled && !mine && !inbox?.canApprove && (
                          <p className="mt-1 text-[10px] text-muted-foreground">Finance Approvals permission required to issue.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!invoiceDrafts.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No invoice drafts are waiting for review or issuance.
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Rejected invoice drafts</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Rejected drafts are void and cannot issue later. The recorded reason remains attached for audit and replacement billing.
              </p>
            </div>
            <Badge variant="outline">{rejectedInvoiceDrafts.length} rejected</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-rejected-invoice-drafts" className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer / context</TableHead>
                  <TableHead>Prepared by</TableHead>
                  <TableHead>Rejected by</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead data-export-ignore className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedInvoiceDrafts.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => onOpenInvoice?.(invoice.id)}>
                        <p className="font-mono text-xs font-semibold hover:underline">{invoice.invoiceNumber}</p>
                        {invoice.mine && <Badge variant="outline" className="mt-1">Prepared by you</Badge>}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{invoice.organization.name}</p>
                      <p className="mt-1 max-w-[300px] truncate text-[10px] text-muted-foreground">
                        {invoice.billingMilestone?.title
                          ? 'Milestone: ' + invoice.billingMilestone.title
                          : invoice.agreement?.title
                            ? 'Agreement: ' + invoice.agreement.title + (invoice.agreement.referenceNumber ? ' · ' + invoice.agreement.referenceNumber : '')
                            : invoice.project?.name
                              ? 'Project: ' + invoice.project.name
                              : 'General account invoice'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{invoice.createdBy || 'Finance'}</TableCell>
                    <TableCell className="text-xs">{invoice.rejectedBy || 'Finance approver'}</TableCell>
                    <TableCell className="text-xs">{date(invoice.rejectedAt)}</TableCell>
                    <TableCell>
                      <p className="max-w-[360px] whitespace-pre-wrap text-xs text-rose-700 dark:text-rose-300">{invoice.rejectionReason}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{money(invoice.total, invoice.currency)}</TableCell>
                    <TableCell data-export-ignore className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onPrepareReplacement?.(invoice.id)}
                      >
                        <RefreshCw className="mr-1.5 size-3.5" /> Prepare replacement
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!rejectedInvoiceDrafts.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No invoice draft rejection history yet.
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Pending credit-note approvals</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Draft credit notes have no ledger, receivable or customer-credit effect until a different authorized approver posts them.
              </p>
            </div>
            <Badge variant="outline">{creditNoteDrafts.length} draft{creditNoteDrafts.length === 1 ? '' : 's'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-pending-credit-note-approvals" className="min-w-[980px]">
              <TableHeader><TableRow>
                <TableHead>Credit note</TableHead><TableHead>Customer / invoice</TableHead><TableHead>Prepared by</TableHead>
                <TableHead>Reason</TableHead><TableHead>Age</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {creditNoteDrafts.map((note) => {
                  const canDecide = Boolean(inbox?.canApprove) && note.makerCanApprove;
                  const age = approvalAge(note.createdAt);
                  return (
                    <TableRow key={note.id}>
                      <TableCell><p className="font-mono text-xs font-semibold">{note.creditNoteNumber}</p><p className="mt-1 text-[10px] text-muted-foreground">{date(note.issueDate)}</p></TableCell>
                      <TableCell><p className="text-xs font-medium">{note.organization.name}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{note.invoice.invoiceNumber}</p></TableCell>
                      <TableCell><p className="text-xs">{note.createdBy || 'Finance'}</p>{note.mine && <Badge variant="outline" className="mt-1">Prepared by you</Badge>}</TableCell>
                      <TableCell><p className="max-w-[280px] whitespace-pre-wrap text-xs">{note.reason}</p></TableCell>
                      <TableCell><Badge variant="outline">{age.label}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{money(note.total, note.currency)}</TableCell>
                      <TableCell className="text-right">
                        {canDecide ? <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" disabled={working} onClick={() => void postCreditNoteDraft(note)}><CheckCircle2 className="mr-1.5 size-3.5" /> Post</Button>
                          <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => { setCreditNoteReject(note); setCreditNoteRejectReason(''); }}><XCircle className="mr-1.5 size-3.5" /> Reject</Button>
                        </div> : <p className="text-[10px] text-muted-foreground">{note.mine && policy?.enabled ? 'A different approver must decide this draft.' : 'Finance Approvals permission required.'}</p>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!creditNoteDrafts.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No credit-note drafts are waiting for approval.</TableCell></TableRow>}
              </TableBody>
            </Table>
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
                A requester cannot approve or reject their own request. Future-dated approvals are scheduled and do not post cash until their effective date.
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
                  const proofRequired = ['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType) && approval.method !== 'cash';
                  const proofReady = !proofRequired || approval.attachments.length > 0;
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
                        {['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType) ? (
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
                                <CheckCircle2 className="mr-1.5 size-3.5" />
                                {new Date(approval.effectiveDate).getTime() > Date.now() ? 'Approve & schedule' : 'Approve'}
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

      <Card className="min-w-0 border-sky-200/70 bg-sky-50/20 dark:border-sky-900/40 dark:bg-sky-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-sky-600" /> Scheduled treasury outflows</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Approved future-dated cash commitments remain off the posted cashbook until their effective date and explicit execution.</p>
            </div>
            <Badge variant="outline">{scheduled.length} scheduled</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-scheduled-treasury-outflows" className="min-w-[1080px]">
              <TableHeader><TableRow>
                <TableHead>Request</TableHead><TableHead>Counterparty</TableHead><TableHead>Approved by</TableHead><TableHead>Payment date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Execution</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {scheduled.map((approval) => {
                  const due = new Date(approval.effectiveDate).getTime() <= Date.now();
                  const mine = approval.requestedByAdminId === inbox?.currentAdminId;
                  const canExecute = Boolean(inbox?.canApprove) && !mine && due;
                  return (
                    <TableRow key={approval.id}>
                      <TableCell><p className="font-mono text-xs font-semibold">{approval.requestNumber}</p><Badge className={statusTone(approval.status)}>Scheduled</Badge></TableCell>
                      <TableCell><p className="text-xs font-medium">{approval.counterpartyName}</p><p className="text-[10px] text-muted-foreground">{approval.sourceReference || pretty(approval.outflowType)}</p></TableCell>
                      <TableCell><p className="text-xs">{approval.decidedByName || 'Finance approver'}</p><p className="text-[10px] text-muted-foreground">{date(approval.decidedAt)}</p></TableCell>
                      <TableCell><p className="text-xs font-medium">{date(approval.effectiveDate)}</p><Badge variant="outline" className={due ? 'mt-1 border-amber-300 text-amber-700 dark:text-amber-300' : 'mt-1'}>{due ? 'Due for execution' : 'Not due yet'}</Badge></TableCell>
                      <TableCell className="text-xs">{pretty(approval.method)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(approval.amount, approval.currency)}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" disabled={!canExecute || working} title={!due ? 'Execution unlocks on the scheduled payment date' : mine ? 'Maker-checker prevents requester execution' : !inbox?.canApprove ? 'Finance approval permission required' : undefined} onClick={() => { setDecision({ approval, action: 'execute' }); setNotes(''); }}>
                          <PlayCircle className="mr-1.5 size-3.5" /> Execute due payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!scheduled.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No approved future-dated outflows are waiting for their payment date.</TableCell></TableRow>}
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
        <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Customer receipt approval history</CardTitle><Badge variant="outline">{receiptHistory.length}</Badge></div></CardHeader>
        <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
          <Table exportFileName="lightworld-customer-receipt-approval-history" className="min-w-[920px]">
            <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Status</TableHead><TableHead>Customer</TableHead><TableHead>Requester</TableHead><TableHead>Decision</TableHead><TableHead>Receipt</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {receiptHistory.map((approval) => <TableRow key={approval.id}>
                <TableCell className="font-mono text-xs">{approval.requestNumber}</TableCell>
                <TableCell><Badge className={statusTone(approval.status)}>{pretty(approval.status)}</Badge></TableCell>
                <TableCell className="text-xs font-medium">{approval.organization.name}</TableCell>
                <TableCell><p className="text-xs">{approval.requestedByName || 'Finance'}</p><p className="text-[10px] text-muted-foreground">{date(approval.requestedAt)}</p></TableCell>
                <TableCell><p className="text-xs">{approval.decidedByName || '—'}</p><p className="text-[10px] text-muted-foreground">{date(approval.decidedAt)}</p>{approval.decisionNotes && <p className="max-w-[240px] truncate text-[10px] text-muted-foreground">{approval.decisionNotes}</p>}</TableCell>
                <TableCell className="font-mono text-xs">{approval.resultReceiptNumber || '—'}</TableCell>
                <TableCell className="text-right font-semibold">{money(approval.amount, approval.currency)}</TableCell>
              </TableRow>)}
              {!receiptHistory.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No customer receipt approval history yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div></CardContent>
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

      <Dialog open={Boolean(receiptDecision)} onOpenChange={(open) => !working && !open && setReceiptDecision(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{receiptDecision?.action === 'approve' ? 'Approve customer receipt?' : receiptDecision?.action === 'reject' ? 'Reject customer receipt?' : 'Cancel customer receipt request?'}</DialogTitle>
            <DialogDescription>
              {receiptDecision?.action === 'approve'
                ? 'Approval will create the receipt, revalidate and apply invoice allocations, post the cash journal and then trigger the customer payment notification.'
                : receiptDecision?.action === 'reject'
                  ? 'Rejection leaves cash, invoice balances and journals unchanged.'
                  : 'Cancellation withdraws this pending manual receipt before another approver acts.'}
            </DialogDescription>
          </DialogHeader>
          {receiptDecision && <div className="rounded-xl border border-border/60 bg-muted/20 p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-xs font-semibold">{receiptDecision.approval.requestNumber}</p><p className="mt-1 text-sm">{receiptDecision.approval.organization.name}</p></div><p className="font-bold">{money(receiptDecision.approval.amount, receiptDecision.approval.currency)}</p></div></div>}
          <div><Label>Decision notes</Label><Textarea rows={3} value={receiptNotes} onChange={(event) => setReceiptNotes(event.target.value)} placeholder={receiptDecision?.action === 'reject' ? 'Reason for rejection…' : 'Optional approval/cancellation note…'} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceiptDecision(null)} disabled={working}>Back</Button>
            <Button type="button" variant={receiptDecision?.action === 'reject' || receiptDecision?.action === 'cancel' ? 'outline' : 'default'} onClick={() => void decideReceipt()} disabled={working || (receiptDecision?.action === 'reject' && !receiptNotes.trim())}>
              {working && <Loader2 className="mr-2 size-4 animate-spin" />}{receiptDecision?.action === 'approve' ? <UserCheck className="mr-2 size-4" /> : null}{receiptDecision?.action ? pretty(receiptDecision.action) : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(decision)} onOpenChange={(open) => !working && !open && setDecision(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === 'approve'
                ? (decision && new Date(decision.approval.effectiveDate).getTime() > Date.now() ? 'Approve and schedule cash outflow?' : 'Approve cash outflow?')
                : decision?.action === 'execute'
                  ? 'Execute scheduled cash outflow?'
                : decision?.action === 'reject'
                  ? 'Reject cash outflow?'
                  : 'Cancel cash outflow request?'}
            </DialogTitle>
            <DialogDescription>
              {decision?.action === 'approve'
                ? (decision && new Date(decision.approval.effectiveDate).getTime() > Date.now()
                    ? 'Approval will reserve this as a scheduled treasury commitment. It will not post cash until its effective date and explicit execution.'
                    : 'Approval will execute the supplier payment or customer refund, update balances and post the cash journal.')
                : decision?.action === 'execute'
                  ? 'Execution will now create the payment/refund, update source balances and post the cash journal using the approved scheduled details.'
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

      <Dialog
        open={Boolean(creditNoteReject)}
        onOpenChange={(open) => {
          if (!open && !working) {
            setCreditNoteReject(null);
            setCreditNoteRejectReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject credit note draft</DialogTitle>
            <DialogDescription>
              Rejection leaves the invoice, receivable, revenue, tax and customer credit unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="credit-note-reject-reason">Reason for rejection</Label>
            <Textarea id="credit-note-reject-reason" rows={5} maxLength={2000} disabled={working}
              value={creditNoteRejectReason} onChange={(event) => setCreditNoteRejectReason(event.target.value)}
              placeholder="Explain why this proposed credit should not be posted." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={working} onClick={() => { setCreditNoteReject(null); setCreditNoteRejectReason(''); }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={working || creditNoteRejectReason.trim().length < 3} onClick={() => void rejectCreditNoteDraft()}>
              {working ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />} Reject draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(supplierBillReject)}
        onOpenChange={(open) => {
          if (!open && !working) {
            setSupplierBillReject(null);
            setSupplierBillRejectReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject supplier bill draft</DialogTitle>
            <DialogDescription>
              Rejection leaves payables, tax, expenses and the general ledger unchanged.
            </DialogDescription>
          </DialogHeader>
          {supplierBillReject && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold">{supplierBillReject.payableNumber}</p>
                  <p className="mt-1 text-sm">{supplierBillReject.vendor.name}</p>
                </div>
                <p className="font-bold">{money(supplierBillReject.total, supplierBillReject.currency)}</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="supplier-bill-reject-reason">Reason for rejection</Label>
            <Textarea id="supplier-bill-reject-reason" rows={5} maxLength={4000} disabled={working}
              value={supplierBillRejectReason} onChange={(event) => setSupplierBillRejectReason(event.target.value)}
              placeholder="Explain what must be corrected before a new supplier bill is prepared." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={working} onClick={() => { setSupplierBillReject(null); setSupplierBillRejectReason(''); }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={working || supplierBillRejectReason.trim().length < 3} onClick={() => void rejectSupplierBillDraft()}>
              {working ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />} Reject draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(invoiceReject)}
        onOpenChange={(open) => {
          if (!open && !working) {
            setInvoiceReject(null);
            setInvoiceRejectReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject invoice draft</DialogTitle>
            <DialogDescription>
              {invoiceReject
                ? 'Reject ' + invoiceReject.invoiceNumber + ' for ' + invoiceReject.organization.name + '. The draft will be voided and cannot be issued later.'
                : 'Reject this invoice draft.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invoice-reject-reason">Reason for rejection</Label>
            <Textarea
              id="invoice-reject-reason"
              value={invoiceRejectReason}
              onChange={(event) => setInvoiceRejectReason(event.target.value)}
              placeholder="Explain what must be corrected before a replacement draft is prepared."
              rows={5}
              maxLength={4000}
              disabled={working}
            />
            <p className="text-[11px] leading-5 text-muted-foreground">
              Rejection keeps the invoice, agreement and billing-milestone provenance for audit. If this draft consumed a milestone, voiding it makes that milestone eligible for a corrected replacement.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setInvoiceReject(null);
              setInvoiceRejectReason('');
            }} disabled={working}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void rejectInvoiceDraft()}
              disabled={working || invoiceRejectReason.trim().length < 3}
            >
              {working ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />}
              Reject draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}