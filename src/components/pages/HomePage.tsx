'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useSEO } from '@/hooks/use-seo';
import {
  Cpu, Cloud, Shield, Database, Monitor, Globe,
  ArrowRight, ArrowUpRight, Quote, ChevronUp, ChevronDown,
  Users, Clock, Zap, Award,
  Phone, Mail, Sparkles, Star, ExternalLink, Play,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */

const SERVICES = [
  { icon: Globe, title: 'Web Development', desc: 'Modern responsive websites & web apps', gradient: 'from-emerald-500 to-teal-600', page: 'services' as const },
  { icon: Cpu, title: 'IT Solutions', desc: 'Enterprise infrastructure & consulting', gradient: 'from-cyan-500 to-blue-600', page: 'services' as const },
  { icon: Shield, title: 'Cybersecurity', desc: 'Advanced threat detection & protection', gradient: 'from-amber-500 to-orange-600', page: 'services' as const },
  { icon: Cloud, title: 'Cloud Services', desc: 'Scalable cloud platforms & migration', gradient: 'from-violet-500 to-purple-600', page: 'services' as const },
  { icon: Database, title: 'Data Analytics', desc: 'Business intelligence & insights', gradient: 'from-rose-500 to-pink-600', page: 'services' as const },
  { icon: Monitor, title: 'Software Dev', desc: 'Custom enterprise applications', gradient: 'from-lime-500 to-green-600', page: 'services' as const },
];

const STATS = [
  { value: 500, suffix: '+', label: 'Clients Served', icon: Users },
  { value: 15, suffix: '+', label: 'Years Experience', icon: Clock },
  { value: 99.9, suffix: '%', label: 'Uptime Guarantee', icon: Zap },
  { value: 24, suffix: '/7', label: 'Support Available', icon: Award },
];

const TYPING_MESSAGES = [
  'Powering Digital Innovation in Africa',
  'Empowering Businesses with Technology',
  'Your Trusted IT Partner in Ghana',
  'Building the Future, One Solution at a Time',
];

const TESTIMONIALS = [
  { text: 'Lightworld transformed our entire IT infrastructure. Their team is incredibly professional and responsive. We saw a 40% increase in operational efficiency within the first quarter.', author: 'Emmanuel K.', role: 'CEO, TechVentures Ghana', stars: 5 },
  { text: 'The best IT company we\'ve worked with. They delivered our project on time, under budget, and exceeded all expectations. Their after-sales support is exceptional.', author: 'Abigail M.', role: 'CTO, DataFlow Inc.', stars: 5 },
  { text: 'Outstanding cybersecurity solutions. Our systems have never been more secure since partnering with them. They proactively identify threats before they become problems.', author: 'Kwame A.', role: 'Director, SecureBank Ghana', stars: 5 },
  { text: 'From concept to deployment, Lightworld handled our cloud migration flawlessly. Zero downtime and our team was trained on the new system within a week.', author: 'Ama S.', role: 'VP Operations, Ghana Retail Corp', stars: 5 },
];

const FEATURED_PROJECTS = [
  { title: 'E-Commerce Platform', category: 'Web Development', desc: 'Full-featured online store with payment integration and analytics', gradient: 'from-emerald-500/20 to-teal-600/20' },
  { title: 'Healthcare Mobile App', category: 'Mobile App', desc: 'Patient management with telemedicine and appointment scheduling', gradient: 'from-amber-500/20 to-orange-600/20' },
  { title: 'Corporate ERP System', category: 'Software', desc: 'Enterprise resource planning for manufacturing company', gradient: 'from-cyan-500/20 to-blue-600/20' },
];

const CLIENTS = ['Google', 'MTN Group', 'Vodafone', 'Ghana Government', 'USAID', 'World Bank', 'UNDP', 'Mastercard Foundation'];

/* ══════════════════════════════════════════════════════════════
   CUSTOM HOOKS
   ══════════════════════════════════════════════════════════════ */

function useTypewriter(messages: string[], speed = 45) {
  const [text, setText] = useState('');
  const [msgIdx, setMsgIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = messages[msgIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        const next = current.slice(0, text.length + 1);
        setText(next);
        if (next.length === current.length) {
          setTimeout(() => setDeleting(true), 2800);
        }
      } else {
        const next = text.slice(0, -1);
        setText(next);
        if (next.length === 0) {
          setDeleting(false);
          setMsgIdx((prev) => (prev + 1) % messages.length);
        }
      }
    }, deleting ? 22 : speed);
    return () => clearTimeout(timeout);
  }, [text, msgIdx, deleting, messages, speed]);

  return text;
}

