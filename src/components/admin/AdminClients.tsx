'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Copy,
  Download,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ClientCommercialAccount from '@/components/admin/ClientCommercialAccount';
import OperationalLoadError from '@/components/admin/OperationalLoadError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { readJsonResponse } from '@/lib/client-api';

type PortalUser = {
  id: string; name: string; email: string; role: string; active: boolean;
  lastLogin: string | null; mustSetPassword: boolean; inviteExpiresAt: string | null; createdAt: string;
};
type Milestone = {
  id: string; title: string; description: string; status: string; order: number;
  dueDate: string | null; completedAt: string | null;
};
type DocumentItem = {
  id: string; title: string; description: string; url: string;
  category: string; visibleToClient: boolean; createdAt: string;
};
type Announcement = {
  id: string; projectId: string | null; title: string; body: string;
  active: boolean; publishAt: string; createdAt: string;
};
type Project = {
  id: string; name: string; summary: string; status: string; health: string;
  progress: number; manager: string; startDate: string | null; targetDate: string | null;
  expiryDate: string | null; nextRenewalDate: string | null; renewalCycle: string;
  renewalCurrency: string; renewalAmount: string; budgetCurrency: string; budgetAmount: string; autoRenew: boolean;
  renewalNoticeDays: number; renewalNotes: string;
  milestones: Milestone[]; documents: DocumentItem[]; announcements: Announcement[];
};
type Agreement = {
  id: string; title: string; agreementType: string; status: string; referenceNumber: string;
  projectId: string | null; currency: string; contractValue: string; effectiveDate: string | null;
  expiryDate: string | null; renewalNoticeDays: number; owner: string; documentUrl: string;
  notes: string; signedAt: string | null; project: { id: string; name: string } | null;
};
type TicketMessage = {
  id: string; authorType: string; authorName: string; message: string; createdAt: string;
};
type Ticket = {
  id: string; ticketNumber: string; projectId: string | null; subject: string; message: string;
  category: string; status: string; priority: string; assignedTo: string;
  createdAt: string; updatedAt: string; lastActivityAt: string;
  messages: TicketMessage[];
};
type Organization = {
  id: string; name: string; status: string; primaryContactName: string;
  primaryEmail: string; primaryPhone: string; users: PortalUser[];
  projects: Project[]; tickets: Ticket[]; announcements: Announcement[]; agreements: Agreement[];
  _count: { users: number; projects: number; tickets: number };
};

