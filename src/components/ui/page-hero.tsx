'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  page?: string;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  badge?: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  children?: React.ReactNode;
}

export default function PageHero({
  title,
  subtitle,
  badge,
  breadcrumbs,
  className,
  children,
}: PageHeroProps) {
  const { navigate } = useAppStore();

  const defaultBreadcrumbs = breadcrumbs ?? [
    { label: 'Home', page: 'home' },
    { label: title.replace(/ Lightworld Technologies/gi, '').trim() },
  ];

  return (
    <section
      className={cn(
        'relative py-20 md:py-28 overflow-hidden',
        'bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800',
        className,
      )}
    >
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-[0.03]" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />

      {/* Gradient orb */}
      <motion.div
        className="absolute top-20 right-20 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="container-main relative z-10">
        {/* Breadcrumbs */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-sm text-slate-400 mb-6"
          aria-label="Breadcrumb"
        >
          {defaultBreadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-slate-600">/</span>
              )}
              {item.page ? (
                <button
                  onClick={() => navigate(item.page as any)}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-emerald-400 font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </motion.nav>

        {/* Badge */}
        {badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6"
          >
            {badge}
          </motion.div>
        )}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}

        {/* Extra children slot */}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            {children}
          </motion.div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
    </section>
  );
}
