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
import AdminFAQs from '@/components/admin/AdminFAQs';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminPages from '@/components/admin/AdminPages';

function AdminRouter() {
  const { adminTab } = useAppStore();

  switch (adminTab) {
    case 'pages':
      return <AdminPages />;
    case 'services':
      return <AdminServices />;
    case 'blog':
      return <AdminBlog />;
    case 'blog-editor':
      return <AdminBlogEditor />;
    case 'team':
      return <AdminTeam />;
    case 'testimonials':
      return <AdminTestimonials />;
    case 'portfolio':
      return <AdminPortfolio />;
    case 'crm':
      return <AdminCRM />;
    case 'messages':
      return <AdminMessages />;
    case 'faqs':
      return <AdminFAQs />;
    case 'settings':
      return <AdminSettings />;
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
          loginAdmin(String(payload.data.name));
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
