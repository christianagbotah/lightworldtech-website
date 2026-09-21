'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Compass,
  GraduationCap,
  Newspaper,
  Layers3,
  MapPin,
  Network,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { companyProfile } from '@/lib/company-profile';
import { contentJson, contentText, defaultCoverage, defaultRecognition, type SiteSettings } from '@/lib/site-content';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';

const principles = [
  {
    icon: Compass,
    title: 'Start with the real problem',
    text: 'We care about the business outcome and the people doing the work before we choose a framework, platform or feature list.',
  },
  {
    icon: Layers3,
    title: 'Design the whole system',
    text: 'A good interface, the workflow behind it, data, infrastructure and operations should reinforce one another.',
  },
  {
    icon: ShieldCheck,
    title: 'Build for production',
    text: 'Security, access control, recoverability, performance and deployment are design concerns—not a last-week checklist.',
  },
  {
    icon: GraduationCap,
    title: 'Leave teams stronger',
    text: 'Documentation, training and thoughtful handover matter because useful technology has to keep working after launch day.',
  },
];

const disciplines = [
  { icon: Code2, label: 'Software engineering' },
  { icon: BrainCircuit, label: 'AI & automation' },
  { icon: Network, label: 'Systems architecture' },
  { icon: Users, label: 'Experience design' },
  { icon: ShieldCheck, label: 'Security & reliability' },
  { icon: GraduationCap, label: 'Training & advisory' },
];

const operating = [
  ['Product mindset', 'We turn requirements into coherent user journeys and measurable product outcomes rather than simply implementing a feature list.'],
  ['Enterprise discipline', 'We are comfortable with roles, approvals, auditability, integrations, data integrity and the operational detail serious systems require.'],
  ['Local context', 'We understand the realities teams face in Ghana and across African markets, including connectivity, mobile-first use and operational constraints.'],
  ['Global standards', 'We design for accessibility, security, modern web performance, maintainability and the expectations of users anywhere in the world.'],
];

type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  email: string;
  linkedin: string;
  twitter: string;
};

