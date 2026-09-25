import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/layout/PublicShell';
import { db } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';

export const dynamic = 'force-dynamic';

async function loadStudy(slug: string) {
  return db.portfolioProject.findFirst({
    where: { caseStudySlug: slug, active: true, caseStudyPublished: true },
    select: {
      id: true,
      title: true,
      description: true,
      image: true,
      url: true,
      category: true,
      technologies: true,
      caseStudySlug: true,
      caseStudyClientName: true,
      caseStudyChallenge: true,
      caseStudySolution: true,
      caseStudyOutcomes: true,
      caseStudyPublishedAt: true,
      updatedAt: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [settings, study] = await Promise.all([getSiteSettings(), loadStudy(slug)]);
  if (!study) return {};
  const seo = buildSeoConfig(settings);
  return buildPageMetadata(seo, {
    title: study.title + ' | Lightworld Technologies Case Study',
    description: study.description || study.caseStudyChallenge.slice(0, 155),
    path: '/case-studies/' + slug,
    image: study.image || undefined,
    absoluteTitle: true,
  });
}

function blocks(value: string): string[] {
  return value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
}

function technologies(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

export default async function CaseStudyDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, study] = await Promise.all([getSiteSettings(), loadStudy(slug)]);
  if (!study) notFound();

  const seo = buildSeoConfig(settings);
  const description = study.description || study.caseStudyChallenge.slice(0, 180);

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path={'/case-studies/' + slug} name={study.title} description={description} />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Case studies', path: '/case-studies' }, { name: study.title, path: '/case-studies/' + slug }]} />
      <main className="min-h-screen bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-14 sm:py-18 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
              <div>
                <Link href="/case-studies" className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">← Approved case studies</Link>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">{study.caseStudyClientName || 'Client name withheld'} · {study.category || 'Technology project'}</p>
                <h1 className="mt-3 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">{study.title}</h1>
                {study.description && <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">{study.description}</p>}
              </div>
              <div className="rounded-[26px] border border-emerald-500/15 bg-emerald-500/[0.07] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Publication standard</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/42">This page is generated only from a portfolio record that passed Lightworld’s case-study publication gate. Internal approval references are retained privately and are never exposed on the public website.</p>
              </div>
            </div>
          </div>
        </section>

        {study.image && (
          <section className="container-main pt-8">
            <div className="relative aspect-[16/7] overflow-hidden rounded-[32px] bg-slate-100 dark:bg-white/[0.03]"><Image src={study.image} alt="" fill unoptimized className="object-cover" /></div>
          </section>
        )}

        <section className="section-padding">
          <div className="container-main grid gap-5 lg:grid-cols-3">
            {[
              ['Challenge', study.caseStudyChallenge],
              ['Solution', study.caseStudySolution],
              ['Outcomes', study.caseStudyOutcomes],
            ].map(([title, value]) => (
              <article key={title} className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">{title}</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 dark:text-white/42">
                  {blocks(value).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
              </article>
            ))}
          </div>

          {technologies(study.technologies).length > 0 && (
            <div className="container-main mt-8 rounded-[26px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Technology used</p>
              <div className="mt-4 flex flex-wrap gap-2">{technologies(study.technologies).map((tag) => <span key={tag} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-white/[0.08] dark:text-white/35">{tag}</span>)}</div>
            </div>
          )}

          <div className="container-main mt-8 flex flex-col gap-4 rounded-[30px] bg-slate-950 p-7 text-white sm:flex-row sm:items-center sm:justify-between dark:bg-[#081119]">
            <div><h2 className="text-2xl font-semibold">Need a similar outcome?</h2><p className="mt-2 text-sm text-white/45">Tell us the business problem rather than trying to copy the implementation.</p></div>
            <Link href="/contact" className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950">Discuss your project</Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
