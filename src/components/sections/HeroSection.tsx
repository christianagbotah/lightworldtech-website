'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Award, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

export default function HeroSection() {
  const { navigate } = useAppStore();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-60" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

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
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1.5 text-sm gap-1.5">
              <Award className="size-3.5" />
              2024 Business Excellence Award
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1.5 text-sm gap-1.5">
              <Sparkles className="size-3.5" />
              2021 MEA Awards Winner
            </Badge>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            The World of{' '}
            <span className="text-gradient">Possibilities</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            A team of dynamic minds shaping the digital future through innovative IT solutions, creative design, and cutting-edge technology that empowers businesses to thrive.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            <Button
              onClick={() => navigate('services')}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base"
            >
              Explore Our Services
              <ArrowRight className="size-4 ml-1" />
            </Button>
            <Button
              onClick={() => navigate('contact')}
              size="lg"
              variant="outline"
              className="border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all px-8 h-12 text-base"
            >
              Contact Us Today
            </Button>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            {[
              { value: '100+', label: 'Projects Delivered' },
              { value: '100+', label: 'Happy Clients' },
              { value: '8+', label: 'Years Experience' },
              { value: '100%', label: 'Satisfaction Rate' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stat.value}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
