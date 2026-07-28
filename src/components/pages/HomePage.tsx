'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useSEO } from '@/hooks/use-seo';
import {
  Cpu, Cloud, Shield, Database, Monitor, Globe,
  ArrowRight, ArrowUpRight, Quote,
  Users, Clock, Zap, Award,
  Phone, Mail, Sparkles, BookOpen,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */

const SERVICES = [
  { icon: Globe, title: 'Web Dev', desc: 'Modern responsive websites & apps', gradient: 'from-emerald-500 to-teal-600', page: 'services' as const },
  { icon: Cpu, title: 'IT Solutions', desc: 'Enterprise infrastructure', gradient: 'from-cyan-500 to-blue-600', page: 'services' as const },
  { icon: Shield, title: 'Cybersecurity', desc: 'Advanced threat protection', gradient: 'from-amber-500 to-orange-600', page: 'services' as const },
  { icon: Cloud, title: 'Cloud Services', desc: 'Scalable cloud platforms', gradient: 'from-violet-500 to-purple-600', page: 'services' as const },
  { icon: Database, title: 'Data Analytics', desc: 'Business intelligence', gradient: 'from-rose-500 to-pink-600', page: 'services' as const },
  { icon: Monitor, title: 'Software Dev', desc: 'Custom applications', gradient: 'from-lime-500 to-green-600', page: 'services' as const },
];

const STATS = [
  { value: 500, suffix: '+', label: 'Clients', icon: Users },
  { value: 15, suffix: '+', label: 'Years', icon: Clock },
  { value: 99.9, suffix: '%', label: 'Uptime', icon: Zap },
  { value: 24, suffix: '/7', label: 'Support', icon: Award },
];

const TYPING_MESSAGES = [
  'Powering Digital Innovation in Africa',
  'Empowering Businesses with Technology',
  'Your Trusted IT Partner in Ghana',
  'Building the Future, One Solution at a Time',
];

const TESTIMONIALS = [
  { text: 'Lightworld transformed our entire IT infrastructure. Their team is incredibly professional and responsive.', author: 'Emmanuel K.', role: 'CEO, TechVentures Ghana' },
  { text: 'The best IT company we\'ve worked with. They delivered our project on time and exceeded expectations.', author: 'Abigail M.', role: 'CTO, DataFlow Inc.' },
  { text: 'Outstanding cybersecurity solutions. Our systems have never been more secure since partnering with them.', author: 'Kwame A.', role: 'Director, SecureBank Ghana' },
];

const CLIENTS = ['Google', 'MTN Group', 'Vodafone', 'Ghana Government', 'USAID', 'World Bank', 'UNDP', 'Mastercard Foundation'];

/* ══════════════════════════════════════════════════════════════
   CUSTOM HOOKS
   ══════════════════════════════════════════════════════════════ */

function useTypewriter(messages: string[], speed = 50) {
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
          setTimeout(() => setDeleting(true), 2500);
        }
      } else {
        const next = text.slice(0, -1);
        setText(next);
        if (next.length === 0) {
          setDeleting(false);
          setMsgIdx((prev) => (prev + 1) % messages.length);
        }
      }
    }, deleting ? 25 : speed);
    return () => clearTimeout(timeout);
  }, [text, msgIdx, deleting, messages, speed]);

  return text;
}

function useCountUp(end: number, duration = 2000, decimals = 0, delay = 800) {
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
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 15 + Math.random() * 30,
        delay: Math.random() * 15,
        opacity: 0.08 + Math.random() * 0.2,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [0, -40, 0], opacity: [p.opacity, p.opacity * 0.3, p.opacity] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-emerald-500/[0.04] blur-[100px] animate-orb-1" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full bg-amber-500/[0.03] blur-[100px] animate-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-cyan-500/[0.02] blur-[80px] animate-orb-3" />
    </div>
  );
}

function ServiceCard({
  service,
  index,
  onClick,
}: {
  service: (typeof SERVICES)[number];
  index: number;
  onClick: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }, []);

  const handleMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.07 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-2.5 lg:p-3.5 cursor-pointer transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]"
      style={{ transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: 'transform 0.15s ease-out' }}
    >
      <div className={cn('size-8 lg:size-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg', service.gradient)}>
        <service.icon className="size-3.5 lg:size-4.5 text-white" />
      </div>
      <h3 className="text-[11px] lg:text-sm font-semibold text-white/90 mb-0.5 leading-tight">{service.title}</h3>
      <p className="text-[9px] lg:text-[11px] text-white/35 leading-relaxed line-clamp-2">{service.desc}</p>
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
        <ArrowUpRight className="size-3 text-emerald-400" />
      </div>
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-emerald-500/[0.06] to-transparent" />
    </motion.div>
  );
}

