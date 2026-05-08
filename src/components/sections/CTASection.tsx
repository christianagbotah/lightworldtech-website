'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Triangle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

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

      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 dark:from-emerald-700 dark:via-emerald-800 dark:to-emerald-900 py-20 md:py-24 relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 grid-pattern opacity-10" />

        {/* Floating geometric shapes */}
        <motion.div
          className="absolute top-10 left-[10%] text-white/5"
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        >
          <Triangle className="size-12" />
        </motion.div>
        <motion.div
          className="absolute top-20 right-[15%] text-white/5"
          animate={{ y: [0, 15, 0], x: [0, 10, 0], rotate: [0, -180, -360] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <Triangle className="size-8 rotate-180" />
        </motion.div>
        <motion.div
          className="absolute bottom-16 left-[20%] text-white/5"
          animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Circle className="size-10" />
        </motion.div>
        <motion.div
          className="absolute bottom-24 right-[8%] text-white/5"
          animate={{ y: [0, 20, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Triangle className="size-6" />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-[5%] text-white/[0.03]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Circle className="size-20" />
        </motion.div>
        <motion.div
          className="absolute top-[30%] right-[5%] text-white/[0.04]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Circle className="size-16" />
        </motion.div>

        {/* Gradient orbs */}
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="container-main relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm border border-white/10">
              <Sparkles className="size-4 text-amber-300" />
              <span className="text-sm text-emerald-50 font-medium">Let&apos;s Build Something Amazing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto leading-tight">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              Get in touch with our team today and let&apos;s discuss how we can help you achieve your digital goals with innovative, tailored solutions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Primary CTA with glow shadow */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg opacity-40 group-hover:opacity-80 blur-lg transition-all duration-500" />
                <Button
                  onClick={() => navigate('contact')}
                  size="lg"
                  className="relative bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg hover:shadow-2xl transition-all px-8 h-12 text-base"
                >
                  Get a Free Quote
                  <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <Button
                onClick={() => navigate('services')}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50 transition-all px-8 h-12 text-base backdrop-blur-sm"
              >
                View Our Services
              </Button>
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
