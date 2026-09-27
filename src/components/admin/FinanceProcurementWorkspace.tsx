'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, ClipboardList, PackageCheck, Plus, RefreshCw, ShoppingCart, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Vendor = { id: string; name: string; email: string; phone: string };
type Project = { id: string; name: string; organization: { id: string; name: string } };
type RequestLine = { id: string; description: string; quantity: string; unitPrice: string; amount: string };
type SupplierQuoteAttachment = {
  id: string; originalName: string; mimeType: string; sizeBytes: number; uploadedByName: string; createdAt: string;
};
type SupplierQuote = {
  id: string; vendorId: string; quoteReference: string; currency: string; total: string;
  leadTimeDays: number | null; validUntil: string | null; notes: string; selected: boolean;
  selectedAt: string | null; selectedByName: string; selectionReason: string; createdByName: string;
  vendor: { id: string; name: string }; attachments: SupplierQuoteAttachment[];
};
type PurchaseRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  vendorId: string | null;
  projectId: string | null;
  currency: string;
  estimatedAmount: string;
  neededBy: string | null;
  status: string;
  requestedByAdminId: string;
  requestedByName: string;
  submittedAt: string;
  decidedByName: string;
  decidedAt: string | null;
  decisionNotes: string;
  vendor: { id: string; name: string } | null;
  project: Project | null;
  lines: RequestLine[];
  purchaseOrder: { id: string; poNumber: string; status: string; total: string } | null;
  supplierQuotes: SupplierQuote[];
};
type PurchaseReceiptLine = { id: string; requestLineId: string; quantity: string };
type PurchaseReceipt = {
  id: string; receiptNumber: string; notes: string; receivedAt: string;
  receivedByName: string; lines: PurchaseReceiptLine[];
};
type PurchaseOrder = {
  id: string;
  poNumber: string;
  requestId: string | null;
  vendorId: string;
  projectId: string | null;
  currency: string;
  total: string;
  issueDate: string;
  expectedDate: string | null;
  status: string;
  notes: string;
  issuedBy: string;
  receivedAt: string | null;
  receivedBy: string;
  closedAt: string | null;
  vendor: { id: string; name: string };
  project: Project | null;
  request: ({ id: string; requestNumber: string; title: string; lines: RequestLine[] }) | null;
  receipts: PurchaseReceipt[];
  bill: { id: string; payableNumber: string; status: string } | null;
};
type ProcurementException = {
  id: string; type: 'approval_aging' | 'delivery_overdue' | 'awaiting_bill';
  severity: 'high' | 'medium'; title: string; reference: string; detail: string;
};
type SupplierPerformance = {
  vendorId: string; vendorName: string; orders: number; receivedOrders: number;
  onTimeMeasuredOrders: number; onTimeOrders: number; onTimeRate: number | null;
  averageDeliveryDays: number | null; overdueOpenOrders: number; partialOpenOrders: number;
  awaitingBillOrders: number;
  commitmentsByCurrency: Array<{ currency: string; amount: string }>;
};
type ProcurementData = {
  canApprove: boolean;
  currentAdminId: string;
  requests: PurchaseRequest[];
  orders: PurchaseOrder[];
  vendors: Vendor[];
  projects: Project[];
  summary: {
    awaitingApproval: number;
    agedApprovals: number;
    overdueOrders: number;
    partialReceipts: number;
    awaitingBill: number;
  };
  exceptions: ProcurementException[];
  supplierPerformance: SupplierPerformance[];
  methodology: string;
};

const emptyLine = () => ({ description: '', quantity: '1', unitPrice: '' });

function money(value: string | number, currency = 'GHS') {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return currency + ' ' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tone(status: string) {
  if (['approved', 'received', 'closed'].includes(status)) return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (['rejected', 'cancelled'].includes(status)) return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (['submitted', 'issued', 'partially_received'].includes(status)) return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  return '';
}

async function readJson(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) throw new Error('Procurement endpoint returned an empty response');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Procurement endpoint returned invalid JSON');
  }
}