export default function AboutPage({
  settings = {},
  team = [],
}: {
  settings?: SiteSettings;
  team?: TeamMember[];
}) {
  const cmsPrinciples = contentJson<Array<{ title: string; text: string }>>(
    settings,
    'about_principles',
    principles.map(({ title, text }) => ({ title, text })),
  ).map((item, index) => ({ ...item, icon: principles[index]?.icon || Compass }));

  const leadership = team.length
    ? team.map((person) => ({
        name: person.name,
        role: person.role,
        description: person.bio,
        initials: person.name
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      }))
    : companyProfile.leadership;

  const recognition = contentJson(settings, 'about_recognition', defaultRecognition);
  const coverage = contentJson(settings, 'about_coverage', defaultCoverage);
  const povParagraphs = contentJson<string[]>(settings, 'about_pov_paragraphs', [
    'Too many technology projects start with a tool and then search for a problem. We work the other way around: understand the people, the workflow, the operational constraints and the value the business needs to create.',
    'Sometimes the answer is a focused website. Sometimes it is a mobile experience, an enterprise platform, an integration layer, an AI-assisted workflow or a training programme. The goal is not to make the solution look complicated. The goal is to make the underlying complexity manageable.',
    'That is why our work spans strategy, experience design, engineering, infrastructure and enablement. We want clients to have one accountable technology partner that can stay useful as the problem evolves.',
  ]);

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
        <CmsHeroMedia settings={settings} settingKey="about_hero_image" />
        <div className="relative container-main py-16 sm:py-20 lg:py-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                <Sparkles className="size-3.5" />
                {contentText(settings, 'about_hero_eyebrow', 'About Lightworld')}
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {contentText(settings, 'about_hero_title', 'We build technology as infrastructure for growth.')}
              </h1>
            </div>
            <div className="lg:pb-1">
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
                {contentText(settings, 'about_hero_description', 'Lightworld Technologies Ltd is a Ghanaian technology company focused on useful digital products: software, apps, websites, intelligent workflows, infrastructure, training and advisory.')}
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-white/35">
                <MapPin className="size-4 text-amber-500" />
                {contentText(settings, 'about_location_line', 'Tema, Ghana · built with a global outlook')}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">{contentText(settings, 'about_pov_eyebrow', 'Our point of view')}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{contentText(settings, 'about_pov_title', 'Digital transformation should feel practical.')}</h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-5 text-base leading-8 text-slate-600 dark:text-white/45"
            >
              {povParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-padding border-y border-slate-200/70 bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="container-main">
          <div className="grid gap-3 md:grid-cols-2">
            {cmsPrinciples.map((principle, index) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.045 }}
                className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/[0.08] text-amber-600 dark:text-amber-300">
                  <principle.icon className="size-5" />
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight">{principle.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/36">{principle.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-950 text-white dark:bg-[#081119]">
        <div className="container-main">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">How we are built</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Multi-disciplinary by design.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/42 sm:text-base">
                Modern digital work crosses disciplines. Our delivery model brings those disciplines together around the same outcome instead of handing the project from silo to silo.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2">
                {disciplines.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs font-medium text-white/50">
                    <item.icon className="size-4 text-amber-300" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {operating.map(([title, text], index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="grid gap-3 rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-5 sm:grid-cols-[auto_1fr]"
                >
                  <span className="font-mono text-xs text-amber-300/70">0{index + 1}</span>
                  <div>
                    <h3 className="font-semibold text-white/88">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/38">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="leadership" className="section-padding scroll-mt-28 border-y border-slate-200/70 bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="container-main">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Leadership</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Accountability has names.</h2>
            </div>
            <Link href="/team" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Meet the leadership team <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            {leadership.map((person, index) => (
              <motion.article
                key={person.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07 }}
                className="relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-7"
              >
                <div className="absolute -right-16 -top-16 size-48 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="relative flex items-start gap-5">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-[22px] border border-amber-500/15 bg-gradient-to-br from-amber-500/15 to-amber-400/10 text-lg font-semibold text-amber-700 dark:text-amber-300">
                    {person.initials}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">{person.role}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{person.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-white/36">{person.description}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="recognition" className="section-padding scroll-mt-28">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                <Trophy className="size-3.5" />
                Recognition & coverage
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Public signals, linked to their sources.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-500 dark:text-white/38">
                We only feature recognition and coverage we can point back to publicly. Award programme listings below name Lightworld Technologies Ltd among their winners.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {recognition.map((item) => (
                <a
                  key={item.year + item.title}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[26px] border border-slate-200/70 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300/60 dark:border-white/[0.07] dark:bg-white/[0.025]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-xs text-amber-600 dark:text-amber-300">{item.year}</span>
                    <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-amber-500 dark:text-white/20" />
                  </div>
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/25">{item.publisher}</p>
                  <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/34">{item.description}</p>
                </a>
              ))}

              {coverage.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[26px] border border-amber-500/15 bg-amber-500/[0.07] p-5 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Newspaper className="size-5 text-amber-600 dark:text-amber-300" />
                    <ArrowUpRight className="size-4 text-amber-600/40 transition group-hover:text-amber-600 dark:text-amber-300/40" />
                  </div>
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700/70 dark:text-amber-300/60">{item.publisher} coverage</p>
                  <h3 className="mt-2 text-lg font-semibold leading-snug">{item.title}</h3>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[32px] border border-slate-200/70 bg-white p-7 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Our direction</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Build a technology company with African context and global capability.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38">
                We are growing beyond project delivery into reusable platforms, products, training and long-term technology partnerships—without losing the close understanding of client operations that makes custom work valuable.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[32px] border border-amber-500/15 bg-amber-500/[0.07] p-7 sm:p-8"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">What clients should expect</p>
              <div className="mt-4 space-y-3">
                {[
                  'Clear communication around scope, risk and trade-offs',
                  'Interfaces that work across desktop and mobile',
                  'Engineering choices that can be explained and maintained',
                  'Security and deployment considered throughout delivery',
                  'A partner willing to understand the operational detail',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                    <span className="text-sm leading-6 text-slate-600 dark:text-white/48">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-padding pt-2">
        <div className="container-main">
          <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-amber-500 to-amber-700 p-7 text-white sm:p-10 lg:p-12">
            <div className="lw-dot-grid absolute inset-0 opacity-20" />
            <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-50/70">Build with us</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">If the problem matters, we are interested in understanding it.</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-amber-800">
                  Start a conversation <ArrowRight className="size-4" />
                </Link>
                <Link href="/careers" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white">
                  Work with us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
