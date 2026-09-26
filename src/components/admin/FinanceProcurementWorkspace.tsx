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
  request: { id: string; requestNumber: string; title: string } | null;
};
type ProcurementData = {
  canApprove: boolean;
  currentAdminId: string;
  requests: PurchaseRequest[];
  orders: PurchaseOrder[];
  vendors: Vendor[];
  projects: Project[];
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
  if (['submitted', 'issued'].includes(status)) return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
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

export default function FinanceProcurementWorkspace() {
  const [data, setData] = useState<ProcurementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Procurement control</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Submit purchase requisitions, enforce maker-checker approval, issue supplier POs and confirm receipt before finance records the supplier bill.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Awaiting approval', value: summary.submitted, Icon: ClipboardList },
          { label: 'Approved to order', value: summary.approved, Icon: CheckCircle2 },
          { label: 'POs in transit', value: summary.issued, Icon: ShoppingCart },
          { label: 'Received / bill next', value: summary.received, Icon: PackageCheck },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
              <Icon className="size-5 text-amber-600" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">New purchase requisition</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="space-y-1.5 lg:col-span-2"><Label>Purpose / title</Label><Input required value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="e.g. Annual cloud infrastructure renewal" /></div>
              <div className="space-y-1.5"><Label>Supplier</Label><select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.vendorId} onChange={(e) => setForm((v) => ({ ...v, vendorId: e.target.value }))}><option value="">Select supplier</option>{data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Project attribution</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.projectId} onChange={(e) => setForm((v) => ({ ...v, projectId: e.target.value }))}><option value="">General overhead</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.organization.name} · {project.name}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Needed by</Label><Input type="date" value={form.neededBy} onChange={(e) => setForm((v) => ({ ...v, neededBy: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Business justification</Label><Textarea value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} placeholder="Why this purchase is required, scope and any supplier context." /></div>

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
              <div><p className="text-xs text-muted-foreground">Estimated commitment</p><p className="text-lg font-bold">{money(estimatedTotal, form.currency)}</p></div>
              <Button type="submit" disabled={saving || estimatedTotal <= 0}>Submit for approval</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Purchase requisitions</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
          <Table exportFileName="lightworld-purchase-requisitions" className="min-w-[1050px]">
            <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Supplier / project</TableHead><TableHead>Needed</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Decision / actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.requests.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.requestNumber} · by {item.requestedByName}</p></TableCell>
                  <TableCell><p>{item.vendor?.name || 'Supplier not selected'}</p><p className="text-xs text-muted-foreground">{item.project ? item.project.organization.name + ' · ' + item.project.name : 'General overhead'}</p></TableCell>
                  <TableCell>{item.neededBy ? new Date(item.neededBy).toLocaleDateString() : 'Not specified'}</TableCell>
                  <TableCell><Badge className={tone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{money(item.estimatedAmount, item.currency)}</TableCell>
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
                      {item.status === 'approved' && <Button size="sm" disabled={saving || !item.vendorId} onClick={() => void action(item.id, 'convert')}>Issue purchase order</Button>}
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
                  <TableCell>{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : 'Not specified'}</TableCell>
                  <TableCell><Badge className={tone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{money(item.total, item.currency)}</TableCell>
                  <TableCell>
                    {item.status === 'issued' && <Button size="sm" variant="outline" disabled={saving} onClick={() => void action(item.id, 'receive')}><PackageCheck className="mr-1 size-3.5" />Confirm received</Button>}
                    {item.status === 'received' && <div className="space-y-2"><p className="text-xs text-muted-foreground">Received by {item.receivedBy || 'Finance'}{item.receivedAt ? ' · ' + new Date(item.receivedAt).toLocaleString() : ''}</p><Button size="sm" variant="outline" disabled={saving} onClick={() => void action(item.id, 'close')}>Close PO</Button></div>}
                    {item.status === 'closed' && <p className="text-xs text-muted-foreground">Closed. Supplier bill can now be matched in Accounts Payable.</p>}
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