export default function FinanceProcurementWorkspace({
  onPrepareBill,
}: {
  onPrepareBill?: (order: PurchaseOrder) => void;
}) {
  const [data, setData] = useState<ProcurementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [quoteRequestId, setQuoteRequestId] = useState('');
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, {
    vendorId: string; quoteReference: string; total: string; leadTimeDays: string; validUntil: string; notes: string;
  }>>({});
  const [quoteSelectionReasons, setQuoteSelectionReasons] = useState<Record<string, string>>({});
  const [quoteEvidenceFiles, setQuoteEvidenceFiles] = useState<Record<string, File | null>>({});
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, Record<string, string>>>({});
  const [receiptNotes, setReceiptNotes] = useState<Record<string, string>>({});
  const [receivingOrderId, setReceivingOrderId] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    vendorId: '',
    projectId: '',
    currency: 'GHS',
    neededBy: '',
    lines: [emptyLine()],
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/finance/procurement', { cache: 'no-store' });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load procurement');
      setData(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load procurement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const estimatedTotal = useMemo(
    () => form.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0),
    [form.lines],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          vendorId: form.vendorId || null,
          projectId: form.projectId || null,
          currency: form.currency,
          neededBy: form.neededBy ? new Date(form.neededBy + 'T12:00:00Z').toISOString() : null,
          lines: form.lines.map((line) => ({
            description: line.description,
            quantity: Number(line.quantity || 0),
            unitPrice: Number(line.unitPrice || 0),
          })),
        }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to submit purchase requisition');
      toast.success('Purchase requisition submitted');
      setForm({ title: '', description: '', vendorId: '', projectId: '', currency: 'GHS', neededBy: '', lines: [emptyLine()] });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit purchase requisition');
    } finally {
      setSaving(false);
    }
  };

  const quoteDraft = (requestId: string) => quoteDrafts[requestId] || {
    vendorId: '', quoteReference: '', total: '', leadTimeDays: '', validUntil: '', notes: '',
  };

  const saveQuote = async (request: PurchaseRequest) => {
    const draft = quoteDraft(request.id);
    if (!draft.vendorId || Number(draft.total || 0) <= 0) {
      toast.error('Select a supplier and enter the quoted total');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/procurement/' + request.id + '/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: draft.vendorId,
          quoteReference: draft.quoteReference,
          currency: request.currency,
          total: Number(draft.total),
          leadTimeDays: draft.leadTimeDays ? Number(draft.leadTimeDays) : null,
          validUntil: draft.validUntil ? new Date(draft.validUntil + 'T23:59:59Z').toISOString() : null,
          notes: draft.notes,
        }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to record supplier quote');
      setQuoteDrafts((current) => ({ ...current, [request.id]: { vendorId: '', quoteReference: '', total: '', leadTimeDays: '', validUntil: '', notes: '' } }));
      toast.success('Supplier quote recorded');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to record supplier quote');
    } finally {
      setSaving(false);
    }
  };

  const selectQuote = async (requestId: string, quoteId: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/procurement/' + requestId + '/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, selectionReason: quoteSelectionReasons[quoteId] || '' }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to select supplier quote');
      toast.success('Winning supplier quote selected');
      setQuoteSelectionReasons((current) => ({ ...current, [quoteId]: '' }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to select supplier quote');
    } finally {
      setSaving(false);
    }
  };

  const uploadQuoteEvidence = async (quoteId: string) => {
    const file = quoteEvidenceFiles[quoteId];
    if (!file) {
      toast.error('Choose a supplier quotation PDF');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/finance/procurement/quotes/' + quoteId + '/attachment', {
        method: 'POST',
        body: formData,
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to upload supplier quotation evidence');
      setQuoteEvidenceFiles((current) => ({ ...current, [quoteId]: null }));
      toast.success('Supplier quotation PDF attached');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload supplier quotation evidence');
    } finally {
      setSaving(false);
    }
  };

  const action = async (id: string, actionName: string, extra: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/procurement/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionName, ...extra }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Procurement action failed');
      toast.success(
        actionName === 'approve' ? 'Requisition approved'
          : actionName === 'reject' ? 'Requisition rejected'
            : actionName === 'convert' ? 'Purchase order issued'
              : actionName === 'receive' ? 'Purchase order received'
                : actionName === 'close' ? 'Purchase order closed'
                  : 'Procurement record updated',
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Procurement action failed');
    } finally {
      setSaving(false);
    }
  };

  const receivedQuantity = (order: PurchaseOrder, requestLineId: string) =>
    order.receipts.reduce(
      (sum, receipt) => sum + receipt.lines.filter((line) => line.requestLineId === requestLineId).reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0),
      0,
    );

  const openReceipt = (order: PurchaseOrder) => {
    if (!order.request) return;
    const draft: Record<string, string> = {};
    for (const line of order.request.lines) {
      const remaining = Math.max(0, Number(line.quantity) - receivedQuantity(order, line.id));
      draft[line.id] = remaining > 0 ? remaining.toFixed(3) : '';
    }
    setReceiptDrafts((current) => ({ ...current, [order.id]: draft }));
    setReceivingOrderId(order.id);
  };

  const submitReceipt = async (order: PurchaseOrder) => {
    if (!order.request) return;
    const draft = receiptDrafts[order.id] || {};
    const lines = order.request.lines
      .map((line) => ({ requestLineId: line.id, quantity: Number(draft[line.id] || 0) }))
      .filter((line) => line.quantity > 0);
    if (!lines.length) {
      toast.error('Enter at least one received quantity');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/procurement/' + order.id + '/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: receiptNotes[order.id] || '', lines }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to record purchase receipt');
      toast.success(payload?.data?.fullyReceived ? 'Purchase order fully received' : 'Partial purchase receipt recorded');
      setReceivingOrderId('');
      setReceiptNotes((current) => ({ ...current, [order.id]: '' }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to record purchase receipt');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          {loading ? 'Loading procurement controls…' : 'Procurement controls are unavailable.'}
        </CardContent>
      </Card>
    );
  }

  const summary = {
    submitted: data.requests.filter((item) => item.status === 'submitted').length,
    approved: data.requests.filter((item) => item.status === 'approved').length,
    issued: data.orders.filter((item) => item.status === 'issued').length,
    received: data.orders.filter((item) => item.status === 'received').length,
  };
  const isOverdue = (item: PurchaseOrder) =>
    ['issued', 'partially_received'].includes(item.status)
    && Boolean(item.expectedDate && new Date(item.expectedDate).getTime() < Date.now());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Procurement control</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Submit purchase requisitions without forcing a supplier choice, source and compare supplier quotes independently, enforce maker-checker approval, issue supplier POs, record line-level GRNs and match only fully received commitments to supplier bills.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Awaiting approval', value: data.summary.awaitingApproval, detail: data.summary.agedApprovals + ' aged >48h', Icon: ClipboardList },
          { label: 'Approved to order', value: summary.approved, detail: 'Ready for PO issue', Icon: CheckCircle2 },
          { label: 'POs in transit', value: data.orders.filter((item) => ['issued', 'partially_received'].includes(item.status)).length, detail: data.summary.overdueOrders + ' overdue', Icon: ShoppingCart },
          { label: 'Partial receipts', value: data.summary.partialReceipts, detail: 'Still open', Icon: PackageCheck },
          { label: 'Received / AP next', value: data.summary.awaitingBill, detail: 'Awaiting matched bill', Icon: PackageCheck },
        ].map(({ label, value, detail, Icon }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div>
              <Icon className="size-5 text-amber-600" />
            </CardContent>
          </Card>
        ))}
      </div>

      {data.exceptions.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Procurement exception queue</CardTitle>
            <p className="text-xs text-muted-foreground">{data.methodology}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.exceptions.slice(0, 12).map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={item.severity === 'high' ? 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200' : 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}>{item.severity}</Badge>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.reference}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Supplier delivery performance</CardTitle>
          <p className="text-xs text-muted-foreground">On-time rate is measured only where the PO has an expected date. Currency commitments are kept separate and are not converted.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table exportFileName="lightworld-supplier-procurement-performance" className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">POs</TableHead>
                  <TableHead className="text-right">On-time</TableHead>
                  <TableHead className="text-right">Avg delivery</TableHead>
                  <TableHead className="text-right">Overdue open</TableHead>
                  <TableHead className="text-right">Partial open</TableHead>
                  <TableHead className="text-right">Awaiting bill</TableHead>
                  <TableHead>Commitments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.supplierPerformance.map((supplier) => (
                  <TableRow key={supplier.vendorId}>
                    <TableCell><p className="font-medium">{supplier.vendorName}</p><p className="text-xs text-muted-foreground">{supplier.receivedOrders} received</p></TableCell>
                    <TableCell className="text-right">{supplier.orders}</TableCell>
                    <TableCell className="text-right">{supplier.onTimeRate === null ? 'Not measured' : supplier.onTimeRate.toFixed(1) + '%'}{supplier.onTimeMeasuredOrders > 0 && <p className="text-[10px] text-muted-foreground">{supplier.onTimeOrders}/{supplier.onTimeMeasuredOrders}</p>}</TableCell>
                    <TableCell className="text-right">{supplier.averageDeliveryDays === null ? '—' : supplier.averageDeliveryDays.toFixed(1) + ' days'}</TableCell>
                    <TableCell className="text-right">{supplier.overdueOpenOrders}</TableCell>
                    <TableCell className="text-right">{supplier.partialOpenOrders}</TableCell>
                    <TableCell className="text-right">{supplier.awaitingBillOrders}</TableCell>
                    <TableCell>{supplier.commitmentsByCurrency.length ? supplier.commitmentsByCurrency.map((item) => item.currency + ' ' + Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).join(' · ') : 'No PO commitments'}</TableCell>
                  </TableRow>
                ))}
                {!data.supplierPerformance.length && <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No supplier procurement history yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">New purchase requisition</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="space-y-1.5 lg:col-span-2"><Label>Purpose / title</Label><Input required value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="e.g. Annual cloud infrastructure renewal" /></div>
              <div className="space-y-1.5"><Label>Preferred supplier (optional)</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.vendorId} onChange={(e) => setForm((v) => ({ ...v, vendorId: e.target.value }))}><option value="">Source after approval</option>{data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select><p className="text-[10px] leading-4 text-muted-foreground">A requester may suggest a supplier, but the awarded supplier is determined through the quotation workflow.</p></div>
              <div className="space-y-1.5"><Label>Project attribution</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.projectId} onChange={(e) => setForm((v) => ({ ...v, projectId: e.target.value }))}><option value="">General overhead</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.organization.name} · {project.name}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Needed by</Label><Input type="date" value={form.neededBy} onChange={(e) => setForm((v) => ({ ...v, neededBy: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Business justification</Label><Textarea value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} placeholder="Why this purchase is required, scope, specifications and business context." /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2"><Label>Line items</Label><Button type="button" size="sm" variant="outline" onClick={() => setForm((v) => ({ ...v, lines: [...v.lines, emptyLine()] }))}><Plus className="mr-1 size-3.5" />Add line</Button></div>
              {form.lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-[minmax(220px,1fr)_110px_150px_120px_auto] sm:items-end">
                  <div className="space-y-1.5"><Label>Description</Label><Input required value={line.description} onChange={(e) => setForm((v) => ({ ...v, lines: v.lines.map((x, i) => i === index ? { ...x, description: e.target.value } : x) }))} /></div>
                  <div className="space-y-1.5"><Label>Qty</Label><Input required type="number" min="0.001" step="0.001" value={line.quantity} onChange={(e) => setForm((v) => ({ ...v, lines: v.lines.map((x, i) => i === index ? { ...x, quantity: e.target.value } : x) }))} /></div>
                  <div className="space-y-1.5"><Label>Unit price</Label><Input required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => setForm((v) => ({ ...v, lines: v.lines.map((x, i) => i === index ? { ...x, unitPrice: e.target.value } : x) }))} /></div>
                  <div className="pb-2 text-right text-sm font-semibold">{money(Number(line.quantity || 0) * Number(line.unitPrice || 0), form.currency)}</div>
                  <Button type="button" variant="ghost" size="sm" disabled={form.lines.length === 1} onClick={() => setForm((v) => ({ ...v, lines: v.lines.filter((_, i) => i !== index) }))}>Remove</Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
              <div><p className="text-xs text-muted-foreground">Planning estimate</p><p className="text-lg font-bold">{money(estimatedTotal, form.currency)}</p><p className="mt-1 text-[10px] text-muted-foreground">This baseline is preserved after sourcing so award savings or overruns remain measurable.</p></div>
              <Button type="submit" disabled={saving || estimatedTotal <= 0}>Submit for approval</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Purchase requisitions</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
          <Table exportFileName="lightworld-purchase-requisitions" className="min-w-[1050px]">
            <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Supplier / project</TableHead><TableHead>Needed</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Estimate / award</TableHead><TableHead>Decision / actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.requests.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.requestNumber} · by {item.requestedByName}</p></TableCell>
                  <TableCell><p>{item.vendor?.name || 'Supplier not selected'}</p><p className="text-xs text-muted-foreground">{item.project ? item.project.organization.name + ' · ' + item.project.name : 'General overhead'}</p></TableCell>
                  <TableCell>{item.neededBy ? new Date(item.neededBy).toLocaleDateString() : 'Not specified'}</TableCell>
                  <TableCell><Badge className={tone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <p className="font-semibold">{money(item.estimatedAmount, item.currency)}</p>
                    {item.supplierQuotes.find((quote) => quote.selected) ? (() => {
                      const selected = item.supplierQuotes.find((quote) => quote.selected)!;
                      const variance = Number(selected.total) - Number(item.estimatedAmount);
                      const variancePercent = Number(item.estimatedAmount) > 0 ? (variance / Number(item.estimatedAmount)) * 100 : null;
                      return (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          <p>Award {money(selected.total, selected.currency)}</p>
                          <p className={variance > 0 ? 'text-rose-600 dark:text-rose-300' : variance < 0 ? 'text-emerald-700 dark:text-emerald-300' : ''}>
                            {variance === 0 ? 'On estimate' : variance < 0 ? 'Saving ' : 'Over estimate '}
                            {variance === 0 ? '' : money(Math.abs(variance), item.currency)}
                            {variancePercent === null || variance === 0 ? '' : ' · ' + Math.abs(variancePercent).toFixed(1) + '%'}
                          </p>
                        </div>
                      );
                    })() : <p className="mt-1 text-[10px] text-muted-foreground">Planning baseline</p>}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[260px] space-y-2">
                      {item.status === 'submitted' && data.canApprove && item.requestedByAdminId !== data.currentAdminId && (
                        <>
                          <Input className="h-8" placeholder="Decision note (optional)" value={decisionNotes[item.id] || ''} onChange={(e) => setDecisionNotes((v) => ({ ...v, [item.id]: e.target.value }))} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={saving} onClick={() => void action(item.id, 'approve', { notes: decisionNotes[item.id] || '' })}><CheckCircle2 className="mr-1 size-3.5" />Approve</Button>
                            <Button size="sm" variant="outline" disabled={saving} onClick={() => void action(item.id, 'reject', { notes: decisionNotes[item.id] || '' })}><XCircle className="mr-1 size-3.5" />Reject</Button>
                          </div>
                        </>
                      )}
                      {item.status === 'submitted' && item.requestedByAdminId === data.currentAdminId && <p className="text-xs text-muted-foreground">Awaiting approval by another authorized finance operator.</p>}
                      {['submitted', 'approved'].includes(item.status) && !item.purchaseOrder && (
                        <div className="space-y-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setQuoteRequestId((current) => current === item.id ? '' : item.id)}>
                            Compare supplier quotes ({item.supplierQuotes.length})
                          </Button>
                          {quoteRequestId === item.id && (
                            <div className="space-y-3 rounded-xl border border-border/60 p-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={quoteDraft(item.id).vendorId} onChange={(e) => setQuoteDrafts((v) => ({ ...v, [item.id]: { ...quoteDraft(item.id), vendorId: e.target.value } }))}>
                                  <option value="">Supplier</option>{data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                                </select>
                                <Input className="h-9 text-xs" placeholder="Quote reference" value={quoteDraft(item.id).quoteReference} onChange={(e) => setQuoteDrafts((v) => ({ ...v, [item.id]: { ...quoteDraft(item.id), quoteReference: e.target.value } }))} />
                                <Input className="h-9 text-xs" type="number" min="0.01" step="0.01" placeholder={'Quoted total (' + item.currency + ')'} value={quoteDraft(item.id).total} onChange={(e) => setQuoteDrafts((v) => ({ ...v, [item.id]: { ...quoteDraft(item.id), total: e.target.value } }))} />
                                <Input className="h-9 text-xs" type="number" min="0" placeholder="Lead time days" value={quoteDraft(item.id).leadTimeDays} onChange={(e) => setQuoteDrafts((v) => ({ ...v, [item.id]: { ...quoteDraft(item.id), leadTimeDays: e.target.value } }))} />
                                <div className="sm:col-span-2"><Label className="text-[10px]">Quote valid until</Label><Input className="mt-1 h-9 text-xs" type="date" value={quoteDraft(item.id).validUntil} onChange={(e) => setQuoteDrafts((v) => ({ ...v, [item.id]: { ...quoteDraft(item.id), validUntil: e.target.value } }))} /></div>
                              </div>
                              <Textarea rows={2} className="text-xs" placeholder="Commercial notes, warranty, payment terms or exclusions…" value={quoteDraft(item.id).notes} onChange={(e) => setQuoteDrafts((v) => ({ ...v, [item.id]: { ...quoteDraft(item.id), notes: e.target.value } }))} />
                              <Button type="button" size="sm" disabled={saving} onClick={() => void saveQuote(item)}>Record quote</Button>
                              <div className="space-y-2 border-t border-border/60 pt-2">
                                {item.supplierQuotes.map((quote) => (
                                  <div key={quote.id} className={quote.selected ? 'rounded-lg border border-emerald-300 bg-emerald-50 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'rounded-lg border border-border/60 p-2'}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div><p className="text-xs font-semibold">{quote.vendor.name} · {money(quote.total, quote.currency)}</p><p className="text-[10px] text-muted-foreground">{quote.quoteReference || 'No reference'} · {quote.leadTimeDays === null ? 'Lead time not set' : quote.leadTimeDays + ' days'}{quote.validUntil ? ' · valid to ' + new Date(quote.validUntil).toLocaleDateString() : ''}</p></div>
                                      <div className="flex items-center gap-1">{quote.selected ? <Badge className="border-0 bg-emerald-100 text-emerald-800">Selected</Badge> : item.status === 'approved' && data.canApprove && item.requestedByAdminId !== data.currentAdminId ? <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void selectQuote(item.id, quote.id)}>Select</Button> : null}</div>
                                    </div>
                                    {quote.notes && <p className="mt-1 text-[10px] text-muted-foreground">{quote.notes}</p>}
                                    {quote.selected && quote.selectionReason && <p className="mt-1 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">Award rationale: {quote.selectionReason}</p>}
                                    <div className="mt-2 space-y-2 rounded-lg bg-muted/30 p-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Quotation evidence</p>
                                      {quote.attachments.map((attachment) => (
                                        <button
                                          key={attachment.id}
                                          type="button"
                                          className="block text-left text-[10px] font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                                          onClick={() => window.open('/api/admin/finance/procurement/quote-attachments/' + attachment.id, '_blank', 'noopener,noreferrer')}
                                        >
                                          {attachment.originalName} · {(attachment.sizeBytes / 1024).toFixed(0)} KB
                                        </button>
                                      ))}
                                      {!quote.attachments.length && <p className="text-[10px] text-muted-foreground">No quotation PDF attached yet.</p>}
                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input
                                          type="file"
                                          accept="application/pdf,.pdf"
                                          className="h-9 text-xs"
                                          onChange={(e) => setQuoteEvidenceFiles((current) => ({ ...current, [quote.id]: e.target.files?.[0] || null }))}
                                        />
                                        <Button type="button" size="sm" variant="outline" disabled={saving || !quoteEvidenceFiles[quote.id]} onClick={() => void uploadQuoteEvidence(quote.id)}>
                                          Attach PDF
                                        </Button>
                                      </div>
                                    </div>
                                    {!quote.selected && item.status === 'approved' && data.canApprove && item.requestedByAdminId !== data.currentAdminId && (
                                      <Input
                                        className="mt-2 h-8 text-xs"
                                        placeholder="Award rationale — required for single-source or higher-priced selection"
                                        value={quoteSelectionReasons[quote.id] || ''}
                                        onChange={(e) => setQuoteSelectionReasons((current) => ({ ...current, [quote.id]: e.target.value }))}
                                      />
                                    )}
                                  </div>
                                ))}
                                {!item.supplierQuotes.length && <p className="text-[10px] text-muted-foreground">No supplier quotes recorded yet.</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {item.status === 'approved' && <Button size="sm" disabled={saving || !item.vendorId || (item.supplierQuotes.length > 0 && !item.supplierQuotes.some((quote) => quote.selected && quote.attachments.length > 0))} onClick={() => void action(item.id, 'convert')}>Issue purchase order</Button>}
                      {item.status === 'approved' && item.supplierQuotes.length > 0 && !item.supplierQuotes.some((quote) => quote.selected) && <p className="text-xs text-muted-foreground">Select the winning supplier quote before PO issue.</p>}
                      {item.status === 'approved' && item.supplierQuotes.some((quote) => quote.selected && quote.attachments.length === 0) && <p className="text-xs text-muted-foreground">Attach the selected supplier quotation PDF before PO issue.</p>}
                      {item.purchaseOrder && <p className="text-xs text-muted-foreground">PO: {item.purchaseOrder.poNumber} · {pretty(item.purchaseOrder.status)}</p>}
                      {item.decidedAt && <p className="text-xs text-muted-foreground">Decision: {item.decidedByName || 'Finance'} · {new Date(item.decidedAt).toLocaleString()}{item.decisionNotes ? ' · ' + item.decisionNotes : ''}</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!data.requests.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No purchase requisitions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div></CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Purchase orders & receiving</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
          <Table exportFileName="lightworld-purchase-orders" className="min-w-[950px]">
            <TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Supplier / source</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Commitment</TableHead><TableHead>Receiving</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.orders.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><p className="font-medium">{item.poNumber}</p><p className="text-xs text-muted-foreground">{new Date(item.issueDate).toLocaleDateString()} · {item.issuedBy}</p></TableCell>
                  <TableCell><p>{item.vendor.name}</p><p className="text-xs text-muted-foreground">{item.request ? item.request.requestNumber + ' · ' + item.request.title : 'Direct PO'}</p></TableCell>
                  <TableCell><div className="space-y-1"><span>{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : 'Not specified'}</span>{isOverdue(item) && <Badge className="ml-2 border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">Overdue</Badge>}</div></TableCell>
                  <TableCell><Badge className={tone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{money(item.total, item.currency)}</TableCell>
                  <TableCell className="min-w-[360px]">
                    {['issued', 'partially_received'].includes(item.status) && item.request && (
                      <div className="space-y-2">
                        {receivingOrderId !== item.id ? (
                          <Button size="sm" variant="outline" disabled={saving} onClick={() => openReceipt(item)}>
                            <PackageCheck className="mr-1 size-3.5" /> Record receipt
                          </Button>
                        ) : (
                          <div className="space-y-3 rounded-xl border border-border/60 p-3">
                            <p className="text-xs font-semibold">Goods / service receipt quantities</p>
                            {item.request.lines.map((line) => {
                              const received = receivedQuantity(item, line.id);
                              const remaining = Math.max(0, Number(line.quantity) - received);
                              return (
                                <div key={line.id} className="grid gap-2 text-xs sm:grid-cols-[minmax(160px,1fr)_70px_70px_90px] sm:items-center">
                                  <span className="font-medium">{line.description}</span>
                                  <span className="text-muted-foreground">PO {Number(line.quantity).toFixed(3)}</span>
                                  <span className="text-muted-foreground">Rec {received.toFixed(3)}</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={remaining}
                                    step="0.001"
                                    value={receiptDrafts[item.id]?.[line.id] || ''}
                                    onChange={(event) => setReceiptDrafts((current) => ({
                                      ...current,
                                      [item.id]: { ...(current[item.id] || {}), [line.id]: event.target.value },
                                    }))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              );
                            })}
                            <Textarea
                              rows={2}
                              value={receiptNotes[item.id] || ''}
                              onChange={(event) => setReceiptNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                              placeholder="Delivery note, condition, shortages or service acceptance notes…"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" disabled={saving} onClick={() => void submitReceipt(item)}>Save receipt</Button>
                              <Button size="sm" variant="outline" disabled={saving} onClick={() => setReceivingOrderId('')}>Cancel</Button>
                            </div>
                          </div>
                        )}
                        {item.receipts.length > 0 && <p className="text-xs text-muted-foreground">{item.receipts.length} receipt{item.receipts.length === 1 ? '' : 's'} recorded · {item.receipts[0].receiptNumber}</p>}
                      </div>
                    )}
                    {item.status === 'received' && <div className="space-y-2"><p className="text-xs text-muted-foreground">Fully received by {item.receivedBy || 'Finance'}{item.receivedAt ? ' · ' + new Date(item.receivedAt).toLocaleString() : ''} · {item.receipts.length} GRN{item.receipts.length === 1 ? '' : 's'}</p><Button size="sm" variant="outline" disabled={saving} onClick={() => void action(item.id, 'close')}>Close PO</Button></div>}
                    {['received', 'closed'].includes(item.status) && (
                      <div className="space-y-2">
                        {item.status === 'closed' && <p className="text-xs text-muted-foreground">PO closed with receipt evidence and ready for Accounts Payable matching.</p>}
                        {onPrepareBill && <Button size="sm" onClick={() => onPrepareBill(item)}>Prepare matched bill</Button>}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!data.orders.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No purchase orders issued yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div></CardContent>
      </Card>
    </div>
  );
}
