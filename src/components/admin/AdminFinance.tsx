'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
   ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Download,
  FileText,
   Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  TrendingUp,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FinanceRecordDetailsDialog, { type FinanceRecordSelection } from '@/components/admin/FinanceRecordDetailsDialog';
import FinanceCustomerCredits from '@/components/admin/FinanceCustomerCredits';
import FinanceAgreementBillingControl, { type AgreementBillingRow } from '@/components/admin/FinanceAgreementBillingControl';
import FinanceAccountingWorkspace, { type FinanceAccountingView } from '@/components/admin/FinanceAccountingWorkspace';
import FinanceExecutiveDashboard, { type FinanceExecutiveDashboardData } from '@/components/admin/FinanceExecutiveDashboard';
import FinanceCollectionsWorkspace from '@/components/admin/FinanceCollectionsWorkspace';
import FinanceRenewalBillingWorkspace from '@/components/admin/FinanceRenewalBillingWorkspace';
import FinanceProcurementWorkspace from '@/components/admin/FinanceProcurementWorkspace';
import FinanceTreasuryWorkspace from '@/components/admin/FinanceTreasuryWorkspace';
import OperationalLoadError from '@/components/admin/OperationalLoadError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type Organization = {
  id: string;
  name: string;
  primaryContactName: string;
  primaryEmail: string;
  paymentTermsDays: number;
  creditLimitCurrency: string;
  creditLimit: string;
  creditHold: boolean;
  creditHoldReason: string;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    health: string;
    nextRenewalDate: string | null;
    expiryDate: string | null;
    renewalCycle: string;
    renewalCurrency: string;
    renewalAmount: string;
    autoRenew: boolean;
    renewalNoticeDays: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    planName: string;
    status: string;
    currency: string;
    recurringAmount: string;
  }>;
};

type Vendor = { id: string; name: string; email: string; phone: string; paymentTermsDays: number };

type Service = {
  id: string;
  organizationId: string;
  name: string;
  serviceType: string;
  planName: string;
  status: string;
  billingCycle: string;
  currency: string;
  recurringAmount: string;
  startDate: string;
  expiryDate: string | null;
  nextDueDate: string | null;
  autoRenew: boolean;
  renewalNoticeDays: number;
  organization: { id: string; name: string };
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
  }>;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  serviceId: string | null;
  projectId: string | null;
  agreementId: string | null;
  replacesInvoiceId: string | null;
  status: string;
  derivedStatus: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  renewalForDate: string | null;
  renewalCompletedAt: string | null;
  renewalCompletedBy: string;
  subtotal: string;
  discount: string;
  tax: string;
  taxTreatment: string;
  taxableAmount: string;
  vatRate: string;
  vatAmount: string;
  nhilRate: string;
  nhilAmount: string;
  getfundRate: string;
  getfundAmount: string;
  total: string;
  amountPaid: string;
  balance: string;
  makerCheckerRequired?: boolean;
  requestedStatus?: string;
  organization: { id: string; name: string };
  service: { id: string; name: string; planName: string } | null;
  agreement: { id: string; title: string; referenceNumber: string; agreementType: string; status: string } | null;
  lines: Array<{ id: string; description: string; quantity: string; unitPrice: string; amount: string }>;
};

type Receipt = {
  id: string;
  paymentNumber: string;
  organizationId: string;
  currency: string;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  paidAt: string;
  method: string;
  reference: string;
  organization: { id: string; name: string };
};

type BillAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
};

type Bill = {
  id: string;
  payableNumber: string;
  vendorId: string;
  vendorReference: string;
  category: string;
  status: string;
  derivedStatus: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  taxTreatment: string;
  taxRecoverable: boolean;
  taxableAmount: string;
  vatRate: string;
  vatAmount: string;
  nhilRate: string;
  nhilAmount: string;
  getfundRate: string;
  getfundAmount: string;
  total: string;
  amountPaid: string;
  balance: string;
  vendor: { id: string; name: string };
  attachments: BillAttachment[];
};

type SupplierPayment = {
  id: string;
  paymentNumber: string;
  vendorId: string;
  currency: string;
  amount: string;
  unallocatedAmount: string;
  paidAt: string;
  method: string;
  reference: string;
  vendor: { id: string; name: string };
  attachments: BillAttachment[];
};

type Expense = {
  id: string;
  expenseNumber: string;
  vendorId: string | null;
  organizationId: string | null;
  projectId: string | null;
  serviceId: string | null;
  organization: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  service: { id: string; name: string; planName: string } | null;
  category: string;
  description: string;
  currency: string;
  amount: string;
  incurredAt: string;
  paidAt: string | null;
  vendor: { id: string; name: string } | null;
};

type Dashboard = FinanceExecutiveDashboardData;

type TaxProfile = {
  id: string;
  countryCode: string;
  enabled: boolean;
  vatRegistrationNumber: string;
  vatRate: string;
  nhilRate: string;
  getfundRate: string;
  effectiveFrom: string;
  updatedBy: string;
  canManage: boolean;
  effectiveRate: string;
};

type FinanceApprovalPolicyMeta = {
  enabled: boolean;
  requireSecondApprover: boolean;
  eligibleApprovers: number;
  canApprove: boolean;
};

type FinanceData = {
  dashboard: Dashboard;
  organizations: Organization[];
  vendors: Vendor[];
  services: Service[];
  invoices: Invoice[];
  receipts: Receipt[];
  bills: Bill[];
  supplierPayments: SupplierPayment[];
  expenses: Expense[];
  taxProfile: TaxProfile | null;
  approvalPolicy: FinanceApprovalPolicyMeta;
};

type AgreementBillingContext = {
  agreementId: string;
  title: string;
  referenceNumber: string;
  projectId: string;
  projectName: string;
  currency: string;
  contractValue: string;
  contractValueBasis: 'unspecified' | 'tax_exclusive' | 'tax_inclusive';
  billingMilestoneId: string;
  billingMilestoneTitle: string;
  billingMilestoneDueDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
};

type DialogName =
  | 'service'
  | 'service-manage'
  | 'invoice'
  | 'receipt'
  | 'vendor'
  | 'bill'
  | 'supplier-payment'
  | 'expense'
  | null;

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const addDays = (dateValue: string, days: number) => {
  const base = new Date(dateValue + 'T12:00:00Z');
  if (Number.isNaN(base.getTime())) return inDays(days);
  return new Date(base.getTime() + days * 86400000).toISOString().slice(0, 10);
};

function pretty(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function payableAgingBucket(dueDate: string, balance: string | number): 'current' | '1_30' | '31_60' | '61_90' | '90_plus' | 'paid' {
  if (Number(balance || 0) <= 0) return 'paid';
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due)) return 'current';
  const daysOverdue = Math.floor((Date.now() - due) / 86400000);
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1_30';
  if (daysOverdue <= 60) return '31_60';
  if (daysOverdue <= 90) return '61_90';
  return '90_plus';
}

type SupplierDueFilter = 'all' | 'overdue' | 'next_7' | 'days_8_14' | 'days_15_30' | 'days_31_60' | 'days_61_90' | 'days_90_plus';

function payableDueBucket(dueDate: string, balance: string | number): Exclude<SupplierDueFilter, 'all'> | 'paid' {
  if (Number(balance || 0) <= 0) return 'paid';
  const date = new Date(dueDate);
  if (!Number.isFinite(date.getTime())) return 'days_90_plus';
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const daysUntilDue = Math.round((due - start) / 86400000);
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'next_7';
  if (daysUntilDue <= 14) return 'days_8_14';
  if (daysUntilDue <= 30) return 'days_15_30';
  if (daysUntilDue <= 60) return 'days_31_60';
  if (daysUntilDue <= 90) return 'days_61_90';
  return 'days_90_plus';
}

function money(value: string | number, currency = 'GHS'): string {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency + ' ' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function statusTone(status: string): string {
  if (['paid', 'active', 'completed'].includes(status)) return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (['overdue', 'expired', 'cancelled'].includes(status)) return 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  if (['partially_paid', 'suspended'].includes(status)) return 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  return 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 2 : 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store', ...init });
      const raw = await response.text();
      let payload: { data?: T; error?: string; detail?: string } | null = null;

      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { data?: T; error?: string; detail?: string };
        } catch {
          const invalid = new Error(
            'Finance endpoint returned invalid JSON (' + response.status + '): ' + url,
          );
          if (attempt < maxAttempts) {
            lastError = invalid;
            await new Promise((resolve) => window.setTimeout(resolve, 180));
            continue;
          }
          throw invalid;
        }
      }

      if (!response.ok) {
        const failed = new Error(
          payload?.error ||
          payload?.detail ||
          'Finance request failed (' + response.status + '): ' + url,
        );
        if (attempt < maxAttempts && [502, 503, 504].includes(response.status)) {
          lastError = failed;
          await new Promise((resolve) => window.setTimeout(resolve, 180));
          continue;
        }
        throw failed;
      }

      if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
        const empty = new Error('Finance endpoint returned an empty response: ' + url);
        if (attempt < maxAttempts) {
          lastError = empty;
          await new Promise((resolve) => window.setTimeout(resolve, 180));
          continue;
        }
        throw empty;
      }

      return payload.data as T;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error('Finance request failed: ' + url);
      if (attempt < maxAttempts && method === 'GET') {
        lastError = normalized;
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        continue;
      }
      throw normalized;
    }
  }

  throw lastError || new Error('Finance request failed: ' + url);
}

