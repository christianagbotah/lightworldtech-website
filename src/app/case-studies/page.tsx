import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PublicShell from '@/components/layout/PublicShell';
import { db } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const seo = buildSeoConfig(settings);
  return buildPageMetadata(seo, {
    title: 'Approved Software Case Studies | Lightworld Technologies',
    description: 'Read evidence-governed Lightworld Technologies case studies published only after challenge, solution, outcome and internal approval records are complete.',
    path: '/case-studies',
    absoluteTitle: true,
  });
}

function technologies(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

export default async function CaseStudies() {
  const [settings, studies] = await Promise.all([
    getSiteSettings(),
    db.portfolioProject.findMany({
      where: { active: true, caseStudyPublished: true, caseStudySlug: { not: null } },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        category: true,
        technologies: true,
        featured: true,
        caseStudySlug: true,
        caseStudyClientName: true,
        caseStudyChallenge: true,
        caseStudyOutcomes: true,
        caseStudyPublishedAt: true,
      },
    }),
  ]);
  const seo = buildSeoConfig(settings);
  const description = 'Evidence-governed Lightworld Technologies case studies published only after challenge, solution, outcome and internal approval records are complete.';

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path="/case-studies" name="Approved Lightworld Technologies case studies" description={description} pageType="CollectionPage" />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Case studies', path: '/case-studies' }]} />
      <main className="min-h-screen bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">Approved client evidence</p>
            <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Case studies with a higher bar for publication.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
              Portfolio examples show the breadth of what we can build. Case studies are different: each public record must include a documented challenge, solution, outcomes and an internal approval reference before publication.
            </p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main">
            {studies.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/[0.1] dark:bg-white/[0.025]">
                <h2 className="text-2xl font-semibold">No approved case studies are public yet.</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-white/36">
                  We will not convert representative portfolio examples into client success claims without the required publication evidence and approval.
                </p>
                <Link href="/portfolio" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white dark:bg-amber-400 dark:text-slate-950">Explore portfolio patterns</Link>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {studies.map((study) => (
                  <article key={study.id} className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white dark:border-white/[0.07] dark:bg-white/[0.025]">
                    <div className="relative aspect-[16/9] bg-slate-100 dark:bg-white/[0.03]">
                      {study.image ? <Image src={study.image} alt="" fill unoptimized className="object-cover" /> : <div className="lw-dot-grid absolute inset-0 bg-slate-950 opacity-80" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                      <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-slate-950/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-lg">{study.category || 'Case study'}</span>
                    </div>
                    <div className="p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">{study.caseStudyClientName || 'Client name withheld'}</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{study.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/36">{study.description || study.caseStudyChallenge}</p>
                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {technologies(study.technologies).slice(0, 8).map((tag) => <span key={tag} className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[10px] text-slate-400 dark:border-white/[0.07] dark:text-white/25">{tag}</span>)}
                      </div>
                      <Link href={'/case-studies/' + study.caseStudySlug} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">Read case study <span aria-hidden="true">→</span></Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
