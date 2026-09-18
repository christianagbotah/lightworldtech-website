'use client';

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
import AdminFAQs from '@/components/admin/AdminFAQs';
import AdminSettings from '@/components/admin/AdminSettings';

function AdminRouter() {
  const { adminTab } = useAppStore();

  switch (adminTab) {
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
  const { isAdminLoggedIn } = useAppStore();

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
