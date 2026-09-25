'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  Factory,
  GraduationCap,
  Lightbulb,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { industrySolutions } from '@/lib/industry-solutions';

const icons = {
  education: GraduationCap,
  manufacturing: Factory,
  logistics: Truck,
  'retail-commerce': ShoppingBag,
  'professional-services': BriefcaseBusiness,
  startups: Lightbulb,
} as const;

export default function IndustriesPage() {
  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative overflow-hidden border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="absolute -left-24 top-10 size-80 rounded-full bg-amber-400/10 blur-[120px]" />
        <div className="container-main relative py-16 sm:py-20 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Industry solutions</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Technology shaped around how the work actually happens.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
              The same technical capability behaves differently inside a school, factory, logistics operation, retailer, service firm or startup. These solution areas show how Lightworld approaches those operating contexts without pretending every organization needs the same software.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {industrySolutions.map((industry, index) => {
              const Icon = icons[industry.slug as keyof typeof icons] || BriefcaseBusiness;
              return (
                <motion.div
                  key={industry.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link
                    href={'/industries/' + industry.slug}
                    className="group flex h-full flex-col rounded-[30px] border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-slate-950/[0.05] dark:border-white/[0.07] dark:bg-white/[0.025]"
                  >
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/[0.08] text-amber-700 dark:text-amber-300">
                      <Icon className="size-5" />
                    </div>
                    <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/25">{industry.shortLabel}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{industry.headline}</h2>
                    <p className="mt-4 flex-1 text-sm leading-7 text-slate-500 dark:text-white/36">{industry.description}</p>
                    <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                      Explore solution <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="rounded-[36px] border border-emerald-400/15 bg-slate-950 p-7 text-white sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Different industry?</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Start with the operating problem, not the category label.</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                  These are priority solution areas, not a restriction on who we can work with. If your organization has a workflow, product or infrastructure challenge, describe it and we can assess fit.
                </p>
              </div>
              <div className="lg:text-right">
                <Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
                  Discuss your industry <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
