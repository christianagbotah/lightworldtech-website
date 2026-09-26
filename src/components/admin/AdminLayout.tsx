'use client';

import { readJsonResponse } from '@/lib/client-api';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  PanelsTopLeft,
  Briefcase,
  FileText,
  Users,
  MessageSquare,
  FolderOpen,
  Mail,
  MailCheck,
  Megaphone,
  GitBranch,
  FileSignature,
  Building2,
  HelpCircle,
  Settings,
  ShieldCheck,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  Bell,
  Search,
  AlertTriangle,
  CircleAlert,
  Info,
  LifeBuoy,
  Landmark,
  Keyboard,
  Images,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { hasAdminPermission, type AdminPermission } from '@/lib/admin-permissions';
import AdminSecurityDialog from '@/components/admin/AdminSecurityDialog';

const navGroups = [
  { id: 'overview', label: 'Overview' },
  { id: 'website', label: 'Website & content' },
  { id: 'sales', label: 'Sales & clients' },
  { id: 'communications', label: 'Communications' },
  { id: 'administration', label: 'Administration' },
] as const;

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'admin-dashboard' as const, group: 'overview' },
  { id: 'pages', label: 'Page Content', icon: PanelsTopLeft, page: 'admin-pages' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'media', label: 'Media Library', icon: Images, page: 'admin-media' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'services', label: 'Services', icon: Briefcase, page: 'admin-services' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'blog', label: 'Blog Posts', icon: FileText, page: 'admin-blog' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'team', label: 'Team Members', icon: Users, page: 'admin-team' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquare, page: 'admin-testimonials' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'portfolio', label: 'Portfolio', icon: FolderOpen, page: 'admin-portfolio' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle, page: 'admin-faqs' as const, permission: 'site.manage' as AdminPermission, group: 'website' },
  { id: 'crm', label: 'CRM Pipeline', icon: GitBranch, page: 'admin-crm' as const, permission: 'crm.manage' as AdminPermission, group: 'sales' },
  { id: 'proposals', label: 'Proposals', icon: FileSignature, page: 'admin-proposals' as const, permission: 'proposals.manage' as AdminPermission, group: 'sales' },
  { id: 'clients', label: 'Client Portal', icon: Building2, page: 'admin-clients' as const, permission: 'clients.manage' as AdminPermission, group: 'sales' },
  { id: 'support', label: 'Support Desk', icon: LifeBuoy, page: 'admin-support' as const, permission: 'clients.manage' as AdminPermission, group: 'sales' },
  { id: 'finance', label: 'Finance & Accounts', icon: Landmark, page: 'admin-finance' as const, permission: 'finance.manage' as AdminPermission, group: 'sales' },
  { id: 'messages', label: 'Messages', icon: Mail, page: 'admin-messages' as const, permission: 'crm.manage' as AdminPermission, group: 'communications' },
  { id: 'newsletter', label: 'Newsletter & Mail', icon: MailCheck, page: 'admin-newsletter' as const, permission: 'communications.manage' as AdminPermission, group: 'communications' },
  { id: 'campaigns', label: 'Campaign Studio', icon: Megaphone, page: 'admin-campaigns' as const, permission: 'communications.manage' as AdminPermission, group: 'communications' },
  { id: 'sms', label: 'SMS & OTP', icon: MessageSquare, page: 'admin-sms' as const, permission: 'communications.manage' as AdminPermission, group: 'communications' },
  { id: 'governance', label: 'Admin Governance', icon: ShieldCheck, page: 'admin-governance' as const, superAdminOnly: true, group: 'administration' },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'admin-settings' as const, permission: 'site.manage' as AdminPermission, group: 'administration' },
];

type AdminSearchResult = {
  kind: 'client' | 'project' | 'invoice' | 'payment' | 'support' | 'lead' | 'proposal' | 'message';
  id: string;
  title: string;
  subtitle: string;
  workspace: 'admin-clients' | 'admin-finance' | 'admin-support' | 'admin-crm' | 'admin-proposals' | 'admin-messages';
};

