'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import CTASection from '@/components/sections/CTASection';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultPortfolio = [
  { id: '1', title: 'E-Commerce Platform', description: 'Full-featured online store with payment integration, inventory management, and analytics dashboard.', category: 'Web Development', tags: ['React', 'Node.js', 'PostgreSQL', 'Stripe'], featured: true },
  { id: '2', title: 'Healthcare Mobile App', description: 'Patient management app with telemedicine features, appointment scheduling, and health records.', category: 'Mobile App', tags: ['React Native', 'Firebase', 'WebRTC'], featured: true },
  { id: '3', title: 'Corporate ERP System', description: 'Enterprise resource planning system for a manufacturing company with supply chain management.', category: 'Software Development', tags: ['Python', 'Django', 'React', 'AWS'], featured: true },
  { id: '4', title: 'Real Estate Portal', description: 'Property listing and management platform with virtual tours and advanced search filters.', category: 'Web Development', tags: ['Next.js', 'Prisma', 'MapBox', 'Cloudinary'], featured: true },
  { id: '5', title: 'Restaurant Ordering App', description: 'Table reservation and food ordering system with real-time updates and payment processing.', category: 'Mobile App', tags: ['Flutter', 'Supabase', 'Stripe'], featured: false },
  { id: '6', title: 'Learning Management System', description: 'Comprehensive LMS for corporate training with course management, progress tracking, and certifications.', category: 'Software Development', tags: ['Vue.js', 'Laravel', 'MySQL'], featured: false },
  { id: '7', title: 'Travel Booking Website', description: 'Full-service travel booking platform with flight, hotel, and activity reservations.', category: 'Web Development', tags: ['Next.js', 'Tailwind', 'Prisma', 'Amadeus API'], featured: false },
  { id: '8', title: 'Fitness Tracker App', description: 'Health and fitness tracking application with workout plans, nutrition logging, and social features.', category: 'Mobile App', tags: ['React Native', 'Node.js', 'MongoDB'], featured: false },
  { id: '9', title: 'Security Monitoring Dashboard', description: 'Real-time security monitoring and alerting system for corporate campuses.', category: 'Software Development', tags: ['Python', 'React', 'WebSocket', 'PostgreSQL'], featured: false },
];

const categories = ['all', 'Web Development', 'Mobile App', 'Software Development'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function PortfolioPage() {
  const { navigate } = useAppStore();
  const [portfolio, setPortfolio] = useState(defaultPortfolio);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetcher('/api/portfolio')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPortfolio(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === 'all'
    ? portfolio
    : portfolio.filter(p => p.category === activeCategory);

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">Portfolio</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-emerald-400">Portfolio</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            A showcase of our best work — innovative solutions that deliver real business results.
          </motion.p>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="section-padding bg-slate-50">
        <div className="container-main">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
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
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              key={activeCategory}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filtered.map((project) => (
                <motion.div key={project.id} variants={itemVariants}>
                  <Card className="group overflow-hidden border-slate-200 hover:shadow-xl transition-all duration-300">
                    {/* Image placeholder */}
                    <div className="relative h-56 bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden">
                      <div className="absolute inset-0 grid-pattern opacity-30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-emerald-600 font-bold text-lg opacity-40">{project.title}</span>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-emerald-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="text-center text-white">
                          <ExternalLink className="size-8 mx-auto mb-2" />
                          <span className="font-medium">View Details</span>
                        </div>
                      </div>
                      {/* Category badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-white/90 text-slate-800 text-xs backdrop-blur-sm">
                          {project.category}
                        </Badge>
                      </div>
                      {project.featured && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-amber-400 text-amber-900 text-xs font-semibold">Featured</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-600 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium text-slate-400">No projects found in this category.</h3>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <CTASection />
    </main>
  );
}