function StatItem({ stat, index }: { stat: (typeof STATS)[number]; index: number }) {
  const count = useCountUp(stat.value, 2200, stat.value % 1 !== 0 ? 1 : 0, 900 + index * 150);
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
      className="flex flex-col items-center justify-center text-center"
    >
      <Icon className="size-3 lg:size-3.5 text-emerald-400/50 mb-1" />
      <span className="text-base lg:text-xl font-bold text-white tabular-nums tracking-tight">
        {count}
        <span className="text-emerald-400/80">{stat.suffix}</span>
      </span>
      <span className="text-[9px] lg:text-[10px] text-white/30 mt-0.5 font-medium">{stat.label}</span>
    </motion.div>
  );
}

function TestimonialRotator() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrent((p) => (p + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 flex flex-col justify-center px-3.5 lg:px-5"
        >
          <Quote className="size-3.5 text-emerald-500/30 mb-1.5 shrink-0" />
          <p className="text-[11px] lg:text-xs text-white/50 leading-relaxed line-clamp-2">"{TESTIMONIALS[current].text}"</p>
          <div className="mt-2 flex items-center gap-2 shrink-0">
            <div className="size-5 lg:size-6 rounded-full bg-gradient-to-br from-emerald-400 to-amber-500 flex items-center justify-center text-[9px] lg:text-[10px] font-bold text-white">
              {TESTIMONIALS[current].author[0]}
            </div>
            <div>
              <p className="text-[10px] lg:text-xs font-semibold text-white/60">{TESTIMONIALS[current].author}</p>
              <p className="text-[8px] lg:text-[9px] text-white/25">{TESTIMONIALS[current].role}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-1.5 right-3.5 lg:right-5 flex gap-1">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn('h-1 rounded-full transition-all duration-300', i === current ? 'bg-emerald-400 w-4' : 'bg-white/15 w-1.5')}
          />
        ))}
      </div>
    </div>
  );
}

