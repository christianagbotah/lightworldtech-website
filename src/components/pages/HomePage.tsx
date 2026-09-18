'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Cloud,
  Code2,
  Factory,
  Globe2,
  GraduationCap,
  MessageSquare,
  Network,
  Rocket,
  School,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Workflow,
} from 'lucide-react';

const capabilities = [
  {
    icon: Code2,
    title: 'Web & product engineering',
    description: 'High-performance websites, customer portals, SaaS products and internal platforms designed around real business workflows.',
    tags: ['Next.js', 'APIs', 'Commerce', 'Portals'],
    feature: true,
  },
  {
    icon: Smartphone,
    title: 'Mobile experiences',
    description: 'Native-feeling iOS and Android experiences with thoughtful offline, notification and field-work patterns.',
    tags: ['iOS', 'Android', 'React Native'],
  },
  {
    icon: Boxes,
    title: 'Enterprise systems',
    description: 'ERP, EAM, school, inventory, HR, logistics and operational systems that connect people, processes and data.',
    tags: ['ERP', 'EAM', 'Workflow'],
    feature: true,
  },
  {
    icon: BrainCircuit,
    title: 'AI & automation',
    description: 'Practical AI assistants, document workflows, knowledge tools and task automation embedded into useful products.',
    tags: ['AI UX', 'Automation', 'Knowledge'],
  },
  {
    icon: Cloud,
    title: 'Cloud & DevOps',
    description: 'Production architecture, deployment pipelines, observability, backups, migrations and resilient infrastructure.',
    tags: ['Cloud', 'CI/CD', 'Reliability'],
  },
  {
    icon: ShieldCheck,
    title: 'Security engineering',
    description: 'Secure-by-design architecture, application hardening, access controls, audits and operational security reviews.',
    tags: ['AppSec', 'RBAC', 'Audit'],
  },
  {
    icon: Search,
    title: 'SEO & digital growth',
    description: 'Search-ready web architecture, technical SEO, conversion journeys, analytics and content foundations.',
    tags: ['SEO', 'Analytics', 'Growth'],
  },
  {
    icon: GraduationCap,
    title: 'Training & advisory',
    description: 'Practical IT training, corporate enablement, architecture consulting and digital transformation support.',
    tags: ['Training', 'Consulting', 'Strategy'],
  },
];

const consoleModes = [
  {
    label: 'Product',
    icon: Code2,
    title: 'Product engineering',
    status: 'Design system synced',
    metrics: [
      ['Experience', 'Responsive'],
      ['Delivery', 'Continuous'],
      ['Architecture', 'Modular'],
    ],
  },
  {
    label: 'AI',
    icon: BrainCircuit,
    title: 'Intelligent workflows',
    status: 'Human-in-the-loop',
    metrics: [
      ['Automation', 'Contextual'],
      ['Controls', 'Auditable'],
      ['Interfaces', 'Assistive'],
    ],
  },
  {
    label: 'Cloud',
    icon: Server,
    title: 'Production operations',
    status: 'Release ready',
    metrics: [
      ['Deploy', 'Repeatable'],
      ['Recovery', 'Designed'],
      ['Telemetry', 'Visible'],
    ],
  },
];

const work = [
  {
    title: 'Enterprise operations',
    category: 'Business systems',
    description: 'Complex workflows translated into clear, role-aware operating experiences.',
    image: '/images/portfolio/erp-system.png',
  },
  {
    title: 'Digital commerce',
    category: 'Web platforms',
    description: 'Fast storefronts and transaction journeys built for conversion and maintainability.',
    image: '/images/portfolio/ecommerce.png',
  },
  {
    title: 'Learning platforms',
    category: 'Education technology',
    description: 'Connected learning, assessment and administration experiences for modern institutions.',
    image: '/images/portfolio/lms.png',
  },
];

const industries = [
  { icon: School, label: 'Education' },
  { icon: Factory, label: 'Manufacturing' },
  { icon: Truck, label: 'Logistics' },
  { icon: Store, label: 'Retail' },
  { icon: Building2, label: 'Professional services' },
  { icon: Rocket, label: 'Startups' },
];

const process = [
  ['01', 'Discover', 'Clarify the business problem, users, constraints and the outcomes that matter.'],
  ['02', 'Design', 'Shape the information architecture, interaction model, visual system and technical plan.'],
  ['03', 'Build', 'Ship in tested vertical slices with security, performance and maintainability built in.'],
  ['04', 'Launch', 'Prepare data, infrastructure, monitoring, documentation and a controlled release.'],
  ['05', 'Evolve', 'Measure usage, support teams and improve the product as the business changes.'],
];

