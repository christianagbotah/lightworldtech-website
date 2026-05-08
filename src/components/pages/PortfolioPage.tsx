'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronRight, ExternalLink, X, Layers, SearchX, ChevronDown, Sparkles, Grid3x3, LayoutGrid, ZoomIn, Maximize2 } from 'lucide-react';
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
import { useAppStore } from '@/lib/store';
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
  height?: 'short' | 'tall' | 'medium'; // For masonry layout
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

// Gradient backgrounds for portfolio cards (simulating images)
const cardGradients = [
  'from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30',
  'from-teal-100 to-teal-200 dark:from-teal-900/40 dark:to-teal-800/30',
  'from-cyan-100 to-cyan-200 dark:from-cyan-900/40 dark:to-cyan-800/30',
  'from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30',
  'from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/30',
  'from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-violet-800/30',
  'from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-800/30',
  'from-lime-100 to-lime-200 dark:from-lime-900/40 dark:to-lime-800/30',
  'from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/30',
];

// Masonry column heights
const masonryHeights = {
  short: 'h-48',
  medium: 'h-64',
  tall: 'h-80',
};

export default function PortfolioPage() {
  const { navigate } = useAppStore();
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
  const [visibleCount, setVisibleCount] = useState(6);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry'>('grid');
  const itemsPerPage = 6;

  // Reset visible count when category changes
  const prevCategoryRef = useState(activeCategory);
  if (prevCategoryRef[0] !== activeCategory) {
    prevCategoryRef[1](activeCategory);
    setVisibleCount(6);
  }

  useEffect(() => {
    fetcher('/api/portfolio')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((p: Record<string, unknown>, i: number) => ({
            ...p,
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

  // Masonry layout: split items into columns
  const masonryColumns = useMemo(() => {
    const cols: PortfolioItem[][] = [[], [], []];
    visibleItems.forEach((item, i) => {
      cols[i % 3].push(item);
    });
    return cols;
  }, [visibleItems]);

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">Portfolio</span>
          </nav>
          <motion.h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            Our <span className="text-emerald-400">Portfolio</span>
          </motion.h1>
          <motion.p className="text-lg text-slate-300 max-w-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            A showcase of our best work — innovative solutions that deliver real business results.
          </motion.p>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          {/* Filter tabs + layout toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all capitalize flex items-center gap-2 ${
                    activeCategory === cat.name
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/25'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {cat.name === 'all' ? 'All Projects' : cat.name}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-medium ${
                    activeCategory === cat.name ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Layout toggle */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-2 rounded-md transition-all ${layoutMode === 'grid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                aria-label="Grid layout"
                title="Grid layout"
              >
                <Grid3x3 className="size-4" />
              </button>
              <button
                onClick={() => setLayoutMode('masonry')}
                className={`p-2 rounded-md transition-all ${layoutMode === 'masonry' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                aria-label="Masonry layout"
                title="Masonry layout"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>

          {/* Results info */}
          {!loading && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-200">{visibleItems.length}</span> of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{filtered.length}</span> projects
                {activeCategory !== 'all' && (
                  <span> in <span className="text-emerald-600 dark:text-emerald-400">{activeCategory}</span></span>
                )}
              </p>
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <Layers className="size-4" />
                <span className="text-xs">{filtered.length} total</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden bg-white dark:bg-slate-800">
                  <Skeleton className="h-56 w-full" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : layoutMode === 'masonry' ? (
            /* Masonry Layout */
            <AnimatePresence mode="wait">
              <motion.div
                key={`masonry-${activeCategory}`}
                className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {visibleItems.map((project, index) => {
                  const heightClass = masonryHeights[project.height || 'medium'] || 'h-64';
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.06 }}
                      className="break-inside-avoid"
                    >
                      <Card
                        className="group overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => handleCardClick(project, visibleItems.indexOf(project))}
                      >
                        {/* Image placeholder with varying height */}
                        <div className={`relative ${heightClass} bg-gradient-to-br ${cardGradients[index % cardGradients.length]} overflow-hidden`}>
                          <div className="absolute inset-0 grid-pattern opacity-30" />
                          {/* Blur placeholder */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-4">
                              <div className="size-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                                <ZoomIn className="size-5 text-emerald-600/50" />
                              </div>
                              <span className="text-emerald-700/50 dark:text-emerald-300/50 font-bold text-sm">{project.title}</span>
                            </div>
                          </div>
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-all duration-400">
                            <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-400">
                              <p className="text-white/90 text-xs leading-relaxed mb-3 line-clamp-3">{project.description}</p>
                              <div className="flex items-center gap-2">
                                <ExternalLink className="size-4 text-white" />
                                <span className="font-medium text-white text-sm">View Details</span>
                              </div>
                            </div>
                          </div>
                          {/* Badges */}
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm">{project.category}</Badge>
                          </div>
                          {project.featured && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-amber-400 text-amber-900 text-xs font-semibold">Featured</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-base font-semibold mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-slate-900 dark:text-white truncate">
                            {project.title}
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {project.tags?.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{tag}</Badge>
                            ))}
                            {(project.tags?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">+{project.tags.length - 3}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          ) : (
            /* Standard Grid Layout */
            <LayoutGroup>
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((project) => (
                    <motion.div key={project.id} variants={itemVariants} layout exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}>
                      <Card
                        className="group overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => handleCardClick(project, visibleItems.indexOf(project))}
                      >
                        <div className={`relative h-56 bg-gradient-to-br ${cardGradients[parseInt(project.id) % cardGradients.length]} overflow-hidden`}>
                          <div className="absolute inset-0 grid-pattern opacity-30" />
                          {/* Blur placeholder with lazy loading effect */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-emerald-600/40 dark:text-emerald-400/40 font-bold text-lg opacity-40">{project.title}</span>
                          </div>
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-emerald-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <motion.div className="text-center text-white" initial={false} animate={{ y: [5, 0] }} transition={{ duration: 0.3 }}>
                              <ExternalLink className="size-8 mx-auto mb-2" />
                              <span className="font-medium">View Details</span>
                            </motion.div>
                          </div>
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm">{project.category}</Badge>
                          </div>
                          {project.featured && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-amber-400 text-amber-900 text-xs font-semibold">Featured</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-slate-900 dark:text-white">{project.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">{project.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {project.tags?.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}

          {/* Load More Button */}
          {hasMore && !loading && (
            <motion.div className="flex justify-center mt-10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button variant="outline" onClick={() => setVisibleCount(prev => prev + itemsPerPage)} className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-8 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md dark:hover:shadow-emerald-900/20 transition-all duration-300">
                Load More Projects <ChevronDown className="size-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {filtered.length === 0 && !loading && (
            <motion.div className="text-center py-20" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="max-w-sm mx-auto">
                <div className="relative size-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/20 rotate-6" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/10 -rotate-3" />
                  <div className="relative size-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-lg">
                    <SearchX className="size-10 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No projects found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">There are no projects in this category yet. Check back soon or browse all our projects.</p>
                <Button onClick={() => setActiveCategory('all')} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all duration-300">
                  <Sparkles className="size-4 mr-2" /> View All Projects
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Quick View Modal */}
      <Dialog open={!!selectedProject && !lightboxOpen} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {selectedProject && (
            <>
              <div className={`relative ${masonryHeights[selectedProject.height || 'medium'] || 'h-64'} bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-900 flex items-center justify-center`}>
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
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{selectedProject.category}</Badge>
                    {selectedProject.featured && <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Featured</Badge>}
                  </div>
                  <Button size="sm" onClick={() => { const idx = filtered.findIndex(p => p.id === selectedProject.id); setLightboxIndex(idx >= 0 ? idx : 0); setLightboxOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                    <ExternalLink className="size-3 mr-1" /> Full View
                  </Button>
                </div>
                <DialogHeader className="mt-1"><DialogTitle className="text-xl">{selectedProject.title}</DialogTitle></DialogHeader>
                <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedProject.fullDescription || selectedProject.description}</DialogDescription>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Technologies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"><ExternalLink className="size-4 mr-2" /> Visit Project</Button>
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
