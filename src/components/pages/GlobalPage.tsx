'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Cloud,
  Code2,
  ExternalLink,
  Globe2,
  GraduationCap,
  Handshake,
  Layers3,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Workflow,
} from 'lucide-react';
import { contentText, type SiteSettings } from '@/lib/site-content';
import { companyProfile } from '@/lib/company-profile';

const capabilities = [
  { icon: Code2, title: 'Web & product engineering', text: 'Websites, portals, SaaS products and business platforms designed for production use.', href: '/services/web-development' },
  { icon: Smartphone, title: 'Mobile applications', text: 'Responsive and native-feeling mobile experiences built around real workflows.', href: '/services/mobile-app-development' },
  { icon: Workflow, title: 'Enterprise systems', text: 'ERP, EAM, operations, finance and workflow software for complex organizations.', href: '/services/software-development' },
  { icon: BrainCircuit, title: 'AI & automation', text: 'Assistive AI, intelligent workflows and practical automation connected to business data.', href: '/services/ai-automation' },
  { icon: Cloud, title: 'Cloud & DevOps', text: 'Deployment, observability, resilience and infrastructure practices for dependable software.', href: '/services/cloud-devops' },
  { icon: ShieldCheck, title: 'Security engineering', text: 'Secure architecture, application hardening, permissions, auditability and release controls.', href: '/services/security-engineering' },
  { icon: Search, title: 'SEO & digital growth', text: 'Search-ready architecture, content foundations, analytics and conversion-focused improvements.', href: '/services/seo-digital-performance' },
  { icon: GraduationCap, title: 'Training & advisory', text: 'Technology training, architecture guidance and digital-transformation planning for teams.', href: '/services/it-training' },
];

const deliverySteps = [
  ['01', 'Discover', 'We clarify the business problem, users, systems, constraints, decision-makers and success measures.'],
  ['02', 'Align', 'Scope, architecture, milestones, ownership, communication rhythm and acceptance criteria are agreed before delivery accelerates.'],
  ['03', 'Build', 'Design, engineering, security and quality assurance move together with visible progress and written decisions.'],
  ['04', 'Release', 'Candidate-tested releases, controlled deployment and rollback planning reduce avoidable production risk.'],
  ['05', 'Improve', 'Support, measurement, iteration, training and handover keep the product useful after launch.'],
];

const collaboration = [
  { icon: Globe2, title: 'Remote delivery from Ghana', text: 'Lightworld is based in Tema, Ghana. International engagements can be delivered remotely without implying a foreign office or local legal entity.' },
  { icon: Clock3, title: 'GMT working base', text: 'Ghana operates on GMT (UTC+0), creating practical working-day overlap with Europe and structured hand-offs with teams in the Americas, Asia and the Middle East.' },
  { icon: Handshake, title: 'Clear human accountability', text: 'Named owners, documented decisions, review points and explicit approvals keep remote work understandable to both business and technical stakeholders.' },
  { icon: ShieldCheck, title: 'Production-minded controls', text: 'Access control, auditability, backups, release gates and secure operating practices are designed into delivery rather than added after launch.' },
];

