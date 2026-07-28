'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Kanban, UsersRound, GraduationCap, BarChart3, Bell, Mail, Clock, CheckCircle2,
  ArrowRight, Flame, Zap,
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
    gradient: 'from-amber-500 to-yellow-600',
    features: ['Task Boards & Kanban', 'Time Tracking', 'Gantt Charts', 'Team Collaboration', 'Automated Reports'],
    launchDate: 'Q4 2026',
  },
  {
    id: '2',
    title: 'CRM System',
    description: 'Build stronger relationships with a CRM designed for African businesses. Manage leads, track sales pipelines, automate follow-ups, and gain actionable insights from customer data.',
    icon: UsersRound,
    gradient: 'from-amber-500 to-amber-600',
    features: ['Lead Management', 'Sales Pipeline', 'Email Automation', 'Customer Analytics', 'Mobile App'],
    launchDate: 'Q1 2027',
  },
  {
    id: '3',
    title: 'Learning Platform',
    description: 'Empower your organization with a modern e-learning platform. Create and deliver courses, track learner progress, issue certificates, and build a culture of continuous learning.',
    icon: GraduationCap,
    gradient: 'from-yellow-500 to-amber-600',
    features: ['Course Builder', 'Video Streaming', 'Progress Tracking', 'Certificates', 'Assessments'],
    launchDate: 'Q2 2027',
  },
  {
    id: '4',
    title: 'Analytics Dashboard',
    description: 'Make data-driven decisions with our powerful analytics dashboard. Visualize key metrics, create custom reports, set alerts, and integrate with your existing data sources.',
    icon: BarChart3,
    gradient: 'from-amber-400 to-amber-500',
    features: ['Custom Dashboards', 'Real-time Data', 'Export Reports', 'Alert System', 'API Integrations'],
    launchDate: 'Q3 2027',
  },
];

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Target launch dates for countdown (approximate future dates)
const launchDates: Record<string, Date> = {
  '1': new Date('2026-12-01T00:00:00'), // Q4 2026
  '2': new Date('2027-03-01T00:00:00'), // Q1 2027
  '3': new Date('2027-06-01T00:00:00'), // Q2 2027
  '4': new Date('2027-09-01T00:00:00'), // Q3 2027
};

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [targetDate]);

  return timeLeft;
}

function CompactCountdown({ targetDate }: { targetDate: Date }) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate);
  const isLaunched = days === 0 && hours === 0 && minutes === 0 && seconds === 0;

  if (isLaunched) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Zap className="size-2.5" />
        Launching now!
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/50 tabular-nums">
      <Flame className="size-2.5 text-amber-500 shrink-0" />
      {days}d {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

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
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <main>
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-[#050810] flex flex-col">
        {/* Subtle background glow */}
        <div className="absolute top-10 left-10 w-40 h-40 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

        {/* Compact Title Bar — ~60px */}
        <motion.div
          className="relative z-10 flex items-center justify-between px-4 lg:px-6 py-3 border-b border-white/[0.06]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold backdrop-blur-sm shrink-0">
              <Clock className="size-2.5 mr-1" />
              Products
            </Badge>
            <h1 className="text-base lg:text-lg font-bold text-white">
              Our <span className="text-gradient-amber">Products</span>
            </h1>
            <span className="hidden sm:inline text-[10px] text-white/30 uppercase tracking-widest">
              Coming Soon
            </span>
          </div>
          <button
            onClick={() => navigate('contact')}
            className="hidden md:inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-emerald-400 transition-colors"
          >
            Need a custom solution?
            <ArrowRight className="size-3" />
          </button>
        </motion.div>

        {/* 2×2 Product Cards Grid */}
        <motion.div
          className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 p-3 lg:p-4 overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => {
            const Icon = product.icon;
            const isSubscribed = subscribed[product.id];

            return (
              <motion.div key={product.id} variants={itemVariants} className="min-h-0">
                <Card className="h-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 lg:p-4 hover:bg-white/[0.06] transition-all duration-300 group overflow-hidden relative flex flex-col">
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${product.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                  {/* Header: icon + title + launch badge */}
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className={`size-10 lg:size-12 shrink-0 rounded-xl bg-gradient-to-br ${product.gradient} flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:rotate-1 transition-all duration-300`}>
                      <Icon className="size-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm lg:text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {product.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className="text-[9px] px-2 py-0 rounded-full bg-white/[0.04] text-white/40 border-0 font-normal">
                          {product.launchDate}
                        </Badge>
                        <CompactCountdown targetDate={launchDates[product.id] || new Date()} />
                      </div>
                    </div>
                  </div>

                  {/* Description — 2 lines */}
                  <p className="text-[11px] lg:text-xs text-white/40 leading-relaxed line-clamp-2 mb-2">
                    {product.description}
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/45 whitespace-nowrap"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Spacer to push email to bottom */}
                  <div className="flex-1" />

                  {/* Email Notification — compact */}
                  {isSubscribed ? (
                    <motion.div
                      className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/15"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <CheckCircle2 className="size-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] text-amber-400 font-medium">
                        You&apos;ll be notified at launch!
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Mail className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-white/25" />
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={emailInputs[product.id] || ''}
                          onChange={(e) => setEmailInputs((prev) => ({ ...prev, [product.id]: e.target.value }))}
                          className="pl-7 h-7 text-[10px] bg-white/[0.04] border-white/[0.06] rounded-lg focus:border-amber-400/50 focus:ring-amber-400/10 placeholder:text-white/25"
                          aria-label={`Email for ${product.title} notifications`}
                        />
                      </div>
                      <Button
                        onClick={() => handleSubscribe(product.id)}
                        disabled={subscribing === product.id}
                        className="h-7 text-[10px] px-2.5 lg:px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0 shadow-md shadow-emerald-500/15"
                      >
                        {subscribing === product.id ? (
                          <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Bell className="size-2.5 mr-1" />
                            <span className="hidden sm:inline">Get Notified</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </main>
  );
}
