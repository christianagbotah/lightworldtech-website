'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Kanban, UsersRound, GraduationCap, BarChart3, Bell, ChevronRight, Mail, Clock, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/hooks/use-seo';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { z } from 'zod';

const products = [
  {
    id: '1',
    title: 'Project Management Tool',
    description: 'Streamline your team\'s workflow with our intuitive project management solution. Features include task boards, time tracking, Gantt charts, and real-time collaboration for teams of any size.',
    icon: Kanban,
    gradient: 'from-emerald-500 to-teal-600',
    features: ['Task Boards & Kanban', 'Time Tracking', 'Gantt Charts', 'Team Collaboration', 'Automated Reports'],
    launchDate: 'Q3 2025',
  },
  {
    id: '2',
    title: 'CRM System',
    description: 'Build stronger relationships with a CRM designed for African businesses. Manage leads, track sales pipelines, automate follow-ups, and gain actionable insights from customer data.',
    icon: UsersRound,
    gradient: 'from-amber-500 to-orange-600',
    features: ['Lead Management', 'Sales Pipeline', 'Email Automation', 'Customer Analytics', 'Mobile App'],
    launchDate: 'Q4 2025',
  },
  {
    id: '3',
    title: 'Learning Platform',
    description: 'Empower your organization with a modern e-learning platform. Create and deliver courses, track learner progress, issue certificates, and build a culture of continuous learning.',
    icon: GraduationCap,
    gradient: 'from-violet-500 to-purple-600',
    features: ['Course Builder', 'Video Streaming', 'Progress Tracking', 'Certificates', 'Assessments'],
    launchDate: 'Q1 2026',
  },
  {
    id: '4',
    title: 'Analytics Dashboard',
    description: 'Make data-driven decisions with our powerful analytics dashboard. Visualize key metrics, create custom reports, set alerts, and integrate with your existing data sources.',
    icon: BarChart3,
    gradient: 'from-rose-500 to-pink-600',
    features: ['Custom Dashboards', 'Real-time Data', 'Export Reports', 'Alert System', 'API Integrations'],
    launchDate: 'Q2 2026',
  },
];

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ProductsPage() {
  const { navigate } = useAppStore();
  useSEO({
    title: 'Products',
    description: 'Upcoming products from Lightworld Technologies - Project Management Tool, CRM System, Learning Platform, and Analytics Dashboard.',
    keywords: ['project management tool', 'CRM system Ghana', 'learning platform', 'analytics dashboard', 'Lightworld Technologies products'],
  });

  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});

  const handleSubscribe = useCallback(async (productId: string) => {
    const email = emailInputs[productId];
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubscribing(productId);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: `product-${productId}` }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed((prev) => ({ ...prev, [productId]: true }));
        toast.success('You\'ll be notified when this product launches!');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubscribing(null);
    }
  }, [emailInputs]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">Products</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-emerald-400">Products</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Innovative solutions we&apos;re building to help businesses across Africa grow and thrive.
          </motion.p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Coming Soon</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
              Products in <span className="text-emerald-600 dark:text-emerald-400">Development</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              We&apos;re working on cutting-edge tools to solve real business challenges. Be the first to know when they launch.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {products.map((product) => {
              const Icon = product.icon;
              const isSubscribed = subscribed[product.id];

              return (
                <motion.div key={product.id} variants={itemVariants}>
                  <Card className="h-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl dark:hover:shadow-emerald-900/20 transition-all duration-300 group overflow-hidden relative">
                    {/* Gradient top accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${product.gradient}`} />

                    <CardContent className="p-6 pt-8">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`size-14 rounded-2xl bg-gradient-to-br ${product.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="size-7 text-white" />
                        </div>
                        <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1.5">
                          <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2 bg-amber-400" />
                          </span>
                          Coming Soon
                        </Badge>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                        {product.description}
                      </p>

                      {/* Features */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-5">
                        {product.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Launch Date */}
                      <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <Clock className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Launching <span className="text-emerald-600 dark:text-emerald-400 font-bold">{product.launchDate}</span>
                        </span>
                      </div>

                      {/* Email Notification */}
                      {isSubscribed ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                            You&apos;ll be notified when this launches!
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                value={emailInputs[product.id] || ''}
                                onChange={(e) => setEmailInputs((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-emerald-400 focus:ring-emerald-400/20"
                                aria-label={`Email for ${product.title} notifications`}
                              />
                            </div>
                            <Button
                              onClick={() => handleSubscribe(product.id)}
                              disabled={subscribing === product.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 shrink-0"
                            >
                              {subscribing === product.id ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Bell className="size-4 mr-1.5" />
                                  Notify Me
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            No spam, unsubscribe anytime. We&apos;ll only notify you about this product launch.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* CTA */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-slate-500 dark:text-slate-400 mb-4">Need a custom solution right now?</p>
            <Button
              onClick={() => navigate('contact')}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8"
            >
              Get a Custom Solution
              <ChevronRight className="size-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