export default function GlobalPage({ settings = {} }: { settings?: SiteSettings }) {
  const heroEyebrow = contentText(settings, 'global_hero_eyebrow', 'Ghana-built · global-ready');
  const heroTitle = contentText(settings, 'global_hero_title', 'A Ghanaian technology partner for ambitious teams anywhere.');
  const heroDescription = contentText(settings, 'global_hero_description', 'Lightworld Technologies Limited is headquartered in Tema, Ghana and can deliver software engineering, digital products, enterprise systems, AI-enabled workflows, cloud, security and advisory work for organizations that can collaborate with us remotely.');
  const deliveryTitle = contentText(settings, 'global_delivery_title', 'A delivery model designed to travel well.');
  const deliveryDescription = contentText(settings, 'global_delivery_description', 'Good international delivery depends less on distance than on clarity, accountability, secure systems and disciplined release practices. We organize the engagement around those fundamentals.');
  const ctaTitle = contentText(settings, 'global_cta_title', 'Your next technology partner does not have to be in the same city.');
  const ctaDescription = contentText(settings, 'global_cta_description', 'Tell us where your team is based, what you are trying to build or improve, and the working rhythm you need. We will tell you plainly whether Lightworld is a good fit.');

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative overflow-hidden border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="absolute -left-24 top-20 size-80 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute -right-20 top-0 size-96 rounded-full bg-amber-400/10 blur-[140px]" />
        <div className="container-main relative py-16 sm:py-20 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Globe2 className="size-3.5" /> {heroEyebrow}
              </div>
              <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">{heroTitle}</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">{heroDescription}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300">
                  Discuss an international project <ArrowRight className="size-4" />
                </Link>
                <Link href="/trust" className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/65">
                  Review our Trust Center <ShieldCheck className="size-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                [MapPin, 'Headquartered', 'Tema, Greater Accra, Ghana'],
                [Globe2, 'Delivery reach', 'Ghana · Africa · worldwide remote'],
                [Clock3, 'Working base', 'GMT · UTC+0'],
                [Layers3, 'Engagement range', 'Product · enterprise · AI · cloud'],
              ].map(([Icon, label, value]) => {
                const MetricIcon = Icon as typeof Globe2;
                return (
                  <div key={String(label)} className="rounded-[24px] border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/[0.07] dark:bg-white/[0.025]">
                    <MetricIcon className="size-4 text-amber-600 dark:text-amber-300" />
                    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-white/22">{String(label)}</p>
                    <p className="mt-1 text-sm font-semibold">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">International collaboration</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{deliveryTitle}</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/38 sm:text-base">{deliveryDescription}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {collaboration.map((item) => (
                <div key={item.title} className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/[0.08] text-amber-700 dark:text-amber-300"><item.icon className="size-5" /></div>
                  <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-white/36">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/75 py-14 dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="container-main">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">What we can deliver</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">One accountable technology partner across the stack.</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {capabilities.map((item) => (
              <Link key={item.title} href={item.href} className="group rounded-[26px] border border-slate-200/70 bg-white p-5 transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg hover:shadow-slate-950/[0.04] dark:border-white/[0.07] dark:bg-white/[0.025]">
                <item.icon className="size-5 text-emerald-600 dark:text-emerald-300" />
                <h3 className="mt-6 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/34">{item.text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">Explore capability <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">How engagements move</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Distance should not create ambiguity.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38">Each stage has a purpose, an owner and a decision point.</p>
            </div>
            <div className="grid gap-3">
              {deliverySteps.map(([number, title, text]) => (
                <div key={number} className="grid gap-4 rounded-[24px] border border-slate-200/70 bg-white p-5 sm:grid-cols-[72px_1fr] dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-300">{number}</span>
                  <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-white/35">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="grid overflow-hidden rounded-[34px] border border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.07] lg:grid-cols-[1.05fr_.95fr]">
            <div className="p-7 sm:p-9 lg:p-11">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300"><Award className="size-6" /></div>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Verified recognition</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Trust should be supported by evidence.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/42">We link recognition to the publisher source and keep security claims scoped to practices we can substantiate.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/case-studies" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950">Approved case studies <ArrowRight className="size-4" /></Link>
                <Link href="/newsroom" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-white/75">Newsroom & evidence <ArrowRight className="size-4" /></Link>
                <Link href="/trust" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-white/75">Trust Center <ShieldCheck className="size-4" /></Link>
              </div>
            </div>
            <div className="border-t border-white/[0.07] bg-white/[0.035] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                {companyProfile.recognition.map((award) => (
                  <a key={award.year + award.title} href={award.href} target="_blank" rel="noreferrer" className="group block rounded-2xl border border-white/[0.07] bg-black/10 p-4 transition hover:border-amber-300/25">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/70">{award.year} · {award.publisher}</p><p className="mt-1.5 text-sm font-semibold text-white/85">{award.title}</p></div>
                      <ExternalLink className="mt-1 size-3.5 shrink-0 text-white/20 transition group-hover:text-amber-300" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="relative overflow-hidden rounded-[38px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500 to-emerald-700 p-7 text-white shadow-2xl shadow-emerald-900/10 sm:p-10 lg:p-14">
            <div className="lw-dot-grid absolute inset-0 opacity-25" />
            <div className="absolute -right-16 -top-16 size-72 rounded-full bg-amber-300/20 blur-[80px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/80">Start internationally</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">{ctaTitle}</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-50/75 sm:text-base">{ctaDescription}</p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link href="/contact" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 sm:w-auto">Start a global project brief <ArrowRight className="size-4" /></Link>
                <p className="flex items-center gap-2 text-xs text-emerald-50/65"><CheckCircle2 className="size-3.5" /> Tell us your country or region and preferred time zone.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
