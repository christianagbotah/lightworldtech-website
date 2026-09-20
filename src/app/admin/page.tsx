'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminServices from '@/components/admin/AdminServices';
import AdminBlog from '@/components/admin/AdminBlog';
import AdminBlogEditor from '@/components/admin/AdminBlogEditor';
import AdminTeam from '@/components/admin/AdminTeam';
import AdminTestimonials from '@/components/admin/AdminTestimonials';
import AdminPortfolio from '@/components/admin/AdminPortfolio';
import AdminMessages from '@/components/admin/AdminMessages';
import AdminCRM from '@/components/admin/AdminCRM';
import AdminProposals from '@/components/admin/AdminProposals';
import AdminClients from '@/components/admin/AdminClients';
import AdminNewsletter from '@/components/admin/AdminNewsletter';
import AdminCampaigns from '@/components/admin/AdminCampaigns';
import AdminGovernance from '@/components/admin/AdminGovernance';
import AdminFAQs from '@/components/admin/AdminFAQs';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminPages from '@/components/admin/AdminPages';
import { hasAdminPermission, type AdminPermission } from '@/lib/admin-permissions';

function AdminRouter() {
  const { adminTab, adminRole, adminPermissions } = useAppStore();
  const can = (permission: AdminPermission) =>
    hasAdminPermission(adminRole, adminPermissions, permission);

  switch (adminTab) {
    case 'pages':
      return can('site.manage') ? <AdminPages /> : <AdminDashboard />;
    case 'services':
      return can('site.manage') ? <AdminServices /> : <AdminDashboard />;
    case 'blog':
      return can('site.manage') ? <AdminBlog /> : <AdminDashboard />;
    case 'blog-editor':
      return can('site.manage') ? <AdminBlogEditor /> : <AdminDashboard />;
    case 'team':
      return can('site.manage') ? <AdminTeam /> : <AdminDashboard />;
    case 'testimonials':
      return can('site.manage') ? <AdminTestimonials /> : <AdminDashboard />;
    case 'portfolio':
      return can('site.manage') ? <AdminPortfolio /> : <AdminDashboard />;
    case 'crm':
      return can('crm.manage') ? <AdminCRM /> : <AdminDashboard />;
    case 'proposals':
      return can('proposals.manage') ? <AdminProposals /> : <AdminDashboard />;
    case 'clients':
      return can('clients.manage') ? <AdminClients /> : <AdminDashboard />;
    case 'newsletter':
      return can('communications.manage') ? <AdminNewsletter /> : <AdminDashboard />;
    case 'campaigns':
      return can('communications.manage') ? <AdminCampaigns /> : <AdminDashboard />;
    case 'governance':
      return adminRole === 'super_admin' ? <AdminGovernance /> : <AdminDashboard />;
    case 'messages':
      return can('crm.manage') ? <AdminMessages /> : <AdminDashboard />;
    case 'faqs':
      return can('site.manage') ? <AdminFAQs /> : <AdminDashboard />;
    case 'settings':
      return can('site.manage') ? <AdminSettings /> : <AdminDashboard />;
    default:
      return <AdminDashboard />;
  }
}

export default function AdminPage() {
  const { isAdminLoggedIn, loginAdmin, logoutAdmin } = useAppStore();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/auth', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No active admin session');
        return response.json();
      })
      .then((payload) => {
        if (!cancelled && payload?.success && payload?.data?.name) {
          loginAdmin(String(payload.data.name), String(payload.data.role || 'admin'), Array.isArray(payload.data.permissions) ? payload.data.permissions : []);
        }
      })
      .catch(() => {
        if (!cancelled) logoutAdmin();
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loginAdmin, logoutAdmin]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050b10] flex items-center justify-center text-white/45 text-sm">
        Verifying secure admin session…
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return <div className="min-h-screen"><AdminLogin /></div>;
  }

  return (
    <div className="min-h-screen">
      <AdminLayout>
        <AdminRouter />
      </AdminLayout>
    </div>
  );
}
