'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CalendarClock,
  CreditCard,
  Download,
  FolderKanban,
  History,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Plus,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
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
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Service = {
  id: string;
  name: string;
  serviceType: string;
  planName: string;
  status: string;
  billingCycle: string;
  currency: string;
  recurringAmount: string;
  expiryDate: string | null;
  nextDueDate: string | null;
  autoRenew: boolean;
  renewalNoticeDays: number;
  project: { id: string; name: string } | null;
  changes: Array<{
    id: string;
    changeType: string;
    previousPlan: string;
    newPlan: string;
    previousAmount: string | null;
    newAmount: string | null;
    effectiveAt: string;
    sourceInvoiceId: string | null;
    previousExpiryDate: string | null;
    newExpiryDate: string | null;
    previousNextDueDate: string | null;
    newNextDueDate: string | null;
    previousStatus: string;
    newStatus: string;
    notes: string;
    changedBy: string;
  }>;
  _count: { invoices: number };
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  serviceId: string | null;
  service: { id: string; name: string; planName: string } | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  renewalForDate: string | null;
  renewalCompletedAt: string | null;
  renewalCompletedBy: string;
  total: string;
  amountPaid: string;
  balance: string;
  status: string;
  derivedStatus: string;
};

type Payment = {
  id: string;
  paymentNumber: string;
  currency: string;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  paidAt: string;
  method: string;
  reference: string;
  receivedBy: string;
};

type CommercialData = {
  organization: {
    id: string;
    name: string;
    status: string;
    primaryContactName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
  customer360: {
    activeProjects: number;
    atRiskProjects: number;
    openTickets: number;
    urgentTickets: number;
    slaBreaches: number;
    overdueInvoices: number;
    renewalsDue30: number;
    expiredServices: number;
    accountHealth: 'healthy' | 'watch' | 'action_required';
    executiveBrief: {
      posture: 'intervention_required' | 'attention' | 'stable';
      headline: string;
      summary: string;
      priorities: Array<{
        key: 'collections' | 'renewals' | 'support' | 'projects' | 'statement';
        severity: 'high' | 'medium' | 'low';
        label: string;
        detail: string;
        evidence: string;
      }>;
      next30Days: Array<{
        currency: string;
        potential: string;
        receivablesDue: string;
        renewals: string;
      }>;
      controls: string;
      generatedAt: string;
    };
    riskSignals: Array<{
      key: string;
      label: string;
      count: number;
      severity: 'medium' | 'high';
    }>;
    nextActions: Array<{
      key: 'collections' | 'renewals' | 'support' | 'projects' | 'statement';
      label: string;
      detail: string;
    }>;
    recentActivity: Array<{
      id: string;
      type: 'payment' | 'invoice' | 'collection' | 'announcement' | 'support' | 'message';
      title: string;
      detail: string;
      actor: string;
      occurredAt: string;
    }>;
    forecast: {
      next30Days: Array<{
        currency: string;
        receivablesDue: string;
        serviceRenewals: string;
        projectRenewals: string;
        totalPotential: string;
      }>;
      next90Days: Array<{
        currency: string;
        receivablesDue: string;
        serviceRenewals: string;
        projectRenewals: string;
        totalPotential: string;
      }>;
      methodology: string;
    };
    profitability: {
      customer: Array<{
        scopeType: 'customer';
        scopeId: string;
        name: string;
        currency: string;
        revenue: string;
        directCost: string;
        margin: string;
        marginPercent: string;
        budgetAmount?: string | null;
        budgetRemaining?: string | null;
        budgetUtilizationPercent?: string | null;
      }>;
      projects: Array<{
        scopeType: 'project';
        scopeId: string;
        name: string;
        currency: string;
        revenue: string;
        directCost: string;
        margin: string;
        marginPercent: string;
        budgetAmount?: string | null;
        budgetRemaining?: string | null;
        budgetUtilizationPercent?: string | null;
      }>;
      services: Array<{
        scopeType: 'service';
        scopeId: string;
        name: string;
        currency: string;
        revenue: string;
        directCost: string;
        margin: string;
        marginPercent: string;
      }>;
      methodology: string;
    };
    collectionTarget: {
      id: string;
      invoiceNumber: string;
      currency: string;
      balance: string;
      dueDate: string;
    } | null;
    commitments: {
      nextCollectionFollowUp: {
        id: string;
        invoiceNumber: string;
        type: string;
        note: string;
        nextFollowUpAt: string;
        createdBy: string;
      } | null;
      nextPaymentPromise: {
        id: string;
        invoiceNumber: string;
        note: string;
        promisedAmount: string | null;
        promisedDate: string;
        currency: string;
        createdBy: string;
      } | null;
    };
    communicationThreads: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      subject: string;
      message: string;
      read: boolean;
      createdAt: string;
      replies: Array<{
        id: string;
        authorName: string;
        subject: string;
        body: string;
        status: string;
        sentAt: string | null;
        createdAt: string;
      }>;
    }>;
    nextRenewal: {
      serviceId: string;
      serviceName: string;
      date: string;
      currency: string;
      amount: string;
    } | null;
    projects: Array<{
      id: string;
      name: string;
      status: string;
      health: string;
      progress: number;
      manager: string;
      targetDate: string | null;
      expiryDate: string | null;
      nextRenewalDate: string | null;
      renewalCurrency: string;
      renewalAmount: string;
      budgetCurrency: string;
      budgetAmount: string;
      updatedAt: string;
    }>;
    tickets: Array<{
      id: string;
      ticketNumber: string;
      subject: string;
      status: string;
      priority: string;
      assignedTo: string;
      lastActivityAt: string;
      updatedAt: string;
    }>;
  };
  byCurrency: Record<string, {
    invoiced: string;
    paid: string;
    outstanding: string;
    unapplied: string;
  }>;
  services: Service[];
  invoices: Invoice[];
  payments: Payment[];
};

