'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Briefcase, Users, Mail, FolderOpen, MessageSquare,
  Plus, ExternalLink, Inbox, Activity, ArrowUpRight, ArrowDownRight,
  Pencil, Eye, CheckCircle2, Clock, Settings, TrendingUp, BarChart3, Timer, MousePointerClick, GitBranch,
  Database, HardDrive, ShieldAlert, CircleDollarSign, CalendarClock, LifeBuoy, FolderKanban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { hasAdminPermission } from '@/lib/admin-permissions';

interface Stats {
  totalPosts: number;
  activeServices: number;
  activeTeam: number;
  unreadMessages: number;
  activePortfolio: number;
  activeTestimonials: number;
  crm: CrmSummary;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
  category?: { name: string } | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface CrmSummary {
  total: number;
  open: number;
  won: number;
  lost: number;
  highPriority: number;
  overdueFollowUps: number;
}

interface HealthData {
  status: 'healthy' | 'attention';
  checkedAt: string;
  database: { status: 'healthy' | 'unhealthy'; latencyMs: number; message?: string };
  mail: { status: 'healthy' | 'attention'; mode: string; configured: boolean; warning: string };
}

interface BackupArtifact {
  kind: 'database' | 'uploads';
  timestamp: string;
  sizeBytes: number;
  ageHours: number;
  freshness: 'fresh' | 'stale';
}

interface ExecutivePortfolio {
  summary: {
    organizations: number;
    activeOrganizations: number;
    interventionRequired: number;
    attention: number;
    stable: number;
    overdueInvoices: number;
    renewalsDue30: number;
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
  data: Array<{
    id: string;
    name: string;
    posture: 'intervention_required' | 'attention' | 'stable';
    riskScore: number;
    metrics: {
      overdueInvoices: number;
      expiredServices: number;
      renewalsDue30: number;
      atRiskProjects: number;
      urgentTickets: number;
      slaBreaches: number;
      budgetPressure: number;
      overBudget: number;
    };
  }>;
  methodology: string;
}

interface BackupData {
  status: 'healthy' | 'attention' | 'missing';
  database: BackupArtifact | null;
  uploads: BackupArtifact | null;
  checkedAt: string;
  restoreVerification: {
    status: 'not_verified';
    message: string;
  };
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return amount.toFixed(index === 0 ? 0 : amount >= 10 ? 1 : 2) + ' ' + units[index];
}

interface AnalyticsData {
  days: number;
  uniqueSessions: number;
  pageViews: number;
  assistantMessages: number;
  projectScopes: number;
  contactSubmits: number;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; events: number }>;
  daily: Array<{
    date: string;
    pageViews: number;
    sessions: number;
    assistantMessages: number;
    leads: number;
  }>;
}

const statCards = [
  { key: 'totalPosts' as const, label: 'Blog Posts', icon: FileText, action: 'admin-blog' as const, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30', borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
  { key: 'activeServices' as const, label: 'Services', icon: Briefcase, action: 'admin-services' as const, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30', borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
  { key: 'activeTeam' as const, label: 'Team Members', icon: Users, action: 'admin-team' as const, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30', borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
  { key: 'unreadMessages' as const, label: 'Unread Messages', icon: Mail, action: 'admin-messages' as const, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', borderAccent: 'border-l-[3px] border-l-rose-500 dark:border-l-rose-400' },
  { key: 'activePortfolio' as const, label: 'Portfolio', icon: FolderOpen, action: 'admin-portfolio' as const, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30', borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
  { key: 'activeTestimonials' as const, label: 'Testimonials', icon: MessageSquare, action: 'admin-testimonials' as const, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30', borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
];

const quickActions = [
  { label: 'Open CRM Pipeline', icon: GitBranch, action: 'admin-crm', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'New Blog Post', icon: Pencil, action: 'admin-blog-editor', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'View Messages', icon: Inbox, action: 'admin-messages', color: 'text-rose-600 dark:text-rose-400' },
];

export default function AdminDashboard() {
  const { navigate, adminRole, adminPermissions, adminName } = useAppStore();
  const canSite = hasAdminPermission(adminRole, adminPermissions, 'site.manage');
  const canCrm = hasAdminPermission(adminRole, adminPermissions, 'crm.manage');
  const canFinance = hasAdminPermission(adminRole, adminPermissions, 'finance.manage');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [recentMessages, setRecentMessages] = useState<ContactMessage[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [portfolio, setPortfolio] = useState<ExecutivePortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, postsRes, messagesRes, analyticsRes, healthRes, backupRes, portfolioRes] = await Promise.all([
          fetch('/api/admin/stats', { cache: 'no-store' }),
          canSite ? fetch('/api/blog?limit=5', { cache: 'no-store' }) : Promise.resolve(null),
          canCrm ? fetch('/api/contact?limit=20', { cache: 'no-store' }) : Promise.resolve(null),
          canSite ? fetch('/api/admin/analytics?days=30', { cache: 'no-store' }) : Promise.resolve(null),
          fetch('/api/admin/health', { cache: 'no-store' }),
          adminRole === 'super_admin'
            ? fetch('/api/admin/operations/backup-status', { cache: 'no-store' })
            : Promise.resolve(null),
          canFinance
            ? fetch('/api/admin/clients/portfolio-intelligence', { cache: 'no-store' })
            : Promise.resolve(null),
        ]);

        if (
          !statsRes.ok ||
          (postsRes && !postsRes.ok) ||
          (messagesRes && !messagesRes.ok) ||
          (analyticsRes && !analyticsRes.ok) ||
          !healthRes.ok ||
          (portfolioRes && !portfolioRes.ok)
        ) {
          throw new Error('Failed to fetch authorized dashboard data');
        }

        const statsData = await statsRes.json();
        const postsData = postsRes ? await postsRes.json() : { data: [] };
        const messagesData = messagesRes ? await messagesRes.json() : { data: [] };
        const analyticsData = analyticsRes ? await analyticsRes.json() : { data: null };
        const healthData = await healthRes.json();
        const backupData = backupRes && backupRes.ok ? await backupRes.json() : { data: null };
        const portfolioData = portfolioRes && portfolioRes.ok ? await portfolioRes.json() : null;

        const rawStats = statsData.data || statsData;

        setStats({
          totalPosts: rawStats?.blog?.total || 0,
          activeServices: rawStats?.services?.active || 0,
          activeTeam: rawStats?.team?.total || 0,
          unreadMessages: rawStats?.messages?.unread || 0,
          activePortfolio: rawStats?.portfolio?.total || 0,
          activeTestimonials: rawStats?.testimonials?.total || 0,
          crm: rawStats?.crm || {
            total: 0,
            open: 0,
            won: 0,
            lost: 0,
            highPriority: 0,
            overdueFollowUps: 0,
          },
        });

        const posts = Array.isArray(postsData) ? postsData : (postsData.data || []);
        const messages = Array.isArray(messagesData) ? messagesData : (messagesData.data || []);
        setRecentPosts(posts.slice(0, 5));
        setRecentMessages(messages.slice(0, 5));
        setAnalytics(analyticsData.data || null);
        setHealth(healthData.data || null);
        setBackup(backupData.data || null);
        setPortfolio(portfolioData ? {
          summary: portfolioData.summary,
          byCurrency: portfolioData.byCurrency || [],
          data: portfolioData.data || [],
          methodology: portfolioData.methodology || '',
        } : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [canSite, canCrm, canFinance, adminRole]);

  const openMessage = (messageId: string) => {
    sessionStorage.setItem('lw-open-message-id', messageId);
    navigate('admin-messages');
  };

  const openClientAccount = (organizationId?: string) => {
    if (organizationId) sessionStorage.setItem('lw-client-organization-id', organizationId);
    navigate('admin-clients');
  };

  const openFinanceWorkspace = (section: 'collections' | 'renewals') => {
    sessionStorage.setItem('lw-finance-section', section);
    navigate('admin-finance');
  };

  const openSupportDesk = () => {
    navigate('admin-support');
  };

  const openCrm = (filter?: { status?: string; priority?: string }) => {
    if (filter?.status) sessionStorage.setItem('lw-crm-status-filter', filter.status);
    if (filter?.priority) sessionStorage.setItem('lw-crm-priority-filter', filter.priority);
    navigate('admin-crm');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const recentActivities = (() => {
    const messageActivity = recentMessages.map((message) => ({
      id: 'message-' + message.id,
      targetId: message.id,
      type: 'message' as const,
      text: 'Inquiry from ' + message.name,
      createdAt: message.createdAt,
      icon: Mail,
      iconColor: message.read ? 'text-slate-400' : 'text-amber-500',
    }));
    const postActivity = recentPosts.map((post) => ({
      id: 'post-' + post.id,
      targetId: post.id,
      type: 'post' as const,
      text: (post.published ? 'Published: ' : 'Draft: ') + post.title,
      createdAt: post.createdAt,
      icon: FileText,
      iconColor: post.published ? 'text-emerald-500' : 'text-slate-400',
    }));
    return [...messageActivity, ...postActivity]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  })();

  const trafficData = analytics?.daily?.slice(-14) || [];
  const maxTraffic = Math.max(1, ...trafficData.map((item) => item.pageViews));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-amber-900 to-amber-600" />
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-amber-400/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 px-6 py-6 md:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">Operations overview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">Welcome back, {adminName || 'Admin'}</h1>
            <p className="mt-1 text-sm text-amber-50/75 md:text-base">Your website, client, communication and operational signals in one place.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('admin-settings')}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-left backdrop-blur-sm transition hover:bg-white/15"
            title={health?.mail.warning || 'Open system settings'}
          >
            <div className="relative">
              <div className={`size-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-300' : 'bg-amber-200'}`} />
              <div className={`absolute inset-0 size-2 animate-ping rounded-full opacity-75 ${health?.status === 'healthy' ? 'bg-emerald-300' : 'bg-amber-200'}`} />
            </div>
            <div>
              <span className="block text-sm font-medium text-white">
                {health?.status === 'healthy' ? 'Systems operational' : 'System attention needed'}
              </span>
              <span className="block text-[10px] text-amber-50/80">
                DB {health?.database.latencyMs ?? '—'}ms · Mail {health?.mail.configured ? 'ready' : 'check config'}
              </span>
            </div>
            <ArrowUpRight className="size-3.5 text-white/70" />
          </button>
        </div>
      </motion.div>

      {/* Consented first-party analytics — last 30 days */}
      {canSite && (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">First-party analytics · last 30 days</p>
          <span className="text-[10px] text-muted-foreground">Only visitors who allow Analytics are counted</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Unique Sessions', value: analytics?.uniqueSessions || 0, icon: Users, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Page Views', value: analytics?.pageViews || 0, icon: Eye, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Assistant Messages', value: analytics?.assistantMessages || 0, icon: MessageSquare, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Contact Submissions', value: analytics?.contactSubmits || 0, icon: Mail, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
            >
              <button type="button" onClick={() => setAnalyticsOpen(true)} className="block w-full text-left">
                <Card className="border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:hover:border-amber-800">
                  <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <Icon className={`size-4 ${item.color}`} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Live</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          );
        })}
        </div>
      </div>
      )}


      {canFinance && portfolio && (
        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Executive exceptions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commercial, delivery and support conditions that need management attention now.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openClientAccount()}
              className="text-left text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"
            >
              Open client portfolio
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Accounts needing intervention',
                value: portfolio.summary.interventionRequired,
                detail: portfolio.summary.attention + ' additional account(s) need attention',
                icon: ShieldAlert,
                onClick: () => openClientAccount(portfolio.data.find((item) => item.posture === 'intervention_required')?.id),
              },
              {
                label: 'Overdue invoices',
                value: portfolio.summary.overdueInvoices,
                detail: portfolio.byCurrency.length
                  ? portfolio.byCurrency.map((item) => item.currency + ' ' + Number(item.overdueReceivables || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).join(' · ')
                  : 'No overdue receivable exposure',
                icon: CircleDollarSign,
                onClick: () => openFinanceWorkspace('collections'),
              },
              {
                label: 'Renewals due in 30 days',
                value: portfolio.summary.renewalsDue30,
                detail: portfolio.byCurrency.length
                  ? portfolio.byCurrency.map((item) => item.currency + ' ' + Number(item.renewals30 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).join(' · ')
                  : 'No renewal exposure recorded',
                icon: CalendarClock,
                onClick: () => openFinanceWorkspace('renewals'),
              },
              {
                label: 'Operational risk',
                value: portfolio.summary.atRiskProjects + portfolio.summary.slaBreaches + portfolio.summary.urgentTickets,
                detail:
                  portfolio.summary.atRiskProjects +
                  ' project risk · ' +
                  portfolio.summary.slaBreaches +
                  ' SLA breach(es) · ' +
                  portfolio.summary.urgentTickets +
                  ' urgent ticket(s)',
                icon: LifeBuoy,
                onClick: () => openSupportDesk(),
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} type="button" onClick={item.onClick} className="block h-full w-full text-left">
                  <Card className="h-full border-border/60 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <Icon className="size-5" />
                        </span>
                        <ArrowUpRight className="size-4 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-2xl font-bold">{item.value}</p>
                      <p className="mt-1 text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{item.detail}</p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>

          {portfolio.summary.overBudget > 0 || portfolio.summary.budgetPressure > 0 ? (
            <button type="button" onClick={() => openClientAccount()} className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-left text-xs text-amber-950 transition hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-100">
              <span>
                <strong>Budget watch:</strong> {portfolio.summary.overBudget} project(s) over budget and {portfolio.summary.budgetPressure} at or above the portfolio pressure threshold.
              </span>
              <FolderKanban className="size-4 shrink-0" />
            </button>
          ) : null}
        </div>
      )}

      {/* CRM pipeline snapshot */}
      {canCrm && (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">CRM pipeline</p>
          <button onClick={() => navigate('admin-crm')} className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300">
            Open pipeline
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Open Leads', value: stats?.crm.open || 0, onClick: () => openCrm() },
            { label: 'High Priority', value: stats?.crm.highPriority || 0, onClick: () => openCrm({ priority: 'high' }) },
            { label: 'Overdue Follow-ups', value: stats?.crm.overdueFollowUps || 0, onClick: () => openCrm() },
            { label: 'Won', value: stats?.crm.won || 0, onClick: () => openCrm({ status: 'won' }) },
          ].map((item) => (
            <button key={item.label} type="button" onClick={item.onClick} className="text-left">
              <Card className="h-full border-border/50 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-bold text-foreground">{item.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
      )}

      {adminRole === 'super_admin' && (
        <button type="button" onClick={() => setBackupOpen(true)} className="block w-full text-left">
          <Card className="border-border/60 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={
                  'flex size-11 shrink-0 items-center justify-center rounded-xl ' +
                  (backup?.status === 'healthy'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')
                }>
                  <HardDrive className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Recovery readiness</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {backup?.status === 'healthy'
                      ? 'Fresh database and uploads backup artifacts detected.'
                      : backup
                        ? 'Backup freshness needs attention.'
                        : 'Backup status could not be confirmed.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Database backup</p>
                  <p className="mt-1 text-sm font-semibold">
                    {backup?.database ? backup.database.ageHours + 'h ago' : 'Not detected'}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </button>
      )}

      {/* Permission-scoped content snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.filter((card) => card.key === 'unreadMessages' ? canCrm : canSite).map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key] || 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <button type="button" onClick={() => navigate(card.action)} className="block w-full text-left">
                <Card className={`border-border/50 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 transition-all duration-300 ${card.borderAccent}`}>
                  <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Charts + Quick Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* First-party traffic chart */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="size-4 text-amber-500" />
                  Consented Traffic
                </CardTitle>
                <span className="text-xs text-muted-foreground">Last 14 days</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-end gap-3 h-40">
                {trafficData.map((item, i) => {
                  const height = (item.pageViews / maxTraffic) * 100;
                  const isCurrentDay = i === trafficData.length - 1;
                  return (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{item.pageViews}</span>
                      <div className="w-full relative group">
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {item.pageViews} views · {item.sessions} sessions
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-200" />
                        </div>
                        <motion.div
                          className={`w-full rounded-t-lg ${isCurrentDay ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-gradient-to-t group-hover:from-amber-600 group-hover:to-amber-400'} transition-all duration-300 cursor-pointer`}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                          style={{ minHeight: '4px' }}
                        />
                      </div>
                      <span className={`text-xs ${isCurrentDay ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {new Date(item.date + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {quickActions.filter((action) => {
                if (action.action === 'admin-crm' || action.action === 'admin-messages') return canCrm;
                return canSite;
              }).map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    className="w-full flex items-center justify-start gap-3 h-14 px-4 rounded-xl border border-border/50 bg-gradient-to-r from-white to-slate-50/50 dark:from-slate-800/80 dark:to-slate-800/40 hover:from-amber-50 hover:to-amber-50/30 dark:hover:from-amber-900/20 dark:hover:to-amber-900/10 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-md transition-all duration-300 text-left"
                    onClick={() => navigate(action.action as Parameters<typeof navigate>[0])}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${i === 0 ? 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20' : i === 1 ? 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20' : 'from-rose-100 to-rose-50 dark:from-rose-900/40 dark:to-rose-900/20'}`}>
                      <Icon className={`size-4 ${action.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                    <ArrowUpRight className="size-3.5 ml-auto text-muted-foreground" />
                  </motion.button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent data tables + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent posts */}
        {canSite && (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Recent Blog Posts
              </h2>
            </div>
            {recentPosts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No posts yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPosts.map((post) => (
                    <TableRow key={post.id} onClick={() => navigate('admin-blog-editor', post.id)} className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200">
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{post.title}</TableCell>
                      <TableCell>
                        {post.published ? (
                          <Badge className="bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        )}

        {/* Recent messages */}
        {canCrm && (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                Recent Messages
              </h2>
            </div>
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No messages yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMessages.map((msg) => (
                    <TableRow key={msg.id} onClick={() => openMessage(msg.id)} className={`cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200 ${!msg.read ? 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' : ''}`}>
                      <TableCell className="font-medium text-sm">
                        <span className="flex items-center gap-2">
                          {!msg.read && <span className="relative flex size-2 shrink-0"><span className="animate-ping absolute inline-flex size-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full size-2 bg-amber-500" /></span>}
                          <span className={msg.read ? '' : 'font-bold'}>{msg.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate text-muted-foreground">{msg.subject || 'No subject'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        )}

        {/* Recent Activity */}
        {(canSite || canCrm) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-border/50 h-full">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" />
                  Recent Activity
                </h2>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => activity.type === 'message' ? openMessage(activity.targetId) : navigate('admin-blog-editor', activity.targetId)}
                      className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className={`size-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`size-3.5 ${activity.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{activity.text}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        )}
      </div>

      <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="size-5 text-amber-600" />
              Recovery readiness
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'PostgreSQL database', artifact: backup?.database, icon: Database },
              { label: 'Uploaded files', artifact: backup?.uploads, icon: FolderOpen },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-border/60 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <Icon className="size-5" />
                    </span>
                    <Badge variant={item.artifact?.freshness === 'fresh' ? 'default' : 'secondary'}>
                      {item.artifact?.freshness === 'fresh' ? 'Fresh' : item.artifact ? 'Stale' : 'Missing'}
                    </Badge>
                  </div>
                  <p className="mt-4 font-semibold">{item.label}</p>
                  {item.artifact ? (
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>Latest artifact: {new Date(item.artifact.timestamp).toLocaleString()}</p>
                      <p>Age: {item.artifact.ageHours} hours</p>
                      <p>Size: {formatBytes(item.artifact.sizeBytes)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-rose-600">No matching backup artifact detected.</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="size-4" /> Restore verification
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-900/75 dark:text-amber-200/70">
              {backup?.restoreVerification.message ||
                'Backup artifacts are checked for presence and freshness only. A successful restore rehearsal has not been verified by this panel.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-amber-600" />
              Analytics drill-down · last {analytics?.days || 30} days
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 p-5">
              <h3 className="font-semibold">Top pages</h3>
              <div className="mt-4 space-y-3">
                {(analytics?.topPages || []).slice(0, 10).map((item, index) => (
                  <div key={item.path + index} className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0">
                    <span className="min-w-0 truncate text-sm">{item.path}</span>
                    <Badge variant="secondary">{item.views} views</Badge>
                  </div>
                ))}
                {!analytics?.topPages?.length && <p className="text-sm text-muted-foreground">No page-view data yet.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 p-5">
              <h3 className="font-semibold">Top referrers</h3>
              <div className="mt-4 space-y-3">
                {(analytics?.topReferrers || []).slice(0, 10).map((item, index) => (
                  <div key={item.referrer + index} className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0">
                    <span className="min-w-0 truncate text-sm">{item.referrer || 'Direct / unknown'}</span>
                    <Badge variant="secondary">{item.events} events</Badge>
                  </div>
                ))}
                {!analytics?.topReferrers?.length && <p className="text-sm text-muted-foreground">No referrer data yet.</p>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