function useCountUp(end: number, duration = 2000, decimals = 0, delay = 600) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Number((eased * end).toFixed(decimals)));
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [started, end, duration, decimals]);

  return count;
}

/* ══════════════════════════════════════════════════════════════
   BACKGROUND EFFECTS
   ══════════════════════════════════════════════════════════════ */

/** Deterministic seeded PRNG (mulberry32) — keeps SSR & client output identical. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ParticleField() {
  const particles = useMemo(() => {
    const rand = mulberry32(20240517); // fixed seed → SSR & client match
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 1 + rand() * 2,
      duration: 20 + rand() * 25,
      delay: rand() * 15,
      opacity: 0.06 + rand() * 0.15,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [0, -30, 0], opacity: [p.opacity, p.opacity * 0.3, p.opacity] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── Slide Background with Ken Burns ── */
const SLIDE_BG: Record<number, { src: string; anim: string }> = {
  0: { src: '/slides/slide-hero.png',        anim: 'animate-ken-burns-a' },
  1: { src: '/slides/slide-about.png',       anim: 'animate-ken-burns-b' },
  2: { src: '/slides/slide-services.png',    anim: 'animate-ken-burns-c' },
  3: { src: '/slides/slide-portfolio.png',   anim: 'animate-ken-burns-d' },
  4: { src: '/slides/slide-testimonials.png', anim: 'animate-ken-burns-a' },
  5: { src: '/slides/slide-cta.png',         anim: 'animate-ken-burns-b' },
};

