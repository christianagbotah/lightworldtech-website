'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  Code2,
  GraduationCap,
  HeartHandshake,
  Mail,
  MapPin,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { contentJson, contentText, type SiteSettings } from '@/lib/site-content';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';

const disciplines = [
  { icon: Code2, title: 'Engineering', text: 'Frontend, backend, mobile, platform and integration work.' },
  { icon: Palette, title: 'Product & design', text: 'Research, UX, interface design, content and design systems.' },
  { icon: BrainCircuit, title: 'AI & data', text: 'Applied AI, automation, analytics and knowledge experiences.' },
  { icon: ShieldCheck, title: 'Cloud & security', text: 'Infrastructure, DevOps, reliability and application security.' },
  { icon: GraduationCap, title: 'Training', text: 'Technical instruction, curriculum and corporate enablement.' },
  { icon: HeartHandshake, title: 'Client delivery', text: 'Discovery, project leadership, implementation and support.' },
];

const expectations = [
  'Care about the user and the operational detail, not only the technology.',
  'Communicate clearly when something is uncertain, risky or needs a decision.',
  'Be willing to learn outside a narrow job title when the product requires it.',
  'Treat security, quality and maintainability as part of the work.',
  'Share knowledge so the whole team improves.',
];

export default function CareersPage({ settings = {} }: { settings?: SiteSettings }) {
  const managedDisciplines = contentJson<Array<{ title: string; text: string }>>(
    settings,
    'careers_disciplines',
    disciplines.map(({ title, text }) => ({ title, text })),
  ).map((item, index) => ({ ...item, icon: disciplines[index]?.icon || Users }));
  const managedExpectations = contentJson<string[]>(settings, 'careers_expectations', expectations);
  const careersEmail = contentText(settings, 'careers_email', 'mail@lightworldtech.com');

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
        <CmsHeroMedia settings={settings} settingKey="careers_hero_image" />
        <div className="relative container-main py-16 sm:py-20 lg:py-24 z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Users className="size-3.5" />
                {contentText(settings, 'careers_hero_eyebrow', 'Careers & talent network')}
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">{contentText(settings, 'careers_hero_title', 'Come build technology that has to work in the real world.')}</h1>
            </div>
            <div>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
                {contentText(settings, 'careers_hero_description', 'We are building a multidisciplinary technology company in Ghana. Open roles change with project needs, so we do not publish stale vacancies or salary promises as if they were current.')}
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-white/35">
                <MapPin className="size-4 text-emerald-500" />
                {contentText(settings, 'careers_location', 'Tema, Ghana · role-dependent remote collaboration')}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">Where talent fits</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Different disciplines. One delivery team.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-500 dark:text-white/38">Even when there is no advertised vacancy, we are interested in strong people whose work aligns with the company we are building.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {managedDisciplines.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-[26px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]"
                >
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                    <item.icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/35">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding border-y border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.06] dark:bg-[#081119]">
        <div className="container-main">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Rocket className="size-5" />
              </div>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">How we think about the work</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">High ownership without pretending one person knows everything.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/40 sm:text-base">The best delivery teams ask good questions, surface risk early and care about what happens after the code is merged.</p>
            </div>

            <div className="space-y-2">
              {managedExpectations.map((item) => (
                <div key={item} className="flex gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-white/48">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[32px] border border-slate-200/70 bg-white p-7 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                <Mail className="size-5" />
              </div>
              <h2 className="mt-7 text-2xl font-semibold tracking-tight">Join the talent network</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/38">Send a concise introduction, the kind of work you do, and links to work you are proud of. If there is a strong fit for a current or upcoming need, the team can follow up.</p>
              <a href={'mailto:' + careersEmail + '?subject=Lightworld%20Talent%20Network'} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {careersEmail} <ArrowRight className="size-4" />
              </a>
            </div>

            <div className="rounded-[32px] border border-emerald-500/15 bg-emerald-500/[0.07] p-7 sm:p-8">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <GraduationCap className="size-5" />
              </div>
              <h2 className="mt-7 text-2xl font-semibold tracking-tight">Still growing your skills?</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/38">Lightworld also works in training and capability building. A career relationship can start with learning, mentorship and practical project exposure.</p>
              <Link href="/services" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Explore training & advisory <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
