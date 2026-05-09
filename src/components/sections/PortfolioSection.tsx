'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ExternalLink,
  X,
  Globe,
  Smartphone,
  Code,
  Home,
  Eye,
  LayoutGrid,
} from 'lucide-react';
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
}

const defaultPortfolio: PortfolioItem[] = [
  {
    id: '1',
    title: 'E-Commerce Platform',
    description: 'Full-featured online store with payment integration and inventory management.',
    fullDescription: 'A comprehensive e-commerce platform built for a leading retail client in Ghana. The solution includes multi-vendor support, real-time inventory management, integrated payment gateways, and a powerful analytics dashboard for business intelligence.',
    category: 'Web Development',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    featured: true,
  },
  {
    id: '2',
    title: 'Healthcare Mobile App',
    description: 'Patient management app with telemedicine features and appointment scheduling.',
    fullDescription: 'A cross-platform healthcare application connecting patients with doctors virtually. Features include appointment scheduling, electronic health records, prescription management, and telemedicine video calls.',
    category: 'Mobile App',
    tags: ['React Native', 'Firebase'],
    featured: true,
  },
  {
    id: '3',
    title: 'Corporate ERP System',
    description: 'Enterprise resource planning system for a manufacturing company.',
    fullDescription: 'A full-scale ERP system designed for a Ghanaian manufacturing company. Modules include inventory management, supply chain optimization, HR management, financial accounting, and production planning.',
    category: 'Software Development',
    tags: ['Python', 'Django', 'React'],
    featured: true,
  },
  {
    id: '4',
    title: 'Real Estate Portal',
    description: 'Property listing and management platform with virtual tours.',
    fullDescription: 'A modern real estate listing platform serving the Ghanaian property market. Features include interactive map-based search, virtual property tours, mortgage calculator, and automated lead generation.',
    category: 'Real Estate',
    tags: ['Next.js', 'Prisma', 'MapBox'],
    featured: true,
  },
];

/* ── Category config ── */
type CategoryKey = 'Web Development' | 'Mobile App' | 'Software Development' | 'Real Estate';

const categoryConfig: Record<CategoryKey, {
  gradient: string;
  darkGradient: string;
  icon: React.ElementType;
  hoverGradient: string;
}> = {
  'Web Development': {
    gradient: 'from-emerald-400 via-teal-400 to-cyan-300',
    darkGradient: 'dark:from-emerald-900/60 dark:via-teal-900/50 dark:to-cyan-900/40',
    icon: Globe,
    hoverGradient: 'from-emerald-900/95 via-teal-800/90 to-cyan-700/80',
  },
  'Mobile App': {
    gradient: 'from-amber-400 via-orange-400 to-yellow-300',
    darkGradient: 'dark:from-amber-900/60 dark:via-orange-900/50 dark:to-yellow-900/40',
    icon: Smartphone,
    hoverGradient: 'from-amber-900/95 via-orange-800/90 to-yellow-700/80',
  },
  'Software Development': {
    gradient: 'from-slate-500 via-blue-500 to-indigo-400',
    darkGradient: 'dark:from-slate-800/60 dark:via-blue-900/50 dark:to-indigo-900/40',
    icon: Code,
    hoverGradient: 'from-slate-900/95 via-blue-800/90 to-indigo-700/80',
  },
  'Real Estate': {
    gradient: 'from-emerald-500 via-emerald-400 to-amber-300',
    darkGradient: 'dark:from-emerald-900/60 dark:via-emerald-800/50 dark:to-amber-900/40',
    icon: Home,
    hoverGradient: 'from-emerald-900/95 via-emerald-800/90 to-amber-700/80',
  },
};

