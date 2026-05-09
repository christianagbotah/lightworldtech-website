'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  Globe,
  Trophy,
} from 'lucide-react';

interface StatItem {
  icon: React.ElementType;
  end: number;
  suffix: string;
  label: string;
  description: string;
  gradient: string;
  iconBg: string;
  delay: number;
}

const stats: StatItem[] = [
  {
    icon: Briefcase,
    end: 200,
    suffix: '+',
    label: 'Projects Completed',
    description: 'Successfully delivered across diverse industries',
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    delay: 0,
  },
  {
    icon: Users,
    end: 150,
    suffix: '+',
    label: 'Happy Clients',
    description: 'Trusted by businesses throughout Ghana and Africa',
    gradient: 'from-amber-400 to-yellow-500',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    delay: 100,
  },
  {
    icon: UserCheck,
    end: 25,
    suffix: '+',
    label: 'Team Members',
    description: 'Skilled developers, designers, and strategists',
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    delay: 200,
  },
  {
    icon: Calendar,
    end: 8,
    suffix: '+',
    label: 'Years Experience',
    description: 'Over eight years of proven excellence in IT',
    gradient: 'from-amber-500 to-amber-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    delay: 300,
  },
  {
    icon: Globe,
    end: 12,
    suffix: '+',
    label: 'Countries Served',
    description: 'Delivering solutions across West Africa and beyond',
    gradient: 'from-yellow-500 to-amber-500',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    delay: 400,
  },
  {
    icon: Trophy,
    end: 10,
    suffix: '+',
    label: 'Awards Won',
    description: 'Recognized for innovation and service quality',
    gradient: 'from-amber-400 to-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    delay: 500,
  },
];

function AnimatedNumber({ end, suffix, delay, inView }: { end: number; suffix: string; delay: number; inView: boolean }) {
  const [count, setCount] = useState(0);
  const hasStarted = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView || hasStarted.current) return;
    hasStarted.current = true;

    const timer = setTimeout(() => {
      const startTime = performance.now();
      const duration = 2000;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(end * eased));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [inView, end, delay]);

  return (
    <span className={`tabular-nums ${inView ? 'animate-count-reveal' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      {count}{suffix}
    </span>
  );
}

export default function StatsCounterSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-amber-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Decorative grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] dark:opacity-[0.06]" />

      {/* Decorative morphing blobs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl animate-morph-blob dark:bg-emerald-600/10" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl animate-morph-blob dark:bg-emerald-600/8" style={{ animationDelay: '-6s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl animate-breathe dark:bg-amber-500/5" />

      {/* Decorative floating geometric shapes */}
      <div className="absolute top-16 right-1/4 w-3 h-3 rounded-full bg-amber-400/30 dark:bg-amber-400/20 animate-float-shape-1" />
      <div className="absolute bottom-20 left-1/3 w-2 h-2 rounded-full bg-amber-400/30 dark:bg-amber-400/20 animate-float-shape-2" />
      <div className="absolute top-1/3 right-20 w-4 h-4 rounded-sm bg-amber-300/20 dark:bg-amber-300/10 rotate-45 animate-float-shape-3" />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-emerald-400 dark:to-amber-400" />
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest bg-emerald-50 dark:bg-amber-900/20 rounded-full px-4 py-1.5 border border-emerald-200/60 dark:border-amber-700/30">
              <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-amber-400 animate-pulse" />
              Our Impact in Numbers
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-emerald-400 dark:to-amber-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Delivering Results That{' '}
            <span className="text-gradient-amber">
              Speak for Themselves
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Over the years, we&apos;ve built a track record of excellence that our clients trust and our team is proud of.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="group relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Glassmorphism card with shimmer */}
                <div className="relative rounded-2xl p-6 md:p-8 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 hover:border-amber-300/60 dark:hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-500 h-full shimmer-sweep">
                  {/* Gradient border on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[1.5px] -z-10`}>
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900" />
                  </div>

                  {/* Icon with orbit dot */}
                  <div className="relative inline-flex items-center justify-center mb-5">
                    <div className={`size-14 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="size-6 text-emerald-600 dark:text-amber-400" />
                    </div>
                    {/* Orbiting decorative dot */}
                    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                      <div className="size-1.5 rounded-full bg-amber-400/50 dark:bg-amber-400/30 animate-orbit" />
                    </div>
                  </div>

                  {/* Number */}
                  <div className="text-4xl md:text-5xl font-extrabold mb-2 leading-none">
                    <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-white dark:to-slate-200 bg-clip-text text-transparent">
                      <AnimatedNumber end={stat.end} suffix={stat.suffix} delay={stat.delay} inView={inView} />
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-700/50 mb-3 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${stat.gradient}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.min(stat.end / 2.5, 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Label */}
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    {stat.label}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
