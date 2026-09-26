'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  LifeBuoy,
  KeyRound,
  Loader2,
  LogOut,
  Megaphone,
  Send,
  ShieldCheck,
  Search,
  AlertTriangle,
  Paperclip,
  Upload,
  Download,
  Star,
  Landmark,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { companyProfile } from '@/lib/company-profile';
import { readJsonResponse } from '@/lib/client-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Milestone = {
  id: string;
  title: string;
  description: string;
  status: string;
  order: number;
  dueDate: string | null;
  completedAt: string | null;
};

type DocumentItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  summary: string;
  status: string;
  health: string;
  progress: number;
  manager: string;
  startDate: string | null;
  targetDate: string | null;
  expiryDate: string | null;
  nextRenewalDate: string | null;
  renewalCycle: string;
  renewalCurrency: string;
  renewalAmount: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  payableInvoice: {
    id: string;
    invoiceNumber: string;
    currency: string;
    balance: string;
    dueDate: string;
    derivedStatus: string;
    renewalForDate: string | null;
  } | null;
  milestones: Milestone[];
  documents: DocumentItem[];
};

type TicketMessage = {
  id: string;
  authorType: string;
  authorName: string;
  message: string;
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

type Ticket = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  lastActivityAt: string;
  unreadByClient: boolean;
  clientRating: number | null;
  clientFeedback: string;
  ratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
};


type AccountService = {
  id: string;
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
  project: { id: string; name: string } | null;
  payableInvoice: {
    id: string;
    invoiceNumber: string;
    currency: string;
    balance: string;
    dueDate: string;
    derivedStatus: string;
  } | null;
  changes: Array<{
    id: string;
    changeType: string;
    previousPlan: string;
    newPlan: string;
    previousAmount: string | null;
    newAmount: string | null;
    effectiveAt: string;
  }>;
};

type AccountInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  derivedStatus: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  renewalForDate: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  creditedAmount: string;
  refundableCredit: string;
  balance: string;
  notes: string;
  creditNotes: Array<{
    id: string;
    creditNoteNumber: string;
    issueDate: string;
    reason: string;
    subtotal: string;
    tax: string;
    total: string;
    appliedAmount: string;
    refundedAmount: string;
    refundableBalance: string;
    status: string;
    refunds: Array<{
      id: string;
      refundNumber: string;
      amount: string;
      refundedAt: string;
      method: string;
      reference: string;
      reason: string;
    }>;
  }>;
  service: { id: string; name: string; planName: string } | null;
  project: { id: string; name: string } | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
};

type AccountPayment = {
  id: string;
  paymentNumber: string;
  currency: string;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  paidAt: string;
  method: string;
  reference: string;
};

type AccountData = {
  summary: Record<string, {
    outstanding: string;
    unappliedCredit: string;
    netDue: string;
  }>;
  services: AccountService[];
  invoices: AccountInvoice[];
  payments: AccountPayment[];
  onlinePaymentsAvailable: boolean;
};

type Announcement = {
  id: string;
  projectId: string | null;
  title: string;
  body: string;
  publishAt: string;
  createdAt: string;
};

