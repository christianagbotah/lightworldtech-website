import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/layout/PublicShell';
import {
  contentJson,
  contentText,
  defaultTermsSections,
} from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata(buildSeoConfig(settings), {
    title: contentText(settings, 'seo_terms_title', 'Website Terms'),
    description: contentText(
      settings,
      'seo_terms_description',
      'Website terms for lightworldtech.com, operated by Lightworld Technologies Ltd.',
    ),
    path: '/terms',
  });
}

function paragraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const sections = contentJson<Array<{ title: string; body: string }>>(
    settings,
    'terms_sections',
    defaultTermsSections,
  ).filter((section) => section?.title?.trim() && section?.body?.trim());

  return (
    <PublicShell settings={settings}>
      <div className="bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
              {contentText(settings, 'terms_eyebrow', 'Website terms')}
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
              {contentText(settings, 'terms_title', 'Terms for using the Lightworld website.')}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45">
              Last updated {contentText(settings, 'terms_last_updated', '18 September 2026')}.
            </p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main max-w-4xl space-y-4">
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
                {section.title.trim().toLowerCase() === 'privacy' && (
                  <Link
                    href="/privacy"
                    className="mt-4 inline-block text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    Read the Privacy & Cookie Notice
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
