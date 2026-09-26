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