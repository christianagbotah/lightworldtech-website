import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/layout/PublicShell';
import {
  contentJson,
  contentText,
  defaultPrivacySections,
} from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { safeNavigationHref } from '@/lib/navigation-content';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata(buildSeoConfig(settings), {
    title: contentText(settings, 'seo_privacy_title', 'Privacy & Cookie Notice'),
    description: contentText(
      settings,
      'seo_privacy_description',
      'How Lightworld Technologies Ltd handles website data, contact information, newsletter subscriptions and optional first-party analytics.',
    ),
    path: '/privacy',
  });
}

function paragraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const companyName = contentText(settings, 'company_name', 'Lightworld Technologies Ltd');
  const companyAddress = contentText(settings, 'company_address', 'Tema, Ghana');
  const companyEmail = contentText(settings, 'company_email', 'mail@lightworldtech.com');
  const sections = contentJson<Array<{ title: string; body: string }>>(
    settings,
    'privacy_sections',
    defaultPrivacySections,
  ).filter((section) => section?.title?.trim() && section?.body?.trim());
  const regulatorUrl = safeNavigationHref(
    contentText(settings, 'privacy_regulator_url', 'https://dpc.gov.gh/'),
    'https://dpc.gov.gh/',
  );

  return (
    <PublicShell settings={settings}>
      <div className="bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
              {contentText(settings, 'privacy_eyebrow', 'Privacy & cookies')}
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
              {contentText(settings, 'privacy_title', 'Clear choices. Minimal data. Useful technology.')}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45">
              {contentText(
                settings,
                'privacy_intro',
                'This notice explains how Lightworld Technologies Ltd handles information through lightworldtech.com.',
              )}{' '}
              Last updated {contentText(settings, 'privacy_last_updated', '18 September 2026')}.
            </p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-sm font-semibold">{companyName}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/38">{companyAddress}</p>
                <a
                  href={'mailto:' + companyEmail}
                  className="mt-4 inline-block text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  {companyEmail}
                </a>
                <p className="mt-6 text-xs leading-6 text-slate-400 dark:text-white/28">
                  {contentText(
                    settings,
                    'privacy_regulator_note',
                    'Ghana’s Data Protection Act, 2012 (Act 843) establishes the national framework for the protection and processing of personal data. This page is a practical website notice and is not a substitute for legal advice.',
                  )}
                </p>
                <a
                  href={regulatorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-xs font-semibold text-slate-600 underline underline-offset-4 dark:text-white/55"
                >
                  {contentText(settings, 'privacy_regulator_label', 'Data Protection Commission')}
                </a>
              </div>
            </aside>

            <div className="space-y-4">
              {sections.map((section, index) => (
                <article
                  key={section.title + index}
                  className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8"
                >
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">{section.title}</h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-white/42">
                    {paragraphs(section.body).map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}

              <article className="rounded-[28px] border border-emerald-500/15 bg-emerald-500/[0.07] p-6 sm:p-8">
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                  {contentText(settings, 'privacy_request_title', 'Questions or privacy requests')}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/42">
                  {contentText(
                    settings,
                    'privacy_request_text',
                    'Email us with enough information for us to understand your request. For general project enquiries, use the Contact page.',
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                  <a className="text-emerald-700 dark:text-emerald-300" href={'mailto:' + companyEmail}>
                    {companyEmail}
                  </a>
                  <Link href="/contact" className="text-emerald-700 dark:text-emerald-300">
                    Contact page
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