export default function AdminFinance() {
  const { navigate } = useAppStore();
  const [section, setSection] = useState<'overview' | 'customers' | 'renewals' | 'collections' | 'suppliers' | 'treasury' | 'procurement' | 'accounting'>('overview');
  const [accountingView, setAccountingView] = useState<FinanceAccountingView>('trial-balance');
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deepLinkOrganizationId, setDeepLinkOrganizationId] = useState('');
  const [deepLinkCustomerName, setDeepLinkCustomerName] = useState('');
  const [deepLinkProjectId, setDeepLinkProjectId] = useState('');
  const [deepLinkServiceId, setDeepLinkServiceId] = useState('');
  const [deepLinkAction, setDeepLinkAction] = useState('');
  const [deepLinkAgreementBilling, setDeepLinkAgreementBilling] = useState<AgreementBillingContext | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [financeRecord, setFinanceRecord] = useState<FinanceRecordSelection>(null);
  const [saving, setSaving] = useState(false);
  const [reminderSendingId, setReminderSendingId] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceEdit, setServiceEdit] = useState({
    planName: '',
    status: 'active',
    billingCycle: 'annual',
    recurringAmount: '',
    expiryDate: '',
    nextDueDate: '',
    autoRenew: false,
    renewalNoticeDays: '30',
    changeType: 'renewal',
    changeNotes: '',
  });

  const [serviceForm, setServiceForm] = useState({
    organizationId: '', projectId: '', name: '', serviceType: 'managed_service',
    planName: '', billingCycle: 'annual', currency: 'GHS', recurringAmount: '',
    startDate: today(), expiryDate: '', nextDueDate: '', autoRenew: false,
    renewalNoticeDays: '30', notes: '',
  });
  const [invoiceForm, setInvoiceForm] = useState({
    organizationId: '', serviceId: '', projectId: '', agreementId: '', billingMilestoneId: '', replacesInvoiceId: '', status: 'issued', currency: 'GHS',
    issueDate: today(), dueDate: inDays(14), renewalForDate: '', discount: '0', taxTreatment: 'none', notes: '',
    lines: [{ description: '', quantity: '1', unitPrice: '' }],
  });
  const [receiptForm, setReceiptForm] = useState({
    organizationId: '', currency: 'GHS', amount: '', paidAt: today(),
    method: 'bank_transfer', reference: '', notes: '',
    allocations: [{ invoiceId: '', amount: '' }],
  });
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', taxId: '', paymentTermsDays: '30', notes: '' });
  const [billForm, setBillForm] = useState({
    purchaseOrderId: '', replacesBillId: '', vendorId: '', vendorReference: '', category: 'operating_expense', currency: 'GHS',
    issueDate: today(), dueDate: inDays(30), taxableAmount: '', taxTreatment: 'none', taxRecoverable: true, notes: '',
  });
  const [billEvidenceFile, setBillEvidenceFile] = useState<File | null>(null);
  const [billEvidenceFiles, setBillEvidenceFiles] = useState<Record<string, File | null>>({});
  const [supplierPaymentEvidenceFiles, setSupplierPaymentEvidenceFiles] = useState<Record<string, File | null>>({});
  const [supplierStatementFrom, setSupplierStatementFrom] = useState('');
  const [supplierStatementTo, setSupplierStatementTo] = useState(today());
  const [supplierAgingFilter, setSupplierAgingFilter] = useState<'all' | 'current' | '1_30' | '31_60' | '61_90' | '90_plus'>('all');
  const [supplierDueFilter, setSupplierDueFilter] = useState<SupplierDueFilter>('all');
  const [supplierPaymentForm, setSupplierPaymentForm] = useState({
    vendorId: '', currency: 'GHS', amount: '', paidAt: today(),
    method: 'bank_transfer', reference: '', notes: '',
    allocations: [{ billId: '', amount: '' }],
  });
  const [expenseForm, setExpenseForm] = useState({
    vendorId: '', organizationId: '', projectId: '', serviceId: '',
    category: 'operating_expense', description: '', currency: 'GHS',
    amount: '', incurredAt: today(), paidAt: today(), method: 'bank_transfer',
    reference: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [dashboard, meta, services, invoices, receipts, bills, supplierPayments, expenses] =
        await Promise.all([
          api<Dashboard>('/api/admin/finance/dashboard'),
          api<{ organizations: Organization[]; vendors: Vendor[]; taxProfile: TaxProfile | null; approvalPolicy: FinanceApprovalPolicyMeta }>('/api/admin/finance/meta'),
          api<Service[]>('/api/admin/finance/services'),
          api<Invoice[]>('/api/admin/finance/invoices'),
          api<Receipt[]>('/api/admin/finance/payments'),
          api<Bill[]>('/api/admin/finance/bills'),
          api<SupplierPayment[]>('/api/admin/finance/vendor-payments'),
          api<Expense[]>('/api/admin/finance/expenses'),
        ]);
      setData({
        dashboard,
        organizations: meta.organizations,
        vendors: meta.vendors,
        services,
        invoices,
        receipts,
        bills,
        supplierPayments,
        expenses,
        taxProfile: meta.taxProfile,
        approvalPolicy: meta.approvalPolicy,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Finance & Accounts';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requestedSection = sessionStorage.getItem('lw-finance-section') || '';
    if (['overview', 'customers', 'renewals', 'collections', 'suppliers', 'treasury', 'accounting'].includes(requestedSection)) {
      setSection(requestedSection as 'overview' | 'customers' | 'renewals' | 'collections' | 'suppliers' | 'treasury' | 'accounting');
    }
    setDeepLinkOrganizationId(sessionStorage.getItem('lw-finance-organization-id') || '');
    setDeepLinkCustomerName(sessionStorage.getItem('lw-finance-customer-name') || '');
    setDeepLinkProjectId(sessionStorage.getItem('lw-finance-project-id') || '');
    setDeepLinkServiceId(sessionStorage.getItem('lw-finance-service-id') || '');
    setDeepLinkAction(sessionStorage.getItem('lw-finance-action') || '');
    const agreementContextRaw = sessionStorage.getItem('lw-finance-agreement-context') || '';
    if (agreementContextRaw) {
      try {
        const parsed = JSON.parse(agreementContextRaw) as Partial<AgreementBillingContext>;
        if (parsed.agreementId && parsed.title) {
          setDeepLinkAgreementBilling({
            agreementId: String(parsed.agreementId),
            title: String(parsed.title),
            referenceNumber: String(parsed.referenceNumber || ''),
            projectId: String(parsed.projectId || ''),
            projectName: String(parsed.projectName || ''),
            currency: String(parsed.currency || 'GHS').toUpperCase(),
            contractValue: String(parsed.contractValue || '0'),
            contractValueBasis:
              parsed.contractValueBasis === 'tax_exclusive' || parsed.contractValueBasis === 'tax_inclusive'
                ? parsed.contractValueBasis
                : 'unspecified',
            billingMilestoneId: String((parsed as any).billingMilestoneId || ''),
            billingMilestoneTitle: String((parsed as any).billingMilestoneTitle || ''),
            billingMilestoneDueDate: (parsed as any).billingMilestoneDueDate ? String((parsed as any).billingMilestoneDueDate) : null,
            effectiveDate: parsed.effectiveDate ? String(parsed.effectiveDate) : null,
            expiryDate: parsed.expiryDate ? String(parsed.expiryDate) : null,
          });
        }
      } catch {
        setDeepLinkAgreementBilling(null);
      }
    }
    const requestedRecordType = sessionStorage.getItem('lw-finance-record-type') || '';
    const requestedRecordId = sessionStorage.getItem('lw-finance-record-id') || '';
    if (
      requestedRecordId &&
      ['invoice', 'receipt', 'bill', 'expense'].includes(requestedRecordType)
    ) {
      setFinanceRecord({
        type: requestedRecordType as NonNullable<FinanceRecordSelection>['type'],
        id: requestedRecordId,
      });
    }
    sessionStorage.removeItem('lw-finance-section');
    sessionStorage.removeItem('lw-finance-organization-id');
    sessionStorage.removeItem('lw-finance-customer-name');
    sessionStorage.removeItem('lw-finance-project-id');
    sessionStorage.removeItem('lw-finance-service-id');
    sessionStorage.removeItem('lw-finance-action');
    sessionStorage.removeItem('lw-finance-agreement-context');
    sessionStorage.removeItem('lw-finance-record-type');
    sessionStorage.removeItem('lw-finance-record-id');
  }, []);

  useEffect(() => {
    if (!data || !deepLinkAction || !deepLinkOrganizationId) return;
    const organization = data.organizations.find((item) => item.id === deepLinkOrganizationId);
    if (!organization) {
      setDeepLinkAction('');
      return;
    }

    setSection('customers');

    if (deepLinkAction === 'agreement-invoice' && deepLinkAgreementBilling) {
      const issueDate = today();
      const contractValue = Number(deepLinkAgreementBilling.contractValue || 0);
      const agreementLabel = [
        deepLinkAgreementBilling.title,
        deepLinkAgreementBilling.referenceNumber ? '(' + deepLinkAgreementBilling.referenceNumber + ')' : '',
      ].filter(Boolean).join(' ');
      setInvoiceForm({
        organizationId: organization.id,
        serviceId: '',
        projectId: deepLinkAgreementBilling.projectId || '',
        agreementId: deepLinkAgreementBilling.agreementId,
        billingMilestoneId: deepLinkAgreementBilling.billingMilestoneId || '',
        replacesInvoiceId: '',
        status: 'draft',
        currency: deepLinkAgreementBilling.currency || 'GHS',
        issueDate,
        dueDate: addDays(issueDate, organization.paymentTermsDays ?? 30),
        renewalForDate: '',
        discount: '0',
        taxTreatment: 'none',
        notes:
          'Prepared from approved active agreement ' +
          agreementLabel +
          '. ' +
          (deepLinkAgreementBilling.contractValueBasis === 'tax_exclusive'
            ? 'Agreement value is tax-exclusive, so approved taxes may be added on top of the pre-tax contract value. '
            : deepLinkAgreementBilling.contractValueBasis === 'tax_inclusive'
              ? 'Agreement value is tax-inclusive; if tax is applied, adjust the pre-tax line amount so the final invoice total remains within the approved value. '
              : 'Agreement value basis is unspecified; confirm whether the contract value is tax-inclusive or tax-exclusive before issuing. ') +
          'Review invoice lines, tax treatment, dates, discounts and amount before issuing.',
        lines: [{
          description:
            agreementLabel +
            (deepLinkAgreementBilling.projectName ? ' · ' + deepLinkAgreementBilling.projectName : '') +
            ' · billing draft',
          quantity: '1',
          unitPrice: contractValue > 0 ? String(contractValue) : '',
        }],
      });
      setDialog('invoice');
    } else if (deepLinkAction === 'invoice') {
      setInvoiceForm((current) => ({
        ...current,
        organizationId: organization.id,
        serviceId: '',
        projectId: '',
        agreementId: '',
        billingMilestoneId: '',
        replacesInvoiceId: '',
        renewalForDate: '',
        dueDate: addDays(current.issueDate, organization.paymentTermsDays ?? 30),
        notes: current.notes || 'Prepared from Customer 360. Review invoice lines, tax treatment and due date before issuing.',
      }));
      setDialog('invoice');
    } else if (deepLinkAction === 'receipt') {
      setReceiptForm((current) => ({
        ...current,
        organizationId: organization.id,
        notes: current.notes || 'Customer payment recorded from Customer 360.',
        allocations: [{ invoiceId: '', amount: '' }],
      }));
      setDialog('receipt');
    } else if (deepLinkAction === 'service') {
      setServiceForm((current) => ({
        ...current,
        organizationId: organization.id,
        projectId: '',
      }));
      setDialog('service');
    }

    setDeepLinkAction('');
  }, [data, deepLinkAction, deepLinkOrganizationId, deepLinkAgreementBilling]);

  const receiptInvoices = useMemo(
    () => (data?.invoices || []).filter((invoice) =>
      invoice.organizationId === receiptForm.organizationId &&
      Number(invoice.balance) > 0 &&
      !['draft', 'void', 'paid'].includes(invoice.derivedStatus)
    ),
    [data?.invoices, receiptForm.organizationId],
  );

  const supplierBills = useMemo(
    () => (data?.bills || []).filter((bill) =>
      bill.vendorId === supplierPaymentForm.vendorId &&
      Number(bill.balance) > 0 &&
      !['draft', 'rejected', 'void', 'paid'].includes(bill.derivedStatus)
    ),
    [data?.bills, supplierPaymentForm.vendorId],
  );

  const selectedBillVendor = data?.vendors.find((vendor) => vendor.id === billForm.vendorId) || null;
  const supplierDefaultDueDate = selectedBillVendor
    ? addDays(billForm.issueDate, selectedBillVendor.paymentTermsDays ?? 30)
    : addDays(billForm.issueDate, 30);

  const supplierBillsByAging = useMemo(
    () => (data?.bills || []).filter((bill) => {
      const agingBucket = payableAgingBucket(bill.dueDate, bill.balance);
      const dueBucket = payableDueBucket(bill.dueDate, bill.balance);
      return !['draft', 'rejected', 'void'].includes(bill.derivedStatus)
        && agingBucket !== 'paid'
        && (supplierAgingFilter === 'all' || agingBucket === supplierAgingFilter)
        && (supplierDueFilter === 'all' || dueBucket === supplierDueFilter);
    }),
    [data?.bills, supplierAgingFilter, supplierDueFilter],
  );

  const supplierAgingByCurrency = useMemo(() => {
    const buckets = new Map<string, {
      current: number; currentCount: number;
      '1_30': number; '1_30Count': number;
      '31_60': number; '31_60Count': number;
      '61_90': number; '61_90Count': number;
      '90_plus': number; '90_plusCount': number;
    }>();
    for (const bill of data?.bills || []) {
      if (['draft', 'rejected', 'void'].includes(bill.derivedStatus)) continue;
      const bucket = payableAgingBucket(bill.dueDate, bill.balance);
      if (bucket === 'paid') continue;
      const currency = bill.currency.trim().toUpperCase() || 'UNSPECIFIED';
      const row = buckets.get(currency) || {
        current: 0, currentCount: 0, '1_30': 0, '1_30Count': 0,
        '31_60': 0, '31_60Count': 0, '61_90': 0, '61_90Count': 0,
        '90_plus': 0, '90_plusCount': 0,
      };
      row[bucket] += Number(bill.balance || 0);
      row[(bucket + 'Count') as 'currentCount' | '1_30Count' | '31_60Count' | '61_90Count' | '90_plusCount'] += 1;
      buckets.set(currency, row);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data?.bills]);

  const scopedCustomerServices = useMemo(
    () => (data?.services || []).filter((item) =>
      (!deepLinkOrganizationId || item.organizationId === deepLinkOrganizationId) &&
      (!deepLinkProjectId || item.project?.id === deepLinkProjectId) &&
      (!deepLinkServiceId || item.id === deepLinkServiceId)
    ),
    [data?.services, deepLinkOrganizationId, deepLinkProjectId, deepLinkServiceId],
  );

  const scopedCustomerInvoices = useMemo(
    () => (data?.invoices || []).filter((item) =>
      (!deepLinkOrganizationId || item.organizationId === deepLinkOrganizationId) &&
      (!deepLinkProjectId || item.projectId === deepLinkProjectId) &&
      (!deepLinkServiceId || item.serviceId === deepLinkServiceId)
    ),
    [data?.invoices, deepLinkOrganizationId, deepLinkProjectId, deepLinkServiceId],
  );

  const scopedCustomerReceipts = useMemo(
    () => (data?.receipts || []).filter((item) =>
      !deepLinkOrganizationId || item.organizationId === deepLinkOrganizationId
    ),
    [data?.receipts, deepLinkOrganizationId],
  );

  const scopedCustomerExpenses = useMemo(
    () => (data?.expenses || []).filter((item) =>
      (!deepLinkOrganizationId || item.organizationId === deepLinkOrganizationId) &&
      (!deepLinkProjectId || item.projectId === deepLinkProjectId) &&
      (!deepLinkServiceId || item.serviceId === deepLinkServiceId)
    ),
    [data?.expenses, deepLinkOrganizationId, deepLinkProjectId, deepLinkServiceId],
  );

  const clearCustomerScope = () => {
    setDeepLinkOrganizationId('');
    setDeepLinkCustomerName('');
    setDeepLinkProjectId('');
    setDeepLinkServiceId('');
  };

  const post = async (url: string, body: unknown, success: string) => {
    setSaving(true);
    try {
      await api(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      toast.success(success);
      setDialog(null);
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save finance record');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openServiceManager = (service: Service) => {
    setSelectedService(service);
    setServiceEdit({
      planName: service.planName,
      status: service.status,
      billingCycle: service.billingCycle,
      recurringAmount: service.recurringAmount,
      expiryDate: service.expiryDate ? service.expiryDate.slice(0, 10) : '',
      nextDueDate: service.nextDueDate ? service.nextDueDate.slice(0, 10) : '',
      autoRenew: service.autoRenew,
      renewalNoticeDays: String(service.renewalNoticeDays),
      changeType: 'renewal',
      changeNotes: '',
    });
    setDialog('service-manage');
  };

  const prepareRenewalInvoice = (service: Service) => {
    const todayValue = today();
    const scheduledDue = service.nextDueDate?.slice(0, 10) || '';
    const dueDate = scheduledDue && scheduledDue >= todayValue ? scheduledDue : inDays(14);
    const cycle = pretty(service.billingCycle).toLowerCase();

    setInvoiceForm({
      organizationId: service.organizationId,
      serviceId: service.id,
      projectId: service.project?.id || '',
      agreementId: '',
      billingMilestoneId: '',
      replacesInvoiceId: '',
      status: 'issued',
      currency: service.currency,
      issueDate: todayValue,
      dueDate,
      renewalForDate: (service.nextDueDate || service.expiryDate)?.slice(0, 10) || '',
      discount: '0',
      taxTreatment: 'none',
      notes: 'Prepared from the service renewal workflow. Review all amounts and terms before issuing.',
      lines: [{
        description:
          service.name +
          (service.planName ? ' · ' + service.planName : '') +
          ' · ' +
          cycle +
          ' renewal',
        quantity: '1',
        unitPrice: service.recurringAmount,
      }],
    });
    setSelectedService(null);
    setSection('customers');
    setDialog('invoice');
  };

  const prepareProjectRenewalInvoice = (projectId: string) => {
    const organization = data?.organizations.find((item) =>
      item.projects.some((project) => project.id === projectId),
    );
    const project = organization?.projects.find((item) => item.id === projectId);
    if (!organization || !project) {
      toast.error('Project renewal details are unavailable');
      return;
    }

    const todayValue = today();
    const scheduledDue = project.nextRenewalDate?.slice(0, 10) || '';
    const dueDate = scheduledDue && scheduledDue >= todayValue ? scheduledDue : inDays(14);
    const cycle = pretty(project.renewalCycle).toLowerCase();

    setInvoiceForm({
      organizationId: organization.id,
      serviceId: '',
      projectId: project.id,
      agreementId: '',
      billingMilestoneId: '',
      replacesInvoiceId: '',
      status: 'issued',
      currency: project.renewalCurrency,
      issueDate: todayValue,
      dueDate,
      renewalForDate: scheduledDue,
      discount: '0',
      taxTreatment: 'none',
      notes: 'Prepared from the project renewal workflow. Review scope, amount, tax treatment and due date before issuing.',
      lines: [{
        description: project.name + ' · ' + cycle + ' project renewal',
        quantity: '1',
        unitPrice: project.renewalAmount,
      }],
    });
    setSection('customers');
    setDialog('invoice');
  };

  const prepareAgreementControlInvoice = (row: AgreementBillingRow) => {
    const organization = data?.organizations.find((item) => item.id === row.organizationId);
    if (!organization) {
      toast.error('Client billing terms are unavailable');
      return;
    }
    if (Number(row.remainingToPrepare || 0) <= 0) {
      toast.error('No unprepared agreement value remains');
      return;
    }
    if (row.billingMilestoneCount > 0 && !row.nextMilestone) {
      toast.error('No unbilled milestone is ready to bill. Confirm milestone readiness in Client Agreements first.');
      return;
    }

    const issueDate = today();
    const milestoneAmount = row.nextMilestone?.amount || row.remainingToPrepare;
    const context: AgreementBillingContext = {
      agreementId: row.id,
      title: row.title,
      referenceNumber: row.referenceNumber,
      projectId: row.projectId || '',
      projectName: row.project?.name || '',
      currency: row.currency,
      contractValue: milestoneAmount,
      contractValueBasis: row.contractValueBasis,
      billingMilestoneId: row.nextMilestone?.id || '',
      billingMilestoneTitle: row.nextMilestone?.title || '',
      billingMilestoneDueDate: row.nextMilestone?.dueDate || null,
      effectiveDate: row.effectiveDate,
      expiryDate: row.expiryDate,
    };
    const agreementLabel = [
      row.title,
      row.referenceNumber ? '(' + row.referenceNumber + ')' : '',
    ].filter(Boolean).join(' ');

    setDeepLinkAgreementBilling(context);
    setInvoiceForm({
      organizationId: row.organizationId,
      serviceId: '',
      projectId: row.projectId || '',
      agreementId: row.id,
      billingMilestoneId: row.nextMilestone?.id || '',
      replacesInvoiceId: '',
      status: 'draft',
      currency: row.currency,
      issueDate,
      dueDate: addDays(issueDate, organization.paymentTermsDays ?? 30),
      renewalForDate: '',
      discount: '0',
      taxTreatment: 'none',
      notes:
        'Prepared from Agreement Billing Control for ' +
        agreementLabel +
        '. ' +
        (row.contractValueBasis === 'tax_exclusive'
          ? 'Remaining value is measured before tax; approved taxes may be added separately. '
          : row.contractValueBasis === 'tax_inclusive'
            ? 'Remaining value is measured against final invoice totals; if tax is applied, adjust the pre-tax line value so the final total stays within the approved agreement value. '
            : 'Contract value basis is unspecified; confirm the tax basis before relying on the remaining amount. ') +
        (row.nextMilestone
          ? 'Prepared for ready billing milestone "' + row.nextMilestone.title + '"' +
            (row.nextMilestone.dueDate ? ' due ' + new Date(row.nextMilestone.dueDate).toLocaleDateString() : '') + '. '
          : 'No unbilled milestone was selected; this uses the remaining agreement value. ') +
        'Confirm milestone entitlement, dates, discounts and amount before issuing.',
      lines: [{
        description:
          agreementLabel +
          (row.project?.name ? ' · ' + row.project.name : '') +
          ' · next billing draft',
        quantity: '1',
        unitPrice: milestoneAmount,
      }],
    });
    setSection('customers');
    setDialog('invoice');
  };

  const sendRenewalReminder = async (service: Service) => {
    setReminderSendingId(service.id);
    try {
      await api('/api/admin/finance/services/' + encodeURIComponent(service.id) + '/renewal-reminder', {
        method: 'POST',
      });
      toast.success('Renewal reminder sent through Hubtel');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send renewal reminder');
    } finally {
      setReminderSendingId('');
    }
  };

  const openFinanceRecord = (type: NonNullable<FinanceRecordSelection>['type'], id: string) => {
    setFinanceRecord({ type, id });
  };

  const prepareRejectedInvoiceReplacement = async (invoiceId: string) => {
    try {
      const record = await api<any>(
        '/api/admin/finance/records/invoice/' + encodeURIComponent(invoiceId),
      );
      const invoice = record?.invoice;
      if (!invoice || invoice.status !== 'void' || !invoice.rejectedAt) {
        toast.error('Only rejected invoice drafts can be used to prepare a replacement');
        return;
      }

      const organization = data?.organizations.find(
        (item) => item.id === invoice.organizationId,
      );
      if (!organization) {
        toast.error('Customer billing terms are unavailable for this replacement');
        return;
      }

      const issueDate = today();
      const rejectionReason = String(invoice.rejectionReason || '').trim() || 'No rejection reason recorded';
      const originalNotes = String(invoice.notes || '').trim();
      const lines = Array.isArray(invoice.lines)
        ? invoice.lines.map((line: any) => ({
            description: String(line.description || ''),
            quantity: String(line.quantity || '1'),
            unitPrice: String(line.unitPrice || ''),
          }))
        : [];

      if (!lines.length) {
        toast.error('The rejected invoice has no line items to copy');
        return;
      }

      setDeepLinkAgreementBilling(null);
      setFinanceRecord(null);
      setSection('customers');
      setInvoiceForm({
        organizationId: String(invoice.organizationId || ''),
        serviceId: String(invoice.serviceId || ''),
        projectId: String(invoice.projectId || ''),
        agreementId: String(invoice.agreementId || ''),
        billingMilestoneId: String(invoice.billingMilestoneId || ''),
        replacesInvoiceId: String(invoice.id || ''),
        status: 'draft',
        currency: String(invoice.currency || 'GHS').toUpperCase(),
        issueDate,
        dueDate: addDays(issueDate, organization.paymentTermsDays ?? 30),
        renewalForDate: invoice.renewalForDate
          ? String(invoice.renewalForDate).slice(0, 10)
          : '',
        discount: String(invoice.discount || '0'),
        taxTreatment: String(invoice.taxTreatment || 'none'),
        notes:
          'Replacement for rejected draft ' +
          String(invoice.invoiceNumber || '') +
          '. Rejection reason: ' +
          rejectionReason +
          '. Review current scope, agreement/milestone readiness, tax treatment, dates, discounts and amounts before saving.' +
          (originalNotes ? '\n\nOriginal draft notes: ' + originalNotes : ''),
        lines,
      });
      setDialog('invoice');
      toast.success('Corrected replacement draft prepared for review');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to prepare a replacement invoice draft',
      );
    }
  };

  const prepareReceiptFromInvoice = (invoice: any) => {
    const balance = String(invoice.balance || '0');
    setFinanceRecord(null);
    setSection('customers');
    setReceiptForm({
      organizationId: String(invoice.organizationId || invoice.organization?.id || ''),
      currency: String(invoice.currency || 'GHS'),
      amount: balance,
      paidAt: today(),
      method: 'bank_transfer',
      reference: '',
      notes: 'Prepared from invoice ' + String(invoice.invoiceNumber || '') + '. Confirm payment details before recording.',
      allocations: Number(balance) > 0
        ? [{ invoiceId: String(invoice.id), amount: balance }]
        : [{ invoiceId: '', amount: '' }],
    });
    setDialog('receipt');
  };

  const prepareSupplierBillReplacement = async (billId: string) => {
    try {
      const record = await api<any>(
        '/api/admin/finance/records/bill/' + encodeURIComponent(billId),
      );
      const bill = record?.bill;
      if (!bill || !['void', 'rejected'].includes(String(bill.status))) {
        toast.error('Only a voided or rejected supplier bill can be replaced');
        return;
      }
      if (bill.replacementBill) {
        toast.error('A replacement supplier bill already exists: ' + bill.replacementBill.payableNumber);
        return;
      }

      const vendor = data?.vendors.find((item) => item.id === bill.vendorId);
      if (!vendor) {
        toast.error('Supplier terms are unavailable for this replacement');
        return;
      }

      const issueDate = today();
      const reason = String(bill.voidReason || bill.rejectionReason || '').trim() || 'No correction reason recorded';

      setFinanceRecord(null);
      setSection('suppliers');
      setBillForm({
        purchaseOrderId: String(bill.purchaseOrder?.id || bill.purchaseOrderId || ''),
        replacesBillId: String(bill.id || ''),
        vendorId: String(bill.vendorId || bill.vendor?.id || ''),
        vendorReference: '',
        category: String(bill.category || 'operating_expense'),
        currency: String(bill.currency || 'GHS').toUpperCase(),
        issueDate,
        dueDate: addDays(issueDate, vendor.paymentTermsDays ?? 30),
        taxableAmount: String(bill.taxableAmount || ''),
        taxTreatment: String(bill.taxTreatment || 'none'),
        taxRecoverable: bill.taxRecoverable !== false,
        notes:
          'Replacement for ' +
          String(bill.payableNumber || '') +
          '. Correction reason: ' +
          reason +
          '. Review the corrected supplier reference, tax treatment, amount and dates, then attach fresh supplier invoice evidence before posting.',
      });
      setBillEvidenceFile(null);
      setDialog('bill');
      toast.success('Corrected supplier bill replacement prepared for review');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to prepare supplier bill replacement');
    }
  };

  const prepareSupplierPaymentFromBill = (bill: any) => {
    const balance = String(bill.balance || '0');
    setFinanceRecord(null);
    setSection('suppliers');
    setSupplierPaymentForm({
      vendorId: String(bill.vendorId || bill.vendor?.id || ''),
      currency: String(bill.currency || 'GHS'),
      amount: balance,
      paidAt: today(),
      method: 'bank_transfer',
      reference: '',
      notes: 'Prepared from supplier bill ' + String(bill.payableNumber || '') + '. Confirm payment details before recording.',
      allocations: Number(balance) > 0
        ? [{ billId: String(bill.id), amount: balance }]
        : [{ billId: '', amount: '' }],
    });
    setDialog('supplier-payment');
  };

  const submitServiceUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedService) return;
    setSaving(true);
    try {
      await api('/api/admin/finance/services/' + encodeURIComponent(selectedService.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: serviceEdit.planName,
          status: serviceEdit.status,
          billingCycle: serviceEdit.billingCycle,
          recurringAmount: Number(serviceEdit.recurringAmount || 0),
          expiryDate: serviceEdit.expiryDate || null,
          nextDueDate: serviceEdit.nextDueDate || null,
          autoRenew: serviceEdit.autoRenew,
          renewalNoticeDays: Number(serviceEdit.renewalNoticeDays || 30),
          changeType: serviceEdit.changeType,
          changeNotes: serviceEdit.changeNotes.trim(),
        }),
      });
      toast.success(
        serviceEdit.changeType === 'renewal'
          ? 'Service renewal recorded'
          : serviceEdit.changeType === 'upgrade'
            ? 'Service upgrade recorded'
            : serviceEdit.changeType === 'downgrade'
              ? 'Service downgrade recorded'
              : 'Service account updated',
      );
      setDialog(null);
      setSelectedService(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update client service');
    } finally {
      setSaving(false);
    }
  };

  const submitService = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await post('/api/admin/finance/services', {
      ...serviceForm,
      projectId: serviceForm.projectId || null,
      recurringAmount: Number(serviceForm.recurringAmount || 0),
      expiryDate: serviceForm.expiryDate || null,
      nextDueDate: serviceForm.nextDueDate || null,
      renewalNoticeDays: Number(serviceForm.renewalNoticeDays || 30),
    }, 'Client service created');
    if (ok) setServiceForm({
      organizationId: '', projectId: '', name: '', serviceType: 'managed_service',
      planName: '', billingCycle: 'annual', currency: 'GHS', recurringAmount: '',
      startDate: today(), expiryDate: '', nextDueDate: '', autoRenew: false,
      renewalNoticeDays: '30', notes: '',
    });
  };

  const submitInvoice = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const makerCheckerEnabled = Boolean(data?.approvalPolicy.enabled && data.approvalPolicy.requireSecondApprover);
      const created = await api<Invoice>('/api/admin/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invoiceForm,
          status: makerCheckerEnabled ? 'draft' : invoiceForm.status,
          serviceId: invoiceForm.serviceId || null,
          projectId: invoiceForm.projectId || null,
          agreementId: invoiceForm.agreementId || null,
          billingMilestoneId: invoiceForm.billingMilestoneId || null,
          replacesInvoiceId: invoiceForm.replacesInvoiceId || null,
          renewalForDate: invoiceForm.renewalForDate || null,
          discount: Number(invoiceForm.discount || 0),
          taxTreatment: invoiceForm.taxTreatment,
          lines: invoiceForm.lines.map((line) => ({
            ...line,
            quantity: Number(line.quantity || 0),
            unitPrice: Number(line.unitPrice || 0),
          })),
        }),
      });

      if (created.status === 'draft') {
        toast.success(
          makerCheckerEnabled || created.makerCheckerRequired
            ? 'Invoice draft saved. A different finance approver must review and issue it.'
            : 'Invoice draft saved',
        );
      } else {
        toast.success('Invoice issued');
      }

      setInvoiceForm({
        organizationId: '', serviceId: '', projectId: '', agreementId: '', billingMilestoneId: '', replacesInvoiceId: '', status: 'issued', currency: 'GHS',
        issueDate: today(), dueDate: inDays(14), renewalForDate: '', discount: '0', taxTreatment: 'none', notes: '',
        lines: [{ description: '', quantity: '1', unitPrice: '' }],
      });
      setDeepLinkAgreementBilling(null);
      setDialog(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api<any>('/api/admin/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...receiptForm,
          amount: Number(receiptForm.amount || 0),
          allocations: receiptForm.allocations
            .filter((item) => item.invoiceId && Number(item.amount) > 0)
            .map((item) => ({ invoiceId: item.invoiceId, amount: Number(item.amount) })),
        }),
      });

      if (result?.pendingApproval) {
        toast.success(
          'Customer receipt submitted for approval' +
          (result.approval?.requestNumber ? ' · ' + result.approval.requestNumber : ''),
        );
      } else {
        toast.success('Customer receipt recorded');
      }

      setReceiptForm({
        organizationId: '', currency: 'GHS', amount: '', paidAt: today(),
        method: 'bank_transfer', reference: '', notes: '',
        allocations: [{ invoiceId: '', amount: '' }],
      });
      setDialog(null);
      if (!result?.pendingApproval) await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit customer receipt');
    } finally {
      setSaving(false);
    }
  };

  const submitVendor = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await post('/api/admin/finance/vendors', {
      ...vendorForm,
      paymentTermsDays: Number(vendorForm.paymentTermsDays || 0),
    }, 'Supplier created');
    if (ok) setVendorForm({ name: '', email: '', phone: '', taxId: '', paymentTermsDays: '30', notes: '' });
  };

  const patchVendor = async (vendorId: string, update: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api('/api/admin/finance/vendors/' + vendorId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      await load();
      toast.success('Supplier terms updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update supplier terms');
    } finally {
      setSaving(false);
    }
  };

  const submitBill = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await api<Bill>('/api/admin/finance/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...billForm,
          taxableAmount: Number(billForm.taxableAmount || 0),
          taxTreatment: billForm.taxTreatment,
        }),
      });

      let evidenceUploaded = false;
      if (billEvidenceFile) {
        try {
          const formData = new FormData();
          formData.append('file', billEvidenceFile);
          await api<BillAttachment>('/api/admin/finance/bills/' + created.id + '/attachments', {
            method: 'POST',
            body: formData,
          });
          evidenceUploaded = true;
        } catch (error) {
          toast.warning(
            'Supplier bill was recorded, but the invoice PDF could not be attached. Open the bill to review and attach evidence again.',
          );
          console.error('Supplier bill evidence upload failed after bill creation:', error);
        }
      }

      toast.success(
        created.status === 'draft'
          ? evidenceUploaded
            ? 'Supplier bill draft saved with evidence and sent for approval'
            : 'Supplier bill draft saved for approval — attach supplier invoice evidence before posting'
          : evidenceUploaded
            ? 'Supplier bill and invoice evidence recorded'
            : 'Supplier bill recorded',
      );
      setBillForm({
        purchaseOrderId: '', replacesBillId: '', vendorId: '', vendorReference: '', category: 'operating_expense', currency: 'GHS',
        issueDate: today(), dueDate: inDays(30), taxableAmount: '', taxTreatment: 'none', taxRecoverable: true, notes: '',
      });
      setBillEvidenceFile(null);
      setDialog(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save supplier bill');
    } finally {
      setSaving(false);
    }
  };

  const uploadBillEvidence = async (billId: string) => {
    const file = billEvidenceFiles[billId];
    if (!file) {
      toast.error('Choose a supplier invoice PDF');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api<BillAttachment>('/api/admin/finance/bills/' + billId + '/attachments', {
        method: 'POST',
        body: formData,
      });
      setBillEvidenceFiles((current) => ({ ...current, [billId]: null }));
      toast.success('Supplier invoice evidence attached');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to attach supplier invoice evidence');
    } finally {
      setSaving(false);
    }
  };

  const uploadSupplierPaymentEvidence = async (paymentId: string) => {
    const file = supplierPaymentEvidenceFiles[paymentId];
    if (!file) {
      toast.error('Choose a payment proof file');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api<BillAttachment>('/api/admin/finance/vendor-payments/' + paymentId + '/attachments', {
        method: 'POST',
        body: formData,
      });
      setSupplierPaymentEvidenceFiles((current) => ({ ...current, [paymentId]: null }));
      toast.success('Supplier payment proof attached');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to attach supplier payment proof');
    } finally {
      setSaving(false);
    }
  };

  const downloadSupplierStatement = (vendorId: string) => {
    const params = new URLSearchParams();
    if (supplierStatementFrom) params.set('from', supplierStatementFrom);
    if (supplierStatementTo) params.set('to', supplierStatementTo);
    const query = params.toString();
    window.open(
      '/api/admin/finance/vendors/' + encodeURIComponent(vendorId) + '/statement' + (query ? '?' + query : ''),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const submitSupplierPayment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/vendor-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supplierPaymentForm,
          amount: Number(supplierPaymentForm.amount || 0),
          allocations: supplierPaymentForm.allocations
            .filter((item) => item.billId && Number(item.amount) > 0)
            .map((item) => ({ billId: item.billId, amount: Number(item.amount) })),
        }),
      });
      const raw = await response.text();
      let payload: any = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch {}
      if (!response.ok) throw new Error(payload?.error || 'Unable to save supplier payment');

      if (payload?.pendingApproval) {
        toast.success(
          'Supplier payment submitted for approval' +
          (payload?.data?.requestNumber ? ' · ' + payload.data.requestNumber : ''),
        );
      } else {
        toast.success('Supplier payment recorded');
      }

      setDialog(null);
      setSupplierPaymentForm({
        vendorId: '', currency: 'GHS', amount: '', paidAt: today(),
        method: 'bank_transfer', reference: '', notes: '',
        allocations: [{ billId: '', amount: '' }],
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save supplier payment');
    } finally {
      setSaving(false);
    }
  };

  const submitExpense = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          vendorId: expenseForm.vendorId || null,
          organizationId: expenseForm.organizationId || null,
          projectId: expenseForm.projectId || null,
          serviceId: expenseForm.serviceId || null,
          amount: Number(expenseForm.amount || 0),
          paidAt: expenseForm.paidAt || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to save expense');

      toast.success(
        payload?.pendingApproval
          ? 'Expense recorded; payment submitted for approval' +
            (payload?.approval?.requestNumber ? ' · ' + payload.approval.requestNumber : '')
          : 'Expense recorded',
      );
      setExpenseForm({
        vendorId: '', organizationId: '', projectId: '', serviceId: '',
        category: 'operating_expense', description: '', currency: 'GHS',
        amount: '', incurredAt: today(), paidAt: today(), method: 'bank_transfer',
        reference: '', notes: '',
      });
      setDialog(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <OperationalLoadError
        title="Finance & Accounts is unavailable"
        message={loadError || 'The finance workspace could not be loaded.'}
        retrying={loading}
        onRetry={() => void load()}
      />
    );
  }

  const currencies = Object.entries(data.dashboard.byCurrency);
  const invoiceSubtotalPreview = invoiceForm.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0),
    0,
  );
  const invoiceTaxablePreview = Math.max(0, invoiceSubtotalPreview - Number(invoiceForm.discount || 0));
  const standardTaxPreview = invoiceForm.taxTreatment === 'standard' && Boolean(data.taxProfile?.enabled);
  const invoiceVatPreview = standardTaxPreview
    ? invoiceTaxablePreview * Number(data.taxProfile?.vatRate || 0) / 100
    : 0;
  const invoiceNhilPreview = standardTaxPreview
    ? invoiceTaxablePreview * Number(data.taxProfile?.nhilRate || 0) / 100
    : 0;
  const invoiceGetfundPreview = standardTaxPreview
    ? invoiceTaxablePreview * Number(data.taxProfile?.getfundRate || 0) / 100
    : 0;
  const invoiceTaxPreview = invoiceVatPreview + invoiceNhilPreview + invoiceGetfundPreview;
  const invoiceTotalPreview = invoiceTaxablePreview + invoiceTaxPreview;
  const billTaxablePreview = Number(billForm.taxableAmount || 0);
  const standardBillTaxPreview = billForm.taxTreatment === 'standard' && Boolean(data.taxProfile?.enabled);
  const billVatPreview = standardBillTaxPreview
    ? billTaxablePreview * Number(data.taxProfile?.vatRate || 0) / 100
    : 0;
  const billNhilPreview = standardBillTaxPreview
    ? billTaxablePreview * Number(data.taxProfile?.nhilRate || 0) / 100
    : 0;
  const billGetfundPreview = standardBillTaxPreview
    ? billTaxablePreview * Number(data.taxProfile?.getfundRate || 0) / 100
    : 0;
  const billTaxPreview = billVatPreview + billNhilPreview + billGetfundPreview;
  const billTotalPreview = billTaxablePreview + billTaxPreview;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <AdminPageHeader
        eyebrow="Finance & Accounts"
        title="Customer accounts and management finance"
        description="Track services, renewals, invoices, receipts, debtors, suppliers, payables, expenses, cashflow and management profit/loss."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} /> Refresh
          </Button>
        }
      />

      {loadError && (
        <OperationalLoadError
          title="Finance refresh failed"
          message={loadError + '. Showing the last successfully loaded finance data.'}
          retrying={loading}
          onRetry={() => void load()}
        />
      )}

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {[
          ['overview', 'Overview'],
          ['customers', 'Customer accounts'],
          ['renewals', 'Renewals'],
          ['collections', 'Collections'],
          ['suppliers', 'Suppliers & expenses'],
          ['treasury', 'Treasury'],
          ['procurement', 'Procurement'],
          ['accounting', 'Accounting'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={section === value ? 'default' : 'outline'}
            aria-pressed={section === value}
            onClick={() => setSection(value as typeof section)}
            className="shrink-0"
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Quick actions</span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setSection('customers');
            setDialog('receipt');
          }}
        >
          <ArrowDownLeft className="mr-2 size-4" />
          Record customer payment
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setSection('customers');
            setDialog('invoice');
          }}
        >
          <FileText className="mr-2 size-4" />
          Issue invoice
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setSection('renewals')}>
          Renewals
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setSection('collections')}>
          Collections
        </Button>
      </div>

      {section === 'overview' && (
        <FinanceExecutiveDashboard
          initialData={data.dashboard}
          onOpenInvoice={(invoiceId) => openFinanceRecord('invoice', invoiceId)}
          onOpenBill={(billId) => openFinanceRecord('bill', billId)}
          onOpenCustomer={(organizationId) => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('lw-client-organization-id', organizationId);
            }
            navigate('admin-clients');
          }}
          onReviewService={(serviceId) => {
            const service = data.services.find((item) => item.id === serviceId);
            if (service) openServiceManager(service);
          }}
          onPrepareRenewalInvoice={(serviceId) => {
            const service = data.services.find((item) => item.id === serviceId);
            if (service) prepareRenewalInvoice(service);
          }}
          onCollections={() => setSection('collections')}
          onRenewals={() => setSection('renewals')}
          onAgreementBilling={() => {
            setSection('customers');
            window.setTimeout(() => {
              document.getElementById('agreement-billing-control')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }, 0);
          }}
          onSuppliers={() => setSection('suppliers')}
          onCashbook={() => {
            setAccountingView('cashbook');
            setSection('accounting');
          }}
          onStatements={() => {
            setAccountingView('statements');
            setSection('accounting');
          }}
          onApprovals={() => {
            setAccountingView('approvals');
            setSection('accounting');
          }}
          onClose={() => {
            setAccountingView('close');
            setSection('accounting');
          }}
        />
      )}

      {section === 'procurement' && (
        <FinanceProcurementWorkspace
          onPrepareBill={(order) => {
            setBillForm({
              purchaseOrderId: order.id,
              replacesBillId: '',
              vendorId: order.vendorId,
              vendorReference: '',
              category: 'operating_expense',
              currency: order.currency,
              issueDate: today(),
              dueDate: inDays(14),
              taxableAmount: order.total,
              taxTreatment: 'none',
              taxRecoverable: true,
              notes: 'Prepared from received purchase order ' + order.poNumber + '. Review supplier invoice reference, tax treatment and due date before posting.',
            });
            setDialog('bill');
          }}
        />
      )}

      {section === 'customers' && (
        <div className="space-y-5">
          {(deepLinkOrganizationId || deepLinkProjectId || deepLinkServiceId) && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/15 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">Customer finance drill-down</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {deepLinkCustomerName || 'Selected customer'}
                  {deepLinkProjectId ? ' · project scope' : ''}
                  {deepLinkServiceId ? ' · service scope' : ''}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearCustomerScope}>Show all customer finance</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog('service')}><Plus className="mr-2 size-4" /> Add service</Button>
            <Button variant="outline" onClick={() => setDialog('invoice')}><FileText className="mr-2 size-4" /> Issue invoice</Button>
            <Button variant="outline" onClick={() => setDialog('receipt')}><ArrowDownLeft className="mr-2 size-4" /> Record customer payment</Button>
          </div>

          <FinanceAgreementBillingControl
            refreshKey={(data.invoices || []).map((invoice) => invoice.id + ':' + invoice.status + ':' + invoice.total).join('|')}
            organizationId={deepLinkOrganizationId}
            onPrepareDraft={prepareAgreementControlInvoice}
            onOpenInvoice={(invoiceId) => openFinanceRecord('invoice', invoiceId)}
            onOpenCustomer={(organizationId) => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('lw-client-organization-id', organizationId);
              }
              navigate('admin-clients');
            }}
          />

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">Client services & subscriptions</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
              <Table exportFileName="lightworld-client-services" className="min-w-[720px]">
                <TableHeader><TableRow><TableHead>Customer / service</TableHead><TableHead>Plan</TableHead><TableHead>Cycle</TableHead><TableHead>Expiry</TableHead><TableHead>Next due</TableHead><TableHead className="text-right">Recurring</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scopedCustomerServices.map((item) => (
                    <TableRow
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={'Open service account for ' + item.organization.name + ': ' + item.name}
                      onClick={() => openServiceManager(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openServiceManager(item);
                        }
                      }}
                      className="cursor-pointer transition hover:bg-amber-50/50 focus-visible:bg-amber-50/70 dark:hover:bg-amber-950/10 dark:focus-visible:bg-amber-950/15"
                      title="Open service account"
                    >
                      <TableCell><p className="font-medium">{item.organization.name}</p><p className="text-xs text-muted-foreground">{item.name}</p></TableCell>
                      <TableCell><p className="text-sm">{item.planName || '—'}</p><Badge className={statusTone(item.status)}>{pretty(item.status)}</Badge></TableCell>
                      <TableCell className="text-sm">{pretty(item.billingCycle)}</TableCell>
                      <TableCell className="text-xs">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'No expiry'}</TableCell>
                      <TableCell className="text-xs">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'Not set'}</TableCell>
                      <TableCell className="text-right font-semibold">{money(item.recurringAmount, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!scopedCustomerServices.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No client services recorded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div></CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">Invoice history</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
              <Table exportFileName="lightworld-client-invoices" className="min-w-[720px]">
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Issued / due</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scopedCustomerInvoices.map((item) => (
                    <TableRow
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={'Open invoice ' + item.invoiceNumber}
                      onClick={() => openFinanceRecord('invoice', item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openFinanceRecord('invoice', item.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs">{item.invoiceNumber}</TableCell>
                      <TableCell><p className="font-medium">{item.organization.name}</p><p className="text-[10px] text-muted-foreground">{item.service?.name || 'General invoice'}</p></TableCell>
                      <TableCell><Badge className={statusTone(item.derivedStatus)}>{pretty(item.derivedStatus)}</Badge></TableCell>
                      <TableCell className="text-xs"><p>{new Date(item.issueDate).toLocaleDateString()}</p><p className="text-muted-foreground">Due {new Date(item.dueDate).toLocaleDateString()}</p></TableCell>
                      <TableCell className="text-right">{money(item.total, item.currency)}</TableCell>
                      <TableCell className="text-right">{money(item.amountPaid, item.currency)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(item.balance, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!scopedCustomerInvoices.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No invoices recorded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div></CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">Customer receipts</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
              <Table exportFileName="lightworld-client-receipts" className="min-w-[720px]">
                <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Unapplied</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scopedCustomerReceipts.map((item) => (
                    <TableRow
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={'Open customer receipt ' + item.paymentNumber}
                      onClick={() => openFinanceRecord('receipt', item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openFinanceRecord('receipt', item.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs">{item.paymentNumber}</TableCell>
                      <TableCell className="font-medium">{item.organization.name}</TableCell>
                      <TableCell className="text-xs">{new Date(item.paidAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{pretty(item.method)}</TableCell>
                      <TableCell className="text-right">{money(item.amount, item.currency)}</TableCell>
                      <TableCell className="text-right">{money(item.unallocatedAmount, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!scopedCustomerReceipts.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No customer receipts recorded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div></CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader><CardTitle className="text-base">Attributed direct expenses</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
              <Table exportFileName="lightworld-customer-attributed-expenses">
                <TableHeader><TableRow><TableHead>Expense</TableHead><TableHead>Project / service</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scopedCustomerExpenses.map((item) => (
                    <TableRow key={item.id} role="button" tabIndex={0} className="cursor-pointer" onClick={() => openFinanceRecord('expense', item.id)} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openFinanceRecord('expense', item.id);
                      }
                    }}>
                      <TableCell><span className="font-mono text-xs">{item.expenseNumber}</span><p className="text-[10px] text-muted-foreground">{pretty(item.category)}</p></TableCell>
                      <TableCell><p className="text-xs font-medium">{item.project?.name || 'No project'}</p><p className="text-[10px] text-muted-foreground">{item.service?.name || 'No service'}</p></TableCell>
                      <TableCell><p className="max-w-[260px] truncate text-sm">{item.description}</p><p className="text-[10px] text-muted-foreground">{item.vendor?.name || 'No supplier'}</p></TableCell>
                      <TableCell className="text-xs">{new Date(item.incurredAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-semibold">{money(item.amount, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!scopedCustomerExpenses.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No direct expenses match this customer/project/service scope.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div></CardContent>
          </Card>

          <FinanceCustomerCredits
            invoices={scopedCustomerInvoices}
            onFinanceChanged={load}
          />
        </div>
      )}

      {section === 'treasury' && (
        <FinanceTreasuryWorkspace
          vendors={data.vendors.map((vendor) => ({ id: vendor.id, name: vendor.name }))}
          onApprovals={() => {
            setAccountingView('approvals');
            setSection('accounting');
          }}
        />
      )}

      {section === 'suppliers' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog('vendor')}><Plus className="mr-2 size-4" /> Add supplier</Button>
            <Button variant="outline" onClick={() => setDialog('bill')}><ReceiptText className="mr-2 size-4" /> Record bill</Button>
            <Button variant="outline" onClick={() => setDialog('supplier-payment')}><ArrowUpRight className="mr-2 size-4" /> Pay supplier</Button>
            <Button variant="outline" onClick={() => setDialog('expense')}><CircleDollarSign className="mr-2 size-4" /> Record expense</Button>
          </div>

          <Card className="min-w-0 border-border/60">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-base">Supplier account statements</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reconcile supplier bills and payments with opening and closing payable balances kept separate by currency.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label>From</Label><Input type="date" value={supplierStatementFrom} onChange={(event) => setSupplierStatementFrom(event.target.value)} /></div>
                  <div><Label>To</Label><Input type="date" value={supplierStatementTo} onChange={(event) => setSupplierStatementTo(event.target.value)} /></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-supplier-directory">
                  <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Payment terms</TableHead><TableHead className="text-right">Statement</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell className="text-xs">{vendor.email || '—'}</TableCell>
                        <TableCell className="text-xs">{vendor.phone || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="365"
                              defaultValue={vendor.paymentTermsDays}
                              className="h-8 w-20 text-xs"
                              aria-label={'Payment terms for ' + vendor.name}
                              onBlur={(event) => {
                                const next = Math.min(365, Math.max(0, Number(event.target.value || 0)));
                                if (next !== vendor.paymentTermsDays) void patchVendor(vendor.id, { paymentTermsDays: next });
                              }}
                            />
                            <span className="text-xs text-muted-foreground">days</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => downloadSupplierStatement(vendor.id)}>
                            <Download className="mr-2 size-3.5" /> Download statement
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.vendors.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No active suppliers are available.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Committed supplier cash schedule</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Upcoming cash requirements from open supplier bills only. Overdue and future due windows are kept separate by currency.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-supplier-cash-schedule">
                  <TableHeader><TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">0–7 days</TableHead>
                    <TableHead className="text-right">8–14 days</TableHead>
                    <TableHead className="text-right">15–30 days</TableHead>
                    <TableHead className="text-right">31–60 days</TableHead>
                    <TableHead className="text-right">61–90 days</TableHead>
                    <TableHead className="text-right">90+ days</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {Object.entries(data.dashboard.payablesSchedule || {}).map(([currency, plan]) => (
                      <TableRow key={currency}>
                        <TableCell className="font-semibold">{currency}</TableCell>
                        {([
                          ['overdue', plan.overdue],
                          ['next_7', plan.next_7],
                          ['days_8_14', plan.days_8_14],
                          ['days_15_30', plan.days_15_30],
                          ['days_31_60', plan.days_31_60],
                          ['days_61_90', plan.days_61_90],
                          ['days_90_plus', plan.days_90_plus],
                        ] as const).map(([bucket, entry]) => (
                          <TableCell key={bucket} className="text-right">
                            <button type="button" className="rounded-md px-2 py-1 text-right transition hover:bg-muted"
                              onClick={() => { setSupplierAgingFilter('all'); setSupplierDueFilter(bucket); }}
                              title={'Filter ' + entry.count + ' open bill' + (entry.count === 1 ? '' : 's') + ' in this due window'}>
                              <span className={bucket === 'overdue' ? 'block font-semibold text-rose-700 dark:text-rose-300' : 'block font-semibold'}>{money(entry.amount, currency)}</span>
                              <span className="block text-[10px] text-muted-foreground">{entry.count} bill{entry.count === 1 ? '' : 's'}</span>
                            </button>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {!Object.keys(data.dashboard.payablesSchedule || {}).length && <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No committed supplier cash requirements are recorded.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Supplier payables aging</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Open creditor balances are shown by currency and due-age band. Amounts are never converted or combined across currencies.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-supplier-payables-aging">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">1–30 days</TableHead>
                      <TableHead className="text-right">31–60 days</TableHead>
                      <TableHead className="text-right">61–90 days</TableHead>
                      <TableHead className="text-right">90+ days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierAgingByCurrency.map(([currency, row]) => (
                      <TableRow key={currency}>
                        <TableCell className="font-semibold">{currency}</TableCell>
                        {([
                          ['current', row.current, row.currentCount],
                          ['1_30', row['1_30'], row['1_30Count']],
                          ['31_60', row['31_60'], row['31_60Count']],
                          ['61_90', row['61_90'], row['61_90Count']],
                          ['90_plus', row['90_plus'], row['90_plusCount']],
                        ] as const).map(([bucket, amount, count]) => (
                          <TableCell key={bucket} className="text-right">
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 text-right transition hover:bg-muted"
                              onClick={() => { setSupplierDueFilter('all'); setSupplierAgingFilter(bucket); }}
                              title={'Filter ' + count + ' open bill' + (count === 1 ? '' : 's') + ' in this aging band'}
                            >
                              <span className="block font-semibold">{money(amount, currency)}</span>
                              <span className="block text-[10px] text-muted-foreground">{count} bill{count === 1 ? '' : 's'}</span>
                            </button>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {!supplierAgingByCurrency.length && (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No open supplier payables to age.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="min-w-0 border-border/60">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle className="text-base">Supplier bills / creditors</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Filter obligations by overdue age and/or contractual due window for payment planning.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="min-w-[170px]">
                      <Label>Aging band</Label>
                      <select aria-label="Filter supplier bills by aging band" value={supplierAgingFilter}
                        onChange={(event) => setSupplierAgingFilter(event.target.value as typeof supplierAgingFilter)}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">All aging bands</option><option value="current">Current / not due</option><option value="1_30">1–30 days overdue</option><option value="31_60">31–60 days overdue</option><option value="61_90">61–90 days overdue</option><option value="90_plus">90+ days overdue</option>
                      </select>
                    </div>
                    <div className="min-w-[170px]">
                      <Label>Due window</Label>
                      <select aria-label="Filter supplier bills by due window" value={supplierDueFilter}
                        onChange={(event) => setSupplierDueFilter(event.target.value as SupplierDueFilter)}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">All due windows</option><option value="overdue">Overdue</option><option value="next_7">0–7 days</option><option value="days_8_14">8–14 days</option><option value="days_15_30">15–30 days</option><option value="days_31_60">31–60 days</option><option value="days_61_90">61–90 days</option><option value="days_90_plus">90+ days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-supplier-bills">
                  <TableHeader><TableRow><TableHead>Bill</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Aging</TableHead><TableHead>Evidence</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {supplierBillsByAging.map((item) => (
                      <TableRow
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        aria-label={'Open supplier bill ' + item.payableNumber}
                        onClick={() => openFinanceRecord('bill', item.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openFinanceRecord('bill', item.id);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-mono text-xs">{item.payableNumber}</TableCell>
                        <TableCell className="font-medium">{item.vendor.name}</TableCell>
                        <TableCell><Badge className={statusTone(item.derivedStatus)}>{pretty(item.derivedStatus)}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payableAgingBucket(item.dueDate, item.balance) === 'current'
                              ? 'Current'
                              : payableAgingBucket(item.dueDate, item.balance).replace('_', '–') + ' days'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                            {item.attachments.length ? (
                              <div className="flex flex-col gap-1">
                                {item.attachments.slice(0, 2).map((attachment) => (
                                  <button
                                    key={attachment.id}
                                    type="button"
                                    className="max-w-[180px] truncate text-left text-[10px] font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                                    onClick={() => window.open('/api/admin/finance/bill-attachments/' + attachment.id, '_blank', 'noopener,noreferrer')}
                                  >
                                    {attachment.originalName}
                                  </button>
                                ))}
                                {item.attachments.length > 2 && <span className="text-[10px] text-muted-foreground">+{item.attachments.length - 2} more</span>}
                              </div>
                            ) : (
                              <Badge variant="outline">Evidence missing</Badge>
                            )}
                            <div className="flex min-w-[190px] gap-1">
                              <Input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="h-8 max-w-[135px] text-[10px]"
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => setBillEvidenceFiles((current) => ({ ...current, [item.id]: event.target.files?.[0] || null }))}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-[10px]"
                                disabled={saving || !billEvidenceFiles[item.id]}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void uploadBillEvidence(item.id);
                                }}
                              >
                                Add PDF
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">{money(item.balance, item.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {!supplierBillsByAging.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">{data.bills.length ? 'No open supplier bills match the selected aging/due filters.' : 'No supplier bills recorded yet.'}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div></CardContent>
            </Card>

            <Card className="min-w-0 border-border/60">
              <CardHeader><CardTitle className="text-base">Direct expenses</CardTitle></CardHeader>
              <CardContent className="p-0"><div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-direct-expenses">
                  <TableHeader><TableRow><TableHead>Expense</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.expenses.map((item) => (
                      <TableRow
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        aria-label={'Open expense ' + item.expenseNumber}
                        onClick={() => openFinanceRecord('expense', item.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openFinanceRecord('expense', item.id);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <TableCell><span className="font-mono text-xs">{item.expenseNumber}</span><p className="text-[10px] text-muted-foreground">{pretty(item.category)}</p></TableCell>
                        <TableCell><p className="max-w-[260px] truncate text-sm">{item.description}</p><p className="text-[10px] text-muted-foreground">{item.vendor?.name || 'No supplier'}</p></TableCell>
                        <TableCell className="text-xs">{new Date(item.incurredAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">{money(item.amount, item.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {!data.expenses.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No direct expenses recorded yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div></CardContent>
            </Card>
          </div>

          <Card className="min-w-0 border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Supplier payment history & proof</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table exportFileName="lightworld-supplier-payments">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date / method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Unapplied</TableHead>
                      <TableHead>Proof</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.supplierPayments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.paymentNumber}</TableCell>
                        <TableCell className="font-medium">{item.vendor.name}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(item.paidAt).toLocaleDateString()}
                          <p className="text-[10px] text-muted-foreground">{pretty(item.method)}</p>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">{item.reference || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{money(item.amount, item.currency)}</TableCell>
                        <TableCell className="text-right">{money(item.unallocatedAmount, item.currency)}</TableCell>
                        <TableCell>
                          <div className="min-w-[220px] space-y-2">
                            {item.attachments.length ? (
                              <div className="flex flex-col gap-1">
                                {item.attachments.slice(0, 2).map((attachment) => (
                                  <button
                                    key={attachment.id}
                                    type="button"
                                    className="max-w-[190px] truncate text-left text-[10px] font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                                    onClick={() => window.open('/api/admin/finance/vendor-payment-attachments/' + attachment.id, '_blank', 'noopener,noreferrer')}
                                  >
                                    {attachment.originalName}
                                  </button>
                                ))}
                                {item.attachments.length > 2 && <span className="text-[10px] text-muted-foreground">+{item.attachments.length - 2} more</span>}
                              </div>
                            ) : (
                              <Badge variant="outline">{item.method === 'cash' ? 'Proof optional' : 'Proof missing'}</Badge>
                            )}
                            <div className="flex gap-1">
                              <Input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                                className="h-8 max-w-[145px] text-[10px]"
                                onChange={(event) => setSupplierPaymentEvidenceFiles((current) => ({ ...current, [item.id]: event.target.files?.[0] || null }))}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-[10px]"
                                disabled={saving || !supplierPaymentEvidenceFiles[item.id]}
                                onClick={() => void uploadSupplierPaymentEvidence(item.id)}
                              >
                                Add proof
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.supplierPayments.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          No supplier payments recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {section === 'renewals' && (
        <FinanceRenewalBillingWorkspace
          services={data.services}
          projects={data.organizations.flatMap((organization) =>
            organization.projects.map((project) => ({
              ...project,
              organizationId: organization.id,
              organization: { id: organization.id, name: organization.name },
            })),
          )}
          invoices={data.invoices}
          initialOrganizationId={deepLinkOrganizationId}
          onPrepareInvoice={(serviceId) => {
            const service = data.services.find((item) => item.id === serviceId);
            if (service) prepareRenewalInvoice(service);
          }}
          onPrepareProjectInvoice={prepareProjectRenewalInvoice}
          onOpenInvoice={(invoiceId) => openFinanceRecord('invoice', invoiceId)}
          onManageService={(serviceId) => {
            const service = data.services.find((item) => item.id === serviceId);
            if (service) openServiceManager(service);
          }}
          onOpenCustomer={(organizationId) => {
            if (typeof window !== 'undefined') sessionStorage.setItem('lw-client-organization-id', organizationId);
            navigate('admin-clients');
          }}
          onRefresh={() => void load()}
        />
      )}

      {section === 'collections' && (
        <FinanceCollectionsWorkspace
          initialQuery={deepLinkCustomerName}
          onOpenInvoice={(invoiceId) => openFinanceRecord('invoice', invoiceId)}
          onOpenCustomer={(organizationId) => {
            if (typeof window !== 'undefined') sessionStorage.setItem('lw-client-organization-id', organizationId);
            navigate('admin-clients');
          }}
        />
      )}

      {section === 'accounting' && (
        <FinanceAccountingWorkspace
          initialView={accountingView}
          onOpenInvoice={(invoiceId) => openFinanceRecord('invoice', invoiceId)}
          onOpenBill={(billId) => openFinanceRecord('bill', billId)}
          onPrepareInvoiceReplacement={prepareRejectedInvoiceReplacement}
        />
      )}

      <FinanceRecordDetailsDialog
        selection={financeRecord}
        onOpenChange={(open) => {
          if (!open) setFinanceRecord(null);
        }}
        onOpenRecord={(selection) => setFinanceRecord(selection)}
        onRecordReceipt={prepareReceiptFromInvoice}
        onPaySupplier={prepareSupplierPaymentFromBill}
        onPrepareBillReplacement={prepareSupplierBillReplacement}
      />

      <Dialog open={dialog === 'service'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Add client service / subscription</DialogTitle></DialogHeader>
          <form onSubmit={submitService} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Client</Label><select required value={serviceForm.organizationId} onChange={(e) => setServiceForm({ ...serviceForm, organizationId: e.target.value, projectId: '' })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select client</option>{data.organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
              <div><Label>Project</Label><select value={serviceForm.projectId} onChange={(e) => setServiceForm({ ...serviceForm, projectId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">No linked project</option>{data.organizations.find((org) => org.id === serviceForm.organizationId)?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Service name</Label><Input required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} /></div><div><Label>Plan / tier</Label><Input value={serviceForm.planName} onChange={(e) => setServiceForm({ ...serviceForm, planName: e.target.value })} /></div></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Billing cycle</Label><select value={serviceForm.billingCycle} onChange={(e) => setServiceForm({ ...serviceForm, billingCycle: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semiannual">Semiannual</option><option value="annual">Annual</option><option value="one_time">One-time</option><option value="custom">Custom</option></select></div>
              <div><Label>Currency</Label><Input value={serviceForm.currency} maxLength={3} onChange={(e) => setServiceForm({ ...serviceForm, currency: e.target.value.toUpperCase() })} /></div>
              <div><Label>Recurring amount</Label><Input required type="number" min="0" step="0.01" value={serviceForm.recurringAmount} onChange={(e) => setServiceForm({ ...serviceForm, recurringAmount: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3"><div><Label>Start date</Label><Input required type="date" value={serviceForm.startDate} onChange={(e) => setServiceForm({ ...serviceForm, startDate: e.target.value })} /></div><div><Label>Expiry date</Label><Input type="date" value={serviceForm.expiryDate} onChange={(e) => setServiceForm({ ...serviceForm, expiryDate: e.target.value })} /></div><div><Label>Next due date</Label><Input type="date" value={serviceForm.nextDueDate} onChange={(e) => setServiceForm({ ...serviceForm, nextDueDate: e.target.value })} /></div></div>
            <div className="flex items-center gap-3"><input type="checkbox" checked={serviceForm.autoRenew} onChange={(e) => setServiceForm({ ...serviceForm, autoRenew: e.target.checked })} /><Label>Auto-renew flag</Label><Input type="number" min="0" max="365" className="ml-auto w-28" value={serviceForm.renewalNoticeDays} onChange={(e) => setServiceForm({ ...serviceForm, renewalNoticeDays: e.target.value })} /><span className="text-xs text-muted-foreground">notice days</span></div>
            <Textarea rows={3} placeholder="Service notes" value={serviceForm.notes} onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Create service</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === 'service-manage'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setSelectedService(null);
          }
        }}
      >
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage service{selectedService ? ' · ' + selectedService.name : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <form onSubmit={submitServiceUpdate} className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Customer</p>
                  <p className="mt-1 font-semibold">{selectedService.organization.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedService.project?.name || 'No linked project'} · {selectedService.currency}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => prepareRenewalInvoice(selectedService)}
                    >
                      <FileText className="mr-1.5 size-3.5" />
                      Prepare renewal invoice
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedService.expiryDate || reminderSendingId === selectedService.id}
                      onClick={() => void sendRenewalReminder(selectedService)}
                      title={!selectedService.expiryDate ? 'Set an expiry date before sending a renewal reminder' : undefined}
                    >
                      {reminderSendingId === selectedService.id
                        ? <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        : <Send className="mr-1.5 size-3.5" />}
                      Send renewal SMS
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Change type</Label>
                    <select
                      value={serviceEdit.changeType}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, changeType: event.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="renewal">Renewal</option>
                      <option value="upgrade">Upgrade</option>
                      <option value="downgrade">Downgrade</option>
                      <option value="price_change">Price change</option>
                      <option value="suspension">Suspension</option>
                      <option value="resumption">Resumption</option>
                      <option value="correction">Correction</option>
                    </select>
                  </div>
                  <div>
                    <Label>Service status</Label>
                    <select
                      value={serviceEdit.status}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, status: event.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Plan / tier</Label>
                    <Input
                      value={serviceEdit.planName}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, planName: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Billing cycle</Label>
                    <select
                      value={serviceEdit.billingCycle}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, billingCycle: event.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semiannual">Semiannual</option>
                      <option value="annual">Annual</option>
                      <option value="one_time">One-time</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Recurring amount ({selectedService.currency})</Label>
                    <Input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceEdit.recurringAmount}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, recurringAmount: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={serviceEdit.expiryDate}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, expiryDate: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Next due date</Label>
                    <Input
                      type="date"
                      value={serviceEdit.nextDueDate}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, nextDueDate: event.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={serviceEdit.autoRenew}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, autoRenew: event.target.checked })}
                    />
                    Auto-renew flag
                  </label>
                  <div className="sm:ml-auto">
                    <Label>Renewal notice days</Label>
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      className="mt-1 w-32"
                      value={serviceEdit.renewalNoticeDays}
                      onChange={(event) => setServiceEdit({ ...serviceEdit, renewalNoticeDays: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Change / renewal note</Label>
                  <Textarea
                    rows={4}
                    maxLength={8000}
                    value={serviceEdit.changeNotes}
                    onChange={(event) => setServiceEdit({ ...serviceEdit, changeNotes: event.target.value })}
                    placeholder="Reason for upgrade, renewal terms, price change, suspension note…"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialog(null);
                      setSelectedService(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button disabled={saving}>
                    {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Save service change
                  </Button>
                </DialogFooter>
              </form>

              <aside className="min-w-0">
                <div className="sticky top-0 rounded-2xl border border-border/60 bg-muted/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Service history</p>
                    <Badge variant="outline">{selectedService.changes.length}</Badge>
                  </div>
                  <div className="mt-4 max-h-[62vh] space-y-3 overflow-y-auto pr-1">
                    {selectedService.changes.map((change) => (
                      <div key={change.id} className="rounded-xl border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">{pretty(change.changeType)}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(change.effectiveAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-2 text-xs">
                          {(change.previousPlan || '—') + ' → ' + (change.newPlan || '—')}
                        </p>
                        {(change.previousAmount !== null || change.newAmount !== null) && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {change.previousAmount !== null ? money(change.previousAmount, selectedService.currency) : '—'}
                            {' → '}
                            {change.newAmount !== null ? money(change.newAmount, selectedService.currency) : '—'}
                          </p>
                        )}
                        {(change.previousExpiryDate || change.newExpiryDate) && (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            Expiry: {change.previousExpiryDate ? new Date(change.previousExpiryDate).toLocaleDateString() : '—'}
                            {' → '}
                            {change.newExpiryDate ? new Date(change.newExpiryDate).toLocaleDateString() : '—'}
                          </p>
                        )}
                        {(change.previousNextDueDate || change.newNextDueDate) && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Next due: {change.previousNextDueDate ? new Date(change.previousNextDueDate).toLocaleDateString() : '—'}
                            {' → '}
                            {change.newNextDueDate ? new Date(change.newNextDueDate).toLocaleDateString() : '—'}
                          </p>
                        )}
                        {change.previousStatus && change.newStatus && change.previousStatus !== change.newStatus && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Status: {pretty(change.previousStatus)} → {pretty(change.newStatus)}
                          </p>
                        )}
                        {change.sourceInvoiceId && (
                          <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">Paid renewal invoice recorded</p>
                        )}
                        {change.notes && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{change.notes}</p>}
                      </div>
                    ))}
                    {!selectedService.changes.length && (
                      <p className="text-xs text-muted-foreground">No service changes recorded yet.</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'invoice'} onOpenChange={(open) => {
        if (!open) {
          setDialog(null);
          setDeepLinkAgreementBilling(null);
        }
      }}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{data.approvalPolicy.enabled ? 'Prepare customer invoice draft' : 'Issue customer invoice'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitInvoice} className="space-y-4">
            {data.approvalPolicy.enabled && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
                <p className="font-semibold">Finance maker-checker is active</p>
                <p className="mt-1 leading-5">
                  This invoice will be saved as a draft. A different administrator with Finance Approvals permission must review and issue it before any ledger posting or customer delivery.
                </p>
                <p className="mt-1 text-[10px] opacity-80">
                  Eligible approvers: {data.approvalPolicy.eligibleApprovers}
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Client</Label><select required value={invoiceForm.organizationId} onChange={(e) => {
              const organization = data.organizations.find((item) => item.id === e.target.value);
              setInvoiceForm({
                ...invoiceForm,
                organizationId: e.target.value,
                serviceId: '',
                projectId: '',
                agreementId: '',
                billingMilestoneId: '',
                replacesInvoiceId: '',
                renewalForDate: '',
                dueDate: addDays(invoiceForm.issueDate, organization?.paymentTermsDays ?? 30),
              });
              setDeepLinkAgreementBilling(null);
            }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select client</option>{data.organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div><div><Label>Service</Label><select value={invoiceForm.serviceId} onChange={(e) => {
              setInvoiceForm({ ...invoiceForm, serviceId: e.target.value, agreementId: '', billingMilestoneId: '', replacesInvoiceId: '', renewalForDate: '' });
              setDeepLinkAgreementBilling(null);
            }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">General invoice</option>{data.services.filter((x) => x.organizationId === invoiceForm.organizationId).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.planName}</option>)}</select></div></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><Label>Issue date</Label><Input type="date" required value={invoiceForm.issueDate} onChange={(e) => {
                const organization = data.organizations.find((item) => item.id === invoiceForm.organizationId);
                setInvoiceForm({
                  ...invoiceForm,
                  issueDate: e.target.value,
                  dueDate: addDays(e.target.value, organization?.paymentTermsDays ?? 30),
                });
              }} /></div>
              <div><Label>Due date</Label><Input type="date" required value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} /></div>
              <div><Label>Discount</Label><Input type="number" min="0" step="0.01" value={invoiceForm.discount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} /></div>
              <div>
                <Label>Tax treatment</Label>
                <select
                  value={invoiceForm.taxTreatment}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, taxTreatment: e.target.value })}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">No tax / not VAT invoice</option>
                  <option value="standard" disabled={!data.taxProfile?.enabled}>
                    Ghana standard VAT{data.taxProfile ? ' · ' + data.taxProfile.effectiveRate + '%' : ''}
                  </option>
                  <option value="zero">Zero-rated</option>
                  <option value="exempt">VAT exempt</option>
                </select>
              </div>
            </div>
            {invoiceForm.organizationId && (() => {
              const organization = data.organizations.find((item) => item.id === invoiceForm.organizationId);
              if (!organization) return null;
              return (
                <div className={organization.creditHold ? 'rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground'}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Payment terms <strong className="text-foreground">{organization.paymentTermsDays} days</strong>
                      {' · '}
                      Credit limit <strong className="text-foreground">{Number(organization.creditLimit) > 0 ? money(organization.creditLimit, organization.creditLimitCurrency) : 'Not limited'}</strong>
                    </span>
                    {organization.creditHold && <Badge className="border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">Credit hold</Badge>}
                  </div>
                  {organization.creditHold && <p className="mt-1">Issued invoices will be blocked: {organization.creditHoldReason || 'account is on credit hold'}. Draft invoices remain available for review.</p>}
                </div>
              );
            })()}
            {invoiceForm.agreementId && deepLinkAgreementBilling && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                <p className="font-semibold">Originating agreement</p>
                <p className="mt-1">
                  {deepLinkAgreementBilling.title}
                  {deepLinkAgreementBilling.referenceNumber ? ' · ' + deepLinkAgreementBilling.referenceNumber : ''}
                  {deepLinkAgreementBilling.projectName ? ' · ' + deepLinkAgreementBilling.projectName : ''}
                </p>
                <p className="mt-1 text-[10px] leading-4 opacity-80">
                  This draft will retain the agreement link for audit traceability. Review all invoice terms before issuing.
                </p>
              </div>
            )}
            {invoiceForm.renewalForDate && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                Renewal cycle: <strong>{new Date(invoiceForm.renewalForDate + 'T00:00:00Z').toLocaleDateString()}</strong>. The server prevents another non-void invoice for this service and renewal date.
              </div>
            )}
            {invoiceForm.taxTreatment === 'standard' && !data.taxProfile?.enabled && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Standard Ghana VAT is currently disabled in the company tax profile. A super admin must enable it before a standard-rated invoice can be issued.
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Taxable value</p><p className="mt-1 font-semibold">{money(invoiceTaxablePreview, invoiceForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">NHIL {standardTaxPreview ? data.taxProfile?.nhilRate + '%' : ''}</p><p className="mt-1 font-semibold">{money(invoiceNhilPreview, invoiceForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">GETFund {standardTaxPreview ? data.taxProfile?.getfundRate + '%' : ''}</p><p className="mt-1 font-semibold">{money(invoiceGetfundPreview, invoiceForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">VAT {standardTaxPreview ? data.taxProfile?.vatRate + '%' : ''}</p><p className="mt-1 font-semibold">{money(invoiceVatPreview, invoiceForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Total tax</p><p className="mt-1 font-semibold">{money(invoiceTaxPreview, invoiceForm.currency)}</p></div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/15"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Invoice total</p><p className="mt-1 font-bold">{money(invoiceTotalPreview, invoiceForm.currency)}</p></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Line items</Label><Button type="button" size="sm" variant="outline" onClick={() => setInvoiceForm({ ...invoiceForm, lines: [...invoiceForm.lines, { description: '', quantity: '1', unitPrice: '' }] })}><Plus className="mr-1 size-3.5" /> Line</Button></div>
              {invoiceForm.lines.map((line, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_150px_auto]">
                  <Input required placeholder="Description" value={line.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, lines: invoiceForm.lines.map((item, i) => i === index ? { ...item, description: e.target.value } : item) })} />
                  <Input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => setInvoiceForm({ ...invoiceForm, lines: invoiceForm.lines.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item) })} />
                  <Input required type="number" min="0" step="0.01" placeholder="Unit price" value={line.unitPrice} onChange={(e) => setInvoiceForm({ ...invoiceForm, lines: invoiceForm.lines.map((item, i) => i === index ? { ...item, unitPrice: e.target.value } : item) })} />
                  <Button type="button" variant="ghost" disabled={invoiceForm.lines.length === 1} onClick={() => setInvoiceForm({ ...invoiceForm, lines: invoiceForm.lines.filter((_, i) => i !== index) })}>Remove</Button>
                </div>
              ))}
            </div>
            <Textarea rows={3} placeholder="Invoice notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Issue invoice</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'receipt'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Record customer receipt</DialogTitle></DialogHeader>
          <form onSubmit={submitReceipt} className="space-y-4">
            <div><Label>Client</Label><select required value={receiptForm.organizationId} onChange={(e) => setReceiptForm({ ...receiptForm, organizationId: e.target.value, allocations: [{ invoiceId: '', amount: '' }] })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select client</option>{data.organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
            <div className="grid gap-3 sm:grid-cols-4"><div><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={receiptForm.amount} onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} /></div><div><Label>Currency</Label><Input value={receiptForm.currency} maxLength={3} onChange={(e) => setReceiptForm({ ...receiptForm, currency: e.target.value.toUpperCase() })} /></div><div><Label>Date</Label><Input required type="date" value={receiptForm.paidAt} onChange={(e) => setReceiptForm({ ...receiptForm, paidAt: e.target.value })} /></div><div><Label>Method</Label><select value={receiptForm.method} onChange={(e) => setReceiptForm({ ...receiptForm, method: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div></div>
            <Input placeholder="Payment reference" value={receiptForm.reference} onChange={(e) => setReceiptForm({ ...receiptForm, reference: e.target.value })} />
            <div className="space-y-2"><div className="flex items-center justify-between"><Label>Allocate to invoices</Label><Button type="button" size="sm" variant="outline" onClick={() => setReceiptForm({ ...receiptForm, allocations: [...receiptForm.allocations, { invoiceId: '', amount: '' }] })}><Plus className="mr-1 size-3.5" /> Allocation</Button></div>{receiptForm.allocations.map((allocation, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]"><select value={allocation.invoiceId} onChange={(e) => setReceiptForm({ ...receiptForm, allocations: receiptForm.allocations.map((item, i) => i === index ? { ...item, invoiceId: e.target.value } : item) })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Leave unapplied / choose invoice</option>{receiptInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · balance {money(invoice.balance, invoice.currency)}</option>)}</select><Input type="number" min="0" step="0.01" placeholder="Allocate" value={allocation.amount} onChange={(e) => setReceiptForm({ ...receiptForm, allocations: receiptForm.allocations.map((item, i) => i === index ? { ...item, amount: e.target.value } : item) })} /><Button type="button" variant="ghost" onClick={() => setReceiptForm({ ...receiptForm, allocations: receiptForm.allocations.filter((_, i) => i !== index) })}>Remove</Button></div>)}</div>
            <Textarea rows={2} placeholder="Receipt notes" value={receiptForm.notes} onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Record receipt</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'vendor'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader><form onSubmit={submitVendor} className="space-y-3"><Input required placeholder="Supplier name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} /><Input type="email" placeholder="Email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} /><Input placeholder="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} /><Input placeholder="Tax / registration ID (optional)" value={vendorForm.taxId} onChange={(e) => setVendorForm({ ...vendorForm, taxId: e.target.value })} /><div><Label>Default payment terms (days)</Label><Input type="number" min="0" max="365" value={vendorForm.paymentTermsDays} onChange={(e) => setVendorForm({ ...vendorForm, paymentTermsDays: e.target.value })} /><p className="mt-1 text-[10px] text-muted-foreground">Used to propose supplier bill due dates. Finance may override a bill due date when the supplier invoice states different terms.</p></div><Textarea placeholder="Supplier notes" value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} /><DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving}>Save supplier</Button></DialogFooter></form></DialogContent>
      </Dialog>

      <Dialog
        open={dialog === 'bill'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setBillForm((current) => ({ ...current, purchaseOrderId: '', replacesBillId: '' }));
            setBillEvidenceFile(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record supplier bill</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitBill} className="space-y-4">
            {billForm.replacesBillId && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-semibold">Corrected supplier bill replacement</p>
                <p className="mt-1">The predecessor remains in audit history. Attach the corrected supplier invoice PDF; previous evidence is not copied.</p>
              </div>
            )}
            {billForm.purchaseOrderId && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                Matched to a received purchase order. Supplier, currency and net amount are enforced server-side against the PO before posting.
              </div>
            )}
            <div>
              <Label>Supplier</Label>
              <select required disabled={Boolean(billForm.purchaseOrderId || billForm.replacesBillId)} value={billForm.vendorId} onChange={(e) => {
                const vendor = data.vendors.find((item) => item.id === e.target.value);
                setBillForm({
                  ...billForm,
                  vendorId: e.target.value,
                  dueDate: addDays(billForm.issueDate, vendor?.paymentTermsDays ?? 30),
                });
              }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select supplier</option>
                {data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Supplier invoice / reference</Label><Input value={billForm.vendorReference} onChange={(e) => setBillForm({ ...billForm, vendorReference: e.target.value })} /></div>
              <div><Label>Expense category</Label><Input required value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} /></div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <Label>Supplier invoice PDF evidence</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                className="mt-1"
                onChange={(event) => setBillEvidenceFile(event.target.files?.[0] || null)}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                PDF only, up to 15MB. Stored privately and linked to this payable for audit and payment review.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><Label>Issue date</Label><Input required type="date" value={billForm.issueDate} onChange={(e) => setBillForm({ ...billForm, issueDate: e.target.value, dueDate: addDays(e.target.value, selectedBillVendor?.paymentTermsDays ?? 30) })} /></div>
              <div><Label>Due date</Label><Input required type="date" value={billForm.dueDate} onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })} /></div>
              <div><Label>Net / taxable amount</Label><Input required disabled={Boolean(billForm.purchaseOrderId)} type="number" min="0.01" step="0.01" value={billForm.taxableAmount} onChange={(e) => setBillForm({ ...billForm, taxableAmount: e.target.value })} /></div>
              <div>
                <Label>Tax treatment</Label>
                <select value={billForm.taxTreatment} onChange={(e) => setBillForm({ ...billForm, taxTreatment: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="none">No tax / non-VAT bill</option>
                  <option value="standard" disabled={!data.taxProfile?.enabled}>
                    Ghana standard VAT{data.taxProfile ? ' · ' + data.taxProfile.effectiveRate + '%' : ''}
                  </option>
                  <option value="zero">Zero-rated</option>
                  <option value="exempt">VAT exempt</option>
                </select>
              </div>
            </div>

            {selectedBillVendor && (
              <div className={billForm.dueDate === supplierDefaultDueDate
                ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                : 'rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'}>
                Supplier default: <strong>{selectedBillVendor.paymentTermsDays} day terms</strong> · default due date <strong>{new Date(supplierDefaultDueDate + 'T00:00:00Z').toLocaleDateString()}</strong>.
                {billForm.dueDate !== supplierDefaultDueDate && ' This bill due date overrides the supplier default and will be recorded in the audit trail.'}
              </div>
            )}

            {billForm.taxTreatment === 'standard' && !data.taxProfile?.enabled && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Standard Ghana VAT is disabled in the company tax profile. Enable it before recording a standard-rated supplier bill.
              </div>
            )}

            {billForm.taxTreatment === 'standard' && data.taxProfile?.enabled && (
              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={billForm.taxRecoverable}
                  onChange={(e) => setBillForm({ ...billForm, taxRecoverable: e.target.checked })}
                />
                <span>
                  <span className="font-medium">Recoverable input tax</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Keep enabled only when this supplier tax is eligible to be claimed as input tax. Otherwise the tax remains part of the expense cost.
                  </span>
                </span>
              </label>
            )}

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Net cost</p><p className="mt-1 font-semibold">{money(billTaxablePreview, billForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">NHIL input</p><p className="mt-1 font-semibold">{money(billNhilPreview, billForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">GETFund input</p><p className="mt-1 font-semibold">{money(billGetfundPreview, billForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">VAT input</p><p className="mt-1 font-semibold">{money(billVatPreview, billForm.currency)}</p></div>
              <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Input tax</p><p className="mt-1 font-semibold">{money(billTaxPreview, billForm.currency)}</p></div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/15"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Amount payable</p><p className="mt-1 font-bold">{money(billTotalPreview, billForm.currency)}</p></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Currency</Label><Input required maxLength={3} value={billForm.currency} onChange={(e) => setBillForm({ ...billForm, currency: e.target.value.toUpperCase() })} /></div>
              <div><Label>Notes</Label><Input value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} /></div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button disabled={saving || !billForm.taxableAmount || (billForm.taxTreatment === 'standard' && !data.taxProfile?.enabled)}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Record bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'supplier-payment'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Record supplier payment</DialogTitle></DialogHeader><form onSubmit={submitSupplierPayment} className="space-y-3"><select required value={supplierPaymentForm.vendorId} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, vendorId: e.target.value, allocations: [{ billId: '', amount: '' }] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select supplier</option>{data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select><div className="grid gap-3 sm:grid-cols-3"><Input required type="number" min="0.01" step="0.01" placeholder="Amount" value={supplierPaymentForm.amount} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, amount: e.target.value })} /><Input required type="date" value={supplierPaymentForm.paidAt} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, paidAt: e.target.value })} /><select value={supplierPaymentForm.method} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, method: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div><Input placeholder="Reference" value={supplierPaymentForm.reference} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, reference: e.target.value })} /><div className="space-y-2"><div className="flex justify-between"><Label>Allocate to bills</Label><Button type="button" size="sm" variant="outline" onClick={() => setSupplierPaymentForm({ ...supplierPaymentForm, allocations: [...supplierPaymentForm.allocations, { billId: '', amount: '' }] })}><Plus className="mr-1 size-3.5" /> Allocation</Button></div>{supplierPaymentForm.allocations.map((allocation, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]"><select value={allocation.billId} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, allocations: supplierPaymentForm.allocations.map((item, i) => i === index ? { ...item, billId: e.target.value } : item) })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Leave unapplied / choose bill</option>{supplierBills.map((bill) => (
  <option key={bill.id} value={bill.id} disabled={!bill.attachments.length}>
    {bill.payableNumber} · {money(bill.balance, bill.currency)}{bill.attachments.length ? ' · evidence verified' : ' · evidence required'}
  </option>
))}</select><Input type="number" min="0" step="0.01" value={allocation.amount} onChange={(e) => setSupplierPaymentForm({ ...supplierPaymentForm, allocations: supplierPaymentForm.allocations.map((item, i) => i === index ? { ...item, amount: e.target.value } : item) })} /><Button type="button" variant="ghost" onClick={() => setSupplierPaymentForm({ ...supplierPaymentForm, allocations: supplierPaymentForm.allocations.filter((_, i) => i !== index) })}>Remove</Button></div>)}</div><p className="text-xs text-muted-foreground">Allocated supplier bills must have at least one uploaded invoice PDF. Unapplied supplier advances can still be recorded without a bill allocation.</p><DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving}>Record payment</Button></DialogFooter></form></DialogContent>
      </Dialog>

      <Dialog open={dialog === 'expense'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record direct expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitExpense} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Supplier</Label>
                <select value={expenseForm.vendorId} onChange={(e) => setExpenseForm({ ...expenseForm, vendorId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No linked supplier</option>
                  {data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Customer attribution</Label>
                <select
                  value={expenseForm.organizationId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, organizationId: e.target.value, projectId: '', serviceId: '' })}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">General company expense</option>
                  {data.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                </select>
              </div>
            </div>

            {expenseForm.organizationId && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Project</Label>
                  <select
                    value={expenseForm.projectId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, projectId: e.target.value, serviceId: '' })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Customer-level / no project</option>
                    {(data.organizations.find((organization) => organization.id === expenseForm.organizationId)?.projects || []).map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Service</Label>
                  <select
                    value={expenseForm.serviceId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, serviceId: e.target.value })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">No linked service</option>
                    {data.services
                      .filter((service) =>
                        service.organizationId === expenseForm.organizationId
                        && (!expenseForm.projectId || !service.project || service.project.id === expenseForm.projectId)
                      )
                      .map((service) => <option key={service.id} value={service.id}>{service.name}{service.planName ? ' · ' + service.planName : ''}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-100">
              Customer/project/service attribution feeds Customer 360 profitability reporting. Leave it blank only for general company overhead.
            </div>

            <Input required placeholder="Expense description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input required value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} placeholder="Category" />
              <Input required type="number" min="0.01" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Incurred date</Label><Input required type="date" value={expenseForm.incurredAt} onChange={(e) => setExpenseForm({ ...expenseForm, incurredAt: e.target.value })} /></div>
              <div><Label>Paid date</Label><Input type="date" value={expenseForm.paidAt} onChange={(e) => setExpenseForm({ ...expenseForm, paidAt: e.target.value })} /></div>
            </div>
            <Input placeholder="Reference" value={expenseForm.reference} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })} />
            <Textarea placeholder="Expense notes" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving}>Record expense</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}