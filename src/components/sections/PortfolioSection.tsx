'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
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
    category: 'Web Development',
    tags: ['Next.js', 'Prisma', 'MapBox'],
    featured: true,
  },
];

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

  useEffect(() => {
    fetcher('/api/portfolio?featured=true')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPortfolio(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-white dark:bg-slate-900" id="portfolio">
      <div className="container-main">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">Portfolio</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Our Work</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Explore a selection of our recent projects that showcase our expertise and commitment to excellence.
          </p>
        </motion.div>

        {/* Portfolio grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {portfolio.slice(0, 4).map((project) => (
                <motion.div key={project.id} variants={itemVariants}>
                  <Card className="group overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg dark:hover:shadow-amber-900/20 transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    {/* Image placeholder with zoom on hover */}
                    <div className="relative h-48 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 overflow-hidden">
                      <div className="absolute inset-0 grid-pattern opacity-40 dark:opacity-20 transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                        <div className="text-emerald-600 dark:text-amber-400 font-bold text-lg opacity-50 dark:opacity-70">{project.title}</div>
                      </div>
                      {/* Enhanced hover overlay with gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-900/95 via-amber-800/80 to-amber-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="flex flex-col items-center gap-2 text-white translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                          <div className="size-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-1">
                            <ExternalLink className="size-5" />
                          </div>
                          <span className="font-medium text-sm">View Project</span>
                        </div>
                      </div>
                      {/* Category badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                          {project.category}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags?.map((tag: string) => (
                          <Badge key={tag} className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-300 border border-amber-200 dark:border-emerald-500 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* View all button */}
            <motion.div
              className="text-center mt-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                onClick={() => navigate('portfolio')}
                variant="outline"
                className="border-amber-300 dark:border-emerald-500 text-emerald-600 dark:text-amber-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                View All Projects
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </motion.div>
          </>
        )}
      </div>

      {/* Quick View Modal */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {selectedProject && (
            <>
              {/* Modal header with gradient */}
              <div className="relative h-40 bg-gradient-to-br from-amber-500 to-amber-500 dark:from-amber-600 dark:to-amber-900 flex items-center justify-center">
                <div className="absolute inset-0 grid-pattern opacity-20" />
                <span className="text-white font-bold text-xl opacity-40 relative z-10">{selectedProject.title}</span>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-3 right-3 size-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <Badge className="mb-2 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-300">
                    {selectedProject.category}
                  </Badge>
                  {selectedProject.featured && (
                    <Badge className="mb-2 ml-1 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-300">
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
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Technologies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                    <ExternalLink className="size-4 mr-2" />
                    Visit Project
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProject(null)} className="flex-1">
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
