'use client';

import { useEffect, useRef, useState, type ElementType } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  Cloud,
  Code2,
  GraduationCap,
  Layers3,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { contentText, type SiteSettings } from '@/lib/site-content';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';

interface ServiceView {
  id: string;
  icon: ElementType;
  eyebrow: string;
  title: string;
  summary: string;
  deliverables: string[];
  outcomes: string[];
  image?: string;
}

const defaultServices: ServiceView[] = [
  {
    id: 'web',
    icon: Code2,
    eyebrow: 'Digital products',
    title: 'Web & product engineering',
    summary: 'Fast, accessible digital experiences that can grow from a focused website into a serious product platform.',
    deliverables: ['Corporate & brand websites', 'Customer and partner portals', 'SaaS and web applications', 'E-commerce experiences', 'API integrations', 'Design systems'],
    outcomes: ['Faster journeys', 'Search-ready architecture', 'Maintainable product foundations'],
  },
  {
    id: 'mobile',
    icon: Smartphone,
    eyebrow: 'Mobile',
    title: 'Mobile app development',
    summary: 'Native-feeling mobile experiences designed around the way customers, field teams and operators actually use a phone.',
    deliverables: ['iOS & Android apps', 'Cross-platform applications', 'Offline-first workflows', 'Push notifications', 'Mobile authentication', 'App release support'],
    outcomes: ['Better field adoption', 'Reliable low-connectivity UX', 'One coherent product experience'],
  },
  {
    id: 'enterprise',
    icon: Workflow,
    eyebrow: 'Operations',
    title: 'Enterprise software & automation',
    summary: 'Role-aware systems that connect approvals, assets, inventory, people, reporting and day-to-day operations.',
    deliverables: ['ERP & operational platforms', 'Asset and maintenance systems', 'Inventory & logistics workflows', 'School & institutional systems', 'Internal portals', 'Workflow automation'],
    outcomes: ['Less manual work', 'Stronger accountability', 'Operational visibility'],
  },
  {
    id: 'ai',
    icon: BrainCircuit,
    eyebrow: 'Intelligence',
    title: 'AI-enabled workflows',
    summary: 'Practical AI experiences that assist teams with information, decisions and repetitive work without hiding the controls that matter.',
    deliverables: ['AI assistants', 'Knowledge experiences', 'Document workflows', 'Search & summarization', 'Human-in-the-loop automation', 'AI feature integration'],
    outcomes: ['Faster knowledge work', 'Consistent execution', 'Auditable assistance'],
  },
  {
    id: 'cloud',
    icon: Cloud,
    eyebrow: 'Infrastructure',
    title: 'Cloud, DevOps & reliability',
    summary: 'Production foundations for teams that need repeatable releases, observability, recovery and room to scale.',
    deliverables: ['Cloud architecture', 'CI/CD pipelines', 'VPS & server migrations', 'Containerized deployments', 'Monitoring & backups', 'Performance tuning'],
    outcomes: ['Safer releases', 'Better uptime posture', 'Lower operational friction'],
  },
  {
    id: 'security',
    icon: ShieldCheck,
    eyebrow: 'Trust',
    title: 'Security engineering',
    summary: 'Security woven into product architecture, access models and delivery processes rather than added as a final checklist.',
    deliverables: ['Application hardening', 'Authentication & authorization', 'RBAC design', 'Audit trails', 'Security reviews', 'Release safeguards'],
    outcomes: ['Reduced risk', 'Traceable actions', 'Stronger production controls'],
  },
  {
    id: 'growth',
    icon: Search,
    eyebrow: 'Growth',
    title: 'SEO & digital performance',
    summary: 'Technical foundations and user journeys that help people discover, understand and act on what your business offers.',
    deliverables: ['Technical SEO', 'Information architecture', 'Performance optimization', 'Analytics setup', 'Conversion journeys', 'Content foundations'],
    outcomes: ['Better discoverability', 'Faster experiences', 'Clearer conversion paths'],
  },
  {
    id: 'training',
    icon: GraduationCap,
    eyebrow: 'Capability',
    title: 'IT training & consultancy',
    summary: 'Practical training and advisory support that helps organizations make better technology decisions and build capability in-house.',
    deliverables: ['Software development training', 'Corporate IT training', 'Architecture advisory', 'Digital transformation planning', 'Technology assessments', 'Team enablement'],
    outcomes: ['Stronger internal skills', 'Clearer roadmaps', 'Better technology decisions'],
  },
];

