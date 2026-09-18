'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react';
import { companyProfile } from '@/lib/company-profile';

const leadershipPrinciples = [
  {
    icon: Building2,
    title: 'Company direction',
    text: 'Leadership keeps product, engineering, client delivery and long-term company growth connected to the same strategy.',
  },
  {
    icon: Workflow,
    title: 'Execution discipline',
    text: 'Complex work is translated into clear priorities, accountable owners and delivery practices that can scale.',
  },
  {
    icon: ShieldCheck,
    title: 'Production standards',
    text: 'Security, reliability, maintainability and responsible technology decisions remain part of leadership oversight.',
  },
];

export default function TeamPage() {
  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="container-main py-16 sm:py-20 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Users className="size-3.5" />
                Leadership
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                People accountable for where Lightworld is going.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
              Lightworld combines company leadership with a hands-on understanding of technology, operations and delivery. These are the confirmed executive leaders of Lightworld Technologies Ltd.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-4 lg:grid-cols-2">
            {companyProfile.leadership.map((person, index) => (
              <motion.article
                key={person.name}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="relative overflow-hidden rounded-[34px] border border-slate-200/70 bg-white p-7 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-9"
              >
                <div className="absolute -right-20 -top-20 size-60 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex size-20 items-center justify-center rounded-[26px] border border-emerald-500/15 bg-gradient-to-br from-emerald-500/15 to-amber-400/10 text-2xl font-semibold tracking-[-0.04em] text-emerald-700 dark:text-emerald-300">
                      {person.initials}
                    </div>
                    <span className="font-mono text-[10px] text-slate-300 dark:text-white/15">0{index + 1}</span>
                  </div>
                  <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{person.role}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{person.name}</h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/38 sm:text-base">{person.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding border-y border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.06] dark:bg-[#081119]">
        <div className="container-main">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Leadership model</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Strategy stays close to delivery.</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {leadershipPrinciples.map((item) => (
              <div key={item.title} className="rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-5">
                <item.icon className="size-5 text-emerald-300" />
                <h3 className="mt-7 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/40">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-emerald-500 to-emerald-700 p-7 text-white sm:p-10 lg:p-12">
            <div className="lw-dot-grid absolute inset-0 opacity-20" />
            <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Sparkles className="size-5 text-emerald-100" />
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Build the next chapter with Lightworld.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/75 sm:text-base">
                  Work with the team on digital products, enterprise systems, AI-enabled workflows, infrastructure, training and advisory.
                </p>
              </div>
              <Link href="/contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-emerald-800">
                Start a conversation <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
