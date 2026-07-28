'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ExternalLink, X, Layers, SearchX, ChevronDown, Sparkles, ZoomIn, Maximize2, Briefcase, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSEO } from '@/hooks/use-seo';
import CTASection from '@/components/sections/CTASection';
import ImageLightbox from '@/components/ui/image-lightbox';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured: boolean;
  clientUrl?: string;
  fullDescription?: string;
  height?: 'short' | 'tall' | 'medium';
}

const defaultPortfolio: PortfolioItem[] = [
  { id: '1', title: 'E-Commerce Platform', description: 'Full-featured online store with payment integration, inventory management, and analytics dashboard.', category: 'Web Development', tags: ['React', 'Node.js', 'PostgreSQL', 'Stripe'], featured: true, clientUrl: '#', fullDescription: 'A comprehensive e-commerce platform built for a leading retail client in Ghana. The solution includes multi-vendor support, real-time inventory management, integrated payment gateways (MTN MoMo, Visa), and a powerful analytics dashboard for business intelligence.', height: 'tall' },
  { id: '2', title: 'Healthcare Mobile App', description: 'Patient management app with telemedicine features, appointment scheduling, and health records.', category: 'Mobile App', tags: ['React Native', 'Firebase', 'WebRTC'], featured: true, clientUrl: '#', fullDescription: 'A cross-platform healthcare application that connects patients with doctors virtually. Features include appointment scheduling, electronic health records, prescription management, telemedicine video calls, and push notifications for appointment reminders.', height: 'medium' },
  { id: '3', title: 'Corporate ERP System', description: 'Enterprise resource planning system for a manufacturing company with supply chain management.', category: 'Software Development', tags: ['Python', 'Django', 'React', 'AWS'], featured: true, clientUrl: '#', fullDescription: 'A full-scale ERP system designed for a Ghanaian manufacturing company. Modules include inventory management, supply chain optimization, HR management, financial accounting, and production planning with real-time reporting dashboards.', height: 'short' },
  { id: '4', title: 'Real Estate Portal', description: 'Property listing and management platform with virtual tours and advanced search filters.', category: 'Web Development', tags: ['Next.js', 'Prisma', 'MapBox', 'Cloudinary'], featured: true, clientUrl: '#', fullDescription: 'A modern real estate listing platform serving the Ghanaian property market. Features include interactive map-based search, virtual property tours, mortgage calculator, agent management, and automated lead generation for property agents.', height: 'medium' },
  { id: '5', title: 'Restaurant Ordering App', description: 'Table reservation and food ordering system with real-time updates and payment processing.', category: 'Mobile App', tags: ['Flutter', 'Supabase', 'Stripe'], featured: false, clientUrl: '#', fullDescription: 'A food ordering and table reservation app for a restaurant chain. Features include real-time menu updates, order tracking, QR code menu scanning, loyalty program integration, and seamless payment processing.', height: 'tall' },
  { id: '6', title: 'Learning Management System', description: 'Comprehensive LMS for corporate training with course management, progress tracking, and certifications.', category: 'Software Development', tags: ['Vue.js', 'Laravel', 'MySQL'], featured: false, clientUrl: '#', fullDescription: 'An enterprise learning management system built for corporate training organizations. Features include course authoring tools, video conferencing integration, progress analytics, certificate generation, and SCORM compliance.', height: 'short' },
  { id: '7', title: 'Travel Booking Website', description: 'Full-service travel booking platform with flight, hotel, and activity reservations.', category: 'Web Development', tags: ['Next.js', 'Tailwind', 'Prisma', 'Amadeus API'], featured: false, clientUrl: '#', fullDescription: 'A comprehensive travel booking platform for a Ghanaian travel agency. Integrates with Amadeus API for flight search and booking, hotel reservations, local activity bookings, and a personalized itinerary builder.', height: 'medium' },
  { id: '8', title: 'Fitness Tracker App', description: 'Health and fitness tracking application with workout plans, nutrition logging, and social features.', category: 'Mobile App', tags: ['React Native', 'Node.js', 'MongoDB'], featured: false, clientUrl: '#', fullDescription: 'A health and fitness tracking app with workout plan customization, nutrition logging with barcode scanning, social challenges, progress analytics with charts, and integration with wearable devices.', height: 'short' },
  { id: '9', title: 'Security Monitoring Dashboard', description: 'Real-time security monitoring and alerting system for corporate campuses.', category: 'Software Development', tags: ['Python', 'React', 'WebSocket', 'PostgreSQL'], featured: false, clientUrl: '#', fullDescription: 'A real-time security monitoring system for a corporate campus. Features include live camera feeds, AI-powered threat detection, incident reporting, guard patrol tracking, and automated alert escalation.', height: 'tall' },
];

