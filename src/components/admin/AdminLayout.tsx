'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  MessageSquare,
  FolderOpen,
  Mail,
  HelpCircle,
  Settings,
  ArrowLeft,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'admin-dashboard' as const },
  { id: 'services', label: 'Services', icon: Briefcase, page: 'admin-services' as const },
  { id: 'blog', label: 'Blog Posts', icon: FileText, page: 'admin-blog' as const },
  { id: 'team', label: 'Team Members', icon: Users, page: 'admin-team' as const },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquare, page: 'admin-testimonials' as const },
  { id: 'portfolio', label: 'Portfolio', icon: FolderOpen, page: 'admin-portfolio' as const },
  { id: 'messages', label: 'Messages', icon: Mail, page: 'admin-messages' as const },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle, page: 'admin-faqs' as const },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'admin-settings' as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentPage, adminTab, setAdminTab, navigate, adminName, logoutAdmin } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavClick = (id: string, page: 'admin-dashboard' | 'admin-services' | 'admin-blog' | 'admin-blog-editor' | 'admin-team' | 'admin-testimonials' | 'admin-messages' | 'admin-settings' | 'admin-faqs' | 'admin-portfolio') => {
    setAdminTab(id);
    navigate(page);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center">
          <span className="text-white font-bold text-sm">LW</span>
        </div>
        <div>
          <h2 className="font-bold text-sm text-foreground">Lightworld</h2>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.page)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 px-3">
          <div className="border-t border-border pt-3">
            <button
              onClick={() => navigate('home')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back to Site</span>
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <h1 className="text-sm font-semibold text-foreground capitalize">
                {adminTab === 'dashboard' ? 'Dashboard' :
                 adminTab === 'blog' ? 'Blog Posts' :
                 adminTab === 'services' ? 'Services' :
                 adminTab === 'team' ? 'Team Members' :
                 adminTab === 'testimonials' ? 'Testimonials' :
                 adminTab === 'portfolio' ? 'Portfolio' :
                 adminTab === 'messages' ? 'Messages' :
                 adminTab === 'faqs' ? 'FAQs' :
                 adminTab === 'settings' ? 'Settings' : 'Admin'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-700 dark:text-amber-300 text-xs font-bold">{(adminName || 'A').charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{adminName || 'Admin'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { logoutAdmin(); navigate('home'); }}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
