'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Smartphone, GraduationCap, TrendingUp, Code, Server, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import CTASection from '@/components/sections/CTASection';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultServices = [
  { id: '1', title: 'Web Development', description: 'Custom, responsive websites and web applications built with cutting-edge technologies for optimal user experience and business growth.', icon: 'Globe', features: ['Custom Website Design', 'E-Commerce Solutions', 'CMS Development', 'Progressive Web Apps', 'API Integration'] },
  { id: '2', title: 'Mobile App Development', description: 'Native and cross-platform mobile applications that deliver exceptional user experiences on iOS and Android devices.', icon: 'Smartphone', features: ['iOS App Development', 'Android App Development', 'Cross-Platform (React Native)', 'App Store Optimization', 'Push Notifications'] },
  { id: '3', title: 'Skills Training', description: 'Comprehensive IT skills development programs designed to empower individuals and organizations with modern technical expertise.', icon: 'GraduationCap', features: ['Web Development Bootcamps', 'Data Science Training', 'Cloud Computing Courses', 'Cybersecurity Training', 'Corporate Training Programs'] },
  { id: '4', title: 'SEO & Marketing', description: 'Data-driven digital marketing strategies and search engine optimization to boost online visibility and drive organic growth.', icon: 'TrendingUp', features: ['Search Engine Optimization', 'Pay-Per-Click Advertising', 'Social Media Marketing', 'Content Marketing', 'Email Marketing'] },
  { id: '5', title: 'Software Development', description: 'Bespoke software solutions tailored to your unique business requirements, from automation tools to enterprise-grade systems.', icon: 'Code', features: ['Custom Software Solutions', 'Enterprise Applications', 'SaaS Development', 'System Integration', 'Process Automation'] },
  { id: '6', title: 'Web Hosting', description: 'Reliable, secure, and high-performance hosting solutions with guaranteed uptime and round-the-clock technical support.', icon: 'Server', features: ['Shared Hosting', 'VPS Hosting', 'Dedicated Servers', 'Cloud Hosting', 'SSL Certificates'] },
];

const iconMap: Record<string, React.ElementType> = {
  Globe, Smartphone, GraduationCap, TrendingUp, Code, Server,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ServicesPage() {
  const { navigate } = useAppStore();
  const [services, setServices] = useState(defaultServices);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetcher('/api/services')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setServices(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">Services</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-emerald-400">Services</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Comprehensive IT solutions designed to accelerate your business growth and digital transformation.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white dark:bg-slate-800">
                  <div className="p-6">
                    <Skeleton className="size-12 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {services.map((service) => {
                const IconComp = iconMap[service.icon] || Globe;
                const isExpanded = expandedId === service.id;
                return (
                  <motion.div key={service.id} variants={itemVariants}>
                    <Card className={`h-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all duration-300 ${isExpanded ? 'border-emerald-300 dark:border-emerald-600 shadow-md ring-1 ring-emerald-200 dark:ring-emerald-700' : ''}`}>
                      <CardContent className="p-6">
                        <div className="size-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                          <IconComp className="size-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">{service.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{service.description}</p>

                        {/* Features list */}
                        {service.features && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {service.features.slice(0, isExpanded ? undefined : 3).map((feature: string) => (
                                <Badge key={feature} variant="secondary" className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 gap-1">
                                  <CheckCircle2 className="size-3" />
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                            {service.features.length > 3 && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : service.id)}
                                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                              >
                                {isExpanded ? 'Show less' : `+${service.features.length - 3} more`}
                              </button>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={() => navigate('contact')}
                          className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Get a Quote <ArrowRight className="size-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Development Process */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Process</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">How We Deliver Excellence</h2>
            <p className="text-slate-600 dark:text-slate-300">Our proven methodology ensures consistent, high-quality results for every project.</p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {[
              { step: '01', title: 'Discovery', desc: 'Understanding your goals and requirements' },
              { step: '02', title: 'Strategy', desc: 'Planning the optimal approach' },
              { step: '03', title: 'Development', desc: 'Building with precision and expertise' },
              { step: '04', title: 'Delivery', desc: 'Testing, launching, and supporting' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative text-center p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-4xl font-bold text-emerald-200 dark:text-emerald-800 mb-2">{item.step}</div>
                <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <CTASection />
    </main>
  );
}