function ClientTicker() {
  const doubled = useMemo(() => [...CLIENTS, ...CLIENTS], []);

  return (
    <div className="relative flex-1 overflow-hidden flex items-center">
      <motion.div className="flex gap-8 whitespace-nowrap" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((client, i) => (
          <span key={i} className="text-[10px] lg:text-xs text-white/15 font-medium tracking-wider uppercase">
            {client}
          </span>
        ))}
      </motion.div>
      <div className="absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-[#050810] to-transparent pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-6 bg-gradient-to-l from-[#050810] to-transparent pointer-events-none" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT — NEXUS COMMAND CENTER
   ══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const { navigate } = useAppStore();
  const typedText = useTypewriter(TYPING_MESSAGES);

  useSEO({
    title: 'Lightworld Technologies — Powering Digital Innovation',
    description: 'Leading IT solutions provider in Ghana. Web development, cloud services, cybersecurity, data analytics, and enterprise software.',
    keywords: ['IT company Ghana', 'Lightworld Technologies', 'web development Ghana', 'cybersecurity Africa', 'cloud services'],
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050810] relative">
      {/* ── Background Effects ── */}
      <GradientOrbs />
      <ParticleField />

      {/* ── Grid Lines (subtle) ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <div className="absolute top-[25%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="absolute top-[50%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="absolute top-[75%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="absolute left-[25%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white to-transparent" />
        <div className="absolute left-[50%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white to-transparent" />
        <div className="absolute left-[75%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white to-transparent" />
      </div>

      {/* ── Bento Grid ── */}
      <div className="relative z-10 h-full flex flex-col p-2 lg:p-3.5 gap-2 lg:gap-2.5">
        {/* ═══ Top: Hero + Services ═══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-2.5 min-h-0">
          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-12 lg:col-span-7 flex flex-col justify-center min-h-0 lg:min-h-0 px-1 lg:px-3"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2.5 mb-3 lg:mb-5"
            >
              <div className="size-8 lg:size-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 overflow-hidden">
                <Image src="/logo.png" alt="Lightworld Technologies" width={24} height={24} className="object-contain p-0.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm lg:text-base font-bold text-white/90 leading-tight">Lightworld</span>
                <span className="text-[8px] lg:text-[9px] font-semibold text-emerald-400 tracking-[0.25em] uppercase leading-tight">
                  Technologies
                </span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-1.5 lg:mb-2.5"
            >
              We Build
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Digital Futures
              </span>
            </motion.h1>

            {/* Typewriter Tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-3 lg:mb-5"
            >
              <p className="text-xs lg:text-base text-white/35 font-light h-4 lg:h-6 flex items-center">
                <Sparkles className="size-3 lg:size-4 text-emerald-400/50 mr-1.5 shrink-0" />
                {typedText}
                <span className="inline-block w-[2px] h-3.5 lg:h-5 bg-emerald-400 ml-0.5 animate-blink" />
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2.5 flex-wrap"
            >
              <button
                onClick={() => navigate('services')}
                className="group flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-emerald-500 text-white text-[11px] lg:text-sm font-semibold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
              >
                Explore Services
                <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate('contact')}
                className="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-white/[0.04] text-white/60 text-[11px] lg:text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.08]"
              >
                <Phone className="size-3.5" />
                <span className="hidden sm:inline">Get in Touch</span>
              </button>
            </motion.div>

            {/* Mobile Stats (inside hero, visible < lg) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-3 lg:hidden grid grid-cols-4 gap-2"
            >
              {STATS.map((stat, i) => (
                <StatItem key={i} stat={stat} index={i} />
              ))}
            </motion.div>
          </motion.div>

          {/* ── Services Bento Grid ── */}
          <div className="col-span-12 lg:col-span-5 grid grid-cols-3 gap-2 lg:gap-2.5 min-h-0">
            {SERVICES.map((service, i) => (
              <ServiceCard key={i} service={service} index={i} onClick={() => navigate(service.page)} />
            ))}
          </div>
        </div>

        {/* ═══ Middle: Testimonial + Quick Links ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-2.5 flex-shrink-0">
          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="col-span-12 lg:col-span-7 h-16 lg:h-20 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm overflow-hidden"
          >
            <TestimonialRotator />
          </motion.div>

          {/* Quick Action Cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="hidden lg:grid col-span-5 grid-cols-2 gap-2.5"
          >
            {/* Newsletter / CTA */}
            <button
              onClick={() => navigate('contact')}
              className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-emerald-600/15 to-teal-600/15 border border-emerald-500/10 px-4 hover:border-emerald-500/20 transition-all"
            >
              <Mail className="size-3.5 text-emerald-400/70 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-[10px] font-semibold text-white/60 truncate">Ready to start?</p>
                <p className="text-[9px] text-white/25">Get a free consultation</p>
              </div>
            </button>

            {/* Blog */}
            <button
              onClick={() => navigate('blog')}
              className="group flex items-center gap-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] px-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
            >
              <BookOpen className="size-3.5 text-white/30 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-[10px] font-semibold text-white/60 truncate">Latest Insights</p>
                <p className="text-[9px] text-white/25">Tech articles & updates</p>
              </div>
            </button>
          </motion.div>
        </div>

        {/* ═══ Bottom: Stats + Ticker ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-2.5 flex-shrink-0">
          {/* Desktop Stats */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.5 }}
            className="hidden lg:flex col-span-5 h-14 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm items-center justify-around px-2"
          >
            {STATS.map((stat, i) => (
              <StatItem key={i} stat={stat} index={i} />
            ))}
          </motion.div>

          {/* Client Ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="col-span-12 lg:col-span-12 h-9 lg:h-10 flex items-center rounded-xl bg-white/[0.015] border border-white/[0.04] px-4 gap-4"
          >
            <span className="text-[9px] lg:text-[10px] text-emerald-400/30 font-semibold uppercase tracking-[0.2em] shrink-0 hidden sm:block">
              Trusted by
            </span>
            <ClientTicker />
          </motion.div>
        </div>
      </div>

      {/* ── Corner Badge ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-3 right-3 lg:bottom-5 lg:right-5 z-20"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="text-[9px] text-white/30 font-medium">Available for projects</span>
        </div>
      </motion.div>
    </div>
  );
}