const engagement = [
  ['01', 'Define', 'We clarify the business outcome, users, constraints and what success should look like.'],
  ['02', 'Shape', 'We turn that into a product scope, experience model, architecture and delivery plan.'],
  ['03', 'Deliver', 'We build in reviewable slices with quality, security and deployment considered from the start.'],
  ['04', 'Operate', 'We support launch, handover, training and the next iteration as real usage creates new insight.'],
];

const situations = [
  'You need to replace spreadsheets and fragmented manual processes.',
  'Your current website looks dated or is difficult to discover on search.',
  'You have a product idea but need both product thinking and engineering.',
  'Your existing application needs modernization, integration or better reliability.',
  'Your team needs a trusted technical partner without building every skill in-house.',
  'You want to introduce AI without turning the product into a gimmick.',
];

export default function ServicesPage({ settings = {} }: { settings?: SiteSettings }) {
  const [serviceItems, setServiceItems] = useState<ServiceView[]>(defaultServices);
  const [active, setActive] = useState(defaultServices[0].id);
  const detailsRef = useRef<HTMLDivElement>(null);
  const selected = serviceItems.find((item) => item.id === active) ?? serviceItems[0] ?? defaultServices[0];

  const selectService = (serviceId: string) => {
    setActive(serviceId);
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    fetch('/api/services?active=true')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load managed services');
        return response.json();
      })
      .then((payload) => {
        const managed = Array.isArray(payload?.data) ? payload.data : [];
        if (managed.length === 0) return;

        const idBySlug: Record<string, string> = {
          'web-development': 'web',
          'mobile-app-development': 'mobile',
          'software-development': 'enterprise',
          'seo-marketing': 'growth',
          'skills-training': 'training',
          'web-hosting': 'cloud',
        };

        const next = [...defaultServices];

        for (const item of managed) {
          const slug = String(item.slug || '');
          const targetId = idBySlug[slug];
          let features: string[] = [];

          if (typeof item.features === 'string' && item.features.trim()) {
            try {
              const parsed = JSON.parse(item.features);
              if (Array.isArray(parsed)) features = parsed.map(String);
            } catch {
              features = item.features.split(',').map((value: string) => value.trim()).filter(Boolean);
            }
          }

          if (targetId) {
            const index = next.findIndex((service) => service.id === targetId);
            if (index >= 0) {
              next[index] = {
                ...next[index],
                title: String(item.title || next[index].title),
                summary: String(item.description || next[index].summary),
                deliverables: features.length > 0 ? features : next[index].deliverables,
                image: String(item.image || next[index].image || ''),
              };
              continue;
            }
          }

          next.push({
            id: 'cms-' + String(item.id || slug || next.length),
            icon: Sparkles,
            eyebrow: 'Managed service',
            title: String(item.title || 'Technology service'),
            summary: String(item.description || ''),
            deliverables: features.length > 0 ? features : ['Custom scope based on your requirements'],
            outcomes: ['Clear scope', 'Practical delivery', 'Long-term maintainability'],
            image: String(item.image || ''),
          });
        }

        setServiceItems(next);
      })
      .catch(() => {
        // Flagship defaults remain available when the CMS is offline.
      });
  }, []);

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative border-b border-slate-200/70 px-4 py-16 dark:border-white/[0.06] sm:px-6 sm:py-20 lg:px-8 lg:py-24 overflow-hidden">
        <CmsHeroMedia settings={settings} settingKey="services_hero_image" />
        <div className="relative container-main z-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Layers3 className="size-3.5" />
                {contentText(settings, 'services_hero_eyebrow', 'End-to-end technology services')}
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {contentText(settings, 'services_hero_title', 'One partner from idea to production.')}
              </h1>
            </div>
            <div className="lg:pb-1">
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
                {contentText(settings, 'services_hero_description', 'Lightworld brings product design, software engineering, cloud, security, growth and training together so you can solve the whole problem—not just commission a collection of screens.')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950">
                  Discuss your project <ArrowRight className="size-4" />
                </Link>
                <Link href="/portfolio" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-white/10 dark:text-white/60">
                  See our work <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceItems.map((service, index) => (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.035 }}
                onClick={() => selectService(service.id)}
                className={
                  active === service.id
                    ? 'group rounded-[26px] border border-emerald-400/35 bg-emerald-500/[0.08] p-5 text-left shadow-lg shadow-emerald-950/[0.04] dark:bg-emerald-300/[0.055]'
                    : 'group rounded-[26px] border border-slate-200/75 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/50 dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:bg-white/[0.04]'
                }
                aria-pressed={active === service.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                    <service.icon className="size-5" />
                  </span>
                  <span className="font-mono text-[9px] text-slate-300 dark:text-white/15">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-600/70 dark:text-emerald-300/55">{service.eyebrow}</p>
                <h2 className="mt-1.5 text-base font-semibold tracking-tight">{service.title}</h2>
              </motion.button>
            ))}
          </div>

          <motion.div
            ref={detailsRef}
            id="service-details"
            key={selected.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="mt-4 scroll-mt-28 grid overflow-hidden rounded-[32px] border border-slate-200/75 bg-white dark:border-white/[0.07] dark:bg-white/[0.025] lg:grid-cols-[.9fr_1.1fr]"
          >
            <div className="border-b border-slate-200/70 p-6 sm:p-8 lg:border-b-0 lg:border-r dark:border-white/[0.06]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                <selected.icon className="size-6" />
              </span>
              <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{selected.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{selected.title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/38 sm:text-base">{selected.summary}</p>

              <div className="mt-7">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/20">Designed for outcomes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.outcomes.map((outcome) => (
                    <span key={outcome} className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white/45">
                      {outcome}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {selected.image && (
                <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <img
                    src={selected.image}
                    alt=""
                    className="aspect-[16/8] w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/20">Typical scope</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {selected.deliverables.map((deliverable) => (
                  <div key={deliverable} className="flex items-start gap-3 rounded-2xl border border-slate-200/65 bg-slate-50/70 p-4 dark:border-white/[0.055] dark:bg-white/[0.02]">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <Check className="size-3" />
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white/55">{deliverable}</span>
                  </div>
                ))}
              </div>
              <Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Talk to us about this capability <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding border-y border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.06] dark:bg-[#081119]">
        <div className="container-main">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Sparkles className="size-3.5" />
                Where we fit
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Bring us the messy problem.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/42 sm:text-base">
                You do not need to arrive with a finished technical specification. We can help turn a business problem into the right product, platform or roadmap.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {situations.map((situation, index) => (
                <motion.div
                  key={situation}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  className="flex gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-white/50">{situation}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">Engagement model</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Enough process to reduce risk. Not enough to slow the work.</h2>
          </div>

          <div className="mt-10 grid gap-3 lg:grid-cols-4">
            {engagement.map(([number, title, description]) => (
              <div key={number} className="rounded-[26px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{number}</span>
                <h3 className="mt-7 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/35">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-5 rounded-[32px] border border-emerald-500/15 bg-emerald-500/[0.07] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">{contentText(settings, 'services_cta_title', 'Not sure which service category fits?')}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/38">{contentText(settings, 'services_cta_description', 'Describe the business problem and we can help shape the right technical approach.')}</p>
            </div>
            <Link href="/contact" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-400 dark:text-slate-950">
              Start with the problem <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