type AllocationForm = {
  invoiceId: string;
  amount: string;
};

type Props = {
  organizationId: string;
  organizationName: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

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

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function date(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function statusTone(status: string) {
  if (['paid', 'active'].includes(status)) return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (['overdue', 'expired', 'cancelled'].includes(status)) return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (['partially_paid', 'suspended'].includes(status)) return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

export default function ClientCommercialAccount({ organizationId, organizationName }: Props) {
  const { navigate } = useAppStore();
  const [data, setData] = useState<CommercialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statementDownloading, setStatementDownloading] = useState(false);
  const [pendingReminder, setPendingReminder] = useState<'payment_sms' | 'renewal_sms' | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    currency: 'GHS',
    amount: '',
    paidAt: today(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
    allocations: [{ invoiceId: '', amount: '' }] as AllocationForm[],
  });

  const load = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await fetch(
        '/api/admin/clients/' + encodeURIComponent(organizationId) + '/commercial',
        { cache: 'no-store' },
      );
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (response.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(payload?.error || 'Unable to load client account');
      setData(payload.data as CommercialData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load client account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const openInvoices = useMemo(
    () => (data?.invoices || []).filter(
      (invoice) =>
        invoice.currency === paymentForm.currency &&
        Number(invoice.balance) > 0 &&
        !['draft', 'void', 'paid'].includes(invoice.derivedStatus),
    ),
    [data?.invoices, paymentForm.currency],
  );

  const serviceHistory = useMemo(
    () => (data?.services || [])
      .flatMap((service) =>
        service.changes.map((change) => ({
          ...change,
          serviceName: service.name,
          planName: service.planName,
          currency: service.currency,
          invoiceNumber:
            change.sourceInvoiceId
              ? data?.invoices.find((invoice) => invoice.id === change.sourceInvoiceId)?.invoiceNumber || ''
              : '',
        })),
      )
      .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime()),
    [data?.services, data?.invoices],
  );

  const currencyCodes = Object.keys(data?.byCurrency || {});

  const openFinanceSection = (
    section: 'customers' | 'renewals' | 'collections',
    action?: 'invoice' | 'receipt' | 'service',
    scope?: { projectId?: string; serviceId?: string },
  ) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lw-finance-section', section);
      sessionStorage.setItem('lw-finance-organization-id', organizationId);
      sessionStorage.setItem('lw-finance-customer-name', organizationName);
      if (scope?.projectId) sessionStorage.setItem('lw-finance-project-id', scope.projectId);
      if (scope?.serviceId) sessionStorage.setItem('lw-finance-service-id', scope.serviceId);
      if (action) sessionStorage.setItem('lw-finance-action', action);
    }
    navigate('admin-finance');
  };

  const openProjectDates = () => {
    document.getElementById('client-projects')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const openNewProject = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lw-client-organization-id', organizationId);
      sessionStorage.setItem('lw-client-action', 'new-project');
    }
    navigate('admin-clients');
  };

  const openCustomerSms = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lw-sms-recipient', data?.organization.primaryPhone || '');
      sessionStorage.setItem('lw-sms-customer-name', data?.organization.primaryContactName || organizationName);
      sessionStorage.setItem('lw-sms-organization-id', organizationId);
    }
    navigate('admin-sms');
  };

  const openCustomerMessage = (messageId: string, mode: 'view' | 'reply') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(mode === 'reply' ? 'lw-reply-message-id' : 'lw-open-message-id', messageId);
    }
    navigate('admin-messages');
  };

  const runCustomerAction = (key: CommercialData['customer360']['nextActions'][number]['key']) => {
    if (key === 'collections' || key === 'renewals') {
      openFinanceSection(key);
      return;
    }
    if (key === 'support' || key === 'projects') {
      document.getElementById(key === 'support' ? 'client-support' : 'client-projects')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return;
    }
    void downloadStatement();
  };

  const sendReminder = async () => {
    if (!pendingReminder || !data) return;
    setReminderBusy(true);
    try {
      if (pendingReminder === 'payment_sms') {
        const target = data.customer360.collectionTarget;
        if (!target) throw new Error('No overdue invoice is available for a payment reminder');
        const response = await fetch('/api/admin/finance/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: target.id,
            type: 'sms_reminder',
            note: 'Payment reminder sent from Customer 360.',
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to send payment reminder');
        toast.success('Payment reminder SMS sent');
      } else {
        const renewal = data.customer360.nextRenewal;
        if (!renewal) throw new Error('No upcoming service renewal is available');
        const response = await fetch(
          '/api/admin/finance/services/' + encodeURIComponent(renewal.serviceId) + '/renewal-reminder',
          { method: 'POST' },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to send renewal reminder');
        toast.success('Renewal reminder SMS sent');
      }
      setPendingReminder(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send customer reminder');
    } finally {
      setReminderBusy(false);
    }
  };

  const downloadStatement = async () => {
    setStatementDownloading(true);
    try {
      const response = await fetch(
        '/api/admin/clients/' + encodeURIComponent(organizationId) + '/statement',
        { cache: 'no-store' },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to download customer statement');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || 'lightworld-customer-statement.csv';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Customer statement downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download customer statement');
    } finally {
      setStatementDownloading(false);
    }
  };
  const openPayment = (invoice?: Invoice) => {
    const currency = invoice?.currency || currencyCodes[0] || 'GHS';
    const amount = invoice?.balance || '';
    setPaymentForm({
      currency,
      amount,
      paidAt: today(),
      method: 'bank_transfer',
      reference: '',
      notes: invoice
        ? 'Receipt against ' + invoice.invoiceNumber
        : 'Customer payment recorded from the client account workspace.',
      allocations: invoice
        ? [{ invoiceId: invoice.id, amount }]
        : [{ invoiceId: '', amount: '' }],
    });
    setPaymentOpen(true);
  };

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          currency: paymentForm.currency,
          amount: Number(paymentForm.amount || 0),
          paidAt: paymentForm.paidAt,
          method: paymentForm.method,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
          allocations: paymentForm.allocations
            .filter((item) => item.invoiceId && Number(item.amount) > 0)
            .map((item) => ({
              invoiceId: item.invoiceId,
              amount: Number(item.amount),
            })),
        }),
      });
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (!response.ok) throw new Error(payload?.error || 'Unable to record customer payment');
      toast.success('Customer payment recorded and posted to the ledger');
      setPaymentOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to record customer payment');
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="size-4 text-amber-600" />
              Account & billing
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Customer receipts, invoice balances, service expiry and renewal details for {organizationName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void downloadStatement()} disabled={statementDownloading || loading}>
              {statementDownloading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Download className="mr-2 size-3.5" />}
              Statement
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => openFinanceSection('renewals')}>
              <CalendarClock className="mr-2 size-3.5" /> Renewals
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => openFinanceSection('collections')}>
              <ArrowUpRight className="mr-2 size-3.5" /> Collections
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
              Refresh
            </Button>
            <Button type="button" size="sm" onClick={() => openPayment()} disabled={loading}>
              <CreditCard className="mr-2 size-4" />
              Record customer payment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && !data ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading account and billing…
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Customer quick actions</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start the most common finance, renewal and delivery actions for {organizationName} without leaving the customer context.
                  </p>
                </div>
                <Badge variant="outline">Operational shortcuts</Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => openFinanceSection('customers', 'invoice')}>
                  <ReceiptText className="mr-2 size-4 shrink-0 text-amber-600" />
                  <span><span className="block text-xs font-semibold">Issue invoice</span><span className="block text-[10px] font-normal text-muted-foreground">Customer preselected</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => openPayment()} disabled={loading}>
                  <CreditCard className="mr-2 size-4 shrink-0 text-emerald-600" />
                  <span><span className="block text-xs font-semibold">Record payment</span><span className="block text-[10px] font-normal text-muted-foreground">Post receipt to ledger</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => openFinanceSection('customers', 'service')}>
                  <WalletCards className="mr-2 size-4 shrink-0 text-sky-600" />
                  <span><span className="block text-xs font-semibold">Add service</span><span className="block text-[10px] font-normal text-muted-foreground">Subscription or managed service</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => openFinanceSection('renewals')}>
                  <CalendarClock className="mr-2 size-4 shrink-0 text-violet-600" />
                  <span><span className="block text-xs font-semibold">Manage renewals</span><span className="block text-[10px] font-normal text-muted-foreground">Expiry, billing and reminders</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => openFinanceSection('collections')}>
                  <ArrowUpRight className="mr-2 size-4 shrink-0 text-rose-600" />
                  <span><span className="block text-xs font-semibold">Collections</span><span className="block text-[10px] font-normal text-muted-foreground">Follow-ups and promises to pay</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={openProjectDates}>
                  <FolderKanban className="mr-2 size-4 shrink-0 text-indigo-600" />
                  <span><span className="block text-xs font-semibold">Project dates</span><span className="block text-[10px] font-normal text-muted-foreground">Expiry and next renewal</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={openNewProject}>
                  <Plus className="mr-2 size-4 shrink-0 text-cyan-600" />
                  <span><span className="block text-xs font-semibold">Create project</span><span className="block text-[10px] font-normal text-muted-foreground">Customer and commercial context preselected</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={openCustomerSms} disabled={!data?.organization.primaryPhone}>
                  <MessageSquareText className="mr-2 size-4 shrink-0 text-emerald-600" />
                  <span><span className="block text-xs font-semibold">SMS customer</span><span className="block text-[10px] font-normal text-muted-foreground">{data?.organization.primaryPhone ? 'Open Hubtel composer' : 'Primary phone required'}</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => setPendingReminder('payment_sms')} disabled={!data?.customer360.collectionTarget || !data?.organization.primaryPhone || reminderBusy}>
                  <CreditCard className="mr-2 size-4 shrink-0 text-rose-600" />
                  <span><span className="block text-xs font-semibold">Payment reminder</span><span className="block text-[10px] font-normal text-muted-foreground">{data?.customer360.collectionTarget ? data.customer360.collectionTarget.invoiceNumber : 'No overdue invoice'}</span></span>
                </Button>
                <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => setPendingReminder('renewal_sms')} disabled={!data?.customer360.nextRenewal || !data?.organization.primaryPhone || reminderBusy}>
                  <CalendarClock className="mr-2 size-4 shrink-0 text-violet-600" />
                  <span><span className="block text-xs font-semibold">Renewal reminder</span><span className="block text-[10px] font-normal text-muted-foreground">{data?.customer360.nextRenewal ? data.customer360.nextRenewal.serviceName : 'No upcoming renewal'}</span></span>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-500/[0.07] via-background to-background dark:border-indigo-900/40">
              <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="size-4 text-indigo-600 dark:text-indigo-300" />
                    <p className="text-sm font-semibold">Executive intelligence brief</p>
                  </div>
                  <p className="mt-2 text-sm font-medium">{data?.customer360.executiveBrief.headline}</p>
                  <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">{data?.customer360.executiveBrief.summary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      data?.customer360.executiveBrief.posture === 'intervention_required'
                        ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                        : data?.customer360.executiveBrief.posture === 'attention'
                          ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'
                          : 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300'
                    }
                  >
                    {pretty(data?.customer360.executiveBrief.posture || 'stable')}
                  </Badge>
                  {data?.customer360.executiveBrief.generatedAt && (
                    <span className="text-[10px] text-muted-foreground">As of {new Date(data.customer360.executiveBrief.generatedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Management priorities</p>
                  <div className="mt-3 grid gap-2">
                    {(data?.customer360.executiveBrief.priorities || []).map((priority) => (
                      <button
                        key={priority.key + ':' + priority.label}
                        type="button"
                        onClick={() => runCustomerAction(priority.key)}
                        className="group flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-500/[0.03]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold">{priority.label}</p>
                            <Badge variant="outline" className={priority.severity === 'high' ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300' : priority.severity === 'medium' ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300' : ''}>
                              {pretty(priority.severity)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{priority.detail}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">Evidence: {priority.evidence}</p>
                        </div>
                        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition group-hover:text-indigo-600" />
                      </button>
                    ))}
                    {!data?.customer360.executiveBrief.priorities.length && (
                      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                        No material exception is currently prioritized by the evidence rules.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Next 30 days</p>
                  <div className="mt-3 space-y-2">
                    {(data?.customer360.executiveBrief.next30Days || []).map((row) => (
                      <div key={row.currency} className="rounded-xl border border-border/60 bg-background/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold">{row.currency}</p>
                          <p className="text-sm font-bold">{money(row.potential, row.currency)}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                          <span>Receivables<br /><strong className="text-foreground">{money(row.receivablesDue, row.currency)}</strong></span>
                          <span>Renewals<br /><strong className="text-foreground">{money(row.renewals, row.currency)}</strong></span>
                        </div>
                      </div>
                    ))}
                    {!data?.customer360.executiveBrief.next30Days.length && (
                      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">No scheduled receivable or renewal value in the next 30 days.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 px-4 py-3 text-[10px] leading-5 text-muted-foreground">
                {data?.customer360.executiveBrief.controls}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80">
              <div className="flex flex-col gap-2 border-b border-border/60 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">Direct profitability</p>
                  <p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted-foreground">
                    {data?.customer360.profitability.methodology || 'Profitability is calculated from issued invoice revenue and explicitly attributed direct expenses.'}
                  </p>
                </div>
                <Badge variant="outline">Actual finance data</Badge>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                {(data?.customer360.profitability.customer || []).map((row) => (
                  <div key={row.scopeId + ':' + row.currency} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{row.currency} direct margin</p>
                      <Badge variant="outline" className={Number(row.margin) >= 0 ? 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300' : 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'}>
                        {Number(row.marginPercent).toFixed(2)}%
                      </Badge>
                    </div>
                    <p className="mt-2 text-lg font-bold">{money(row.margin, row.currency)}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <span>Revenue<br /><strong className="text-foreground">{money(row.revenue, row.currency)}</strong></span>
                      <span>Direct cost<br /><strong className="text-foreground">{money(row.directCost, row.currency)}</strong></span>
                    </div>
                  </div>
                ))}
                {!data?.customer360.profitability.customer.length && (
                  <div className="sm:col-span-2 xl:col-span-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    No attributable revenue or direct expense data is available yet. Use Record expense and choose this customer/project/service to begin profitability tracking.
                  </div>
                )}
              </div>

              {(data?.customer360.profitability.projects.length || data?.customer360.profitability.services.length) ? (
                <div className="grid gap-4 border-t border-border/60 p-4 2xl:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-border/60">
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-semibold">Project margins</p>
                      <Badge variant="outline">{data?.customer360.profitability.projects.length || 0}</Badge>
                    </div>
                    <div className="max-w-full overflow-x-auto">
                      <Table exportFileName="lightworld-client-project-profitability" className="min-w-[620px]">
                        <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Direct cost</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Margin</TableHead><TableHead data-export-ignore className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {(data?.customer360.profitability.projects || []).slice(0, 20).map((row) => (
                            <TableRow key={row.scopeId + ':' + row.currency}>
                              <TableCell className="text-xs font-medium">{row.name}</TableCell>
                              <TableCell className="text-xs">{row.currency}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.revenue, row.currency)}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.directCost, row.currency)}</TableCell>
                              <TableCell className="text-right text-xs">
                                {row.budgetAmount !== null && row.budgetAmount !== undefined
                                  ? money(row.budgetAmount, row.currency)
                                  : '—'}
                                {row.budgetUtilizationPercent !== null && row.budgetUtilizationPercent !== undefined && (
                                  <span className="block text-[10px] text-muted-foreground">{Number(row.budgetUtilizationPercent).toFixed(2)}% used</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {row.budgetRemaining !== null && row.budgetRemaining !== undefined
                                  ? <span className={Number(row.budgetRemaining) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{money(row.budgetRemaining, row.currency)}</span>
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right"><span className={Number(row.margin) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{money(row.margin, row.currency)} · {Number(row.marginPercent).toFixed(2)}%</span></TableCell>
                              <TableCell data-export-ignore className="text-right">
                                <Button type="button" size="sm" variant="outline" onClick={() => openFinanceSection('customers', undefined, { projectId: row.scopeId })}>
                                  Drill down <ArrowUpRight className="ml-1.5 size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-xl border border-border/60">
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-semibold">Service margins</p>
                      <Badge variant="outline">{data?.customer360.profitability.services.length || 0}</Badge>
                    </div>
                    <div className="max-w-full overflow-x-auto">
                      <Table exportFileName="lightworld-client-service-profitability" className="min-w-[620px]">
                        <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Direct cost</TableHead><TableHead className="text-right">Margin</TableHead><TableHead data-export-ignore className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {(data?.customer360.profitability.services || []).slice(0, 20).map((row) => (
                            <TableRow key={row.scopeId + ':' + row.currency}>
                              <TableCell className="text-xs font-medium">{row.name}</TableCell>
                              <TableCell className="text-xs">{row.currency}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.revenue, row.currency)}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.directCost, row.currency)}</TableCell>
                              <TableCell className="text-right"><span className={Number(row.margin) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{money(row.margin, row.currency)} · {Number(row.marginPercent).toFixed(2)}%</span></TableCell>
                              <TableCell data-export-ignore className="text-right">
                                <Button type="button" size="sm" variant="outline" onClick={() => openFinanceSection('customers', undefined, { serviceId: row.scopeId })}>
                                  Drill down <ArrowUpRight className="ml-1.5 size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80">
              <div className="flex flex-col gap-2 border-b border-border/60 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">30 / 90 day commercial forecast</p>
                  <p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted-foreground">
                    {data?.customer360.forecast.methodology || 'Upcoming receivables and renewal exposure by currency.'}
                  </p>
                </div>
                <Badge variant="outline">Forward view</Badge>
              </div>
              <div className="grid gap-4 p-4 2xl:grid-cols-2">
                {([
                  ['Next 30 days', data?.customer360.forecast.next30Days || []],
                  ['Next 90 days', data?.customer360.forecast.next90Days || []],
                ] as const).map(([label, rows]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-border/60">
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-semibold">{label}</p>
                      <Badge variant="outline">{rows.length} currenc{rows.length === 1 ? 'y' : 'ies'}</Badge>
                    </div>
                    <div className="max-w-full overflow-x-auto">
                      <Table exportFileName={'lightworld-client-' + label.toLowerCase().replaceAll(' ', '-') + '-forecast'} className="min-w-[680px]">
                        <TableHeader><TableRow><TableHead>Currency</TableHead><TableHead className="text-right">Receivables due</TableHead><TableHead className="text-right">Service renewals</TableHead><TableHead className="text-right">Project renewals</TableHead><TableHead className="text-right">Potential</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow key={label + ':' + row.currency}>
                              <TableCell className="text-xs font-semibold">{row.currency}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.receivablesDue, row.currency)}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.serviceRenewals, row.currency)}</TableCell>
                              <TableCell className="text-right text-xs">{money(row.projectRenewals, row.currency)}</TableCell>
                              <TableCell className="text-right text-xs font-semibold">{money(row.totalPotential, row.currency)}</TableCell>
                            </TableRow>
                          ))}
                          {!rows.length && <TableRow><TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">No receivable or renewal value is scheduled inside this horizon.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(data?.byCurrency || {}).flatMap(([currency, totals]) => [
                <div key={currency + '-invoiced'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} invoiced</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.invoiced, currency)}</p>
                </div>,
                <div key={currency + '-paid'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} paid</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.paid, currency)}</p>
                </div>,
                <div key={currency + '-outstanding'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} outstanding</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.outstanding, currency)}</p>
                </div>,
                <div key={currency + '-unapplied'} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{currency} unapplied credit</p>
                  <p className="mt-1 text-lg font-bold">{money(totals.unapplied, currency)}</p>
                </div>,
              ])}
              {!Object.keys(data?.byCurrency || {}).length && (
                <div className="sm:col-span-2 xl:col-span-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No invoices or customer payments have been recorded yet.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/[0.05] via-background to-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">Customer 360 commercial pulse</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Delivery, receivables, renewals and support signals for one client account.
                  </p>
                  {(data?.organization.primaryContactName || data?.organization.primaryEmail) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Primary contact: <span className="font-medium text-foreground">{data?.organization.primaryContactName || 'Not named'}</span>
                      {data?.organization.primaryEmail ? ' · ' + data.organization.primaryEmail : ''}
                      {data?.organization.primaryPhone ? ' · ' + data.organization.primaryPhone : ''}
                    </p>
                  )}
                </div>
                {data?.customer360.nextRenewal && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                    <p className="font-semibold text-amber-700 dark:text-amber-300">Next commercial renewal</p>
                    <p className="mt-1 font-medium">{data.customer360.nextRenewal.serviceName}</p>
                    <p className="text-muted-foreground">
                      {date(data.customer360.nextRenewal.date)} · {money(data.customer360.nextRenewal.amount, data.customer360.nextRenewal.currency)}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Account health</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className={
                          data?.customer360.accountHealth === 'healthy'
                            ? statusTone('active')
                            : data?.customer360.accountHealth === 'action_required'
                              ? statusTone('overdue')
                              : statusTone('partially_paid')
                        }>
                          {data?.customer360.accountHealth === 'healthy'
                            ? 'Healthy'
                            : data?.customer360.accountHealth === 'action_required'
                              ? 'Action required'
                              : 'Watch'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {data?.customer360.riskSignals.length || 0} active risk signal{(data?.customer360.riskSignals.length || 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(data?.customer360.riskSignals || []).map((signal) => (
                        <Badge key={signal.key} variant="outline" className={signal.severity === 'high' ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300' : 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'}>
                          {signal.label}: {signal.count}
                        </Badge>
                      ))}
                      {!data?.customer360.riskSignals.length && (
                        <Badge variant="outline">No urgent risks flagged</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Recommended next actions</p>
                  <div className="mt-3 grid gap-2">
                    {(data?.customer360.nextActions || []).map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => runCustomerAction(action.key)}
                        className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-left transition hover:border-amber-400/50 hover:bg-amber-500/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{action.label}</p>
                          <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{action.detail}</p>
                        </div>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition group-hover:text-amber-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                {[
                  { label: 'Active projects', value: data?.customer360.activeProjects || 0, Icon: FolderKanban },
                  { label: 'At-risk projects', value: data?.customer360.atRiskProjects || 0, Icon: AlertTriangle },
                  { label: 'Open tickets', value: data?.customer360.openTickets || 0, Icon: LifeBuoy },
                  { label: 'Urgent tickets', value: data?.customer360.urgentTickets || 0, Icon: AlertTriangle },
                  { label: 'SLA breaches', value: data?.customer360.slaBreaches || 0, Icon: AlertTriangle },
                  { label: 'Overdue invoices', value: data?.customer360.overdueInvoices || 0, Icon: ReceiptText },
                  { label: 'Due in 30 days', value: data?.customer360.renewalsDue30 || 0, Icon: CalendarClock },
                  { label: 'Expired services', value: data?.customer360.expiredServices || 0, Icon: History },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-xl border border-border/60 bg-background/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
                      <Icon className="size-3.5 text-amber-600" />
                    </div>
                    <p className="mt-1 text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-background/70">
                <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Recent customer activity</p>
                    <p className="text-[11px] text-muted-foreground">Payments, invoices, collections, client announcements and support conversations in one timeline.</p>
                  </div>
                  <Badge variant="outline">{data?.customer360.recentActivity.length || 0} recent</Badge>
                </div>
                <div className="divide-y divide-border/60">
                  {(data?.customer360.recentActivity || []).slice(0, 12).map((activity) => (
                    <div key={activity.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-start">
                      <div>
                        <Badge variant="outline" className="text-[10px]">{pretty(activity.type)}</Badge>
                        <p className="mt-1 text-[10px] text-muted-foreground">{new Date(activity.occurredAt).toLocaleString()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{pretty(activity.title)}</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{activity.detail}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground sm:text-right">{activity.actor}</p>
                    </div>
                  ))}
                  {!data?.customer360.recentActivity.length && (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No customer activity has been recorded yet.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Next collection follow-up</p>
                  {data?.customer360.commitments.nextCollectionFollowUp ? (
                    <>
                      <p className="mt-2 text-sm font-semibold">{data.customer360.commitments.nextCollectionFollowUp.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pretty(data.customer360.commitments.nextCollectionFollowUp.type)} · {new Date(data.customer360.commitments.nextCollectionFollowUp.nextFollowUpAt).toLocaleString()}</p>
                      {data.customer360.commitments.nextCollectionFollowUp.note && <p className="mt-2 text-xs leading-5 text-muted-foreground">{data.customer360.commitments.nextCollectionFollowUp.note}</p>}
                      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => openFinanceSection('collections')}>
                        Open collections
                      </Button>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No pending collection follow-up is scheduled.</p>
                  )}
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Next promise to pay</p>
                  {data?.customer360.commitments.nextPaymentPromise ? (
                    <>
                      <p className="mt-2 text-sm font-semibold">{data.customer360.commitments.nextPaymentPromise.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {data.customer360.commitments.nextPaymentPromise.promisedAmount
                          ? money(data.customer360.commitments.nextPaymentPromise.promisedAmount, data.customer360.commitments.nextPaymentPromise.currency) + ' · '
                          : ''}
                        {new Date(data.customer360.commitments.nextPaymentPromise.promisedDate).toLocaleDateString()}
                      </p>
                      {data.customer360.commitments.nextPaymentPromise.note && <p className="mt-2 text-xs leading-5 text-muted-foreground">{data.customer360.commitments.nextPaymentPromise.note}</p>}
                      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => openFinanceSection('collections')}>
                        Review commitment
                      </Button>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No active promise-to-pay commitment is recorded.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-background/70">
                <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Customer communications</p>
                    <p className="text-[11px] text-muted-foreground">Website enquiries and Lightworld replies matched to this client’s known email addresses.</p>
                  </div>
                  <Badge variant="outline">{data?.customer360.communicationThreads.length || 0} thread{(data?.customer360.communicationThreads.length || 0) === 1 ? '' : 's'}</Badge>
                </div>
                <div className="divide-y divide-border/60">
                  {(data?.customer360.communicationThreads || []).slice(0, 8).map((thread) => {
                    const latestReply = thread.replies[thread.replies.length - 1];
                    return (
                      <div key={thread.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-xs font-semibold">{thread.subject || 'Customer message'}</p>
                            <Badge variant="outline" className={thread.read ? '' : 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'}>
                              {thread.read ? 'Read' : 'Unread'}
                            </Badge>
                            {latestReply && (
                              <Badge variant="outline">
                                Last reply: {pretty(latestReply.status)}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{thread.name} · {thread.email} · {new Date(thread.createdAt).toLocaleString()}</p>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{thread.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{thread.replies.length} internal repl{thread.replies.length === 1 ? 'y' : 'ies'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openCustomerMessage(thread.id, 'view')}>
                            View thread
                          </Button>
                          <Button type="button" size="sm" onClick={() => openCustomerMessage(thread.id, 'reply')}>
                            Reply internally
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!data?.customer360.communicationThreads.length && (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No website message thread is currently matched to this client’s known email addresses.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 2xl:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-border/60 bg-background/70">
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Delivery portfolio</p>
                      <p className="text-[11px] text-muted-foreground">Current project health, progress and commercial dates.</p>
                    </div>
                    <Badge variant="outline">{data?.customer360.projects.length || 0}</Badge>
                  </div>
                  <div className="max-w-full overflow-x-auto">
                    <Table exportFileName="lightworld-client-project-commercial-pulse" className="min-w-[720px]">
                      <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Health</TableHead><TableHead>Progress</TableHead><TableHead>Target</TableHead><TableHead>Renewal</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(data?.customer360.projects || []).map((project) => (
                          <TableRow key={project.id}>
                            <TableCell>
                              <p className="text-xs font-semibold">{project.name}</p>
                              <p className="text-[10px] text-muted-foreground">{project.manager || pretty(project.status)}</p>
                            </TableCell>
                            <TableCell><Badge className={statusTone(project.health === 'on_track' ? 'active' : project.health)}>{pretty(project.health)}</Badge></TableCell>
                            <TableCell className="text-xs font-medium">{project.progress}%</TableCell>
                            <TableCell className="text-xs">{date(project.targetDate)}</TableCell>
                            <TableCell>
                              <p className="text-xs">{date(project.nextRenewalDate || project.expiryDate)}</p>
                              {Number(project.renewalAmount) > 0 && <p className="text-[10px] text-muted-foreground">{money(project.renewalAmount, project.renewalCurrency)} renewal</p>}
                              {Number(project.budgetAmount) > 0 && <p className="text-[10px] text-muted-foreground">{money(project.budgetAmount, project.budgetCurrency)} budget</p>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!data?.customer360.projects.length && <TableRow><TableCell colSpan={5} className="py-7 text-center text-sm text-muted-foreground">No delivery projects recorded.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-border/60 bg-background/70">
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Support pressure</p>
                      <p className="text-[11px] text-muted-foreground">Open client issues that may affect delivery or renewal confidence.</p>
                    </div>
                    <Badge variant="outline">{data?.customer360.tickets.length || 0}</Badge>
                  </div>
                  <div className="max-w-full overflow-x-auto">
                    <Table exportFileName="lightworld-client-open-support-pulse" className="min-w-[660px]">
                      <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Subject</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(data?.customer360.tickets || []).map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-mono text-xs">{ticket.ticketNumber}</TableCell>
                            <TableCell className="max-w-[240px] truncate text-xs" title={ticket.subject}>{ticket.subject}</TableCell>
                            <TableCell><Badge className={['urgent', 'critical', 'high'].includes(ticket.priority) ? statusTone('overdue') : statusTone('active')}>{pretty(ticket.priority)}</Badge></TableCell>
                            <TableCell className="text-xs">{pretty(ticket.status)}</TableCell>
                            <TableCell className="text-xs">{ticket.assignedTo || 'Unassigned'}</TableCell>
                          </TableRow>
                        ))}
                        {!data?.customer360.tickets.length && <TableRow><TableCell colSpan={5} className="py-7 text-center text-sm text-muted-foreground">No open support pressure for this client.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 2xl:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                  <div>
                    <p className="font-semibold">Invoices & balances</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Click Record payment to settle a specific invoice.</p>
                  </div>
                  <Badge variant="outline">{data?.invoices.length || 0}</Badge>
                </div>
                <div className="max-w-full overflow-x-auto">
                  <Table exportFileName="lightworld-client-account-invoices" className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Project / service</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.invoices || []).slice(0, 20).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            <p className="text-xs font-medium">{invoice.project?.name || 'General account'}</p>
                            <p className="text-[10px] text-muted-foreground">{invoice.service?.name || invoice.service?.planName || 'No linked service'}</p>
                          </TableCell>
                          <TableCell className="text-xs">{date(invoice.dueDate)}</TableCell>
                          <TableCell><Badge className={statusTone(invoice.derivedStatus)}>{pretty(invoice.derivedStatus)}</Badge></TableCell>
                          <TableCell className="text-right">{money(invoice.total, invoice.currency)}</TableCell>
                          <TableCell className="text-right font-semibold">{money(invoice.balance, invoice.currency)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Number(invoice.balance) <= 0 || ['draft', 'void'].includes(invoice.derivedStatus)}
                              onClick={() => openPayment(invoice)}
                            >
                              Record payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!data?.invoices.length && (
                        <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No invoices for this customer.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                  <div>
                    <p className="font-semibold">Service expiry & renewal</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Recurring service accounts linked to this customer or project.</p>
                  </div>
                  <Badge variant="outline">{data?.services.length || 0}</Badge>
                </div>
                <div className="max-w-full overflow-x-auto">
                  <Table exportFileName="lightworld-client-service-renewals" className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Billing</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Next due</TableHead>
                        <TableHead>Auto renew</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.services || []).map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <p className="text-xs font-semibold">{service.name}</p>
                            <p className="text-[10px] text-muted-foreground">{service.planName || pretty(service.serviceType)}</p>
                          </TableCell>
                          <TableCell className="text-xs">{service.project?.name || 'General'}</TableCell>
                          <TableCell>
                            <p className="text-xs">{money(service.recurringAmount, service.currency)}</p>
                            <p className="text-[10px] text-muted-foreground">{pretty(service.billingCycle)}</p>
                          </TableCell>
                          <TableCell className="text-xs">{date(service.expiryDate)}</TableCell>
                          <TableCell className="text-xs">{date(service.nextDueDate)}</TableCell>
                          <TableCell><Badge variant="outline">{service.autoRenew ? 'Yes' : 'No'}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {!data?.services.length && (
                        <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No recurring service accounts linked yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-border/60">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                <div>
                  <p className="font-semibold">Customer payment history</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Receipts recorded against this customer account.</p>
                </div>
                <Badge variant="outline">{data?.payments.length || 0}</Badge>
              </div>
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-client-payment-history" className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method / reference</TableHead>
                      <TableHead>Received by</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Unapplied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.payments || []).slice(0, 30).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.paymentNumber}</TableCell>
                        <TableCell className="text-xs">{date(payment.paidAt)}</TableCell>
                        <TableCell>
                          <p className="text-xs">{pretty(payment.method)}</p>
                          <p className="text-[10px] text-muted-foreground">{payment.reference || 'No reference'}</p>
                        </TableCell>
                        <TableCell className="text-xs">{payment.receivedBy}</TableCell>
                        <TableCell className="text-right font-semibold">{money(payment.amount, payment.currency)}</TableCell>
                        <TableCell className="text-right">{money(payment.unallocatedAmount, payment.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {!data?.payments.length && (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No customer payments recorded yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-border/60">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                <div>
                  <p className="flex items-center gap-2 font-semibold"><History className="size-4 text-amber-600" /> Service commercial history</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Renewals, upgrades, downgrades and date changes retained as an audit trail.</p>
                </div>
                <Badge variant="outline">{serviceHistory.length}</Badge>
              </div>
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-client-service-history" className="min-w-[980px]">
                  <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Change</TableHead><TableHead>Effective</TableHead><TableHead>Amount</TableHead><TableHead>Expiry</TableHead><TableHead>Next due</TableHead><TableHead>Source / notes</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {serviceHistory.slice(0, 50).map((change) => (
                      <TableRow key={change.id}>
                        <TableCell><p className="text-xs font-semibold">{change.serviceName}</p><p className="text-[10px] text-muted-foreground">{change.planName || '—'}</p></TableCell>
                        <TableCell><Badge variant="outline">{pretty(change.changeType)}</Badge></TableCell>
                        <TableCell className="text-xs">{date(change.effectiveAt)}</TableCell>
                        <TableCell className="text-xs">{change.previousAmount !== null || change.newAmount !== null ? (change.previousAmount !== null ? money(change.previousAmount, change.currency) : '—') + ' → ' + (change.newAmount !== null ? money(change.newAmount, change.currency) : '—') : '—'}</TableCell>
                        <TableCell className="text-xs">{date(change.previousExpiryDate)} → {date(change.newExpiryDate)}</TableCell>
                        <TableCell className="text-xs">{date(change.previousNextDueDate)} → {date(change.newNextDueDate)}</TableCell>
                        <TableCell><p className="text-xs">{change.invoiceNumber ? 'Invoice ' + change.invoiceNumber : change.changedBy || 'Manual service change'}</p>{change.notes && <p className="mt-1 max-w-sm text-[10px] leading-4 text-muted-foreground">{change.notes}</p>}</TableCell>
                      </TableRow>
                    ))}
                    {!serviceHistory.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No service changes have been recorded yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <ConfirmActionDialog
        open={Boolean(pendingReminder)}
        onOpenChange={(open) => {
          if (!open && !reminderBusy) setPendingReminder(null);
        }}
        title={pendingReminder === 'payment_sms' ? 'Send payment reminder SMS?' : 'Send renewal reminder SMS?'}
        description={
          pendingReminder === 'payment_sms' && data?.customer360.collectionTarget
            ? 'Send the approved payment-due template to ' + (data.organization.primaryPhone || 'the customer') + ' for ' + data.customer360.collectionTarget.invoiceNumber + ' (' + money(data.customer360.collectionTarget.balance, data.customer360.collectionTarget.currency) + ' outstanding). Duplicate reminders are blocked for 12 hours.'
            : pendingReminder === 'renewal_sms' && data?.customer360.nextRenewal
              ? 'Send the approved renewal template to ' + (data.organization.primaryPhone || 'the customer') + ' for ' + data.customer360.nextRenewal.serviceName + '. Duplicate reminders are blocked for 12 hours.'
              : 'Send this customer reminder?'
        }
        confirmLabel={reminderBusy ? 'Sending…' : 'Send SMS'}
        tone="default"
        onConfirm={() => void sendReminder()}
      />

      <Dialog open={paymentOpen} onOpenChange={(open) => !saving && setPaymentOpen(open)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record customer payment</DialogTitle>
            <DialogDescription>
              Record cash received from {organizationName}. Allocate it to outstanding invoices or leave any excess as unapplied customer credit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPayment} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
              <div><Label>Currency</Label><Input required maxLength={3} value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value.toUpperCase(), allocations: [{ invoiceId: '', amount: '' }] })} /></div>
              <div><Label>Payment date</Label><Input required type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} /></div>
              <div>
                <Label>Method</Label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div><Label>Payment reference</Label><Input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Bank reference, MoMo transaction ID, cheque number…" /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Allocate to invoices</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentForm((current) => ({
                    ...current,
                    allocations: [...current.allocations, { invoiceId: '', amount: '' }],
                  }))}
                >
                  <ReceiptText className="mr-2 size-3.5" /> Add allocation
                </Button>
              </div>
              {paymentForm.allocations.map((allocation, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <select
                    value={allocation.invoiceId}
                    onChange={(e) => {
                      const invoice = openInvoices.find((item) => item.id === e.target.value);
                      setPaymentForm((current) => ({
                        ...current,
                        allocations: current.allocations.map((item, itemIndex) =>
                          itemIndex === index
                            ? { invoiceId: e.target.value, amount: invoice?.balance || item.amount }
                            : item,
                        ),
                      }));
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Leave unapplied / select invoice</option>
                    {openInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} · {invoice.project?.name || 'General'} · balance {money(invoice.balance, invoice.currency)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={allocation.amount}
                    onChange={(e) => setPaymentForm((current) => ({
                      ...current,
                      allocations: current.allocations.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, amount: e.target.value } : item,
                      ),
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentForm((current) => ({
                      ...current,
                      allocations: current.allocations.filter((_, itemIndex) => itemIndex !== index),
                    }))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div><Label>Notes</Label><Textarea rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>

            <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-amber-600" />
                The receipt posts automatically to the double-entry ledger and updates invoice balances immediately.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)} disabled={saving}>Cancel</Button>
              <Button disabled={saving || Number(paymentForm.amount) <= 0}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
