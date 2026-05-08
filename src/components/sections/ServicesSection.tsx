'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Smartphone, GraduationCap, TrendingUp, Code, Server, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultServices = [
  { id: '1', title: 'Web Development', description: 'Custom, responsive websites and web applications built with modern technologies for optimal user experience.', icon: 'Globe' },
  { id: '2', title: 'Mobile App Development', description: 'Native and cross-platform mobile applications for iOS and Android that engage your users on the go.', icon: 'Smartphone' },
  { id: '3', title: 'Skills Training', description: 'Comprehensive IT skills development programs designed to empower individuals and teams with cutting-edge knowledge.', icon: 'GraduationCap' },
  { id: '4', title: 'SEO & Marketing', description: 'Data-driven digital marketing strategies and SEO optimization to boost your online visibility and growth.', icon: 'TrendingUp' },
  { id: '5', title: 'Software Development', description: 'Bespoke software solutions tailored to your business needs, from automation tools to enterprise systems.', icon: 'Code' },
  { id: '6', title: 'Web Hosting', description: 'Reliable, secure, and high-performance hosting solutions with 99.9% uptime guarantee and 24/7 support.', icon: 'Server' },
];

const iconMap: Record<string, React.ElementType> = {
  Globe, Smartphone, GraduationCap, TrendingUp, Code, Server,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 150 } },
};

export default function ServicesSection() {
  const [services, setServices] = useState(defaultServices);
  const [loading, setLoading] = useState(true);
  const { navigate } = useAppStore();

  useEffect(() => {
    fetcher('/api/services')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setServices(data);
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-white dark:bg-slate-900 relative overflow-hidden" id="services">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/50 dark:bg-amber-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-100/30 dark:bg-amber-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Our Expertise</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">What We Do</h2>
          <p className="text-slate-600 dark:text-slate-300">
            We offer a comprehensive range of IT solutions designed to help your business grow, innovate, and stay ahead of the competition.
          </p>
        </motion.div>

        {/* Services grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="size-12 rounded-lg mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {services.map((service) => {
              const IconComp = iconMap[service.icon] || Globe;
              return (
                <motion.div key={service.id} variants={itemVariants}>
                  <Card
                    className="group h-full border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 backdrop-blur-sm hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-2xl dark:hover:shadow-amber-900/20 transition-all duration-500 cursor-pointer overflow-hidden relative hover:scale-[1.03]"
                    onClick={() => navigate('services')}
                  >
                    {/* Shimmer/shine effect on hover */}
                    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-10">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out skew-x-12 scale-x-150 group-hover:via-white/20" />
                    </div>

                    {/* Animated gradient top border */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-50/0 to-amber-50/60 dark:from-amber-900/0 dark:to-amber-900/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg" />

                    <CardContent className="p-6 relative">
                      {/* Icon with gradient background and rotation on hover */}
                      <div className="mb-5 relative inline-block">
                        <div className="absolute inset-0 size-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-400 opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
                        <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/60 group-hover:from-amber-100 group-hover:to-amber-100 dark:group-hover:from-amber-800/60 dark:group-hover:to-amber-900/40 flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-amber-200/50 dark:group-hover:shadow-amber-900/30">
                          <IconComp className="size-6 text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                        {service.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                        {service.description}
                      </p>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                        Learn More <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
