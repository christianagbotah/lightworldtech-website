'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Award, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { useTypedText } from '@/hooks/use-typed-text';

const slides = [
  { src: '/images/hero-slide-1.png', alt: 'Team working together in a modern office' },
  { src: '/images/hero-slide-2.png', alt: 'Software development and coding on multiple screens' },
  { src: '/images/hero-slide-3.png', alt: 'Cloud infrastructure and server technology' },
  { src: '/images/hero-slide-4.png', alt: 'Mobile app development on various devices' },
  { src: '/images/hero-slide-5.png', alt: 'Digital marketing analytics dashboard' },
];

function StatCounter({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const { displayValue, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  return (
    <div className="text-center" ref={ref}>
      <div className="text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums drop-shadow-sm">{displayValue}</div>
      <div className="text-xs sm:text-sm text-white/70 mt-1">{label}</div>
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

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide((prev) => (index + slides.length) % slides.length);
  }, []);

  const goNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ===== Image Slider Background ===== */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          >
            <Image
              src={slides[currentSlide].src}
              alt={slides[currentSlide].alt}
              fill
              className="object-cover"
              priority={currentSlide === 0}
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Dark gradient overlay - ensures text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-900/70" />
        {/* Additional bottom gradient for stats bar readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </div>

      {/* ===== Animated gradient orbs (decorative, visible through overlay) ===== */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ===== Floating decorative dots ===== */}
      <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-emerald-400/40 animate-float pointer-events-none" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-20 w-3 h-3 rounded-full bg-amber-400/30 animate-float pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-1/4 w-2 h-2 rounded-full bg-amber-300/40 animate-float pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-emerald-300/40 animate-float pointer-events-none" style={{ animationDelay: '0.5s' }} />

      {/* ===== Left Arrow Navigation ===== */}
      <button
        onClick={goPrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-emerald-500/80 hover:border-emerald-400/50 transition-all duration-300 hover:scale-110 group"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* ===== Right Arrow Navigation ===== */}
      <button
        onClick={goNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-emerald-500/80 hover:border-emerald-400/50 transition-all duration-300 hover:scale-110 group"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* ===== Content (overlaid on slider) ===== */}
      <div className="container-main relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Award badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-amber-400/20 backdrop-blur-sm text-amber-200 border-amber-400/30 px-3 py-1.5 text-sm gap-1.5">
              <Award className="size-3.5" />
              2024 Business Excellence Award
            </Badge>
            <Badge className="bg-amber-400/20 backdrop-blur-sm text-amber-200 border-amber-400/30 px-3 py-1.5 text-sm gap-1.5">
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
            <span className="text-white drop-shadow-lg">The World of{' '}</span>
            <span className="text-gradient bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent whitespace-nowrap drop-shadow-lg">
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
            <span className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/90 drop-shadow">
              {displayText}
              <span className={`inline-block w-0.5 h-6 sm:h-7 ml-1 bg-amber-400 align-middle ${isDeleting ? 'animate-blink-fast' : 'animate-blink'}`} />
            </span>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow"
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
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-400 rounded-lg opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-500 animate-glow-pulse" />
              <Button
                onClick={() => navigate('services')}
                size="lg"
                className="relative bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base group"
              >
                Explore Our Services
                <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <Button
              onClick={() => navigate('contact')}
              size="lg"
              variant="outline"
              className="border-white/30 hover:bg-white/10 hover:border-amber-400/60 hover:text-amber-300 text-white backdrop-blur-sm transition-all px-8 h-12 text-base"
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

      {/* ===== Navigation Dots ===== */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`group relative rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 h-3'
                : 'w-3 h-3 hover:bg-emerald-400/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {/* Inactive dot (emerald-400) */}
            <span
              className={`absolute inset-0 rounded-full bg-emerald-400/60 transition-opacity duration-300 ${
                index === currentSlide ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {/* Active dot (amber-400 / gold, pill shape) */}
            <span
              className={`absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-opacity duration-300 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        ))}
      </div>

      {/* ===== Bottom gradient fade to match next section ===== */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
    </section>
  );
}