type AdminNotice = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  count: number;
  action: string;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentPage, adminTab, setAdminTab, navigate, adminName, adminRole, adminPermissions, logoutAdmin } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [noticeTotal, setNoticeTotal] = useState(0);
  const [noticeLoading, setNoticeLoading] = useState(true);

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => {
      if ('superAdminOnly' in item && item.superAdminOnly && adminRole !== 'super_admin') return false;
      if ('permission' in item && item.permission && !hasAdminPermission(adminRole, adminPermissions, item.permission)) return false;
      return true;
    }),
    [adminRole, adminPermissions],
  );

  const loadNotifications = async () => {
    setNoticeLoading(true);
    try {
      const response = await fetch('/api/admin/notifications', { cache: 'no-store' });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Could not load notifications');
      setNotices(payload?.data?.notices || []);
      setNoticeTotal(Number(payload?.data?.total || 0));
    } catch {
      setNotices([]);
      setNoticeTotal(0);
    } finally {
      setNoticeLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [adminTab]);

  useEffect(() => {
    if (!commandOpen || commandQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch('/api/admin/search?q=' + encodeURIComponent(commandQuery.trim()), {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await readJsonResponse(response);
        if (!response.ok) throw new Error(payload?.error || 'Unable to search operations');
        setSearchResults(Array.isArray(payload?.data) ? payload.data : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [commandOpen, commandQuery]);


  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadNotifications();
    };
    const intervalId = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem('lw-admin-sidebar-collapsed') === '1');
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('lw-admin-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNoticeAction = (action: string) => {
    if (action === 'admin-support-at-risk') {
      sessionStorage.setItem('lw-support-sla-filter', 'at_risk');
      navigate('admin-support');
      return;
    }
    if (action === 'admin-clients') {
      navigate('admin-clients');
      return;
    }
    if (action === 'admin-finance-collections') {
      sessionStorage.setItem('lw-finance-section', 'collections');
      navigate('admin-finance');
      return;
    }
    if (action === 'admin-finance-renewals') {
      sessionStorage.setItem('lw-finance-section', 'renewals');
      navigate('admin-finance');
      return;
    }
    if (action === 'admin-finance-suppliers') {
      sessionStorage.setItem('lw-finance-section', 'suppliers');
      navigate('admin-finance');
      return;
    }
    if (action === 'admin-crm-overdue') {
      sessionStorage.setItem('lw-crm-overdue-filter', '1');
      navigate('admin-crm');
      return;
    }
    const item = visibleNavItems.find((entry) => entry.page === action);
    if (item) handleNavClick(item.id, item.page);
  };

  const openSearchResult = (result: AdminSearchResult) => {
    if (result.kind === 'client') {
      sessionStorage.setItem('lw-client-organization-id', result.id);
      navigate('admin-clients');
    } else if (result.kind === 'project') {
      sessionStorage.setItem('lw-finance-section', 'customers');
      sessionStorage.setItem('lw-finance-project-id', result.id);
      navigate('admin-finance');
    } else if (result.kind === 'invoice') {
      sessionStorage.setItem('lw-finance-section', 'customers');
      sessionStorage.setItem('lw-finance-record-type', 'invoice');
      sessionStorage.setItem('lw-finance-record-id', result.id);
      navigate('admin-finance');
    } else if (result.kind === 'payment') {
      sessionStorage.setItem('lw-finance-section', 'customers');
      sessionStorage.setItem('lw-finance-record-type', 'receipt');
      sessionStorage.setItem('lw-finance-record-id', result.id);
      navigate('admin-finance');
    } else if (result.kind === 'support') {
      sessionStorage.setItem('lw-support-ticket-id', result.id);
      navigate('admin-support');
    } else if (result.kind === 'lead') {
      sessionStorage.setItem('lw-open-lead-id', result.id);
      navigate('admin-crm');
    } else if (result.kind === 'proposal') {
      sessionStorage.setItem('lw-open-proposal-id', result.id);
      navigate('admin-proposals');
    } else {
      sessionStorage.setItem('lw-open-message-id', result.id);
      navigate('admin-messages');
    }
    setCommandQuery('');
    setSearchResults([]);
    setCommandOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } finally {
      logoutAdmin();
      navigate('home');
    }
  };

  const handleNavClick = (id: string, page: 'admin-dashboard' | 'admin-pages' | 'admin-media' | 'admin-services' | 'admin-blog' | 'admin-blog-editor' | 'admin-team' | 'admin-testimonials' | 'admin-crm' | 'admin-proposals' | 'admin-clients' | 'admin-support' | 'admin-finance' | 'admin-newsletter' | 'admin-campaigns' | 'admin-sms' | 'admin-governance' | 'admin-messages' | 'admin-settings' | 'admin-faqs' | 'admin-portfolio') => {
    setAdminTab(id);
    navigate(page);
    setSidebarOpen(false);
  };

  const sidebarContent = (collapsed = false) => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className={cn(
        'flex min-h-16 items-center border-b border-border/70 px-3',
        collapsed ? 'justify-center' : 'justify-between gap-3',
      )}>
        <div className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-sm shadow-amber-600/20">
            <span className="text-sm font-bold text-white">LW</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-foreground">Lightworld</h2>
              <p className="text-[11px] text-muted-foreground">Admin Console</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground lg:flex"
            aria-label="Collapse admin sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 py-3">
        <nav className={cn('space-y-5', collapsed ? 'px-2' : 'px-3')} aria-label="Admin workspaces">
          {navGroups.map((group) => {
            const items = visibleNavItems.filter((item) => item.group === group.id);
            if (!items.length) return null;
            return (
              <div key={group.id} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/65">
                    {group.label}
                  </p>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = adminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id, item.page)}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'group flex w-full items-center rounded-xl text-sm font-semibold transition-all duration-150',
                        collapsed ? 'h-10 justify-center px-0' : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className={cn('mt-5', collapsed ? 'px-2' : 'px-3')}>
          <div className="border-t border-border/70 pt-3">
            <button
              type="button"
              onClick={() => navigate('home')}
              title={collapsed ? 'Back to site' : undefined}
              className={cn(
                'flex w-full items-center rounded-xl text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
                collapsed ? 'h-10 justify-center px-0' : 'gap-3 px-3 py-2.5',
              )}
            >
              <ArrowLeft className="size-4 shrink-0" />
              {!collapsed && <span>Back to site</span>}
            </button>
          </div>
        </div>
      </ScrollArea>

      {collapsed && (
        <div className="border-t border-border/70 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-10 w-full items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Expand admin sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-muted/30">
      {/* Desktop sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 hidden h-dvh min-h-0 flex-col overflow-hidden border-r border-border/70 bg-card/95 backdrop-blur transition-[width] duration-200 lg:flex',
        sidebarCollapsed ? 'w-20' : 'w-64',
      )}>
        {sidebarContent(sidebarCollapsed)}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {sidebarContent(false)}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className={cn(
        'flex min-h-screen min-w-0 w-full flex-col transition-[margin,width] duration-200',
        sidebarCollapsed ? 'lg:ml-20 lg:w-[calc(100%-5rem)]' : 'lg:ml-64 lg:w-[calc(100%-16rem)]',
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 min-w-0 border-b border-border/70 bg-card/88 shadow-sm shadow-slate-950/[0.025] backdrop-blur-xl">
          <div className="flex h-16 min-w-0 items-center justify-between gap-3 px-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <h1 className="truncate text-sm font-semibold capitalize text-foreground">
                {adminTab === 'dashboard' ? 'Dashboard' :
                 adminTab === 'pages' ? 'Page Content' :
                 adminTab === 'media' ? 'Media Library' :
                 adminTab === 'blog' ? 'Blog Posts' :
                 adminTab === 'services' ? 'Services' :
                 adminTab === 'team' ? 'Team Members' :
                 adminTab === 'testimonials' ? 'Testimonials' :
                 adminTab === 'portfolio' ? 'Portfolio' :
                 adminTab === 'crm' ? 'CRM Pipeline' :
                 adminTab === 'proposals' ? 'Proposals' :
                 adminTab === 'clients' ? 'Client Portal' :
                 adminTab === 'support' ? 'Support Desk' :
                 adminTab === 'finance' ? 'Finance & Accounts' :
                 adminTab === 'newsletter' ? 'Newsletter & Mail' :
                 adminTab === 'campaigns' ? 'Campaign Studio' :
                 adminTab === 'sms' ? 'SMS & OTP' :
                 adminTab === 'governance' ? 'Admin Governance' :
                 adminTab === 'messages' ? 'Messages' :
                 adminTab === 'faqs' ? 'FAQs' :
                 adminTab === 'settings' ? 'Settings' : 'Admin'}
              </h1>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="hidden h-9 min-w-[220px] items-center gap-2 rounded-lg border border-border bg-background/70 px-3 text-left text-sm text-muted-foreground transition hover:border-amber-300 hover:bg-background md:flex"
                aria-label="Open admin command palette"
              >
                <Search className="size-4" />
                <span className="truncate">Search admin…</span>
                <span className="ml-auto flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                  <Keyboard className="size-3" /> Ctrl K
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCommandOpen(true)}
                className="md:hidden"
                aria-label="Search admin"
                title="Search admin"
              >
                <Search className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSecurityOpen(true)}
                aria-label="Administrator security"
                title="Administrator security"
              >
                <ShieldCheck className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Open notifications"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {noticeTotal > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">
                        {noticeTotal > 99 ? '99+' : noticeTotal}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(92vw,390px)] p-0">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Notification centre</p>
                      <p className="text-[11px] text-muted-foreground">Operational items that need attention</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void loadNotifications()} disabled={noticeLoading}>
                      Refresh
                    </Button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {noticeLoading ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">Checking operational items…</p>
                    ) : notices.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <ShieldCheck className="mx-auto size-6 text-emerald-600" />
                        <p className="mt-2 text-sm font-medium">Nothing needs attention</p>
                        <p className="mt-1 text-xs text-muted-foreground">No current alerts for your access scope.</p>
                      </div>
                    ) : notices.map((notice) => {
                      const NoticeIcon = notice.severity === 'critical' ? CircleAlert : notice.severity === 'warning' ? AlertTriangle : Info;
                      return (
                        <button
                          key={notice.id}
                          type="button"
                          onClick={() => handleNoticeAction(notice.action)}
                          className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted"
                        >
                          <span className={cn(
                            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
                            notice.severity === 'critical'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : notice.severity === 'warning'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
                          )}>
                            <NoticeIcon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-semibold">{notice.title}</span>
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{notice.count}</span>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{notice.message}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-700 dark:text-amber-300 text-xs font-bold">{(adminName || 'A').charAt(0).toUpperCase()}</span>
                </div>
                <div className="leading-tight">
                  <span className="block text-sm font-medium text-foreground">{adminName || 'Admin'}</span>
                  {adminRole === 'super_admin' && <span className="block text-[10px] uppercase tracking-[0.12em] text-amber-600 dark:text-amber-300">Super admin</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-7">
          <div className="mx-auto min-w-0 w-full max-w-[1800px]">{children}</div>
        </main>
      </div>

      <AdminSecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Admin command palette"
        description="Search and navigate Lightworld administrator workspaces"
        className="max-w-2xl"
      >
        <CommandInput
          value={commandQuery}
          onValueChange={setCommandQuery}
          placeholder="Search workspaces, clients, projects, invoices, payments, proposals, tickets, leads or messages…"
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>{searchLoading ? 'Searching operational records…' : 'No matching workspace or operational record.'}</CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup heading="Operational records">
              {searchResults.map((result) => (
                <CommandItem
                  key={result.kind + '-' + result.id}
                  value={result.kind + ' ' + result.title + ' ' + result.subtitle}
                  onSelect={() => openSearchResult(result)}
                >
                  {result.kind === 'client' ? <Building2 className="size-4" /> :
                   result.kind === 'project' ? <FolderOpen className="size-4" /> :
                   result.kind === 'invoice' || result.kind === 'payment' ? <Landmark className="size-4" /> :
                   result.kind === 'support' ? <LifeBuoy className="size-4" /> :
                   result.kind === 'lead' ? <GitBranch className="size-4" /> :
                   result.kind === 'proposal' ? <FileSignature className="size-4" /> :
                   <Mail className="size-4" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{result.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{result.subtitle}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Workspaces">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.label + ' ' + item.id}
                  onSelect={() => {
                    handleNavClick(item.id, item.page);
                    setCommandOpen(false);
                  }}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
          {hasAdminPermission(adminRole, adminPermissions, 'site.manage') && (
            <CommandGroup heading="Quick actions">
              <CommandItem
                value="new blog post create article"
                onSelect={() => {
                  navigate('admin-blog-editor');
                  setCommandOpen(false);
                }}
              >
                <FileText className="size-4" />
                <span>Create blog post</span>
                <CommandShortcut>New</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
