import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  LockKeyhole,
  Mail,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';
import { contentJson, contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

const defaultPractices = [
  {
    title: 'Access & application security',
    text: 'Administrative actions are protected by authenticated sessions, admin passwords are hashed, public endpoints are rate-limited where appropriate, and production builds are gated before release.',
  },
  {
    title: 'Privacy-conscious data handling',
    text: 'Optional first-party website analytics runs only after visitor consent and is designed not to store raw IP addresses, email addresses or user-agent fingerprints in analytics events.',
  },
  {
    title: 'Release & recovery discipline',
    text: 'Production changes are built from exact source revisions, candidate-tested before traffic moves, and database backups are taken before schema-changing releases.',
  },
  {
    title: 'Human-accountable AI',
    text: 'The public assistant is grounded in managed company content and verified facts. Project-scoping output is a starting point for human review, not a binding quote, contract or autonomous commercial decision.',
  },
];

const practiceIcons = [LockKeyhole, Database, RotateCcw, Bot];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_trust_title', 'Security, Privacy & Responsible AI | Lightworld Technologies');
  const description = contentText(
    settings,
    'seo_trust_description',
    'Review Lightworld Technologies Limited security, privacy, reliable-delivery and responsible-AI practices for its website and software engineering work.',
  );
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/trust',
    absoluteTitle: true,
  });
}

export default async function TrustPage() {
  const settings = await getSiteSettings();
  const practices = contentJson<Array<{ title: string; text: string }>>(
    settings,
    'trust_practices',
    defaultPractices,
  );
  const aiPrinciples = contentJson<string[]>(settings, 'trust_ai_principles', [
    'Ground important company facts in managed or verified sources.',
    'Make uncertainty and handoff points clear instead of inventing commitments.',
    'Keep humans responsible for commercial scope, pricing and delivery decisions.',
    'Limit collected data to what the visitor has chosen to share or consented to.',
  ]);
  const contact = contentText(settings, 'trust_security_contact', 'mail@lightworldtech.com');

  return (
    <PublicShell>
      <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
          <CmsHeroMedia settings={settings} settingKey="trust_hero_image" />
          <div className="relative container-main py-16 sm:py-20 lg:py-24 z-10">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-3.5" />
                  {contentText(settings, 'trust_hero_eyebrow', 'Trust Center')}
                </div>
                <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                  {contentText(settings, 'trust_hero_title', 'Trust is part of the product, not a badge added later.')}
                </h1>
              </div>
              <p className="max-w-xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
                {contentText(
                  settings,
                  'trust_hero_description',
                  'A practical view of how Lightworld approaches access control, privacy, reliable delivery and responsible AI across this website and our engineering process.',
                )}
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-2">
              {['Authenticated administration', 'Consent-aware analytics', 'Verified release gates', 'Human-reviewed AI'].map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white/45">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main">
            <div className="mb-8 max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Working practices</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Controls should be explainable.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38">
                These statements describe practices implemented for Lightworld’s website and delivery workflow. They are intentionally more specific than generic security promises.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {practices.map((practice, index) => {
                const Icon = practiceIcons[index % practiceIcons.length];
                return (
                  <article key={practice.title} className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-7">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-300">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em]">{practice.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/38">{practice.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.06] dark:bg-[#081119]">
          <div className="container-main section-padding">
            <div className="grid gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Responsible AI</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Useful assistance. Clear human accountability.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/40">
                  The public concierge can answer managed company questions and help structure an initial project brief. It does not independently approve pricing, contracts, security commitments or delivery dates.
                </p>
              </div>
              <div className="space-y-3">
                {aiPrinciples.map((principle) => (
                  <div key={principle} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                    <p className="text-sm leading-6 text-white/58">{principle}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">Certification claims stay explicit.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38">
                {contentText(
                  settings,
                  'trust_disclaimer',
                  'This page describes current working practices and controls; it does not claim ISO, SOC 2, PCI DSS or other third-party certification unless a verified certification is explicitly published here.',
                )}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/privacy" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold transition hover:border-emerald-300 dark:border-white/[0.08]">
                  Privacy & Cookie Notice <ArrowRight className="size-3.5" />
                </Link>
                <Link href="/terms" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold transition hover:border-emerald-300 dark:border-white/[0.08]">
                  Website Terms <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-emerald-500/15 bg-emerald-500/[0.07] p-6 sm:p-8">
              <Mail className="size-5 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Report a concern</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Security or privacy question?</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-white/42">
                Send enough detail for the Lightworld team to understand the issue. Please avoid sending passwords or other secrets in the first message.
              </p>
              <a href={'mailto:' + contact + '?subject=Security%20or%20privacy%20enquiry'} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-slate-950">
                {contact} <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