const signals = [
  'Mobile-first by default',
  'SEO-ready architecture',
  'Production-minded engineering',
  'Built in Ghana. Ready for anywhere.',
];

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CapabilityConsole() {
  const [activeMode, setActiveMode] = useState(0);
  const mode = consoleModes[activeMode];

  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-10 rounded-[48px] bg-emerald-400/10 blur-3xl" />
      <div className="lw-console relative overflow-hidden rounded-[30px] border border-white/10 bg-[#081119]/90 p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-4">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-2 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.8)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Lightworld / Build system</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/30">
            <Activity className="size-3" />
            live
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {consoleModes.map((item, index) => (
            <button
              key={item.label}
              onClick={() => setActiveMode(index)}
              className={
                index === activeMode
                  ? 'flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs font-semibold text-emerald-300'
                  : 'flex items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5 text-xs font-medium text-white/35 transition hover:bg-white/[0.05] hover:text-white/60'
              }
              aria-pressed={index === activeMode}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        <motion.div
          key={mode.label}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28 }}
          className="mt-3 rounded-[22px] border border-white/[0.06] bg-[#0b1721] p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/65">Active workspace</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{mode.title}</h3>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-300/80">
              <CheckCircle2 className="size-3" />
              {mode.status}
            </span>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {mode.metrics.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/[0.055] bg-white/[0.025] p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">{label}</p>
                <p className="mt-2 text-sm font-medium text-white/75">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/[0.055] bg-black/15 p-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/25">
              <span>Delivery pipeline</span>
              <span>Production</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              {['Discover', 'UX', 'Build', 'QA', 'Release'].map((item, index) => (
                <div key={item} className="min-w-0 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.65, delay: 0.12 * index }}
                      className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-400 to-amber-300"
                    />
                  </div>
                  <p className="mt-2 truncate text-[9px] text-white/25">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mt-3 flex items-center justify-between px-2 pb-1 text-[10px] text-white/20">
          <span className="flex items-center gap-1.5"><Network className="size-3" /> systems connected</span>
          <span>Accra · Ghana</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative min-h-[92svh] border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-24 size-72 rounded-full bg-emerald-300/20 blur-[120px] dark:bg-emerald-500/10" />
          <div className="absolute right-[8%] top-32 size-72 rounded-full bg-amber-300/20 blur-[120px] dark:bg-amber-400/[0.07]" />
        </div>

        <div className="container-main relative flex min-h-[92svh] items-center py-28 sm:py-32 lg:py-36">
          <div className="grid w-full items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-600/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-300/15 dark:text-emerald-300"
              >
                <Sparkles className="size-3.5" />
                Ghana-built · global-ready digital engineering
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.72, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 max-w-[900px] text-[clamp(3.2rem,8vw,7.4rem)] font-semibold leading-[0.9] tracking-[-0.065em]"
              >
                Technology people
                <span className="block bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 bg-clip-text text-transparent">want to use.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.14 }}
                className="mt-7 max-w-2xl text-base leading-7 text-slate-600 dark:text-white/50 sm:text-lg sm:leading-8"
              >
                Lightworld Technologies designs and builds apps, websites, enterprise platforms, AI-enabled workflows and digital infrastructure—then helps teams adopt, operate and grow them.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.22 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  href="/contact"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                >
                  Start a project
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/portfolio"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-300/80 bg-white/50 px-6 text-sm font-semibold text-slate-800 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 dark:hover:bg-white/[0.06]"
                >
                  Explore our work
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.34 }}
                className="mt-10 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4"
              >
                {signals.map((signal) => (
                  <div key={signal} className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-white/35">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{signal}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="lg:pl-3"
            >
              <CapabilityConsole />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/70 bg-white/70 py-6 dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="container-main">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/25">One partner across the digital lifecycle</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-white/35 sm:text-sm">
              <span>Strategy</span>
              <span>Experience design</span>
              <span>Engineering</span>
              <span>Cloud</span>
              <span>Growth</span>
              <span>Training</span>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="section-padding relative">
        <div className="container-main">
          <Reveal className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">What we build</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">More than a website agency.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-white/45 lg:justify-self-end lg:text-lg">
              We connect brand, product, software and operations. Start with a focused website or app, then grow into a connected digital ecosystem without changing partners every time the problem gets harder.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((item, index) => (
              <Reveal
                key={item.title}
                delay={index * 0.035}
                className={item.feature ? 'lg:col-span-2' : ''}
              >
                <Link
                  href="/services"
                  className="group flex h-full min-h-[245px] flex-col rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-950/[0.02] transition duration-300 hover:-translate-y-1 hover:border-emerald-300/60 hover:shadow-xl hover:shadow-emerald-950/[0.05] dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-emerald-300/20 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                      <item.icon className="size-5" />
                    </div>
                    <ArrowUpRight className="size-4 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-white/15" />
                  </div>
                  <div className="mt-auto pt-8">
                    <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-white/38">{item.description}</p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[10px] font-medium text-slate-400 dark:border-white/[0.07] dark:text-white/25">{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding border-y border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.06] dark:bg-[#081119]">
        <div className="container-main">
          <Reveal className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Workflow className="size-3.5" />
                Systems thinking
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">From a digital front door to the system behind the business.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/45">
                A modern company needs more than attractive screens. We design the customer experience, operational workflows, data connections and infrastructure as one system.
              </p>
              <Link href="/services" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200">
                See how we work <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-3">
              {[
                [Globe2, 'Experience layer', 'Brand sites, portals, mobile apps and interfaces that make complex services feel simple.'],
                [Workflow, 'Operations layer', 'Approvals, work orders, inventory, people, finance and industry workflows connected to the way teams actually work.'],
                [Network, 'Integration layer', 'APIs, payments, external services, notifications and data pipelines that keep systems in sync.'],
                [ShieldCheck, 'Trust layer', 'Authentication, permissions, auditability, backups, deployment controls and secure operating practices.'],
                [BarChart3, 'Insight layer', 'Dashboards, reporting, analytics and AI-assisted workflows that turn activity into decisions.'],
              ].map(([Icon, title, text], index) => {
                const LayerIcon = Icon as typeof Globe2;
                return (
                  <motion.div
                    key={String(title)}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06, duration: 0.5 }}
                    className="group grid gap-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-5 sm:grid-cols-[auto_1fr] sm:items-start"
                  >
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white/[0.05] text-emerald-300">
                      <LayerIcon className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold text-white/90">{String(title)}</h3>
                        <span className="text-[10px] font-mono text-white/20">0{index + 1}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/40">{String(text)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">Selected capabilities</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Built to solve, not to decorate.</h2>
            </div>
            <Link href="/portfolio" className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-white/50">
              View portfolio <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {work.map((project, index) => (
              <Reveal key={project.title} delay={index * 0.06}>
                <Link href="/portfolio" className="group block overflow-hidden rounded-[30px] border border-slate-200/70 bg-white dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-white/[0.03]">
                    <Image
                      src={project.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.035]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-slate-950/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-lg">{project.category}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div>
                      <h3 className="text-lg font-semibold">{project.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-white/35">{project.description}</p>
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-white/15" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/70 py-10 dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="container-main">
          <Reveal className="grid gap-6 lg:grid-cols-[.6fr_1.4fr] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/25">Designed around real sectors</p>
              <p className="mt-2 text-lg font-semibold">Digital systems for teams doing real work.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {industries.map((industry) => (
                <div key={industry.label} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-3 text-xs font-medium text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-white/40">
                  <industry.icon className="size-4 text-emerald-500" />
                  {industry.label}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <Reveal className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">How we deliver</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Clear enough for the board. Detailed enough for engineering.</h2>
          </Reveal>

          <div className="mt-10 grid gap-3 lg:grid-cols-5">
            {process.map(([number, title, description], index) => (
              <Reveal key={number} delay={index * 0.045}>
                <div className="h-full rounded-[26px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{number}</span>
                    {index < process.length - 1 && <ArrowRight className="hidden size-3.5 text-slate-300 lg:block dark:text-white/15" />}
                  </div>
                  <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/35">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding pt-4">
        <div className="container-main">
          <div className="grid overflow-hidden rounded-[36px] border border-slate-200/70 bg-slate-950 text-white shadow-2xl shadow-slate-950/10 dark:border-white/[0.07] lg:grid-cols-2">
            <Reveal className="relative p-7 sm:p-10 lg:p-12">
              <div className="absolute -left-20 -top-20 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <GraduationCap className="size-6" />
                </div>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Lightworld Academy</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Build capability inside your team.</h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-white/45 sm:text-base">
                  Practical technology training for individuals, teams and organizations—from modern software development to digital operations and cloud skills.
                </p>
                <Link href="/services" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  Explore training <ArrowRight className="size-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal className="border-t border-white/[0.07] bg-white/[0.035] p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <MessageSquare className="size-6" />
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Advisory</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Need the plan before the build?</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/45 sm:text-base">
                We can help define architecture, delivery roadmaps, digital transformation priorities and product strategy before a line of code is committed.
              </p>
              <Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white">
                Book a consultation <ArrowRight className="size-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <Reveal className="relative overflow-hidden rounded-[38px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500 to-emerald-700 p-7 text-white shadow-2xl shadow-emerald-900/10 sm:p-10 lg:p-14">
            <div className="lw-dot-grid absolute inset-0 opacity-25" />
            <div className="absolute -right-20 -top-24 size-80 rounded-full bg-amber-300/20 blur-[80px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/80">The next build starts here</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">Bring the business problem. We’ll help shape the technology.</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-50/75 sm:text-base">
                  Tell us what you are trying to launch, improve or automate. We will help turn it into a clear, buildable next step.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link href="/contact" className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 sm:w-auto">
                  Start a conversation <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="mailto:mail@lightworldtech.com" className="text-sm text-emerald-50/70 transition hover:text-white">mail@lightworldtech.com</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
