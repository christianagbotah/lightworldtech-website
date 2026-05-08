'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Award, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { useTypedText } from '@/hooks/use-typed-text';

function StatCounter({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const { displayValue, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  return (
    <div className="text-center" ref={ref}>
      <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{displayValue}</div>
      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}

export default function HeroSection() {
  const { navigate } = useAppStore();
  const { displayText, isDeleting } = useTypedText({
    strings: ['Web Development', 'Mobile Apps', 'Cloud Solutions', 'Digital Marketing', 'Software Solutions'],
    typeSpeed: 80,
    deleteSpeed: 40,
    pauseDuration: 2000,
  });

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950">
      {/* Decorative mesh/grid background */}
      <div className="absolute inset-0 grid-pattern opacity-60 dark:opacity-20" />
      <div className="absolute inset-0 [background-size:60px_60px] [background-image:linear-gradient(to_right,rgba(16,185,129,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.06)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)]" />
      {/* Radial mesh gradient */}
      <div className="absolute inset-0 [background-image:radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.04)_0%,transparent_70%)] dark:[background-image:radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06)_0%,transparent_70%)]" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-400/15 dark:bg-amber-500/10 rounded-full blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-300/10 dark:bg-amber-400/5 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating decorative dots */}
      <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-amber-400/40 animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-20 w-3 h-3 rounded-full bg-amber-400/30 animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-1/4 w-2 h-2 rounded-full bg-amber-300/40 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-amber-300/40 animate-float" style={{ animationDelay: '0.5s' }} />

      {/* Content */}
      <div className="container-main relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Award badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-3 py-1.5 text-sm gap-1.5">
              <Award className="size-3.5" />
              2024 Business Excellence Award
            </Badge>
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-3 py-1.5 text-sm gap-1.5">
              <Sparkles className="size-3.5" />
              2021 MEA Awards Winner
            </Badge>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <span className="inline-flex flex-wrap">The World of{' '}</span>
            <span className="text-gradient bg-gradient-to-r from-amber-600 via-amber-500 to-amber-500 dark:from-amber-400 dark:via-amber-300 dark:to-amber-400 bg-clip-text text-transparent whitespace-nowrap">
              Possibilities
            </span>
          </motion.h1>

          {/* Typed text animation */}
          <motion.div
            className="h-10 sm:h-12 flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <span className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-700 dark:text-slate-200">
              {displayText}
              <span className={`inline-block w-0.5 h-6 sm:h-7 ml-1 bg-amber-500 dark:bg-amber-400 align-middle ${isDeleting ? 'animate-blink-fast' : 'animate-blink'}`} />
            </span>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            A team of dynamic minds shaping the digital future through innovative IT solutions, creative design, and cutting-edge technology that empowers businesses to thrive.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            {/* Primary CTA with animated glow border */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-400 rounded-lg opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-500 animate-glow-pulse" />
              <Button
                onClick={() => navigate('services')}
                size="lg"
                className="relative bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base group"
              >
                Explore Our Services
                <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <Button
              onClick={() => navigate('contact')}
              size="lg"
              variant="outline"
              className="border-slate-300 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-950 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 transition-all px-8 h-12 text-base"
            >
              Contact Us Today
            </Button>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <StatCounter value={100} suffix="+" label="Projects Delivered" delay={0} />
            <StatCounter value={100} suffix="+" label="Happy Clients" delay={200} />
            <StatCounter value={8} suffix="+" label="Years Experience" delay={400} />
            <StatCounter value={100} suffix="%" label="Satisfaction Rate" delay={600} />
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
    </section>
  );
}
