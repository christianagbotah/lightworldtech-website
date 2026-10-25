import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Mail,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';
import { getSiteSettings } from '@/lib/site-content-server';
import { contentText } from '@/lib/site-content';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const seo = buildSeoConfig(settings);
  return buildPageMetadata(seo, {
    title: 'Security Vulnerability Disclosure | Lightworld Technologies',
    description:
      'Report suspected security vulnerabilities affecting Lightworld Technologies public websites and services using our responsible disclosure guidance.',
    path: '/security',
    absoluteTitle: true,
  });
}

const goodFaith = [
  'Test only systems and accounts you are authorized to access.',
  'Use the minimum interaction needed to demonstrate the suspected vulnerability.',
  'Avoid accessing, changing, deleting or downloading other people’s data.',
  'Do not use social engineering, phishing, denial-of-service or physical attacks.',
  'Give Lightworld reasonable time to investigate and remediate before public disclosure.',
];

const usefulReport = [
  'Affected URL, endpoint or product area.',
  'A concise description of the issue and potential impact.',
  'Reproduction steps or a minimal proof of concept.',
  'Relevant timestamps, request IDs or screenshots with secrets removed.',
  'A safe way to contact you for follow-up questions.',
];

export default async function SecurityDisclosurePage() {
  const settings = await getSiteSettings();
  const seo = buildSeoConfig(settings);
  const contact = contentText(settings, 'trust_security_contact', 'mail@lightworldtech.com');
  const description =
    'Lightworld Technologies vulnerability disclosure guidance for good-faith security research and responsible reporting.';

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path="/security" name="Security vulnerability disclosure" description={description} />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Trust Center', path: '/trust' }, { name: 'Security disclosure', path: '/security' }]} />
      <main className="min-h-screen bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" />
              Security disclosure
            </div>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Found a security issue? Report it responsibly.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
              We welcome clear, good-faith reports that help us investigate suspected vulnerabilities affecting Lightworld Technologies public websites or services. This page is a reporting policy, not a bug-bounty promise or certification claim.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={'mailto:' + contact + '?subject=Security%20vulnerability%20report'} className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-slate-950">
                Report by email <Mail className="size-4" />
              </a>
              <Link href="/trust" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold dark:border-white/[0.08] dark:bg-white/[0.025]">
                Open Trust Center <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-5 lg:grid-cols-2">
            <article className="rounded-[30px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              <SearchCheck className="size-5 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Good-faith research</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Keep testing safe and proportionate.</h2>
              <div className="mt-5 space-y-3">
                {goodFaith.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/42">{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              <Mail className="size-5 text-amber-600 dark:text-amber-300" />
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">What to include</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Give us enough detail to reproduce it.</h2>
              <div className="mt-5 space-y-3">
                {usefulReport.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.035]">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/42">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/15">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <p className="text-xs leading-6 text-amber-950 dark:text-amber-100">
                    Do not send passwords, private keys, access tokens or unnecessary personal data in the first report. If sensitive evidence is required, ask us for a safer exchange method first.
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="container-main mt-5 rounded-[30px] bg-slate-950 p-7 text-white dark:bg-[#081119] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Response expectations</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">We triage reports based on evidence and potential impact.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                  We may ask for clarification, reproduction details or a safer proof of concept. Remediation time depends on severity, exploitability, affected systems and the changes required. We do not promise a reward or fixed response deadline on this page.
                </p>
              </div>
              <a href={'mailto:' + contact + '?subject=Security%20vulnerability%20report'} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950">
                {contact} <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
