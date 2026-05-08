'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Triangle, Circle, Hexagon, Star, CheckCircle2, Clock, Users, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';

function CTAStatCounter({ value, suffix, label, icon: Icon, delay = 0 }: { value: number; suffix: string; label: string; icon: React.ElementType; delay?: number }) {
  const { displayValue, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  return (
    <div className="text-center" ref={ref}>
      <Icon className="size-5 mx-auto mb-2 text-amber-300/70" />
      <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">{displayValue}</div>
      <div className="text-xs text-emerald-200/70 mt-1">{label}</div>
    </div>
  );
}

const trustBadges = [
  { icon: CheckCircle2, label: 'Free Consultation' },
  { icon: Clock, label: '24/7 Support' },
  { icon: Users, label: '100+ Clients' },
  { icon: Rocket, label: 'Fast Delivery' },
];

export default function CTASection() {
  const { navigate } = useAppStore();

  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient border top */}
      <motion.div
        className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
        animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-amber-700 dark:from-emerald-800 dark:via-emerald-900 dark:to-amber-900 py-20 md:py-28 relative overflow-hidden animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
        {/* Mesh pattern overlay */}
        <div className="absolute inset-0 mesh-pattern opacity-20" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-10" />

        {/* Floating geometric shapes - more elaborate */}
        <motion.div
          className="absolute top-10 left-[8%] text-white/5"
          animate={{ y: [0, -25, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        >
          <Triangle className="size-14" />
        </motion.div>
        <motion.div
          className="absolute top-16 right-[12%] text-white/5"
          animate={{ y: [0, 18, 0], x: [0, 12, 0], rotate: [0, -180, -360] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <Triangle className="size-10 rotate-180" />
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-[15%] text-white/5"
          animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Circle className="size-12" />
        </motion.div>
        <motion.div
          className="absolute bottom-28 right-[6%] text-white/5"
          animate={{ y: [0, 22, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Hexagon className="size-8" />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-[3%] text-white/[0.03]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Circle className="size-24" />
        </motion.div>
        <motion.div
          className="absolute top-[25%] right-[3%] text-white/[0.04]"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Hexagon className="size-20" />
        </motion.div>
        <motion.div
          className="absolute bottom-[10%] left-[40%] text-white/[0.03]"
          animate={{ y: [0, -15, 0], rotate: [0, 45, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Star className="size-16" />
        </motion.div>

        {/* Large gradient orbs */}
        <motion.div
          className="absolute -top-20 right-[10%] w-80 h-80 bg-amber-400/15 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 left-[10%] w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="container-main relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            {/* Top badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-5 py-2 backdrop-blur-md border border-white/15 shadow-lg shadow-black/10">
                <Sparkles className="size-4 text-amber-300" />
                <span className="text-sm text-emerald-50 font-medium">Let&apos;s Build Something Amazing</span>
                <Sparkles className="size-4 text-amber-300" />
              </div>
            </div>

            {/* Main heading */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5 max-w-4xl mx-auto leading-tight text-center">
              Ready to{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 bg-clip-text text-transparent" aria-label="Transform">
                Transform
              </span>{' '}
              Your Business?
            </h2>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-emerald-100/90 max-w-2xl mx-auto mb-10 leading-relaxed text-center">
              Get in touch with our team today and let&apos;s discuss how we can help you achieve your digital goals with innovative, tailored solutions.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              {/* Primary CTA with glow shadow */}
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 rounded-xl opacity-40 group-hover:opacity-80 blur-xl transition-all duration-700 animate-glow-pulse" />
                <Button
                  onClick={() => navigate('contact')}
                  size="lg"
                  className="relative bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold shadow-2xl hover:shadow-2xl transition-all px-10 h-14 text-lg rounded-xl"
                >
                  Get a Free Quote
                  <ArrowRight className="size-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </Button>
              </div>
              <Button
                onClick={() => navigate('services')}
                size="lg"
                variant="outline"
                className="border-white/25 text-white hover:bg-white/15 hover:text-white hover:border-white/50 transition-all px-10 h-14 text-lg backdrop-blur-sm rounded-xl"
              >
                View Our Services
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
              <CTAStatCounter value={100} suffix="+" label="Projects Delivered" icon={Rocket} delay={0} />
              <CTAStatCounter value={100} suffix="+" label="Happy Clients" icon={Users} delay={150} />
              <CTAStatCounter value={8} suffix="+" label="Years Experience" icon={Clock} delay={300} />
              <CTAStatCounter value={100} suffix="%" label="Satisfaction" icon={CheckCircle2} delay={450} />
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {trustBadges.map((badge) => (
                <motion.div
                  key={badge.label}
                  className="flex items-center gap-2 bg-white/8 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  <badge.icon className="size-4 text-emerald-300" />
                  <span className="text-sm text-white/80 font-medium">{badge.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Animated gradient border bottom */}
      <motion.div
        className="h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </section>
  );
}