function SlideBackground({ slideIndex }: { slideIndex: number }) {
  const bg = SLIDE_BG[slideIndex];
  if (!bg) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Image */}
      <Image
        src={bg.src}
        alt=""
        fill
        sizes="100vw"
        className={cn('object-cover object-center opacity-[0.18]', bg.anim)}
        priority={slideIndex === 0}
        aria-hidden="true"
      />
      {/* Theme-aware gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-white/90 dark:from-[#050810]/60 dark:via-[#050810]/80 dark:to-[#050810]/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-white/50 dark:from-[#050810]/50 dark:via-transparent dark:to-[#050810]/50" />
    </div>
  );
}

function GradientOrbs({ variant = 0 }: { variant?: number }) {
  const configs = [
    { c1: 'emerald-500/[0.06]', c2: 'amber-500/[0.04]', c3: 'cyan-500/[0.03]' },
    { c1: 'cyan-500/[0.06]', c2: 'violet-500/[0.04]', c3: 'emerald-500/[0.03]' },
    { c1: 'amber-500/[0.06]', c2: 'rose-500/[0.04]', c3: 'emerald-500/[0.03]' },
    { c1: 'teal-500/[0.06]', c2: 'blue-500/[0.04]', c3: 'amber-500/[0.03]' },
    { c1: 'emerald-500/[0.06]', c2: 'cyan-500/[0.04]', c3: 'rose-500/[0.03]' },
    { c1: 'amber-500/[0.08]', c2: 'emerald-500/[0.06]', c3: 'teal-500/[0.04]' },
  ];
  const cfg = configs[variant % configs.length];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn('absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full blur-[100px] animate-orb-1', `bg-${cfg.c1}`)} />
      <div className={cn('absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full blur-[100px] animate-orb-2', `bg-${cfg.c2}`)} />
      <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full blur-[80px] animate-orb-3', `bg-${cfg.c3}`)} />
    </div>
  );
}

function GridOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.015]">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={`h-${i}`} className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400 dark:via-white to-transparent" style={{ top: `${(i + 1) * 16.67}%` }} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={`v-${i}`} className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-400 dark:via-white to-transparent" style={{ left: `${(i + 1) * 16.67}%` }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SLIDE 1: HERO
   ══════════════════════════════════════════════════════════════ */

function HeroSlide() {
  const { navigate } = useAppStore();
  const typedText = useTypewriter(TYPING_MESSAGES);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <GradientOrbs variant={0} />
      <ParticleField />
      <GridOverlay />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="size-14 lg:size-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/25 overflow-hidden">
            <Image src="/logo.png" alt="Lightworld Technologies" width={40} height={40} className="object-contain p-1" />
          </div>
          <div className="text-left">
            <span className="text-lg lg:text-xl font-bold dark:text-white text-slate-900 leading-tight">Lightworld</span>
            <span className="block text-[9px] font-semibold text-emerald-400 tracking-[0.3em] uppercase leading-tight">Technologies</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold dark:text-white text-slate-900 leading-[1.05] tracking-tight mb-5"
        >
          We Build{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Digital Futures
          </span>
        </motion.h1>

        {/* Typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <p className="text-sm lg:text-lg dark:text-white/40 text-slate-500 font-light h-5 lg:h-7 flex items-center justify-center">
            <Sparkles className="size-4 lg:size-5 text-emerald-400/50 mr-2 shrink-0" />
            {typedText}
            <span className="inline-block w-[2px] h-4 lg:h-6 bg-emerald-400 ml-1 animate-blink" />
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <button
            onClick={() => navigate('services')}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-[0.98]"
          >
            Explore Services
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('contact')}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full dark:bg-white/[0.06] bg-slate-100 dark:text-white/70 text-slate-700 text-sm font-medium dark:hover:bg-white/[0.12] hover:bg-slate-200 dark:hover:text-white hover:text-slate-900 transition-all dark:border-white/[0.1] border-slate-200 dark:hover:border-white/[0.2] hover:border-slate-300 hover:scale-105 active:scale-[0.98]"
          >
            <Phone className="size-4" />
            Get in Touch
          </button>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-12 flex items-center justify-center gap-6 lg:gap-10"
        >
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="text-center">
                <Icon className="size-3.5 text-emerald-400/40 mx-auto mb-1" />
                <span className="block text-xl lg:text-2xl font-bold dark:text-white text-slate-900 tabular-nums">
                  {stat.value}<span className="text-emerald-400/70">{stat.suffix}</span>
                </span>
                <span className="block text-xs dark:text-white/35 text-slate-500 mt-0.5 font-medium">{stat.label}</span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Availability Badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 right-8 z-20"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full dark:bg-white/[0.04] bg-slate-100/80 dark:border-white/[0.08] border-slate-200 backdrop-blur-sm">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] lg:text-xs dark:text-white/40 text-slate-500 font-medium">Available for projects</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SLIDE 2: ABOUT / WHO WE ARE
   ══════════════════════════════════════════════════════════════ */

function AboutSlide() {
  const { navigate } = useAppStore();

  const stats = [
    { value: 500, suffix: '+', label: 'Satisfied Clients', desc: 'Across diverse industries' },
    { value: 200, suffix: '+', label: 'Projects Delivered', desc: 'On time and on budget' },
    { value: 15, suffix: '+', label: 'Years in Business', desc: 'Of proven excellence' },
    { value: 99.9, suffix: '%', label: 'Success Rate', desc: 'Client satisfaction guaranteed' },
  ];

  return (
    <div className="absolute inset-0 flex items-center">
      <GradientOrbs variant={1} />
      <GridOverlay />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Mission */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <div className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.15em]">Who We Are</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold dark:text-white text-slate-900 leading-tight mb-5">
              Ghana&apos;s Leading{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">IT Solutions</span>{' '}
              Partner
            </h2>

            <p className="text-sm lg:text-lg dark:text-white/50 text-slate-600 leading-relaxed mb-6 max-w-lg">
              At Lightworld Technologies, we combine innovation with expertise to deliver transformative digital solutions.
              From enterprise software to cloud infrastructure, our team of specialists empowers businesses across Africa
              to thrive in the digital age.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('about')}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
              >
                Learn More About Us
                <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-full dark:bg-white/[0.04] bg-slate-100 dark:border-white/[0.06] border-slate-200">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-3 text-amber-400 fill-amber-400" />
                ))}
                <span className="text-[10px] dark:text-white/40 text-slate-500 ml-1">5.0 Rating</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-3.5"
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="group relative p-5 lg:p-7 rounded-2xl dark:bg-white/[0.03] bg-white shadow-sm dark:border-white/[0.06] border-slate-200 backdrop-blur-sm dark:hover:bg-white/[0.06] hover:bg-slate-50 dark:hover:border-white/[0.12] hover:border-slate-300 transition-all duration-300"
              >
                <span className="block text-2xl lg:text-3xl font-extrabold dark:text-white text-slate-900 tabular-nums">
                  {stat.value}<span className="text-emerald-400/70">{stat.suffix}</span>
                </span>
                <span className="block text-sm font-semibold dark:text-white/70 text-slate-700 mt-1.5">{stat.label}</span>
                <span className="block text-xs dark:text-white/35 text-slate-400 mt-0.5">{stat.desc}</span>
                <div className="absolute top-3 right-3 size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="size-3.5 text-emerald-400" />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SLIDE 3: SERVICES
   ══════════════════════════════════════════════════════════════ */

function ServicesSlide() {
  const { navigate } = useAppStore();

  return (
    <div className="absolute inset-0 flex items-center">
      <GradientOrbs variant={2} />
      <GridOverlay />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4"
          >
            <div className="size-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-[0.15em]">What We Do</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold dark:text-white text-slate-900 leading-tight"
          >
            Our <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Services</span>
          </motion.h2>
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-5">
          {SERVICES.map((service, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              onClick={() => navigate(service.page)}
              className="group relative overflow-hidden rounded-xl dark:bg-white/[0.03] bg-white shadow-sm dark:border-white/[0.06] border-slate-200 backdrop-blur-sm p-4 lg:p-6 cursor-pointer text-left transition-all duration-300 dark:hover:bg-white/[0.07] hover:bg-slate-50 dark:hover:border-white/[0.15] hover:border-slate-300 hover:scale-[1.02]"
            >
              <div className={cn('size-10 lg:size-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 lg:mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg', service.gradient)}>
                <service.icon className="size-5 lg:size-6 text-white" />
              </div>
              <h3 className="text-sm lg:text-base font-bold dark:text-white/90 text-slate-800 mb-1.5">{service.title}</h3>
              <p className="text-xs lg:text-sm dark:text-white/40 text-slate-500 leading-relaxed line-clamp-2">{service.desc}</p>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                <ArrowUpRight className="size-4 text-emerald-400" />
              </div>
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br dark:from-emerald-500/[0.06] from-emerald-500/[0.04] to-transparent" />
            </motion.button>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6 lg:mt-8"
        >
          <button
            onClick={() => navigate('services')}
            className="group inline-flex items-center gap-2 text-xs dark:text-white/40 text-slate-500 hover:text-emerald-400 transition-colors font-medium"
          >
            View All Services & Details
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SLIDE 4: PORTFOLIO
   ══════════════════════════════════════════════════════════════ */

function PortfolioSlide() {
  const { navigate } = useAppStore();

  return (
    <div className="absolute inset-0 flex items-center">
      <GradientOrbs variant={3} />
      <GridOverlay />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <div className="size-1.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-[0.15em]">Our Work</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold dark:text-white text-slate-900 leading-tight mb-5">
              Projects That{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Speak</span>{' '}
              For Themselves
            </h2>

            <p className="text-sm lg:text-lg dark:text-white/50 text-slate-600 leading-relaxed mb-6 max-w-lg">
              From enterprise platforms to mobile applications, our portfolio showcases the breadth and depth of our technical expertise.
              Every project is crafted with precision, performance, and purpose.
            </p>

            <div className="flex items-center gap-6 mb-8">
              {[
                { label: 'Web Apps', count: '80+' },
                { label: 'Mobile Apps', count: '45+' },
                { label: 'Enterprise', count: '35+' },
              ].map((item, i) => (
                <div key={i}>
                  <span className="block text-xl font-bold dark:text-white text-slate-900">{item.count}</span>
                  <span className="block text-xs dark:text-white/40 text-slate-500 font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('portfolio')}
              className="group flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-[0.98]"
            >
              View Full Portfolio
              <ExternalLink className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </motion.div>

          {/* Right: Featured Projects */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3 lg:space-y-4"
          >
            {FEATURED_PROJECTS.map((project, i) => (
              <div
                key={i}
                className={cn(
                  'group relative p-4 lg:p-6 rounded-xl border transition-all duration-300 cursor-pointer hover:scale-[1.01]',
                  `bg-gradient-to-br ${project.gradient} dark:border-white/[0.06] border-slate-200 dark:hover:border-white/[0.12] hover:border-slate-300`,
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider">{project.category}</span>
                    <h3 className="text-sm lg:text-base font-bold dark:text-white/90 text-slate-800 mt-1.5">{project.title}</h3>
                    <p className="text-xs lg:text-sm dark:text-white/40 text-slate-500 mt-1 line-clamp-1">{project.desc}</p>
                  </div>
                  <ArrowUpRight className="size-4 dark:text-white/20 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SLIDE 5: TESTIMONIALS
   ══════════════════════════════════════════════════════════════ */

function TestimonialsSlide() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrent((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <GradientOrbs variant={4} />
      <GridOverlay />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
        >
          <div className="size-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.15em]">Testimonials</span>
        </motion.div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[...Array(TESTIMONIALS[current].stars)].map((_, i) => (
            <motion.div
              key={`${current}-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
            >
              <Star className="size-5 text-amber-400 fill-amber-400" />
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <div className="relative mb-8">
          <Quote className="size-10 lg:size-14 text-emerald-500/15 absolute -top-3 -left-2 lg:-left-4" />
          <AnimatePresence mode="wait">
            <motion.p
              key={current}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="text-lg lg:text-2xl dark:text-white/60 text-slate-600 leading-relaxed font-light italic pl-6 lg:pl-10"
            >
              &ldquo;{TESTIMONIALS[current].text}&rdquo;
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Author */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="size-10 lg:size-12 rounded-full bg-gradient-to-br from-emerald-400 to-amber-500 flex items-center justify-center text-sm lg:text-base font-bold text-white shadow-lg shadow-emerald-500/20">
              {TESTIMONIALS[current].author[0]}
            </div>
            <div className="text-left">
              <p className="text-sm lg:text-base font-semibold dark:text-white/70 text-slate-700">{TESTIMONIALS[current].author}</p>
              <p className="text-xs lg:text-sm dark:text-white/40 text-slate-500">{TESTIMONIALS[current].role}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === current ? 'bg-emerald-400 w-6' : 'dark:bg-white/10 bg-slate-300 w-2 dark:hover:bg-white/20 hover:bg-slate-400',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SLIDE 6: CTA / CONTACT
   ══════════════════════════════════════════════════════════════ */

function ClientTicker({ className }: { className?: string }) {
  const doubled = useMemo(() => [...CLIENTS, ...CLIENTS], []);
  return (
    <div className={cn('relative overflow-hidden flex items-center', className)}>
      <motion.div className="flex gap-10 whitespace-nowrap" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((client, i) => (
          <span key={i} className="text-[10px] lg:text-xs dark:text-white/12 text-slate-300 font-medium tracking-wider uppercase">{client}</span>
        ))}
      </motion.div>
      <div className="absolute left-0 inset-y-0 w-10 bg-gradient-to-r dark:from-[#050810] from-slate-50 to-transparent pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-10 bg-gradient-to-l dark:from-[#050810] from-slate-50 to-transparent pointer-events-none" />
    </div>
  );
}

function CTASlide() {
  const { navigate } = useAppStore();

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <GradientOrbs variant={5} />
      <GridOverlay />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative p-8 lg:p-12 rounded-3xl dark:bg-white/[0.03] bg-white/90 shadow-sm dark:border-white/[0.08] border-slate-200 backdrop-blur-sm overflow-hidden"
        >
          {/* Inner glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <Sparkles className="size-6 text-emerald-400/50 mx-auto mb-4" />

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold dark:text-white text-slate-900 leading-tight mb-4">
              Ready to{' '}
              <span className="bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">Get Started?</span>
            </h2>

            <p className="text-sm lg:text-base dark:text-white/40 text-slate-500 leading-relaxed mb-8 max-w-md mx-auto">
              Let&apos;s discuss how we can help transform your business with innovative IT solutions.
              Get a free consultation today — no obligations.
            </p>

            {/* CTAs */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
              <button
                onClick={() => navigate('contact')}
                className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-[0.98]"
              >
                Get a Free Quote
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('portfolio')}
                className="group flex items-center gap-2.5 px-6 py-3.5 rounded-full dark:bg-white/[0.06] bg-slate-100 dark:text-white/60 text-slate-700 text-sm font-medium dark:hover:bg-white/[0.12] hover:bg-slate-200 dark:hover:text-white hover:text-slate-900 transition-all dark:border-white/[0.08] border-slate-200 hover:scale-105 active:scale-[0.98]"
              >
                View Our Work
              </button>
            </div>

            {/* Contact Info */}
            <div className="flex items-center justify-center gap-6 lg:gap-8 text-xs dark:text-white/30 text-slate-400">
              <a href="tel:+233243618186" className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                <Phone className="size-3.5" />
                <span>+233 (024) 361 8186</span>
              </a>
              <a href="mailto:mail@lightworldtech.com" className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                <Mail className="size-3.5" />
                <span>mail@lightworldtech.com</span>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Client Ticker */}
        <div className="mt-10 px-4">
          <ClientTicker className="py-2" />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT — FULLSCREEN SLIDESHOW
   ══════════════════════════════════════════════════════════════ */

const SLIDES = [
  { id: 0, label: 'Home', component: HeroSlide },
  { id: 1, label: 'About', component: AboutSlide },
  { id: 2, label: 'Services', component: ServicesSlide },
  { id: 3, label: 'Portfolio', component: PortfolioSlide },
  { id: 4, label: 'Testimonials', component: TestimonialsSlide },
  { id: 5, label: 'Get Started', component: CTASlide },
];

const slideVariants = {
  enter: { opacity: 0, scale: 0.98 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoTime = useRef(Date.now());

  useSEO({
    title: 'Lightworld Technologies — Powering Digital Innovation',
    description: 'Leading IT solutions provider in Ghana. Web development, cloud services, cybersecurity, data analytics, and enterprise software.',
    keywords: ['IT company Ghana', 'Lightworld Technologies', 'web development Ghana', 'cybersecurity Africa', 'cloud services'],
  });

  // Auto-advance every 6 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      if (!isPaused && !isTransitioning) {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, isTransitioning]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentSlide) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [currentSlide, isTransitioning]);

  const nextSlide = useCallback(() => goToSlide((currentSlide + 1) % SLIDES.length), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length), [currentSlide, goToSlide]);

  // Wheel handler
  useEffect(() => {
    let lastWheel = 0;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < 1000) return; // Throttle
      lastWheel = now;

      if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) nextSlide();
        else prevSlide();
      }
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [nextSlide, prevSlide]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  }, [nextSlide, prevSlide]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); prevSlide(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextSlide, prevSlide]);

  const ActiveSlideComponent = SLIDES[currentSlide].component;

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen overflow-hidden dark:bg-[#050810] bg-slate-50 relative select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Slide Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <SlideBackground slideIndex={currentSlide} />
          <ActiveSlideComponent />
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation Dots (right side) ── */}
      <div className="fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2.5">
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className="group flex items-center gap-2.5"
            aria-label={`Go to ${slide.label} slide`}
          >
            {/* Desktop: dot with label */}
            <span className="hidden lg:block text-[9px] dark:text-white/0 text-transparent dark:group-hover:text-white/40 group-hover:text-slate-600 font-medium transition-all duration-300 text-right w-24 -mr-2.5">
              {slide.label}
            </span>
            <div
              className={cn(
                'transition-all duration-400 rounded-full',
                i === currentSlide
                  ? 'size-3 bg-emerald-400 shadow-lg shadow-emerald-400/40'
                  : 'size-2 dark:bg-white/15 bg-slate-300 dark:group-hover:bg-white/30 group-hover:bg-slate-400 group-hover:size-2.5',
              )}
            />
          </button>
        ))}
      </div>

      {/* ── Arrow Controls (bottom right) ── */}
      <div className="fixed bottom-6 lg:bottom-8 right-6 lg:right-8 z-30 flex items-center gap-2">
        <button
          onClick={prevSlide}
          className="size-10 rounded-full dark:bg-white/[0.04] bg-white/80 dark:border-white/[0.08] border-slate-200 flex items-center justify-center dark:text-white/40 text-slate-500 dark:hover:bg-white/[0.08] hover:bg-slate-100 dark:hover:text-white/70 hover:text-slate-700 transition-all hover:scale-110 active:scale-95"
          aria-label="Previous slide"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          onClick={nextSlide}
          className="size-10 rounded-full dark:bg-white/[0.04] bg-white/80 dark:border-white/[0.08] border-slate-200 flex items-center justify-center dark:text-white/40 text-slate-500 dark:hover:bg-white/[0.08] hover:bg-slate-100 dark:hover:text-white/70 hover:text-slate-700 transition-all hover:scale-110 active:scale-95"
          aria-label="Next slide"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* ── Slide Counter (bottom left) ── */}
      <div className="fixed bottom-6 lg:bottom-8 left-6 lg:left-8 z-30 flex items-center gap-2">
        <span className="text-lg font-bold dark:text-white/60 text-slate-500 tabular-nums">{String(currentSlide + 1).padStart(2, '0')}</span>
        <span className="text-xs dark:text-white/15 text-slate-400 font-medium">/ {String(SLIDES.length).padStart(2, '0')}</span>
        <div className="ml-3 w-16 h-1 rounded-full dark:bg-white/[0.06] bg-slate-200 overflow-hidden">
          <motion.div
            className="h-full bg-emerald-400/60 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Scroll Hint (shown briefly) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
      >
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4], y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-[9px] dark:text-white/20 text-slate-400 font-medium tracking-wider uppercase">Scroll or Swipe</span>
          <ChevronDown className="size-3 dark:text-white/20 text-slate-400" />
        </motion.div>
      </motion.div>
    </div>
  );
}
