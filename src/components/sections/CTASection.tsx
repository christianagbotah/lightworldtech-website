'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export default function CTASection() {
  const { navigate } = useAppStore();

  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 py-20 md:py-24">
        {/* Decorative elements */}
        <div className="absolute inset-0 grid-pattern opacity-10" />
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
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
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
              <Button
                onClick={() => navigate('contact')}
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base"
              >
                Get a Free Quote
                <ArrowRight className="size-4 ml-1" />
              </Button>
              <Button
                onClick={() => navigate('services')}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white transition-all px-8 h-12 text-base"
              >
                View Our Services
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