type PortfolioIntelligence = {
  summary: {
    organizations: number;
    activeOrganizations: number;
    interventionRequired: number;
    attention: number;
    stable: number;
    overdueInvoices: number;
    renewalsDue30: number;
    expiredAgreements: number;
    agreementsInNoticeWindow: number;
    atRiskProjects: number;
    budgetPressure: number;
    overBudget: number;
    urgentTickets: number;
    slaBreaches: number;
  };
  byCurrency: Array<{
    currency: string;
    overdueReceivables: string;
    renewals30: string;
  }>;
  methodology: string;
  actionQueue: Array<{
    id: string;
    organizationId: string;
    organizationName: string;
    type: 'collections' | 'renewals' | 'agreements' | 'support' | 'projects' | 'budget';
    severity: 'high' | 'medium';
    title: string;
    detail: string;
    score: number;
  }>;
  data: Array<{
    id: string;
    name: string;
    status: string;
    primaryContactName: string;
    primaryEmail: string;
    primaryPhone: string;
    posture: 'intervention_required' | 'attention' | 'stable';
    riskScore: number;
    metrics: {
      users: number;
      projects: number;
      activeProjects: number;
      atRiskProjects: number;
      openTickets: number;
      urgentTickets: number;
      slaBreaches: number;
      overdueInvoices: number;
      expiredServices: number;
      renewalsDue30: number;
      expiredAgreements: number;
      agreementsInNoticeWindow: number;
      budgetPressure: number;
      overBudget: number;
    };
    exposure: Array<{
      currency: string;
      overdueReceivables: string;
      renewals30: string;
    }>;
  }>;
};

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function AdminClients() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioIntelligence | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioForbidden, setPortfolioForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [organizationQuery, setOrganizationQuery] = useState('');
  const [organizationStatus, setOrganizationStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'document' | 'announcement'; id: string; label: string } | null>(null);
  const [activationLinks, setActivationLinks] = useState<Record<string, string>>({});
  const [pendingClientAction, setPendingClientAction] = useState('');

  const [orgForm, setOrgForm] = useState({ name: '', primaryContactName: '', primaryEmail: '', primaryPhone: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'client_admin' });
  const [projectForm, setProjectForm] = useState({
    name: '',
    summary: '',
    manager: '',
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
  const [milestoneForm, setMilestoneForm] = useState({ projectId: '', title: '', dueDate: '' });
  const [agreementForm, setAgreementForm] = useState({
    title: '', agreementType: 'contract', status: 'draft', referenceNumber: '', projectId: '',
    currency: 'GHS', contractValue: '', effectiveDate: '', expiryDate: '', renewalNoticeDays: '30',
    owner: '', documentUrl: '', notes: '', signedAt: '',
  });
  const [documentForms, setDocumentForms] = useState<Record<string, { title: string; url: string; description: string; category: string }>>({});
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', projectId: '' });
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  const selected = organizations.find((item) => item.id === selectedId) || organizations[0] || null;

  const fetchPortfolio = async () => {
    setPortfolioLoading(true);
    try {
      const response = await fetch('/api/admin/clients/portfolio-intelligence', { cache: 'no-store' });
      if (response.status === 403) {
        setPortfolioForbidden(true);
        setPortfolio(null);
        return;
      }
      if (!response.ok) throw new Error('Could not load executive client portfolio');
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      setPortfolio({
        summary: payload.summary,
        byCurrency: payload.byCurrency || [],
        methodology: payload.methodology || '',
        actionQueue: payload.actionQueue || [],
        data: payload.data || [],
      });
      setPortfolioForbidden(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load executive client portfolio');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load client portal organizations');
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      const items: Organization[] = payload.data || [];
      setOrganizations(items);
      if (!selectedId && items.length) setSelectedId(items[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load clients';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void Promise.all([fetchOrganizations(), fetchPortfolio()]); }, []);

  useEffect(() => {
    if (!organizations.length || typeof window === 'undefined') return;
    const requestedOrganizationId = sessionStorage.getItem('lw-client-organization-id') || '';
    const requestedAction = sessionStorage.getItem('lw-client-action') || '';
    if (!requestedOrganizationId && !requestedAction) return;

    sessionStorage.removeItem('lw-client-organization-id');
    sessionStorage.removeItem('lw-client-action');

    if (requestedOrganizationId && organizations.some((organization) => organization.id === requestedOrganizationId)) {
      setSelectedId(requestedOrganizationId);
    }
    if (requestedAction) setPendingClientAction(requestedAction);
  }, [organizations]);

  useEffect(() => {
    if (!pendingClientAction || !selected) return;
    const id = window.setTimeout(() => {
      if (pendingClientAction === 'new-project') {
        document.getElementById('client-new-project')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('client-new-project-name')?.focus();
      } else if (pendingClientAction === 'agreements') {
        document.getElementById('client-agreements')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setPendingClientAction('');
    }, 0);
    return () => window.clearTimeout(id);
  }, [pendingClientAction, selected?.id]);

  const openPortfolioAction = (action: PortfolioIntelligence['actionQueue'][number]) => {
    if (action.type === 'collections' || action.type === 'renewals') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lw-finance-section', action.type);
        sessionStorage.setItem('lw-finance-organization-id', action.organizationId);
        sessionStorage.setItem('lw-finance-customer-name', action.organizationName);
      }
      useAppStore.getState().navigate('admin-finance');
      return;
    }

    setSelectedId(action.organizationId);
    const target =
      action.type === 'support'
        ? 'client-support'
        : action.type === 'agreements'
          ? 'client-agreements'
          : action.type === 'projects' || action.type === 'budget'
            ? 'client-projects'
            : 'client-overview';
    window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const filteredOrganizations = useMemo(() => {
    const needle = organizationQuery.trim().toLowerCase();
    return organizations.filter((organization) => {
      if (organizationStatus !== 'all' && organization.status !== organizationStatus) return false;
      if (!needle) return true;
      return [
        organization.name,
        organization.primaryContactName,
        organization.primaryEmail,
        organization.primaryPhone,
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [organizations, organizationQuery, organizationStatus]);

  const exportPortfolio = () => {
    if (!portfolio) {
      toast.error('Executive client portfolio is not available for export');
      return;
    }
    const quote = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const lines: string[][] = [
      ['Lightworld Technologies Ltd', 'Executive client portfolio'],
      ['Generated at', new Date().toISOString()],
      [],
      [
        'Organization',
        'Status',
        'Management posture',
        'Risk score',
        'Overdue invoices',
        'Renewals due 30d',
        'Expired agreements',
        'Agreements in notice window',
        'At-risk projects',
        'Budget pressure',
        'Over budget',
        'Urgent support',
        'SLA breaches',
        'Currency exposure',
      ],
      ...portfolio.data.map((row) => [
        row.name,
        row.status,
        row.posture,
        String(row.riskScore),
        String(row.metrics.overdueInvoices),
        String(row.metrics.renewalsDue30),
        String(row.metrics.expiredAgreements),
        String(row.metrics.agreementsInNoticeWindow),
        String(row.metrics.atRiskProjects),
        String(row.metrics.budgetPressure),
        String(row.metrics.overBudget),
        String(row.metrics.urgentTickets),
        String(row.metrics.slaBreaches),
        row.exposure.map((item) =>
          item.currency +
          ': overdue ' +
          item.overdueReceivables +
          ', renewals ' +
          item.renewals30
        ).join(' | '),
      ]),
      [],
      ['Priority action queue'],
      ['Organization', 'Severity', 'Action type', 'Action', 'Detail'],
      ...portfolio.actionQueue.map((action) => [
        action.organizationName,
        action.severity,
        action.type,
        action.title,
        action.detail,
      ]),
      [],
      ['Methodology', portfolio.methodology],
    ];
    const csv = lines.map((row) => row.map(quote).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lightworld-client-portfolio-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('Executive client portfolio downloaded');
  };

  const counts = useMemo(() => ({
    organizations: organizations.length,
    users: organizations.reduce((sum, item) => sum + item._count.users, 0),
    projects: organizations.reduce((sum, item) => sum + item._count.projects, 0),
    openTickets: organizations.reduce((sum, item) => sum + item.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length, 0),
  }), [organizations]);

  const patchOrganization = async (id: string, update: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/clients/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Could not update client organization');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update client organization');
    }
  };

  const patchUser = async (id: string, update: Record<string, unknown>, success?: string) => {
    try {
      const response = await fetch('/api/admin/client-users/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not update portal user');
      if (payload?.activationUrl) {
        setActivationLinks((current) => ({ ...current, [id]: String(payload.activationUrl) }));
      }
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      if (success) toast.success(success);
      return payload;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update portal user');
      return null;
    }
  };

  const regenerateInvite = async (id: string) => {
    await patchUser(id, { regenerateInvite: true }, 'New activation link generated');
  };

  const copyActivationLink = async (id: string) => {
    const url = activationLinks[id];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Activation link copied');
  };

  const createOrganization = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orgForm),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not create client organization');
      setOrgForm({ name: '', primaryContactName: '', primaryEmail: '', primaryPhone: '' });
      setSelectedId(payload.data.id);
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Client organization created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create client organization');
    } finally { setSaving(false); }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not create portal user');
      setUserForm({ name: '', email: '', role: 'client_admin' });
      if (payload?.activationUrl && payload?.data?.id) {
        setActivationLinks((current) => ({ ...current, [payload.data.id]: String(payload.activationUrl) }));
      }
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Portal user provisioned — share the activation link securely');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create portal user');
    } finally { setSaving(false); }
  };

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name,
          summary: projectForm.summary,
          manager: projectForm.manager,
          status: 'active',
          health: 'on_track',
          progress: 0,
          targetDate: projectForm.targetDate ? new Date(projectForm.targetDate).toISOString() : null,
          expiryDate: projectForm.expiryDate ? new Date(projectForm.expiryDate).toISOString() : null,
          nextRenewalDate: projectForm.nextRenewalDate ? new Date(projectForm.nextRenewalDate).toISOString() : null,
          renewalCycle: projectForm.renewalCycle,
          renewalCurrency: projectForm.renewalCurrency,
          renewalAmount: Number(projectForm.renewalAmount || 0),
          budgetCurrency: projectForm.budgetCurrency,
          budgetAmount: Number(projectForm.budgetAmount || 0),
          autoRenew: projectForm.autoRenew,
          renewalNoticeDays: Number(projectForm.renewalNoticeDays || 30),
          renewalNotes: projectForm.renewalNotes,
        }),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not create client project');
      setProjectForm({
        name: '',
        summary: '',
        manager: '',
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
      setMilestoneForm((current) => ({ ...current, projectId: payload.data.id }));
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Client project created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create client project');
    } finally { setSaving(false); }
  };

  const createAgreement = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/agreements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agreementForm,
          projectId: agreementForm.projectId || null,
          contractValue: Number(agreementForm.contractValue || 0),
          renewalNoticeDays: Number(agreementForm.renewalNoticeDays || 30),
          effectiveDate: agreementForm.effectiveDate ? new Date(agreementForm.effectiveDate).toISOString() : null,
          expiryDate: agreementForm.expiryDate ? new Date(agreementForm.expiryDate).toISOString() : null,
          signedAt: agreementForm.signedAt ? new Date(agreementForm.signedAt).toISOString() : null,
        }),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not create agreement');
      setAgreementForm({
        title: '', agreementType: 'contract', status: 'draft', referenceNumber: '', projectId: '',
        currency: 'GHS', contractValue: '', effectiveDate: '', expiryDate: '', renewalNoticeDays: '30',
        owner: '', documentUrl: '', notes: '', signedAt: '',
      });
      await fetchOrganizations();
      toast.success('Agreement registered');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create agreement');
    } finally { setSaving(false); }
  };

  const patchAgreement = async (agreementId: string, update: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/client-agreements/' + agreementId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not update agreement');
      await fetchOrganizations();
      toast.success('Agreement updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update agreement');
    }
  };

  const patchProject = async (projectId: string, update: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/client-projects/' + projectId, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Could not update project');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update project');
    }
  };

  const updateProjectLocal = (projectId: string, update: Partial<Project>) => {
    if (!selected) return;
    setOrganizations((current) => current.map((organization) =>
      organization.id !== selected.id
        ? organization
        : {
            ...organization,
            projects: organization.projects.map((project) =>
              project.id === projectId ? { ...project, ...update } : project,
            ),
          },
    ));
  };

  const createMilestone = async (event: FormEvent) => {
    event.preventDefault();
    if (!milestoneForm.projectId) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-projects/' + milestoneForm.projectId + '/milestones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: milestoneForm.title,
          dueDate: milestoneForm.dueDate ? new Date(milestoneForm.dueDate).toISOString() : null,
        }),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not create milestone');
      setMilestoneForm({ projectId: milestoneForm.projectId, title: '', dueDate: '' });
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Milestone published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create milestone');
    } finally { setSaving(false); }
  };

  const patchMilestone = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/client-milestones/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Could not update milestone');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
    } catch { toast.error('Could not update milestone'); }
  };

  const patchTicket = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/client-tickets/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Could not update support ticket');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
    } catch { toast.error('Could not update support ticket'); }
  };

  const createDocument = async (event: FormEvent, projectId: string) => {
    event.preventDefault();
    const form = documentForms[projectId] || { title: '', url: '', description: '', category: 'document' };
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-projects/' + projectId + '/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, visibleToClient: true }),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not publish document');
      setDocumentForms((current) => ({ ...current, [projectId]: { title: '', url: '', description: '', category: 'document' } }));
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Client document published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish document');
    } finally { setSaving(false); }
  };

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch('/api/admin/client-documents/' + id, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove document');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Client document removed');
    } catch { toast.error('Could not remove document'); }
  };

  const createAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/clients/' + selected.id + '/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementForm.title,
          body: announcementForm.body,
          projectId: announcementForm.projectId || null,
        }),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not publish announcement');
      setAnnouncementForm({ title: '', body: '', projectId: '' });
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Client announcement published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish announcement');
    } finally { setSaving(false); }
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    try {
      const response = await fetch('/api/admin/client-announcements/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error('Could not update announcement');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
    } catch { toast.error('Could not update announcement'); }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch('/api/admin/client-announcements/' + id, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete announcement');
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Announcement deleted');
    } catch { toast.error('Could not delete announcement'); }
  };

  const replyTicket = async (ticketId: string) => {
    const message = (ticketReplies[ticketId] || '').trim();
    if (!message) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/client-tickets/' + ticketId + '/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      });
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
      if (!response.ok) throw new Error(payload?.error || 'Could not send reply');
      setTicketReplies((current) => ({ ...current, [ticketId]: '' }));
      await Promise.all([fetchOrganizations(), fetchPortfolio()]);
      toast.success('Support reply sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send reply');
    } finally { setSaving(false); }
  };

  if (loading && !organizations.length) {
    return <div className="space-y-5"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  if (loadError && !organizations.length) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Client Portal"
          title="Client organizations & delivery visibility"
          description="Provision only real client organizations. Portal users see projects, milestones and support requests scoped to their organization."
        />
        <OperationalLoadError
          title="Client organizations could not be loaded"
          message={loadError}
          retrying={loading}
          onRetry={() => void Promise.all([fetchOrganizations(), fetchPortfolio()])}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Client Portal"
        title="Client organizations & delivery visibility"
        description="Provision only real client organizations. Portal users see projects, milestones and support requests scoped to their organization."
        actions={
          <>
            {!portfolioForbidden && (
              <Button variant="outline" onClick={exportPortfolio} disabled={!portfolio}>
                <Download className="mr-2 size-4" /> Export portfolio
              </Button>
            )}
            <Button variant="outline" onClick={() => void Promise.all([fetchOrganizations(), fetchPortfolio()])} disabled={loading}>
              <RefreshCw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} /> Refresh
            </Button>
          </>
        }
      />

      {loadError && (
        <OperationalLoadError
          title="Client workspace refresh failed"
          message={loadError + '. Showing the last successfully loaded client records.'}
          retrying={loading}
          onRetry={() => void Promise.all([fetchOrganizations(), fetchPortfolio()])}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Organizations', value: counts.organizations, icon: Building2 },
          { label: 'Portal users', value: counts.users, icon: Users },
          { label: 'Projects', value: counts.projects, icon: FolderKanban },
          { label: 'Open tickets', value: counts.openTickets, icon: LifeBuoy },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
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

      {!portfolioForbidden && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-indigo-600" />
                  Executive client portfolio
                </CardTitle>
                <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">
                  Cross-customer commercial and delivery exceptions. {portfolio?.methodology || 'Financial values stay separated by currency.'}
                </p>
              </div>
              <Badge variant="outline">Finance-authorized view</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolioLoading && !portfolio ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
              </div>
            ) : portfolio ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {[
                    { label: 'Intervention', value: portfolio.summary.interventionRequired, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-500/10' },
                    { label: 'Attention', value: portfolio.summary.attention, icon: Activity, tone: 'text-amber-600 bg-amber-500/10' },
                    { label: 'Stable', value: portfolio.summary.stable, icon: Building2, tone: 'text-emerald-600 bg-emerald-500/10' },
                    { label: 'Overdue invoices', value: portfolio.summary.overdueInvoices, icon: CircleDollarSign, tone: 'text-rose-600 bg-rose-500/10' },
                    { label: 'Renewals ≤30d', value: portfolio.summary.renewalsDue30, icon: CalendarClock, tone: 'text-violet-600 bg-violet-500/10' },
                    { label: 'Agreement exceptions', value: portfolio.summary.expiredAgreements + portfolio.summary.agreementsInNoticeWindow, icon: FileText, tone: 'text-amber-600 bg-amber-500/10' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
                          <p className="mt-1 text-xl font-bold">{item.value}</p>
                        </div>
                        <span className={'flex size-9 items-center justify-center rounded-xl ' + item.tone}><Icon className="size-4" /></span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 2xl:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
                  <div className="min-w-0 rounded-xl border border-border/60">
                    <div className="border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-semibold">Currency exposure</p>
                      <p className="text-[11px] text-muted-foreground">Overdue receivables and scheduled renewal value within 30 days.</p>
                    </div>
                    <div className="divide-y divide-border/60">
                      {portfolio.byCurrency.map((row) => (
                        <div key={row.currency} className="grid grid-cols-[70px_1fr_1fr] gap-3 px-4 py-3 text-xs">
                          <span className="font-semibold">{row.currency}</span>
                          <span className="text-right"><span className="block text-[9px] uppercase text-muted-foreground">Overdue</span>{money(row.overdueReceivables, row.currency)}</span>
                          <span className="text-right"><span className="block text-[9px] uppercase text-muted-foreground">Renewals</span>{money(row.renewals30, row.currency)}</span>
                        </div>
                      ))}
                      {!portfolio.byCurrency.length && <div className="px-4 py-6 text-xs text-muted-foreground">No overdue receivable or near-term renewal exposure is currently recorded.</div>}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-xl border border-border/60">
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">Accounts by management priority</p>
                        <p className="text-[11px] text-muted-foreground">Highest exception score first. Click an account to open its command centre.</p>
                      </div>
                      <Badge variant="outline">{portfolio.data.length}</Badge>
                    </div>
                    <div className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
                      {portfolio.data.slice(0, 30).map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(row.id);
                            window.setTimeout(() => document.getElementById('client-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                          }}
                          className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xs font-semibold">{row.name}</p>
                              <Badge
                                variant="outline"
                                className={
                                  row.posture === 'intervention_required'
                                    ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                                    : row.posture === 'attention'
                                      ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'
                                      : 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300'
                                }
                              >
                                {pretty(row.posture)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {row.metrics.overdueInvoices} overdue · {row.metrics.renewalsDue30} renewals · {row.metrics.expiredAgreements + row.metrics.agreementsInNoticeWindow} agreement exceptions · {row.metrics.atRiskProjects} delivery risk · {row.metrics.budgetPressure} budget pressure · {row.metrics.urgentTickets + row.metrics.slaBreaches} support pressure
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {row.exposure.slice(0, 2).map((exposure) => (
                              <span key={exposure.currency} className="rounded-lg border border-border/60 bg-background px-2 py-1 text-[9px] text-muted-foreground">
                                {exposure.currency}: {money(exposure.overdueReceivables, exposure.currency)} overdue
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                      {!portfolio.data.length && <div className="px-4 py-6 text-xs text-muted-foreground">No client organizations are available for portfolio analysis.</div>}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60">
                  <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Priority action queue</p>
                      <p className="text-[11px] text-muted-foreground">Cross-customer work ordered by severity and exception score. Open an item to continue in the correct operational workspace.</p>
                    </div>
                    <Badge variant="outline">{portfolio.actionQueue.length} action{portfolio.actionQueue.length === 1 ? '' : 's'}</Badge>
                  </div>
                  <div className="max-h-[460px] divide-y divide-border/60 overflow-y-auto">
                    {portfolio.actionQueue.slice(0, 40).map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => openPortfolioAction(action)}
                        className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-xs font-semibold">{action.organizationName}</p>
                            <Badge
                              variant="outline"
                              className={action.severity === 'high'
                                ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                                : 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'}
                            >
                              {pretty(action.severity)}
                            </Badge>
                            <Badge variant="secondary">{pretty(action.type)}</Badge>
                          </div>
                          <p className="mt-1 text-xs font-medium">{action.title}</p>
                          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{action.detail}</p>
                        </div>
                        <div className="flex items-center gap-2 self-center text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          Open action
                          <Send className="size-3.5" />
                        </div>
                      </button>
                    ))}
                    {!portfolio.actionQueue.length && (
                      <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                        No commercial, agreement, support, delivery or budget exception currently requires action.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-8">
                  {[
                    ['Expired agreements', portfolio.summary.expiredAgreements],
                    ['Notice-window agreements', portfolio.summary.agreementsInNoticeWindow],
                    ['At-risk projects', portfolio.summary.atRiskProjects],
                    ['Budget pressure', portfolio.summary.budgetPressure],
                    ['Over budget', portfolio.summary.overBudget],
                    ['Urgent support', portfolio.summary.urgentTickets],
                    ['SLA breaches', portfolio.summary.slaBreaches],
                    ['Active clients', portfolio.summary.activeOrganizations],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                Executive client portfolio data is temporarily unavailable. Core client management remains available below.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Add client organization</CardTitle></CardHeader>        <CardContent>
          <form onSubmit={createOrganization} className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(200px,1.2fr)_minmax(150px,1fr)_auto] lg:items-center">
            <Input required placeholder="Organization name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            <Input placeholder="Primary contact" value={orgForm.primaryContactName} onChange={(e) => setOrgForm({ ...orgForm, primaryContactName: e.target.value })} />
            <Input type="email" autoComplete="email" placeholder="Primary email" value={orgForm.primaryEmail} onChange={(e) => setOrgForm({ ...orgForm, primaryEmail: e.target.value })} />
            <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="Primary phone" value={orgForm.primaryPhone} onChange={(e) => setOrgForm({ ...orgForm, primaryPhone: e.target.value })} />
            <Button disabled={saving}><Plus className="mr-2 size-4" /> Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <Card className="border-border/60">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Organizations</CardTitle>
            <div className="space-y-2">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={organizationQuery}
                  onChange={(event) => setOrganizationQuery(event.target.value)}
                  placeholder="Search clients"
                  className="h-9 pl-9 text-xs"
                />
              </label>
              <select
                aria-label="Filter client organizations by status"
                value={organizationStatus}
                onChange={(event) => setOrganizationStatus(event.target.value)}
                className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="max-h-[680px] space-y-2 overflow-y-auto">
            {filteredOrganizations.length ? filteredOrganizations.map((item) => (
              <button key={item.id} type="button" aria-pressed={selected?.id === item.id} onClick={() => setSelectedId(item.id)} className={(selected?.id === item.id ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/[0.08] ' : 'border-border/60 ') + 'w-full rounded-xl border p-3 text-left transition'}>
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{item.name}</span><Badge variant="outline">{item.status}</Badge></div>
                <p className="mt-1 text-[10px] text-muted-foreground">{item._count.users} users · {item._count.projects} projects</p>
              </button>
            )) : <p className="text-sm text-muted-foreground">{organizations.length ? 'No client organizations match this search.' : 'No client organizations yet.'}</p>}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <div className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-2xl border border-border/60 bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <nav aria-label="Client command centre sections" className="flex min-w-max items-center gap-1">
                {[
                  ['Overview', 'client-overview'],
                  ['Portal users', 'client-portal-users'],
                  ['Commercial', 'client-commercial'],
                  ['Agreements', 'client-agreements'],
                  ['Communications', 'client-communications'],
                  ['Projects & documents', 'client-projects'],
                  ['Support', 'client-support'],
                ].map(([label, target]) => (
                  <Button
                    key={target}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 whitespace-nowrap text-xs"
                    onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    {label}
                  </Button>
                ))}
              </nav>
            </div>

            <Card id="client-overview" className="scroll-mt-28 border-border/60">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>{selected.name}</CardTitle>
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
                    value={selected.status}
                    onChange={(event) => void patchOrganization(selected.id, { status: event.target.value })}
                  >
                    <option value="active">Active organization</option>
                    <option value="inactive">Inactive / revoke portal</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Primary contact</p>
                    <p className="mt-1 text-sm font-semibold">{selected.primaryContactName || 'Not set'}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{selected.primaryEmail || 'No email'}{selected.primaryPhone ? ' · ' + selected.primaryPhone : ''}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Portal access</p>
                    <p className="mt-1 text-sm font-semibold">{selected.users.filter((user) => user.active).length} active user{selected.users.filter((user) => user.active).length === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{selected.users.filter((user) => user.mustSetPassword).length} activation{selected.users.filter((user) => user.mustSetPassword).length === 1 ? '' : 's'} pending</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Delivery portfolio</p>
                    <p className="mt-1 text-sm font-semibold">{selected.projects.filter((project) => !['completed', 'cancelled'].includes(project.status)).length} active project{selected.projects.filter((project) => !['completed', 'cancelled'].includes(project.status)).length === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{selected.projects.filter((project) => ['attention', 'at_risk'].includes(project.health)).length} need attention</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Support load</p>
                    <p className="mt-1 text-sm font-semibold">{selected.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length} open ticket{selected.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{selected.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status) && ['high', 'urgent', 'critical'].includes(ticket.priority)).length} high-priority</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-5 xl:grid-cols-2">
                <div id="client-portal-users" className="scroll-mt-28 rounded-2xl border border-border/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Portal users</p>
                  <div className="mt-3 space-y-2">
                    {selected.users.map((user) => (
                      <div key={user.id} className="rounded-xl bg-muted/40 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{user.lastLogin ? 'Last login ' + new Date(user.lastLogin).toLocaleString() : 'Never signed in'}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">{user.active ? 'Active' : 'Revoked'}</Badge>
                            {user.mustSetPassword && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Activation pending</Badge>}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <select
                            className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
                            value={user.role}
                            onChange={(event) => void patchUser(user.id, { role: event.target.value }, 'Portal role updated')}
                          >
                            <option value="client_admin">Client admin</option>
                            <option value="client_member">Client member</option>
                          </select>
                          <Button type="button" size="sm" variant="outline" onClick={() => void patchUser(user.id, { active: !user.active }, user.active ? 'Portal access revoked' : 'Portal access restored')}>
                            {user.active ? 'Revoke access' : 'Restore access'}
                          </Button>
                        </div>
                        <div className="mt-2 space-y-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => void regenerateInvite(user.id)}>
                            <KeyRound className="mr-2 size-3.5" /> {user.mustSetPassword ? 'Generate new activation link' : 'Generate reset link'}
                          </Button>
                          {activationLinks[user.id] && (
                            <div className="flex gap-2">
                              <Input readOnly value={activationLinks[user.id]} className="h-9 text-xs" />
                              <Button type="button" size="icon" variant="outline" onClick={() => void copyActivationLink(user.id)} aria-label="Copy activation link">
                                <Copy className="size-3.5" />
                              </Button>
                            </div>
                          )}
                          {user.mustSetPassword && user.inviteExpiresAt && (
                            <p className="text-[10px] text-muted-foreground">Current activation window expires {new Date(user.inviteExpiresAt).toLocaleString()}.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {!selected.users.length && <p className="text-xs text-muted-foreground">No portal users provisioned.</p>}
                  </div>
                  <form onSubmit={createUser} className="mt-4 space-y-3 border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold">Provision user</p>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required autoComplete="name" placeholder="Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /><Input required type="email" autoComplete="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                    <select className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="client_admin">Client admin</option><option value="client_member">Client member</option></select>
                    <Button disabled={saving} variant="outline"><KeyRound className="mr-2 size-4" /> Provision & generate activation link</Button>
                    <p className="text-[10px] text-muted-foreground">Lightworld never sets the client’s password. The API returns a one-time activation URL that expires after 7 days.</p>
                  </form>
                </div>

                <div id="client-new-project" className="scroll-mt-28 rounded-2xl border border-border/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">New project</p>
                  <form onSubmit={createProject} className="mt-3 space-y-4">
                    <Input id="client-new-project-name" required placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
                    <Textarea rows={3} placeholder="Client-visible project summary" value={projectForm.summary} onChange={(e) => setProjectForm({ ...projectForm, summary: e.target.value })} />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><Label>Lightworld project lead</Label><Input placeholder="Project lead" value={projectForm.manager} onChange={(e) => setProjectForm({ ...projectForm, manager: e.target.value })} /></div>
                      <div><Label>Delivery target date</Label><Input type="date" value={projectForm.targetDate} onChange={(e) => setProjectForm({ ...projectForm, targetDate: e.target.value })} /></div>
                    </div>

                    <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">Commercial lifecycle</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div><Label>Expiry date</Label><Input type="date" value={projectForm.expiryDate} onChange={(e) => setProjectForm({ ...projectForm, expiryDate: e.target.value })} /></div>
                        <div><Label>Next renewal date</Label><Input type="date" value={projectForm.nextRenewalDate} onChange={(e) => setProjectForm({ ...projectForm, nextRenewalDate: e.target.value })} /></div>
                        <div>
                          <Label>Renewal cycle</Label>
                          <select value={projectForm.renewalCycle} onChange={(e) => setProjectForm({ ...projectForm, renewalCycle: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="semiannual">Semiannual</option>
                            <option value="annual">Annual</option>
                            <option value="one_time">One time</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-[1fr_92px] gap-2">
                          <div><Label>Renewal amount</Label><Input type="number" min="0" step="0.01" value={projectForm.renewalAmount} onChange={(e) => setProjectForm({ ...projectForm, renewalAmount: e.target.value })} /></div>
                          <div><Label>Currency</Label><Input maxLength={3} value={projectForm.renewalCurrency} onChange={(e) => setProjectForm({ ...projectForm, renewalCurrency: e.target.value.toUpperCase() })} /></div>
                        </div>
                        <div className="grid grid-cols-[1fr_92px] gap-2">
                          <div><Label>Project budget</Label><Input type="number" min="0" step="0.01" value={projectForm.budgetAmount} onChange={(e) => setProjectForm({ ...projectForm, budgetAmount: e.target.value })} /></div>
                          <div><Label>Budget CCY</Label><Input maxLength={3} value={projectForm.budgetCurrency} onChange={(e) => setProjectForm({ ...projectForm, budgetCurrency: e.target.value.toUpperCase() })} /></div>
                        </div>
                        <div><Label>Renewal notice days</Label><Input type="number" min="0" max="365" value={projectForm.renewalNoticeDays} onChange={(e) => setProjectForm({ ...projectForm, renewalNoticeDays: e.target.value })} /></div>
                        <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                          <input type="checkbox" checked={projectForm.autoRenew} onChange={(e) => setProjectForm({ ...projectForm, autoRenew: e.target.checked })} />
                          Auto-renew
                        </label>
                      </div>
                      <div className="mt-3"><Label>Renewal notes</Label><Textarea rows={2} value={projectForm.renewalNotes} onChange={(e) => setProjectForm({ ...projectForm, renewalNotes: e.target.value })} placeholder="Renewal terms, notice requirements, special pricing…" /></div>
                    </div>

                    <Button disabled={saving}><Plus className="mr-2 size-4" /> Create project</Button>
                  </form>

                  <form onSubmit={createMilestone} className="mt-5 space-y-3 border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold">Publish milestone</p>
                    <select required className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={milestoneForm.projectId} onChange={(e) => setMilestoneForm({ ...milestoneForm, projectId: e.target.value })}>
                      <option value="">Select project</option>{selected.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                    <div className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Milestone title" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} /><Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} /></div>
                    <Button disabled={saving} variant="outline"><CalendarClock className="mr-2 size-4" /> Add milestone</Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <div id="client-commercial" className="scroll-mt-28">
              <ClientCommercialAccount
                organizationId={selected.id}
                organizationName={selected.name}
              />
            </div>

            <Card id="client-agreements" className="scroll-mt-28 border-border/60">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-amber-600" /> Agreements & SOW register</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Track contracts, statements of work and expiry obligations separately from invoices and project dates.</p>
                  </div>
                  <Badge variant="outline">{selected.agreements.filter((item) => item.status === 'active').length} active</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
                <form onSubmit={createAgreement} className="space-y-3 rounded-2xl border border-border/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Agreement title</Label><Input required value={agreementForm.title} onChange={(e) => setAgreementForm({ ...agreementForm, title: e.target.value })} placeholder="Managed services agreement" /></div>
                    <div><Label>Reference number</Label><Input value={agreementForm.referenceNumber} onChange={(e) => setAgreementForm({ ...agreementForm, referenceNumber: e.target.value })} placeholder="LWT-CTR-2026-001" /></div>
                    <div><Label>Agreement type</Label><select value={agreementForm.agreementType} onChange={(e) => setAgreementForm({ ...agreementForm, agreementType: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="contract">Contract</option><option value="statement_of_work">Statement of work</option><option value="service_agreement">Service agreement</option><option value="nda">NDA</option><option value="license">License</option><option value="other">Other</option></select></div>
                    <div><Label>Status</Label><select value={agreementForm.status} onChange={(e) => setAgreementForm({ ...agreementForm, status: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option><option value="superseded">Superseded</option></select></div>
                    <div><Label>Linked project</Label><select value={agreementForm.projectId} onChange={(e) => setAgreementForm({ ...agreementForm, projectId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Organization level</option>{selected.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
                    <div><Label>Agreement owner</Label><Input value={agreementForm.owner} onChange={(e) => setAgreementForm({ ...agreementForm, owner: e.target.value })} placeholder="Account / project owner" /></div>
                    <div className="grid grid-cols-[1fr_92px] gap-2"><div><Label>Contract value</Label><Input type="number" min="0" step="0.01" value={agreementForm.contractValue} onChange={(e) => setAgreementForm({ ...agreementForm, contractValue: e.target.value })} /></div><div><Label>Currency</Label><Input maxLength={3} value={agreementForm.currency} onChange={(e) => setAgreementForm({ ...agreementForm, currency: e.target.value.toUpperCase() })} /></div></div>
                    <div><Label>Renewal notice days</Label><Input type="number" min="0" max="365" value={agreementForm.renewalNoticeDays} onChange={(e) => setAgreementForm({ ...agreementForm, renewalNoticeDays: e.target.value })} /></div>
                    <div><Label>Effective date</Label><Input type="date" value={agreementForm.effectiveDate} onChange={(e) => setAgreementForm({ ...agreementForm, effectiveDate: e.target.value })} /></div>
                    <div><Label>Signed date</Label><Input type="date" value={agreementForm.signedAt} onChange={(e) => setAgreementForm({ ...agreementForm, signedAt: e.target.value })} /></div>
                    <div><Label>Expiry date</Label><Input type="date" value={agreementForm.expiryDate} onChange={(e) => setAgreementForm({ ...agreementForm, expiryDate: e.target.value })} /></div>
                    <div><Label>Document URL</Label><Input type="url" value={agreementForm.documentUrl} onChange={(e) => setAgreementForm({ ...agreementForm, documentUrl: e.target.value })} placeholder="https://..." /></div>
                  </div>
                  <div><Label>Commercial / legal notes</Label><Textarea rows={3} value={agreementForm.notes} onChange={(e) => setAgreementForm({ ...agreementForm, notes: e.target.value })} placeholder="Termination, notice, renewal or special delivery terms…" /></div>
                  <Button disabled={saving}><Plus className="mr-2 size-4" /> Register agreement</Button>
                </form>
                <div className="space-y-3">
                  {selected.agreements.map((agreement) => {
                    const daysToExpiry = agreement.expiryDate ? Math.ceil((new Date(agreement.expiryDate).getTime() - Date.now()) / 86400000) : null;
                    const noticeDue = daysToExpiry !== null && daysToExpiry <= agreement.renewalNoticeDays && daysToExpiry >= 0;
                    return <div key={agreement.id} className="rounded-2xl border border-border/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0"><p className="text-sm font-semibold">{agreement.title}</p><p className="mt-1 text-xs text-muted-foreground">{pretty(agreement.agreementType)}{agreement.referenceNumber ? ' · ' + agreement.referenceNumber : ''}{agreement.project?.name ? ' · ' + agreement.project.name : ''}</p></div>
                        <div className="flex flex-wrap gap-1"><Badge variant="outline">{pretty(agreement.status)}</Badge>{noticeDue && <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Notice window open</Badge>}{daysToExpiry !== null && daysToExpiry < 0 && <Badge className="bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">Expired</Badge>}</div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3"><p><span className="text-muted-foreground">Value:</span> {money(agreement.contractValue, agreement.currency)}</p><p><span className="text-muted-foreground">Owner:</span> {agreement.owner || 'Unassigned'}</p><p><span className="text-muted-foreground">Signed:</span> {agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'Not recorded'}</p><p><span className="text-muted-foreground">Effective:</span> {agreement.effectiveDate ? new Date(agreement.effectiveDate).toLocaleDateString() : 'Not set'}</p><p><span className="text-muted-foreground">Expiry:</span> {agreement.expiryDate ? new Date(agreement.expiryDate).toLocaleDateString() : 'Open-ended'}</p><p><span className="text-muted-foreground">Notice:</span> {agreement.renewalNoticeDays} days</p></div>
                      {agreement.notes && <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{agreement.notes}</p>}
                      <div className="mt-3 flex flex-wrap gap-2"><select value={agreement.status} onChange={(e) => void patchAgreement(agreement.id, { status: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs"><option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option><option value="superseded">Superseded</option></select>{agreement.documentUrl && <Button type="button" size="sm" variant="outline" onClick={() => window.open(agreement.documentUrl, '_blank', 'noopener,noreferrer')}><FileText className="mr-2 size-3.5" /> Open document</Button>}</div>
                    </div>;
                  })}
                  {!selected.agreements.length && <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No contracts or statements of work registered for this client yet.</p>}
                </div>
              </CardContent>
            </Card>

            <Card id="client-communications" className="scroll-mt-28 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="size-4 text-amber-600" /> Client announcements</CardTitle>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
                <form onSubmit={createAnnouncement} className="space-y-3">
                  <Input required placeholder="Announcement title" value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} />
                  <Textarea required rows={4} placeholder="Client-visible update…" value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} />
                  <select className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={announcementForm.projectId} onChange={(event) => setAnnouncementForm({ ...announcementForm, projectId: event.target.value })}>
                    <option value="">Organization-wide announcement</option>
                    {selected.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                  <Button disabled={saving}><Megaphone className="mr-2 size-4" /> Publish announcement</Button>
                </form>
                <div className="space-y-2">
                  {selected.announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{announcement.title}</p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{announcement.body}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">{announcement.projectId ? 'Project update' : 'Organization-wide'} · {new Date(announcement.publishAt).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline">{announcement.active ? 'Published' : 'Hidden'}</Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void toggleAnnouncement(announcement.id, !announcement.active)}>
                          {announcement.active ? 'Hide' : 'Publish'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDelete({ kind: 'announcement', id: announcement.id, label: announcement.title })}>
                          <Trash2 className="mr-1 size-3.5 text-destructive" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selected.announcements.length && <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No client announcements yet.</p>}
                </div>
              </CardContent>
            </Card>

            <div id="client-projects" className="scroll-mt-28 grid gap-4">
              {selected.projects.map((project) => (
                <Card key={project.id} className="border-border/60">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="max-w-2xl"><p className="text-lg font-semibold">{project.name}</p><p className="mt-1 text-sm text-muted-foreground">{project.summary || 'No client-visible summary yet.'}</p></div>
                      <div className="grid grid-cols-3 gap-2">
                        <select className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={project.status} onChange={(e) => void patchProject(project.id, { status: e.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select>
                        <select className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={project.health} onChange={(e) => void patchProject(project.id, { health: e.target.value })}><option value="on_track">On track</option><option value="attention">Attention</option><option value="at_risk">At risk</option></select>
                        <Input type="number" min={0} max={100} value={project.progress} onChange={(e) => {
                          const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          setOrganizations((current) => current.map((org) => org.id !== selected.id ? org : ({ ...org, projects: org.projects.map((p) => p.id === project.id ? { ...p, progress: value } : p) })));
                        }} onBlur={(e) => void patchProject(project.id, { progress: Number(e.target.value) || 0 })} className="h-9 text-xs" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">Commercial lifecycle</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Project expiry, renewal value and next renewal control.</p>
                        </div>
                        <Badge variant="outline">{project.autoRenew ? 'Auto-renew' : 'Manual renewal'}</Badge>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <Label className="text-[10px] uppercase tracking-[0.08em]">Expiry date</Label>
                          <Input
                            type="date"
                            value={project.expiryDate?.slice(0, 10) || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateProjectLocal(project.id, { expiryDate: value ? value + 'T00:00:00.000Z' : null });
                              void patchProject(project.id, { expiryDate: value ? new Date(value).toISOString() : null });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-[0.08em]">Next renewal</Label>
                          <Input
                            type="date"
                            value={project.nextRenewalDate?.slice(0, 10) || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateProjectLocal(project.id, { nextRenewalDate: value ? value + 'T00:00:00.000Z' : null });
                              void patchProject(project.id, { nextRenewalDate: value ? new Date(value).toISOString() : null });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-[0.08em]">Renewal cycle</Label>
                          <select
                            value={project.renewalCycle}
                            onChange={(e) => {
                              updateProjectLocal(project.id, { renewalCycle: e.target.value });
                              void patchProject(project.id, { renewalCycle: e.target.value });
                            }}
                            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="semiannual">Semiannual</option>
                            <option value="annual">Annual</option>
                            <option value="one_time">One time</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-[1fr_84px] gap-2">
                          <div>
                            <Label className="text-[10px] uppercase tracking-[0.08em]">Renewal amount</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={project.renewalAmount}
                              onChange={(e) => updateProjectLocal(project.id, { renewalAmount: e.target.value })}
                              onBlur={(e) => void patchProject(project.id, { renewalAmount: Number(e.target.value || 0) })}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase tracking-[0.08em]">Currency</Label>
                            <Input
                              maxLength={3}
                              value={project.renewalCurrency}
                              onChange={(e) => updateProjectLocal(project.id, { renewalCurrency: e.target.value.toUpperCase() })}
                              onBlur={(e) => void patchProject(project.id, { renewalCurrency: e.target.value.toUpperCase() })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_84px] gap-2">
                          <div>
                            <Label className="text-[10px] uppercase tracking-[0.08em]">Project budget</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={project.budgetAmount}
                              onChange={(e) => updateProjectLocal(project.id, { budgetAmount: e.target.value })}
                              onBlur={(e) => void patchProject(project.id, { budgetAmount: Number(e.target.value || 0) })}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase tracking-[0.08em]">Budget CCY</Label>
                            <Input
                              maxLength={3}
                              value={project.budgetCurrency}
                              onChange={(e) => updateProjectLocal(project.id, { budgetCurrency: e.target.value.toUpperCase() })}
                              onBlur={(e) => void patchProject(project.id, { budgetCurrency: e.target.value.toUpperCase() })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-[0.08em]">Notice days</Label>
                          <Input
                            type="number"
                            min="0"
                            max="365"
                            value={project.renewalNoticeDays}
                            onChange={(e) => updateProjectLocal(project.id, { renewalNoticeDays: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
                            onBlur={(e) => void patchProject(project.id, { renewalNoticeDays: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
                          />
                        </div>
                        <label className="flex items-center gap-2 self-end rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={project.autoRenew}
                            onChange={(e) => {
                              updateProjectLocal(project.id, { autoRenew: e.target.checked });
                              void patchProject(project.id, { autoRenew: e.target.checked });
                            }}
                          />
                          Auto-renew
                        </label>
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase tracking-[0.08em]">Renewal notes</Label>
                          <Input
                            value={project.renewalNotes}
                            placeholder="Renewal terms or special pricing"
                            onChange={(e) => updateProjectLocal(project.id, { renewalNotes: e.target.value })}
                            onBlur={(e) => void patchProject(project.id, { renewalNotes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {project.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div><p className="text-sm font-medium">{milestone.title}</p><p className="text-[10px] text-muted-foreground">{milestone.dueDate ? 'Due ' + new Date(milestone.dueDate).toLocaleDateString() : 'No due date'}</p></div>
                          <select className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={milestone.status} onChange={(e) => void patchMilestone(milestone.id, e.target.value)}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select>
                        </div>
                      ))}
                      {!project.milestones.length && <p className="text-xs text-muted-foreground">No milestones published.</p>}
                    </div>

                    <div className="mt-5 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><FileText className="size-3.5" /> Client documents</p>
                        <span className="text-[10px] text-muted-foreground">{project.documents.length} published</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {project.documents.map((document) => (
                          <div key={document.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                            <div className="min-w-0">
                              <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-amber-600 hover:underline">{document.title}</a>
                              {document.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{document.description}</p>}
                              <p className="mt-1 text-[10px] text-muted-foreground">{pretty(document.category)} · {document.visibleToClient ? 'Visible to client' : 'Internal'}</p>
                            </div>
                            <Button type="button" size="icon" variant="ghost" onClick={() => setPendingDelete({ kind: 'document', id: document.id, label: document.title })} aria-label="Remove document">
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(event) => void createDocument(event, project.id)} className="mt-3 grid gap-2 lg:grid-cols-2">
                        <Input
                          required
                          placeholder="Document title"
                          value={documentForms[project.id]?.title || ''}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { url: '', description: '', category: 'document' }), title: event.target.value } }))}
                        />
                        <Input
                          required
                          placeholder="https://… or /files/…"
                          value={documentForms[project.id]?.url || ''}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { title: '', description: '', category: 'document' }), url: event.target.value } }))}
                        />
                        <Input
                          placeholder="Category (document, invoice, guide…)"
                          value={documentForms[project.id]?.category || 'document'}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { title: '', url: '', description: '' }), category: event.target.value } }))}
                        />
                        <Input
                          placeholder="Short description"
                          value={documentForms[project.id]?.description || ''}
                          onChange={(event) => setDocumentForms((current) => ({ ...current, [project.id]: { ...(current[project.id] || { title: '', url: '', category: 'document' }), description: event.target.value } }))}
                        />
                        <Button disabled={saving} variant="outline" className="lg:col-span-2"><Plus className="mr-2 size-4" /> Publish document link</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!selected.projects.length && <Card className="border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">No projects created for this organization yet.</CardContent></Card>}
            </div>

            <Card id="client-support" className="scroll-mt-28 border-border/60">
              <CardHeader><CardTitle className="text-base">Support tickets</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {selected.tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">{ticket.ticketNumber}</span>
                          <p className="text-sm font-semibold">{ticket.subject}</p>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{ticket.message}</p>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          {pretty(ticket.category)} · {pretty(ticket.priority)} priority
                          {ticket.assignedTo ? ' · ' + ticket.assignedTo : ' · Unassigned'}
                          {' · opened ' + new Date(ticket.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <select className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15" value={ticket.status} onChange={(e) => void patchTicket(ticket.id, e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="awaiting_client">Awaiting client</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
                    </div>
                    {ticket.messages.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                        {ticket.messages.map((message) => (
                          <div key={message.id} className={message.authorType === 'admin' ? 'mr-8 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20' : 'ml-8 rounded-xl bg-muted/50 p-3'}>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <span>{message.authorName} · {message.authorType === 'admin' ? 'Lightworld' : 'Client'}</span>
                              <span>{new Date(message.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {ticket.status !== 'closed' && (
                      <div className="mt-3 flex gap-2">
                        <Input value={ticketReplies[ticket.id] || ''} onChange={(event) => setTicketReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Reply as Lightworld…" />
                        <Button type="button" size="icon" disabled={saving || !(ticketReplies[ticket.id] || '').trim()} onClick={() => void replyTicket(ticket.id)} aria-label="Send support reply">
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {!selected.tickets.length && <p className="text-xs text-muted-foreground">No support tickets yet.</p>}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-8 text-sm text-muted-foreground">Create the first client organization to start provisioning the portal.</CardContent></Card>
        )}
      </div>
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        tone="destructive"
        title={pendingDelete?.kind === 'document' ? 'Remove client document?' : 'Delete client announcement?'}
        description={
          pendingDelete?.kind === 'document'
            ? 'Remove “' + pendingDelete.label + '” from the client portal. The linked source file is not deleted by this action.'
            : pendingDelete
              ? 'Permanently delete the announcement “' + pendingDelete.label + '”. Clients will no longer be able to view it.'
              : 'Confirm this destructive action.'
        }
        confirmLabel={pendingDelete?.kind === 'document' ? 'Remove document' : 'Delete announcement'}
        onConfirm={async () => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === 'document') await deleteDocument(pendingDelete.id);
          else await deleteAnnouncement(pendingDelete.id);
        }}
      />
    </div>
  );
}