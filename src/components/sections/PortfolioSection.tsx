'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultPortfolio = [
  {
    id: '1',
    title: 'E-Commerce Platform',
    description: 'Full-featured online store with payment integration and inventory management.',
    category: 'Web Development',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    featured: true,
  },
  {
    id: '2',
    title: 'Healthcare Mobile App',
    description: 'Patient management app with telemedicine features and appointment scheduling.',
    category: 'Mobile App',
    tags: ['React Native', 'Firebase'],
    featured: true,
  },
  {
    id: '3',
    title: 'Corporate ERP System',
    description: 'Enterprise resource planning system for a manufacturing company.',
    category: 'Software Development',
    tags: ['Python', 'Django', 'React'],
    featured: true,
  },
  {
    id: '4',
    title: 'Real Estate Portal',
    description: 'Property listing and management platform with virtual tours.',
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
  const [portfolio, setPortfolio] = useState(defaultPortfolio);
  const [loading, setLoading] = useState(true);
  const { navigate } = useAppStore();

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
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Portfolio</span>
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
                  <Card className="group overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg dark:hover:shadow-emerald-900/20 transition-all duration-300 cursor-pointer"
                    onClick={() => navigate('portfolio')}
                  >
                    {/* Image placeholder */}
                    <div className="relative h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 overflow-hidden">
                      <div className="absolute inset-0 grid-pattern opacity-40 dark:opacity-20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg opacity-50 dark:opacity-70">{project.title}</div>
                      </div>
                      {/* Hover overlay with gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/90 via-emerald-900/70 to-emerald-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="flex flex-col items-center gap-2 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <ExternalLink className="size-6" />
                          <span className="font-medium text-sm">View Project</span>
                        </div>
                      </div>
                      {/* Category badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                          {project.category}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
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
                className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                View All Projects
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
