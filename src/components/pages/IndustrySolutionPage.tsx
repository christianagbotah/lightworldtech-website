'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import type { IndustrySolution } from '@/lib/industry-solutions';

export default function IndustrySolutionPage({ industry }: { industry: IndustrySolution }) {
  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative overflow-hidden border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="absolute -right-24 top-10 size-96 rounded-full bg-emerald-400/10 blur-[140px]" />
        <div className="container-main relative py-16 sm:py-20 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-10 lg:grid-cols-[1.12fr_.88fr] lg:items-end">
            <div>
              <Link href="/industries" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                Industry solutions
              </Link>
              <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">{industry.headline}</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">{industry.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300">
                  Discuss a {industry.shortLabel.toLowerCase()} project <ArrowRight className="size-4" />
                </Link>
                <Link href="/global" className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/65">
                  Global delivery <Globe2 className="size-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/[0.07] dark:bg-white/[0.025]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Operating context</p>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-white/42">{industry.context}</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600 dark:text-rose-300">Common friction</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">Problems the system should reduce.</h2>
            <div className="mt-7 space-y-3">
              {industry.challenges.map((challenge) => (
                <div key={challenge} className="flex gap-3 rounded-[22px] border border-slate-200/70 bg-white p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <CircleDot className="mt-1 size-4 shrink-0 text-rose-500" />
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/40">{challenge}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">Solution priorities</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">What we would design around.</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {industry.priorities.map((priority) => (
                <div key={priority} className="flex gap-3 rounded-[22px] border border-slate-200/70 bg-white p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <p className="text-sm font-medium leading-6">{priority}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/70 py-14 dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="container-main">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Relevant capabilities</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">The technical disciplines behind the solution.</h2>
          </div>
          <div className="mt-9 grid gap-3 md:grid-cols-2">
            {industry.capabilities.map((capability) => (
              <Link key={capability.title} href={capability.href} className="group rounded-[26px] border border-slate-200/70 bg-white p-5 transition hover:border-amber-300 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{capability.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/36">{capability.text}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-amber-600 dark:text-white/20" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid overflow-hidden rounded-[36px] border border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.07] lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="size-6" /></div>
              <h2 className="mt-7 text-4xl font-semibold tracking-[-0.045em]">Built for production, not just presentation.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/44 sm:text-base">
                Permissions, auditability, deployment controls, backups, performance and maintainability are part of the architecture discussion from the beginning.
              </p>
              <Link href="/trust" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">Review the Trust Center <ArrowRight className="size-4" /></Link>
            </div>
            <div className="border-t border-white/[0.07] bg-white/[0.035] p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Start with context</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Tell us how your operation works today.</h3>
              <p className="mt-4 text-sm leading-7 text-white/42">The project brief now captures industry, country or region, budget range, preferred currency, delivery window and engagement model so the first discussion starts with useful context.</p>
              <Link href="/contact" className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950">Start project brief <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