/* ── Filter tabs ── */
const filterTabs = ['All', 'Web', 'Mobile', 'Software'] as const;
type FilterTab = (typeof filterTabs)[number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function PortfolioSection() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(defaultPortfolio);
  const [loading, setLoading] = useState(true);
  const { navigate } = useAppStore();
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  useEffect(() => {
    fetcher('/api/portfolio?featured=true')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPortfolio(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getCategoryConfig = (category: string) => {
    return categoryConfig[category as CategoryKey] || categoryConfig['Web Development'];
  };

  return (
    <section className="section-padding bg-white dark:bg-slate-900" id="portfolio">
      <div className="container-main">
        {/* ── Section header ── */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">
            Portfolio
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Our Work
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Explore a selection of our recent projects that showcase our expertise and commitment to excellence.
          </p>
        </motion.div>

        {/* ── Featured Projects badge strip ── */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-medium border-amber-300 dark:border-amber-600/50 text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-900/10 rounded-full"
          >
            4 Featured Projects
          </Badge>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-medium border-emerald-300 dark:border-emerald-600/50 text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full"
          >
            Web
          </Badge>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-medium border-orange-300 dark:border-orange-600/50 text-slate-600 dark:text-slate-300 bg-orange-50/50 dark:bg-orange-900/10 rounded-full"
          >
            Mobile
          </Badge>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-medium border-blue-300 dark:border-blue-600/50 text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-900/10 rounded-full"
          >
            Enterprise
          </Badge>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-medium border-emerald-300 dark:border-emerald-600/50 text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full"
          >
            Real Estate
          </Badge>
        </motion.div>

        {/* ── Category filter tabs ── */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`
                  relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-white shadow-md shadow-emerald-500/25 dark:shadow-amber-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }
                `}
              >
                {tab}
              </button>
            );
          })}
        </motion.div>

        {/* ── Portfolio grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-56 w-full" />
                <div className="p-6">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {portfolio.slice(0, 4).map((project, index) => {
                const config = getCategoryConfig(project.category);
                const Icon = config.icon;
                const isFirst = index === 0;

                return (
                  <motion.div
                    key={project.id}
                    variants={itemVariants}
                    className={isFirst ? 'sm:col-span-2 lg:col-span-2' : ''}
                  >
                    <Card
                      className="group overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-2xl dark:hover:shadow-emerald-900/20 transition-all duration-500 cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      {/* ── Tech-themed visual card ── */}
                      <div
                        className={`relative ${isFirst ? 'h-64 sm:h-72' : 'h-56'} overflow-hidden`}
                      >
                        {/* Category-based gradient background */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${config.gradient} ${config.darkGradient} transition-transform duration-700 group-hover:scale-110`}
                        />

                        {/* Decorative SVG grid pattern overlay */}
                        <div className="absolute inset-0 grid-pattern opacity-30 dark:opacity-20 transition-transform duration-700 group-hover:scale-110" />

                        {/* Centered project icon */}
                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-500 group-hover:opacity-20 group-hover:scale-90">
                          <div className="relative">
                            <div className="size-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                              <Icon className="size-10 text-white" strokeWidth={1.5} />
                            </div>
                            {/* Glow ring behind icon */}
                            <div className="absolute inset-0 size-20 rounded-2xl bg-white/10 animate-pulse -z-10 scale-125 blur-md" />
                          </div>
                        </div>

                        {/* Floating project number badge */}
                        <div className="absolute top-4 left-4 z-10">
                          <div className="w-10 h-10 rounded-lg bg-black/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <span className="text-white font-bold text-sm tracking-tight">
                              0{index + 1}
                            </span>
                          </div>
                        </div>

                        {/* Category badge (top-right) */}
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm border border-white/30 dark:border-slate-700/50 shadow-sm">
                            {project.category}
                          </Badge>
                        </div>

                        {/* ── Enhanced hover overlay ── */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-t ${config.hoverGradient} flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500`}
                        >
                          <div className="flex flex-col items-center gap-3 text-white translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                            <h3 className="text-xl sm:text-2xl font-bold text-center px-4 drop-shadow-lg">
                              {project.title}
                            </h3>
                            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 hover:bg-white/25 transition-colors">
                              <span className="text-sm font-medium">View Case Study</span>
                              <ArrowRight className="size-4" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Card body ── */}
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                            {project.title}
                          </h3>
                          {/* View counter / eye icon */}
                          <div className="flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-slate-500">
                            <Eye className="size-3.5" />
                            <span className="text-xs font-medium">View Details</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">
                          {project.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {project.tags?.map((tag: string) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ── View All Projects button ── */}
            <motion.div
              className="text-center mt-12"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                onClick={() => navigate('portfolio')}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300 hover:scale-105"
              >
                View All Projects
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Quick View Modal ── */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {selectedProject && (
            <>
              {/* Modal header with themed gradient */}
              {(() => {
                const config = getCategoryConfig(selectedProject.category);
                const Icon = config.icon;
                return (
                  <div
                    className={`relative h-44 bg-gradient-to-br ${config.gradient} ${config.darkGradient} flex items-center justify-center`}
                  >
                    <div className="absolute inset-0 grid-pattern opacity-20" />
                    <div className="flex flex-col items-center gap-2 relative z-10">
                      <div className="size-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Icon className="size-7 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white font-semibold text-lg drop-shadow-md">
                        {selectedProject.title}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="absolute top-3 right-3 size-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10 cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })()}

              <div className="p-6 space-y-4">
                <div>
                  <Badge className="mb-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border-0">
                    {selectedProject.category}
                  </Badge>
                  {selectedProject.featured && (
                    <Badge className="mb-2 ml-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border-0">
                      Featured
                    </Badge>
                  )}
                  <DialogHeader className="mt-2">
                    <DialogTitle className="text-xl">{selectedProject.title}</DialogTitle>
                  </DialogHeader>
                </div>

                <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedProject.fullDescription || selectedProject.description}
                </DialogDescription>

                {/* Technologies */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Technologies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.tags?.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <a href={selectedProject.clientUrl && selectedProject.clientUrl !== '#' ? selectedProject.clientUrl : undefined} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 cursor-pointer">
                      <ExternalLink className="size-4 mr-2" />
                      Visit Project
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedProject(null)}
                    className="flex-1 cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