type PortalData = {
  user: { name: string; email: string; role: string };
  organization: {
    id: string;
    name: string;
    primaryContactName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
  projects: Project[];
  tickets: Ticket[];
  announcements: Announcement[];
  account: AccountData;
};

function statusLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function accountMoney(value: string | number, currency: string): string {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency + ' ' + amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

function accountStatusClass(value: string): string {
  if (['paid', 'active'].includes(value)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (['overdue', 'expired', 'cancelled'].includes(value)) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (['partially_paid', 'suspended'].includes(value)) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-white/[0.07] dark:text-white/55';
}

function healthClass(value: string): string {
  if (value === 'at_risk') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (value === 'attention') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

export default function ClientPortalPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<PortalData | null>(null);
  const [portalError, setPortalError] = useState('');
  const [portalRefreshing, setPortalRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [ticket, setTicket] = useState({ subject: '', message: '', priority: 'normal', category: 'general', projectId: '' });
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('all');
  const [ticketSending, setTicketSending] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [replyingTicketId, setReplyingTicketId] = useState('');
  const [uploadingTicketId, setUploadingTicketId] = useState('');
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { rating: number; feedback: string }>>({});
  const [ratingTicketId, setRatingTicketId] = useState('');
  const [paymentStartingId, setPaymentStartingId] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [serviceRequest, setServiceRequest] = useState({
    open: false,
    serviceId: '',
    action: 'renewal',
    requestedPlan: '',
    notes: '',
  });
  const [serviceRequestSaving, setServiceRequestSaving] = useState(false);

  const loadPortal = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/client/portal', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load the client portal');
      setData(payload.data);
      setPortalError('');
      setProfileName(String(payload?.data?.user?.name || ''));
      if (Array.isArray(payload?.data?.tickets) && payload.data.tickets.some((item: Ticket) => item.unreadByClient)) {
        void fetch('/api/client/tickets/read', { method: 'POST' }).catch(() => undefined);
      }
      return true;
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : 'Unable to load the client portal');
      return false;
    }
  };

  useEffect(() => {
    fetch('/api/client/auth', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          setSignedIn(false);
          return;
        }
        setSignedIn(true);
        const loaded = await loadPortal();
        if (loaded) await reconcileReturnedPayment();
      })
      .catch(() => setSignedIn(false))
      .finally(() => setSessionChecked(true));
  }, []);

  const reconcileReturnedPayment = async () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('payment');
    const reference = params.get('reference') || '';

    if (paymentState === 'cancelled') {
      toast.error('Hubtel payment was cancelled');
    } else if (paymentState === 'success' && reference) {
      try {
        const response = await fetch('/api/client/payments/hubtel/status?reference=' + encodeURIComponent(reference), { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to verify payment');
        if (payload?.data?.paid) {
          toast.success('Payment verified and your account has been updated');
          await loadPortal();
        } else {
          toast.message('Payment is still being verified. Refresh your account shortly.');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to verify Hubtel payment');
      }
    }

    if (paymentState) {
      params.delete('payment');
      params.delete('reference');
      const next = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', next);
    }
  };

  const payInvoice = async (invoiceId: string) => {
    setPaymentStartingId(invoiceId);
    try {
      const response = await fetch('/api/client/payments/hubtel/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to start Hubtel payment');
      if (!payload?.data?.checkoutUrl) throw new Error('Hubtel did not return a checkout URL');
      window.location.assign(String(payload.data.checkoutUrl));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start Hubtel payment');
      setPaymentStartingId('');
    }
  };

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/client/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to sign in');
      setSignedIn(true);
      const loaded = await loadPortal();
      setLogin((current) => ({ ...current, password: '' }));
      if (!loaded) {
        toast.message('Signed in successfully, but the client workspace could not be loaded yet. Use Try again to refresh it.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    setResetLoading(true);
    setResetMessage('');

    try {
      const response = await fetch('/api/client/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login.email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to request a password reset');
      setResetMessage(
        payload?.message ||
          'If an active client portal account uses that email, a secure password reset link has been sent.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request a password reset');
    } finally {
      setResetLoading(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const name = profileName.trim();
    if (name.length < 2) {
      toast.error('Enter your full name');
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to update profile');
      await loadPortal();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 12) {
      toast.error('New password must be at least 12 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password confirmation does not match');
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch('/api/client/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to change password');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(payload?.message || 'Password changed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const openServiceRequest = (service: AccountService) => {
    setServiceRequest({
      open: true,
      serviceId: service.id,
      action: 'renewal',
      requestedPlan: service.planName || '',
      notes: '',
    });
  };

  const submitServiceRequest = async (event: FormEvent) => {
    event.preventDefault();
    const service = data?.account.services.find((item) => item.id === serviceRequest.serviceId);
    if (!service) {
      toast.error('The selected service is no longer available');
      return;
    }

    const actionLabel: Record<string, string> = {
      renewal: 'Renewal',
      upgrade: 'Upgrade',
      downgrade: 'Downgrade',
      cancellation: 'Cancellation',
      plan_change: 'Plan change',
      other: 'Other service change',
    };
    const label = actionLabel[serviceRequest.action] || 'Service change';

    setServiceRequestSaving(true);
    try {
      const response = await fetch('/api/client/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: service.name + ' — ' + label + ' request',
          message: [
            'Service change request submitted from the Lightworld Client Portal.',
            '',
            'Service: ' + service.name,
            'Service ID: ' + service.id,
            'Current plan: ' + (service.planName || 'Not specified'),
            'Request type: ' + label,
            'Requested plan: ' + (serviceRequest.requestedPlan.trim() || 'Not specified'),
            'Current billing cycle: ' + statusLabel(service.billingCycle),
            'Current recurring amount: ' + accountMoney(service.recurringAmount, service.currency),
            '',
            'Client notes:',
            serviceRequest.notes.trim() || 'No additional notes supplied.',
            '',
            'This request is for review only. No service, billing or renewal state should change until an authorized Lightworld representative approves and processes it.',
          ].join('\n'),
          priority: 'normal',
          category: 'project_change',
          projectId: service.project?.id || null,
        }),
      });
      const payload = await readJsonResponse<any>(response, 'Unable to submit service request');
      setServiceRequest({
        open: false,
        serviceId: '',
        action: 'renewal',
        requestedPlan: '',
        notes: '',
      });
      await loadPortal();
      toast.success(
        payload?.data?.ticketNumber
          ? 'Service request submitted as ' + payload.data.ticketNumber
          : 'Service request submitted to Lightworld',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit service request');
    } finally {
      setServiceRequestSaving(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/client/auth', { method: 'DELETE' }).catch(() => undefined);
    setSignedIn(false);
    setData(null);
    setPortalError('');
    setLogin({ email: '', password: '' });
    setProfileOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const submitTicket = async (event: FormEvent) => {
    event.preventDefault();
    setTicketSending(true);
    try {
      const response = await fetch('/api/client/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticket.subject,
          message: ticket.message,
          priority: ticket.priority,
          category: ticket.category,
          projectId: ticket.projectId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to create ticket');
      setTicket({ subject: '', message: '', priority: 'normal', category: 'general', projectId: '' });
      await loadPortal();
      toast.success('Support request submitted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create ticket');
    } finally {
      setTicketSending(false);
    }
  };

  const submitTicketRating = async (ticketId: string) => {
    const draft = ratingDrafts[ticketId] || { rating: 0, feedback: '' };
    if (draft.rating < 1 || draft.rating > 5) return;
    setRatingTicketId(ticketId);
    try {
      const response = await fetch('/api/client/tickets/' + ticketId + '/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: draft.rating,
          feedback: draft.feedback.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to submit satisfaction feedback');
      await loadPortal();
      toast.success('Thank you for rating Lightworld support');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit satisfaction feedback');
    } finally {
      setRatingTicketId('');
    }
  };

  const uploadTicketAttachment = async (ticketId: string, file: File | null) => {
    if (!file) return;
    setUploadingTicketId(ticketId);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/client/tickets/' + ticketId + '/attachments', {
        method: 'POST',
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to upload attachment');
      await loadPortal();
      toast.success('Attachment added to support ticket');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload attachment');
    } finally {
      setUploadingTicketId('');
    }
  };

  const replyToTicket = async (ticketId: string) => {
    const message = (replies[ticketId] || '').trim();
    if (!message) return;
    setReplyingTicketId(ticketId);
    try {
      const response = await fetch('/api/client/tickets/' + ticketId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to send reply');
      setReplies((current) => ({ ...current, [ticketId]: '' }));
      await loadPortal();
      toast.success('Reply sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send reply');
    } finally {
      setReplyingTicketId('');
    }
  };

  const retryPortal = async () => {
    setPortalRefreshing(true);
    try {
      const loaded = await loadPortal();
      if (loaded) {
        toast.success('Client workspace refreshed');
        await reconcileReturnedPayment();
      }
    } finally {
      setPortalRefreshing(false);
    }
  };

  const activeProjects = useMemo(
    () => data?.projects.filter((project) => project.status !== 'completed').length || 0,
    [data],
  );

  const visibleTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    return (data?.tickets || []).filter((item) => {
      if (ticketStatus !== 'all' && item.status !== ticketStatus) return false;
      if (!query) return true;
      return [
        item.ticketNumber,
        item.subject,
        item.message,
        item.category,
        item.assignedTo,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [data?.tickets, ticketSearch, ticketStatus]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b10] text-white/45">
        <Loader2 className="mr-2 size-4 animate-spin" /> Checking secure client session…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-[#050b10] px-4 py-12 text-white">
        <div className="mx-auto grid min-h-[80vh] min-w-0 max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              <ShieldCheck className="size-3.5" /> Secure Client Portal
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
              Your Lightworld project workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/45">
              View project progress, services, billing, invoices, payments, announcements and support conversations for your organization.
            </p>
            <a href="/" className="mt-7 inline-flex text-sm font-semibold text-amber-300">← Back to lightworldtech.com</a>
          </div>

          <Card className="border-white/[0.08] bg-white/[0.035] text-white">
            <CardHeader>
              <CardTitle>Client sign in</CardTitle>
              <p className="text-sm text-white/38">Use the client account you activated from your one-time Lightworld invitation.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input id="client-email" type="email" required autoComplete="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} className="border-white/10 bg-black/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password</Label>
                  <Input id="client-password" type="password" required autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} className="border-white/10 bg-black/20 text-white" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
                </Button>
              </form>

              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode((value) => !value);
                    setResetMessage('');
                  }}
                  className="mx-auto flex items-center gap-2 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
                >
                  <KeyRound className="size-4" />
                  {resetMode ? 'Back to sign in' : 'Forgot password?'}
                </button>

                {resetMode && (
                  <form onSubmit={requestPasswordReset} className="mt-4 space-y-3">
                    <p className="text-xs leading-5 text-white/45">
                      Enter your client portal email. If the account is active, we will send a secure one-time reset link.
                    </p>
                    <Input
                      type="email"
                      value={login.email}
                      onChange={(event) => setLogin({ ...login, email: event.target.value })}
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                      className="border-white/10 bg-black/20 text-white"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={resetLoading}
                      className="w-full border-amber-400/25 bg-amber-400/[0.06] text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Sending reset link...
                        </>
                      ) : (
                        'Send reset link'
                      )}
                    </Button>
                    {resetMessage && (
                      <p className="rounded-xl border border-amber-400/15 bg-amber-400/[0.07] p-3 text-xs leading-5 text-amber-100">
                        {resetMessage}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b10] px-4 text-white">
        <Card role="alert" className="w-full max-w-xl border-amber-400/15 bg-white/[0.04] text-white">
          <CardContent className="p-6 sm:p-7">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold">Your session is active, but the workspace did not load.</h1>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {portalError || 'Lightworld could not load your projects, billing and support data.'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => void retryPortal()} disabled={portalRefreshing} className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                {portalRefreshing && <Loader2 className="mr-2 size-4 animate-spin" />}
                Try again
              </Button>
              <Button type="button" variant="outline" onClick={() => void signOut()} className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]">
                <LogOut className="mr-2 size-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 shadow-sm shadow-slate-950/[0.025] backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#071018]/92">
        <div className="container-main flex min-h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Building2 className="size-4" /></span>
            <div>
              <p className="text-sm font-semibold">{data?.organization.name || 'Client Portal'}</p>
              <p className="text-[10px] text-slate-400 dark:text-white/30">Lightworld client workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
              <ShieldCheck className="mr-2 size-4" />
              <span className="hidden sm:inline">Profile & security</span>
              <span className="sm:hidden">Profile</span>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-2 size-4" /> Sign out</Button>
          </div>
        </div>
      </header>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-5 sm:px-6">
            <DialogTitle>Profile & security</DialogTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Manage your client portal identity and password from one secure workspace.
            </p>
          </DialogHeader>
          <div className="grid gap-5 p-5 sm:p-6">
            <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Profile</h2>
                  <p className="text-xs text-muted-foreground">Your client-facing identity.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-profile-name">Name</Label>
                  <Input
                    id="client-profile-name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-profile-email">Email</Label>
                  <Input id="client-profile-email" value={data?.user.email || ''} readOnly disabled />
                  <p className="text-[11px] leading-4 text-slate-400">
                    Email is managed by Lightworld; changes require verification to protect account ownership.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={profileSaving} className="bg-amber-600 text-white hover:bg-amber-700">
                  {profileSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save profile
                </Button>
              </div>
            </form>

            <form onSubmit={changePassword} className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07] sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <KeyRound className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Password</h2>
                  <p className="text-xs text-muted-foreground">Secure this account and sign out other client sessions.</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-white/38">
                Changing your password also invalidates unused password-reset links.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="client-current-password">Current password</Label>
                  <Input
                    id="client-current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-new-password">New password</Label>
                  <Input
                    id="client-new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-confirm-password">Confirm new password</Label>
                  <Input
                    id="client-confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={passwordSaving} className="bg-amber-600 text-white hover:bg-amber-700">
                  {passwordSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Change password
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={serviceRequest.open}
        onOpenChange={(open) => {
          if (serviceRequestSaving) return;
          setServiceRequest((current) => ({ ...current, open }));
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request a service change</DialogTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Submit a renewal, upgrade, downgrade or cancellation request for review. This does not change your service or create a charge automatically.
            </p>
          </DialogHeader>
          <form onSubmit={submitServiceRequest} className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <p className="font-semibold">
                {data?.account.services.find((item) => item.id === serviceRequest.serviceId)?.name || 'Selected service'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current plan: {data?.account.services.find((item) => item.id === serviceRequest.serviceId)?.planName || 'Not specified'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-service-request-type">Request type</Label>
              <select
                id="client-service-request-type"
                value={serviceRequest.action}
                onChange={(event) => setServiceRequest((current) => ({ ...current, action: event.target.value }))}
                className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm"
              >
                <option value="renewal">Renew service</option>
                <option value="upgrade">Upgrade plan / capacity</option>
                <option value="downgrade">Downgrade plan / capacity</option>
                <option value="plan_change">Other plan change</option>
                <option value="cancellation">Request cancellation</option>
                <option value="other">Other service change</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-service-request-plan">Requested plan or change</Label>
              <Input
                id="client-service-request-plan"
                value={serviceRequest.requestedPlan}
                onChange={(event) => setServiceRequest((current) => ({ ...current, requestedPlan: event.target.value }))}
                placeholder="e.g. Business plan, 20 users, annual renewal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-service-request-notes">Notes</Label>
              <Textarea
                id="client-service-request-notes"
                rows={4}
                value={serviceRequest.notes}
                onChange={(event) => setServiceRequest((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Tell us what you want changed, your preferred effective date, or any questions for the account team."
              />
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              Lightworld will review commercial terms, outstanding balances, effective dates and technical impact before applying any service change.
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={serviceRequestSaving}
                onClick={() => setServiceRequest((current) => ({ ...current, open: false }))}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={serviceRequestSaving}>
                {serviceRequestSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Submit request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <nav className="sticky top-16 z-30 border-b border-slate-200/70 bg-[#f7f9f8]/92 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#050b10]/92" aria-label="Client workspace sections">
        <div className="container-main flex max-w-full gap-1 overflow-x-auto py-2">
          {[
            ['Overview', '#overview'],
            ['Billing', '#billing'],
            ['Projects', '#projects'],
            ['Support', '#support'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-white/40 dark:hover:bg-white/[0.05] dark:hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {portalError && (
        <div className="container-main pt-4">
          <div role="status" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-5">{portalError}. Showing the last successfully loaded workspace data.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void retryPortal()} disabled={portalRefreshing} className="shrink-0">
              {portalRefreshing && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Retry refresh
            </Button>
          </div>
        </div>
      )}

      <main id="overview" className="container-main min-w-0 max-w-full scroll-mt-32 py-8 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Client portal</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Welcome, {data?.user.name}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-white/38">Projects, account visibility and support for {data?.organization.name}.</p>
          </div>
          <div className="min-w-0 break-all text-right text-xs text-slate-400 dark:text-white/28">{data?.user.email}</div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Active projects', value: activeProjects, icon: FolderKanban },
            { label: 'Total milestones', value: data?.projects.reduce((sum, project) => sum + project.milestones.length, 0) || 0, icon: CheckCircle2 },
            { label: 'Open support tickets', value: data?.tickets.filter((item) => !['resolved', 'closed'].includes(item.status)).length || 0, icon: LifeBuoy },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-white/35">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">{item.value}</p>
                  </div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-5 border-amber-200/70 bg-amber-50/60 dark:border-amber-900/35 dark:bg-amber-950/15">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600">
                <Star className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">Share your experience with Lightworld</p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-white/38">
                  If you have worked with us, you can leave an honest Google review. Reviews are optional, should reflect your genuine experience, and are never exchanged for discounts or incentives.
                </p>
              </div>
            </div>
            <a
              href={companyProfile.googleReviewPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
            >
              Review on Google <ExternalLink className="size-4" />
            </a>
          </CardContent>
        </Card>

        {Boolean(data?.announcements.length) && (
          <section className="mt-8">
            <div className="flex items-center gap-2"><Megaphone className="size-4 text-amber-600" /><h2 className="text-xl font-semibold">Updates from Lightworld</h2></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data?.announcements.map((item) => (
                <Card key={item.id} className="border-amber-500/15 bg-amber-500/[0.04] dark:border-amber-400/10">
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-white/40">{item.body}</p>
                    <p className="mt-3 text-[10px] text-slate-400">{new Date(item.publishAt).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section id="billing" className="mt-8 scroll-mt-32">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="size-5 text-amber-600" />
              <div>
                <h2 className="text-xl font-semibold">Account & billing</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-white/35">Your Lightworld services, renewals, invoices, receipts and current account position.</p>
              </div>
            </div>
            <Button asChild type="button" size="sm" variant="outline" className="w-full shrink-0 sm:w-auto">
              <a href="/api/client/account/statement">
                <Download className="mr-2 size-4" />
                Download statement
              </a>
            </Button>
          </div>

          {Object.keys(data?.account.summary || {}).length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {Object.entries(data?.account.summary || {}).map(([currency, summary]) => (
                <Card key={currency} className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{currency} account</p>
                        <p className="mt-2 text-2xl font-bold">{accountMoney(summary.netDue, currency)}</p>
                        <p className="text-xs text-slate-500 dark:text-white/35">Net amount due</p>
                      </div>
                      <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><WalletCards className="size-5" /></span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"><p className="text-slate-400">Invoices outstanding</p><p className="mt-1 font-semibold">{accountMoney(summary.outstanding, currency)}</p></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"><p className="text-slate-400">Available credit</p><p className="mt-1 font-semibold">{accountMoney(summary.unappliedCredit, currency)}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-4 border-dashed border-slate-300 dark:border-white/10"><CardContent className="p-5 text-sm text-slate-500 dark:text-white/35">No account transactions have been published yet.</CardContent></Card>
          )}

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
            <Card className="min-w-0 border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <CardHeader><CardTitle className="text-base">Services & renewals</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data?.account.services.length ? data.account.services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/35">
                          {service.planName || 'No plan'} · {statusLabel(service.billingCycle)}
                          {service.project ? ' · ' + service.project.name : ''}
                        </p>
                      </div>
                      <Badge className={accountStatusClass(service.status)}>{statusLabel(service.status)}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Service fee</p>
                        <p className="mt-1 text-sm font-semibold">{accountMoney(service.recurringAmount, service.currency)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Next payment due</p>
                        <p className="mt-1 text-sm font-semibold">{service.nextDueDate ? new Date(service.nextDueDate).toLocaleDateString() : 'Not scheduled'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-400">
                      <span>Started {new Date(service.startDate).toLocaleDateString()}</span>
                      <span>{service.expiryDate ? 'Expires ' + new Date(service.expiryDate).toLocaleDateString() : 'No fixed expiry'}</span>
                      {service.autoRenew && <span>Auto-renew flag enabled</span>}
                    </div>
                    <div className="mt-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => openServiceRequest(service)}>
                        <LifeBuoy className="mr-2 size-3.5" />
                        Request renewal / change
                      </Button>
                    </div>
                    {service.payableInvoice ? (
                      <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/15">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">Payment due</p>
                            <p className="mt-1 text-sm font-semibold">
                              {accountMoney(service.payableInvoice.balance, service.payableInvoice.currency)}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500 dark:text-white/35">
                              {service.payableInvoice.invoiceNumber} · due {new Date(service.payableInvoice.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          {service.payableInvoice.currency === 'GHS' && data.account.onlinePaymentsAvailable ? (
                            <Button
                              type="button"
                              size="sm"
                              className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
                              disabled={paymentStartingId === service.payableInvoice.id}
                              onClick={() => void payInvoice(service.payableInvoice!.id)}
                            >
                              {paymentStartingId === service.payableInvoice.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <WalletCards className="mr-2 size-3.5" />}
                              Pay service with Hubtel
                            </Button>
                          ) : service.payableInvoice.currency === 'GHS' ? (
                            <span className="text-[10px] text-slate-500 dark:text-white/35">Online payment setup pending</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 dark:text-white/35">Online checkout currently supports GHS invoices</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-[10px] text-slate-400">No outstanding invoice for this service.</p>
                    )}
                    {service.changes.length > 1 && (
                      <details className="mt-3 rounded-xl border border-slate-200/70 p-3 text-xs dark:border-white/[0.07]">
                        <summary className="cursor-pointer font-semibold">Service history ({service.changes.length})</summary>
                        <div className="mt-3 space-y-2">
                          {service.changes.map((change) => (
                            <div key={change.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-2 first:border-t-0 first:pt-0 dark:border-white/[0.06]">
                              <div><p className="font-medium">{statusLabel(change.changeType)}</p><p className="text-[10px] text-slate-400">{change.previousPlan || '—'} → {change.newPlan || '—'}</p></div>
                              <p className="text-[10px] text-slate-400">{new Date(change.effectiveAt).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-xs text-slate-400 dark:border-white/10">No services have been added to your account yet.</p>}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="size-4 text-amber-600" /> Invoice history</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-w-full overflow-x-auto">
                  <Table className="min-w-[920px]" exportFileName="lightworld-client-invoices">
                    <thead className="border-y border-slate-200/70 bg-slate-50 text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:border-white/[0.07] dark:bg-white/[0.025]">
                      <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Service / project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Credits</th><th className="px-4 py-3 text-right">Balance</th><th data-export-ignore className="px-4 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {data?.account.invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-slate-200/60 dark:border-white/[0.06]">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-semibold">{invoice.invoiceNumber}</p>
                            <p className="text-[10px] text-slate-400">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                            {invoice.creditNotes.length > 0 && (
                              <details className="mt-2 text-[10px]">
                                <summary className="cursor-pointer font-medium text-amber-700 dark:text-amber-300">
                                  {invoice.creditNotes.length} credit note{invoice.creditNotes.length === 1 ? '' : 's'}
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {invoice.creditNotes.map((note) => (
                                    <div key={note.id} className="rounded-lg border border-slate-200/70 p-2 dark:border-white/[0.07]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-semibold">{note.creditNoteNumber}</span>
                                        <span>{accountMoney(note.total, invoice.currency)}</span>
                                      </div>
                                      <p className="mt-1 text-slate-400">{note.reason}</p>
                                      {Number(note.refundedAmount) > 0 && (
                                        <p className="mt-1 text-slate-400">Refunded: {accountMoney(note.refundedAmount, invoice.currency)}</p>
                                      )}
                                      {Number(note.refundableBalance) > 0 && (
                                        <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">
                                          Available credit: {accountMoney(note.refundableBalance, invoice.currency)}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p className="font-medium">{invoice.service?.name || invoice.project?.name || 'General account'}</p>
                            {invoice.renewalForDate && (
                              <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                                Renewal cycle · {new Date(invoice.renewalForDate).toLocaleDateString()}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3"><Badge className={accountStatusClass(invoice.derivedStatus)}>{statusLabel(invoice.derivedStatus)}</Badge></td>
                          <td className="px-4 py-3 text-xs">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">{accountMoney(invoice.total, invoice.currency)}</td>
                          <td className="px-4 py-3 text-right">{accountMoney(invoice.amountPaid, invoice.currency)}</td>
                          <td className="px-4 py-3 text-right">{Number(invoice.creditedAmount) ? accountMoney(invoice.creditedAmount, invoice.currency) : '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{accountMoney(invoice.balance, invoice.currency)}</td>
                          <td data-export-ignore className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button asChild type="button" size="sm" variant="outline">
                                <a href={'/api/client/invoices/' + encodeURIComponent(invoice.id) + '/document'} target="_blank" rel="noreferrer">
                                  <FileText className="mr-1.5 size-3.5" />
                                  View / print
                                </a>
                              </Button>
                              {Number(invoice.balance) > 0 && invoice.currency === 'GHS' && data.account.onlinePaymentsAvailable ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-amber-600 text-white hover:bg-amber-700"
                                  disabled={paymentStartingId === invoice.id}
                                  onClick={() => void payInvoice(invoice.id)}
                                >
                                  {paymentStartingId === invoice.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <WalletCards className="mr-2 size-3.5" />}
                                  Pay with Hubtel
                                </Button>
                              ) : invoice.derivedStatus === 'paid' ? (
                                <Badge className={accountStatusClass('paid')}>Paid</Badge>
                              ) : Number(invoice.balance) > 0 && invoice.currency === 'GHS' ? (
                                <span className="self-center text-[10px] text-slate-400">Online payment setup pending</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!data?.account.invoices.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-400">No invoices published yet.</td></tr>}
                    </tbody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-5 border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <CardHeader><CardTitle className="text-base">Payment / receipt history</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table className="min-w-[640px]" exportFileName="lightworld-client-receipts">
                  <thead className="border-y border-slate-200/70 bg-slate-50 text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:border-white/[0.07] dark:bg-white/[0.025]">
                    <tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Unapplied receipt</th><th data-export-ignore className="px-4 py-3 text-right">Document</th></tr>
                  </thead>
                  <tbody>
                    {data?.account.payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-slate-200/60 dark:border-white/[0.06]">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{payment.paymentNumber}</td>
                        <td className="px-4 py-3 text-xs">{new Date(payment.paidAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs">{statusLabel(payment.method)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/35">{payment.reference || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{accountMoney(payment.amount, payment.currency)}</td>
                        <td className="px-4 py-3 text-right">{accountMoney(payment.unallocatedAmount, payment.currency)}</td>
                        <td data-export-ignore className="px-4 py-3 text-right">
                          <Button asChild type="button" size="sm" variant="outline">
                            <a href={'/api/client/payments/' + encodeURIComponent(payment.id) + '/receipt'} target="_blank" rel="noreferrer">
                              <ReceiptText className="mr-1.5 size-3.5" />
                              View / print
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!data?.account.payments.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">No payments recorded yet.</td></tr>}
                  </tbody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="projects" className="mt-8 scroll-mt-32">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Projects</h2>
            <span className="text-xs text-slate-400">{data?.projects.length || 0} total</span>
          </div>
          {data?.projects.length ? (
            <div className="mt-4 grid gap-5">
              {data.projects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <CardContent className="p-0">
                    <div className="grid min-w-0 gap-6 p-6 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{statusLabel(project.status)}</Badge>
                          <Badge className={healthClass(project.health)}>{statusLabel(project.health)}</Badge>
                        </div>
                        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{project.name}</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/38">{project.summary || 'Project summary will appear here as it is published by the Lightworld team.'}</p>

                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs">
                            <span>Progress</span><span className="font-semibold">{project.progress}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: project.progress + '%' }} />
                          </div>
                        </div>

                        <div className="mt-5 space-y-2 text-xs text-slate-500 dark:text-white/35">
                          {project.manager && <p>Lightworld lead: <span className="font-medium text-foreground">{project.manager}</span></p>}
                          {project.targetDate && <p className="flex items-center gap-2"><CalendarDays className="size-3.5" /> Target: {new Date(project.targetDate).toLocaleDateString()}</p>}
                        </div>

                        {(project.expiryDate || project.nextRenewalDate || Number(project.renewalAmount) > 0) && (
                          <div className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-900/35 dark:bg-amber-950/10">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Project commercial schedule</p>
                              {project.autoRenew && (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                                  Auto-renew enabled
                                </Badge>
                              )}
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Project expiry</p>
                                <p className="mt-1 text-sm font-semibold">
                                  {project.expiryDate ? new Date(project.expiryDate).toLocaleDateString() : 'Not set'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Next renewal</p>
                                <p className="mt-1 text-sm font-semibold">
                                  {project.nextRenewalDate ? new Date(project.nextRenewalDate).toLocaleDateString() : 'Not scheduled'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Renewal cycle</p>
                                <p className="mt-1 text-sm font-semibold">{statusLabel(project.renewalCycle || 'annual')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Renewal amount</p>
                                <p className="mt-1 text-sm font-semibold">
                                  {Number(project.renewalAmount) > 0
                                    ? accountMoney(project.renewalAmount, project.renewalCurrency)
                                    : 'To be confirmed'}
                                </p>
                              </div>
                            </div>
                            <p className="mt-3 text-[10px] leading-5 text-slate-500 dark:text-white/35">
                              Auto-renew records the intended renewal workflow; it does not automatically charge your account. Issued invoices and available payment options appear in Billing.
                            </p>
                            {project.payableInvoice ? (
                              <div className="mt-4 rounded-xl border border-amber-200/80 bg-white/75 p-3 dark:border-amber-900/40 dark:bg-black/10">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">Project payment due</p>
                                    <p className="mt-1 text-sm font-semibold">
                                      {accountMoney(project.payableInvoice.balance, project.payableInvoice.currency)}
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-500 dark:text-white/35">
                                      {project.payableInvoice.invoiceNumber} · due {new Date(project.payableInvoice.dueDate).toLocaleDateString()}
                                      {project.payableInvoice.renewalForDate
                                        ? ' · renewal ' + new Date(project.payableInvoice.renewalForDate).toLocaleDateString()
                                        : ''}
                                    </p>
                                  </div>
                                  {project.payableInvoice.currency === 'GHS' && data.account.onlinePaymentsAvailable ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
                                      disabled={paymentStartingId === project.payableInvoice.id}
                                      onClick={() => void payInvoice(project.payableInvoice!.id)}
                                    >
                                      {paymentStartingId === project.payableInvoice.id
                                        ? <Loader2 className="mr-2 size-3.5 animate-spin" />
                                        : <WalletCards className="mr-2 size-3.5" />}
                                      Pay project with Hubtel
                                    </Button>
                                  ) : project.payableInvoice.currency === 'GHS' ? (
                                    <span className="text-[10px] text-slate-500 dark:text-white/35">Online payment setup pending</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 dark:text-white/35">Online checkout currently supports GHS invoices</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-[10px] text-slate-500 dark:text-white/35">No outstanding invoice for this project.</p>
                            )}

                          </div>
                        )}

                        <div className="mt-6 border-t border-slate-200/70 pt-5 dark:border-white/[0.07]">
                          <div className="flex items-center gap-2"><FileText className="size-4 text-amber-600" /><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Documents</p></div>
                          {project.documents.length ? (
                            <div className="mt-3 space-y-2">
                              {project.documents.map((document) => (
                                <a
                                  key={document.id}
                                  href={document.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 p-3 transition hover:border-amber-300 dark:border-white/[0.07]"
                                >
                                  <div>
                                    <p className="text-sm font-medium">{document.title}</p>
                                    {document.description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/35">{document.description}</p>}
                                    <p className="mt-1 text-[10px] text-slate-400">{statusLabel(document.category)}</p>
                                  </div>
                                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                                </a>
                              ))}
                            </div>
                          ) : <p className="mt-3 text-xs text-slate-400">No client documents published yet.</p>}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Milestones</p>
                        {project.milestones.length ? (
                          <div className="mt-3 space-y-2">
                            {project.milestones.map((milestone) => (
                              <div key={milestone.id} className="flex gap-3 rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                                  {milestone.status === 'completed' ? <CheckCircle2 className="size-4" /> : milestone.status === 'in_progress' ? <CircleDot className="size-4" /> : <Clock3 className="size-4" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">{milestone.title}</p>
                                  {milestone.description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/35">{milestone.description}</p>}
                                  <p className="mt-2 text-[10px] text-slate-400">{statusLabel(milestone.status)}{milestone.dueDate ? ' · Due ' + new Date(milestone.dueDate).toLocaleDateString() : ''}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-xs text-slate-400 dark:border-white/10">Milestones will appear here when published by the Lightworld team.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[28px] border border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-white/10 dark:text-white/35">
              No client projects have been published to this organization yet.
            </div>
          )}
        </section>

        <section id="support" className="mt-9 grid min-w-0 scroll-mt-32 gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <Card className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <CardHeader><CardTitle>Request support</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <select value={ticket.projectId} onChange={(event) => setTicket({ ...ticket, projectId: event.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
                    <option value="">General / no project</option>
                    {data?.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input required minLength={3} value={ticket.subject} onChange={(event) => setTicket({ ...ticket, subject: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select value={ticket.priority} onChange={(event) => setTicket({ ...ticket, priority: event.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select value={ticket.category} onChange={(event) => setTicket({ ...ticket, category: event.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15">
                    <option value="technical">Technical support</option>
                    <option value="billing">Billing</option>
                    <option value="hosting">Hosting</option>
                    <option value="project_change">Project change</option>
                    <option value="training">Training</option>
                    <option value="account">Account</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Details</Label>
                  <Textarea required minLength={3} rows={5} value={ticket.message} onChange={(event) => setTicket({ ...ticket, message: event.target.value })} />
                </div>
                <Button disabled={ticketSending} className="bg-amber-600 hover:bg-amber-700">
                  {ticketSending && <Loader2 className="mr-2 size-4 animate-spin" />} Submit support request
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <CardHeader>
              <CardTitle>Support conversations</CardTitle>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={ticketSearch}
                    onChange={(event) => setTicketSearch(event.target.value)}
                    placeholder="Search ticket number or subject"
                    className="pl-9"
                  />
                </label>
                <select
                  value={ticketStatus}
                  onChange={(event) => setTicketStatus(event.target.value)}
                  className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="awaiting_client">Awaiting client</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {visibleTickets.length ? (
                <div className="space-y-4">
                  {visibleTickets.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">{item.ticketNumber}</span>
                            {item.unreadByClient && <span className="size-2 rounded-full bg-amber-500" title="New Lightworld activity" />}
                          </div>
                          <p className="mt-1 text-sm font-semibold">{item.subject}</p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {statusLabel(item.category)}
                            {item.assignedTo ? ' · Assigned to ' + item.assignedTo : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{statusLabel(item.status)}</Badge>
                          <Badge variant="outline">{statusLabel(item.priority)}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Original request</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-white/45">{item.message}</p>
                      </div>
                      {item.messages.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {item.messages.map((message) => (
                            <div key={message.id} className={message.authorType === 'client' ? 'ml-6 rounded-xl bg-amber-500/[0.07] p-3' : 'mr-6 rounded-xl bg-slate-100 p-3 dark:bg-white/[0.05]'}>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                                <span>{message.authorName} · {message.authorType === 'client' ? 'Client' : 'Lightworld'}</span>
                                <span>{new Date(message.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{message.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {['resolved', 'closed'].includes(item.status) && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                          {item.ratedAt && item.clientRating ? (
                            <div>
                              <p className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                                <Star className="size-4 fill-current" /> Your support rating
                              </p>
                              <p className="mt-2 text-lg font-bold text-amber-900 dark:text-amber-100">{item.clientRating}/5</p>
                              {item.clientFeedback && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-amber-900/70 dark:text-amber-200/65">{item.clientFeedback}</p>}
                              <p className="mt-2 text-[10px] text-amber-900/55 dark:text-amber-200/50">Thank you for your feedback.</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">How was Lightworld support?</p>
                              <p className="mt-1 text-[10px] text-amber-900/65 dark:text-amber-200/60">Rate this resolved case once. Your feedback helps us improve service quality.</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => {
                                  const selectedRating = ratingDrafts[item.id]?.rating || 0;
                                  return (
                                    <button
                                      key={rating}
                                      type="button"
                                      onClick={() => setRatingDrafts((current) => ({
                                        ...current,
                                        [item.id]: {
                                          rating,
                                          feedback: current[item.id]?.feedback || '',
                                        },
                                      }))}
                                      className={
                                        'flex size-9 items-center justify-center rounded-lg border transition ' +
                                        (rating <= selectedRating
                                          ? 'border-amber-500 bg-amber-500 text-white'
                                          : 'border-amber-300 bg-background text-amber-600 hover:border-amber-500')
                                      }
                                      aria-label={'Rate support ' + rating + ' out of 5'}
                                    >
                                      <Star className={'size-4 ' + (rating <= selectedRating ? 'fill-current' : '')} />
                                    </button>
                                  );
                                })}
                              </div>
                              <Textarea
                                className="mt-3 bg-background"
                                rows={3}
                                maxLength={2000}
                                value={ratingDrafts[item.id]?.feedback || ''}
                                onChange={(event) => setRatingDrafts((current) => ({
                                  ...current,
                                  [item.id]: {
                                    rating: current[item.id]?.rating || 0,
                                    feedback: event.target.value,
                                  },
                                }))}
                                placeholder="Optional feedback about your support experience…"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="mt-3"
                                disabled={ratingTicketId === item.id || !(ratingDrafts[item.id]?.rating)}
                                onClick={() => void submitTicketRating(item.id)}
                              >
                                {ratingTicketId === item.id && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                                Submit rating
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-white/[0.07]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            <Paperclip className="size-3.5" /> Attachments
                          </p>
                          {item.status !== 'closed' && (
                            <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold transition hover:border-amber-300 dark:border-white/10">
                              {uploadingTicketId === item.id ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <Upload className="mr-1.5 size-3" />}
                              Add evidence
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                className="sr-only"
                                disabled={uploadingTicketId === item.id}
                                onChange={(event) => {
                                  const file = event.target.files?.[0] || null;
                                  void uploadTicketAttachment(item.id, file);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>
                        {item.attachments.length ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {item.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={'/api/support-attachments/' + attachment.id}
                                className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200/70 p-2.5 text-xs transition hover:border-amber-300 dark:border-white/[0.07]"
                              >
                                <Paperclip className="size-3.5 shrink-0 text-amber-600" />
                                <span className="min-w-0 flex-1 truncate">{attachment.originalName}</span>
                                <Download className="size-3 shrink-0 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-[10px] text-slate-400">No files attached.</p>
                        )}
                      </div>

                      {item.status !== 'closed' && (
                        <div className="mt-3 flex gap-2">
                          <Input
                            value={replies[item.id] || ''}
                            onChange={(event) => setReplies((current) => ({ ...current, [item.id]: event.target.value }))}
                            placeholder="Reply to this support request…"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                void replyToTicket(item.id);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            onClick={() => void replyToTicket(item.id)}
                            disabled={replyingTicketId === item.id || !(replies[item.id] || '').trim()}
                            aria-label="Send support reply"
                          >
                            {replyingTicketId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          </Button>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span>Opened {new Date(item.createdAt).toLocaleString()}</span>
                        <span>Last activity {new Date(item.lastActivityAt || item.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-xs text-slate-400 dark:border-white/10">
                  {data?.tickets.length ? 'No support tickets match this filter.' : 'No support requests yet.'}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
