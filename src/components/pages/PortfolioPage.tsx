'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Briefcase, Layers3, Sparkles } from 'lucide-react';
import { contentText, type SiteSettings } from '@/lib/site-content';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured: boolean;
  clientUrl?: string;
  fullDescription?: string;
  image?: string;
}

const capabilityExamples: PortfolioItem[] = [
  {
    id: 'example-commerce',
    title: 'Commerce & customer platforms',
    description: 'Product discovery, transactions, account journeys, fulfilment and analytics in one responsive experience.',
    category: 'Web & Commerce',
    tags: ['Customer UX', 'Payments', 'Operations'],
    featured: true,
    image: '/images/portfolio/ecommerce.png',
  },
  {
    id: 'example-enterprise',
    title: 'Enterprise operations',
    description: 'Connected workflows for assets, work orders, inventory, people, approvals and management reporting.',
    category: 'Enterprise Software',
    tags: ['Workflow', 'RBAC', 'Reporting'],
    featured: true,
    image: '/images/portfolio/erp-system.png',
  },
  {
    id: 'example-learning',
    title: 'Education & learning systems',
    description: 'Administration, learning, assessment and communication experiences built for institutions and their communities.',
    category: 'Education Technology',
    tags: ['Learning', 'Administration', 'Mobile'],
    featured: false,
    image: '/images/portfolio/lms.png',
  },
  {
    id: 'example-mobile',
    title: 'Mobile service experiences',
    description: 'Native-feeling mobile products for customers and field teams, with thoughtful offline and notification patterns.',
    category: 'Mobile',
    tags: ['iOS', 'Android', 'Offline UX'],
    featured: false,
    image: '/images/portfolio/healthcare.png',
  },
  {
    id: 'example-security',
    title: 'Operational visibility',
    description: 'Dashboards and control surfaces that make activity, risk, exceptions and performance easier to understand.',
    category: 'Data & Operations',
    tags: ['Dashboards', 'Alerts', 'Audit'],
    featured: false,
    image: '/images/portfolio/security.png',
  },
  {
    id: 'example-marketplace',
    title: 'Marketplace & directory products',
    description: 'Search, discovery, listing and management experiences designed around trust and conversion.',
    category: 'Digital Products',
    tags: ['Search', 'Listings', 'Growth'],
    featured: false,
    image: '/images/portfolio/realestate.png',
  },
];

export default function PortfolioPage({ settings = {} }: { settings?: SiteSettings }) {
  const [items, setItems] = useState<PortfolioItem[]>(capabilityExamples);
  const [usingCms, setUsingCms] = useState(false);
  const [active, setActive] = useState('All');

  useEffect(() => {
    fetch('/api/portfolio?active=true')
      .then((response) => {
        if (!response.ok) throw new Error('Portfolio unavailable');
        return response.json();
      })
      .then((payload) => {
        const data = Array.isArray(payload?.data) ? payload.data : [];
        if (data.length === 0) return;

        const mapped = data.map((item: Record<string, unknown>, index: number): PortfolioItem => {
          let tags: string[] = [];
          if (Array.isArray(item.technologies)) {
            tags = item.technologies.map(String);
          } else if (typeof item.technologies === 'string' && item.technologies.trim()) {
            try {
              const parsed = JSON.parse(item.technologies);
              if (Array.isArray(parsed)) tags = parsed.map(String);
            } catch {
              tags = item.technologies.split(',').map((value) => value.trim()).filter(Boolean);
            }
          }

          return {
            id: String(item.id ?? index),
            title: String(item.title ?? 'Project'),
            description: String(item.description ?? ''),
            category: String(item.category || 'Digital Product'),
            tags,
            featured: item.featured === true,
            clientUrl: item.url ? String(item.url) : undefined,
            image: item.image ? String(item.image) : undefined,
          };
        });

        setItems(mapped);
        setUsingCms(true);
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const filtered = active === 'All' ? items : items.filter((item) => item.category === active);

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="container-main py-16 sm:py-20 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Briefcase className="size-3.5" />
                {contentText(settings, 'portfolio_hero_eyebrow', 'Work & solution patterns')}
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">{contentText(settings, 'portfolio_hero_title', 'Technology should look good. More importantly, it should work.')}</h1>
            </div>
            <div>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
                {contentText(
                  settings,
                  'portfolio_hero_description',
                  usingCms
                    ? 'A selection of work published by the Lightworld team across web, mobile and business systems.'
                    : 'These representative solution patterns show the kinds of products and operational experiences our team is equipped to design and engineer.',
                )}
              </p>
              {!usingCms && (
                <p className="mt-3 text-xs leading-5 text-slate-400 dark:text-white/25">
                  Client-specific case studies can be added through the existing portfolio CMS when approved for publication.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActive(category)}
                  className={
                    active === category
                      ? 'shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-slate-950'
                      : 'shrink-0 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white/35'
                  }
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/20">
              <Layers3 className="size-3.5" />
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {filtered.map((project, index) => (
              <motion.article
                key={project.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.04, 0.2) }}
                className="group overflow-hidden rounded-[30px] border border-slate-200/70 bg-white dark:border-white/[0.07] dark:bg-white/[0.025]"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-white/[0.03]">
                  {project.image ? (
                    <Image src={project.image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" unoptimized />
                  ) : (
                    <div className="lw-dot-grid absolute inset-0 bg-slate-950 opacity-80" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-slate-950/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-lg">{project.category}</span>
                  {project.featured && (
                    <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold text-emerald-100 backdrop-blur-lg">
                      <Sparkles className="size-3" /> Featured
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{project.title}</h2>
                      <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/36">{project.description}</p>
                    </div>
                    {project.clientUrl && project.clientUrl !== '#' ? (
                      <a href={project.clientUrl} target="_blank" rel="noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-white/[0.07] dark:text-white/25">
                        <ArrowUpRight className="size-4" />
                        <span className="sr-only">Open project</span>
                      </a>
                    ) : (
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-slate-300 dark:text-white/15" />
                    )}
                  </div>
                  {project.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[10px] font-medium text-slate-400 dark:border-white/[0.07] dark:text-white/25">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-5 rounded-[32px] border border-emerald-500/15 bg-emerald-500/[0.07] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{contentText(settings, 'portfolio_cta_title', 'Have a harder problem than these?')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/38">{contentText(settings, 'portfolio_cta_description', 'Good. The most useful work usually starts where a template stops being enough.')}</p>
            </div>
            <Link href="/contact" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white dark:text-slate-950">
              Discuss your project <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