const allCategories = ['all', 'Web Development', 'Mobile App', 'Software Development'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4 } },
};

// Category color mapping for badges
const categoryColors: Record<string, string> = {
  'Web Development': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Mobile App': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Software Development': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
};

// Card gradient accents based on category
const categoryCardAccents: Record<string, string> = {
  'Web Development': 'from-emerald-500/8 to-emerald-600/3',
  'Mobile App': 'from-amber-500/8 to-amber-600/3',
  'Software Development': 'from-violet-500/8 to-violet-600/3',
};

export default function PortfolioPage() {
  useSEO({
    title: 'Portfolio',
    description: 'Explore our portfolio of web development, mobile app, and software projects. See how Lightworld Technologies delivers innovative solutions for businesses in Ghana and Africa.',
    keywords: ['portfolio Ghana', 'web development projects', 'mobile app showcase', 'software solutions', 'IT projects Africa', 'Lightworld Technologies work'],
  });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(defaultPortfolio);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(9);
  const itemsPerPage = 6;

  // Reset visible count when category changes
  const prevCategoryRef = useState(activeCategory);
  if (prevCategoryRef[0] !== activeCategory) {
    prevCategoryRef[1](activeCategory);
    setVisibleCount(9);
  }

  useEffect(() => {
    fetcher('/api/portfolio')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((p: Record<string, unknown>, i: number) => ({
            id: String(p.id || defaultPortfolio[i]?.id || String(i)),
            title: String(p.title || defaultPortfolio[i]?.title || ''),
            description: String(p.description || defaultPortfolio[i]?.description || ''),
            category: String(p.category || defaultPortfolio[i]?.category || ''),
            tags: Array.isArray(p.tags) ? p.tags.map(String) : (defaultPortfolio[i]?.tags || []),
            featured: p.featured === true,
            clientUrl: String(p.clientUrl || defaultPortfolio[i]?.clientUrl || ''),
            fullDescription: String(p.fullDescription || defaultPortfolio[i]?.fullDescription || ''),
            height: (p.height || defaultPortfolio[i]?.height || ['short', 'medium', 'tall'][i % 3]) as 'short' | 'tall' | 'medium',
          }));
          setPortfolio(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (project: PortfolioItem, index: number) => {
    setSelectedProject(project);
    setLightboxOpen(true);
    setLightboxIndex(index);
  };

  const filtered = activeCategory === 'all'
    ? portfolio
    : portfolio.filter(p => p.category === activeCategory);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of portfolio) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return allCategories.map(cat => ({
      name: cat,
      count: cat === 'all' ? portfolio.length : (counts[cat] || 0),
    }));
  }, [portfolio]);

  return (
    <main className="bg-background min-h-screen">
      {/* Compact Title Bar */}
      <section className="relative">
        {/* Subtle top gradient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-24 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container-main relative z-10">
          {/* Badge + Title Row */}
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
            >
              <Briefcase className="size-3" />
              Our Portfolio
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold dark:text-white text-slate-900">
              Projects & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">Case Studies</span>
            </h1>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === cat.name
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-md shadow-emerald-500/15'
                    : 'dark:bg-white/[0.04] bg-slate-100 dark:text-white/50 text-slate-500 dark:hover:bg-white/[0.08] hover:bg-slate-200 dark:hover:text-white/70 hover:text-slate-700 border border-slate-200 dark:border-white/[0.06]'
                }`}
              >
                {cat.name === 'all' ? 'All Projects' : cat.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-medium ${
                  activeCategory === cat.name ? 'bg-white/20 text-white' : 'dark:bg-white/[0.06] bg-slate-200 dark:text-white/30 text-slate-400'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}

            {/* Results count */}
            {!loading && (
              <div className="ml-auto flex items-center gap-1.5 dark:text-white/25 text-slate-400">
                <Layers className="size-3.5" />
                <span className="text-xs">{filtered.length} projects</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content — Full Viewport Grid */}
      <section className="h-[calc(100vh-8rem)] overflow-hidden">
        <div className="container-main h-full">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 h-full">
              {Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
                  <Skeleton className="h-4 w-28 mb-3 mx-4 mt-4" />
                  <Skeleton className="h-3 w-full mb-1.5 mx-4" />
                  <Skeleton className="h-3 w-3/4 mb-3 mx-4" />
                  <div className="flex gap-1.5 px-4 pb-4">
                    <Skeleton className="h-4 w-12 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-10 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              className="flex items-center justify-center h-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center max-w-sm">
                <div className="relative size-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-900/30 to-amber-800/20 rotate-6" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-900/20 to-amber-800/10 -rotate-3" />
                  <div className="relative size-20 rounded-2xl dark:bg-white/[0.04] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] flex items-center justify-center shadow-lg">
                    <SearchX className="size-8 dark:text-white/30 text-slate-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold dark:text-white/60 text-slate-500 mb-2">No projects found</h3>
                <p className="text-sm dark:text-white/40 text-slate-500 mb-5 leading-relaxed">There are no projects in this category yet. Check back soon or browse all our projects.</p>
                <Button onClick={() => setActiveCategory('all')} className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-white shadow-md shadow-emerald-500/20 text-sm">
                  <Sparkles className="size-4 mr-2" /> View All Projects
                </Button>
              </div>
            </motion.div>
          ) : (
            <LayoutGroup>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 h-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((project, index) => {
                    const accentGradient = categoryCardAccents[project.category] || 'from-slate-500/8 to-slate-600/3';
                    const badgeColor = categoryColors[project.category] || 'dark:bg-white/10 bg-slate-100 dark:text-white/60 text-slate-500';

                    return (
                      <motion.div
                        key={project.id}
                        variants={itemVariants}
                        layout
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="h-full"
                      >
                        <Card
                          className={`group relative h-full dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] rounded-xl overflow-hidden transition-all duration-300 cursor-pointer dark:hover:bg-white/[0.05] hover:bg-slate-100 ${
                            project.featured
                              ? 'hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5'
                              : 'dark:hover:border-white/[0.12] hover:border-slate-300'
                          }`}
                          onClick={() => handleCardClick(project, visibleItems.indexOf(project))}
                        >
                          {/* Featured glow accent */}
                          {project.featured && (
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          )}

                          <div className="p-4 lg:p-6 flex flex-col h-full">
                            {/* Top: Category badge + Featured indicator */}
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badgeColor}`}>
                                {project.category}
                              </Badge>
                              {project.featured && (
                                <span className="flex items-center gap-1 text-xs text-amber-400/70">
                                  <span className="size-1.5 rounded-full bg-amber-400/70 animate-pulse" />
                                  Featured
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="text-sm lg:text-base font-semibold mb-2 group-hover:text-emerald-400 transition-colors dark:text-white text-slate-900 leading-snug">
                              {project.title}
                            </h3>

                            {/* Description (2 lines) */}
                            <p className="text-xs lg:text-sm dark:text-white/40 text-slate-500 leading-relaxed mb-3 line-clamp-2 flex-grow">
                              {project.description}
                            </p>

                            {/* Tags (max 3) */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {project.tags?.slice(0, 3).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-xs lg:text-sm px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-full dark:bg-white/[0.05] bg-slate-100 dark:text-white/40 text-slate-500 border border-slate-100 dark:border-white/[0.04]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {(project.tags?.length || 0) > 3 && (
                                <span className="text-xs px-2 py-0.5 rounded-full dark:bg-white/[0.03] bg-slate-100 dark:text-white/25 text-slate-400">
                                  +{project.tags.length - 3}
                                </span>
                              )}
                            </div>

                            {/* Hover overlay — View Details */}
                            <div className="absolute inset-0 dark:bg-slate-950/80 bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                              <motion.div
                                className="text-center"
                                initial={false}
                                animate={{ y: [6, 0] }}
                                transition={{ duration: 0.25 }}
                              >
                                <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-emerald-500/25">
                                  <ZoomIn className="size-4 text-white" />
                                </div>
                                <span className="text-sm lg:text-base font-medium text-white">View Details</span>
                              </motion.div>
                            </div>
                          </div>

                          {/* Bottom accent line */}
                          <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}
        </div>
      </section>

      {/* Bottom Bar */}
      <div className="container-main pb-6">
        <div className="flex items-center justify-between">
          {/* View All Projects link */}
          <motion.button
            className="inline-flex items-center gap-2 text-sm text-emerald-400/70 hover:text-emerald-400 transition-colors group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            View All Projects
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>

          {/* Load More (only if needed) */}
          {hasMore && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount(prev => prev + itemsPerPage)}
                className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 px-5 text-xs h-8 hover:shadow-md transition-all duration-300"
              >
                Load More <ChevronDown className="size-3 ml-1" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <Dialog open={!!selectedProject && !lightboxOpen} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
          {selectedProject && (
            <>
              <div className="relative h-48 bg-gradient-to-br from-emerald-600 to-amber-700 flex items-center justify-center">
                <div className="absolute inset-0 grid-pattern opacity-20" />
                <div className="text-center relative z-10 p-6">
                  <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                    <Maximize2 className="size-6 text-white" />
                  </div>
                  <span className="text-white font-bold text-xl opacity-40">{selectedProject.title}</span>
                </div>
                <button onClick={() => setSelectedProject(null)} className="absolute top-3 right-3 size-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10" aria-label="Close"><X className="size-4" /></button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <Badge className={`text-xs ${categoryColors[selectedProject.category] || 'bg-amber-500/10 text-amber-300'}`}>{selectedProject.category}</Badge>
                    {selectedProject.featured && <Badge className="bg-amber-500/10 text-amber-300">Featured</Badge>}
                  </div>
                  <Button size="sm" onClick={() => { const idx = filtered.findIndex(p => p.id === selectedProject.id); setLightboxIndex(idx >= 0 ? idx : 0); setLightboxOpen(true); }} className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs">
                    <ExternalLink className="size-3 mr-1" /> Full View
                  </Button>
                </div>
                <DialogHeader className="mt-1"><DialogTitle className="text-xl dark:text-white text-slate-900">{selectedProject.title}</DialogTitle></DialogHeader>
                <DialogDescription className="text-sm dark:text-white/60 text-slate-500 leading-relaxed">{selectedProject.fullDescription || selectedProject.description}</DialogDescription>

                <div>
                  <h4 className="text-sm font-semibold dark:text-white text-slate-900 mb-2">Technologies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs dark:bg-white/[0.06] bg-slate-100 dark:text-white/40 text-slate-500">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-white flex-1"><ExternalLink className="size-4 mr-2" /> Visit Project</Button>
                  <Button variant="outline" onClick={() => setSelectedProject(null)} className="flex-1">Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        items={filtered.map(p => ({
          id: p.id,
          title: p.title,
          description: p.fullDescription || p.description,
          category: p.category,
          tags: p.tags,
          featured: p.featured,
        }))}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(index) => {
          setLightboxIndex(index);
          setSelectedProject(filtered[index] || null);
        }}
      />

      {/* CTA */}
      <CTASection />
    </main>
  );
}
