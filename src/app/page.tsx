'use client';

import { useAppStore } from '@/lib/store';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BackToTop from '@/components/layout/BackToTop';
import HomePage from '@/components/pages/HomePage';
import AboutPage from '@/components/pages/AboutPage';
import ServicesPage from '@/components/pages/ServicesPage';
import BlogPage from '@/components/pages/BlogPage';
import BlogDetailPage from '@/components/pages/BlogDetailPage';
import ContactPage from '@/components/pages/ContactPage';
import PortfolioPage from '@/components/pages/PortfolioPage';
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
  const { currentPage, adminTab } = useAppStore();

  if (currentPage === 'admin-blog-editor') {
    return <AdminBlogEditor />;
  }

  switch (adminTab) {
    case 'dashboard':
      return <AdminDashboard />;
    case 'services':
      return <AdminServices />;
    case 'blog':
      return <AdminBlog />;
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

function PublicRouter() {
  const { currentPage } = useAppStore();

  const variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'services' && <ServicesPage />}
        {currentPage === 'blog' && <BlogPage />}
        {currentPage === 'blog-detail' && <BlogDetailPage />}
        {currentPage === 'contact' && <ContactPage />}
        {currentPage === 'portfolio' && <PortfolioPage />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function Home() {
  const { currentPage } = useAppStore();

  const isAdminPage =
    currentPage === 'admin' ||
    currentPage === 'admin-dashboard' ||
    currentPage === 'admin-services' ||
    currentPage === 'admin-blog' ||
    currentPage === 'admin-blog-editor' ||
    currentPage === 'admin-team' ||
    currentPage === 'admin-testimonials' ||
    currentPage === 'admin-messages' ||
    currentPage === 'admin-settings' ||
    currentPage === 'admin-faqs' ||
    currentPage === 'admin-portfolio';

  if (isAdminPage) {
    return (
      <AdminLayout>
        <AdminRouter />
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PublicRouter />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
