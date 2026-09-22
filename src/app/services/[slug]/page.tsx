import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, MapPin } from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';
import { BreadcrumbJsonLd, JsonLd } from '@/components/ui/json-ld';
import { getSeoConfig, buildPageMetadata, seoAbsoluteUrl } from '@/lib/seo-config';
import {
  getServiceSearchPage,
  serviceSearchPageMap,
  serviceSearchPages,
  type ServiceSearchPage,
} from '@/lib/service-search-pages';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return serviceSearchPages.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceSearchPage(slug);

  if (!service) {
    return {
      title: 'Service Not Found',
      robots: { index: false, follow: true },
    };
  }

  const seo = await getSeoConfig();
  return buildPageMetadata(seo, {
    title: service.metaTitle,
    description: service.metaDescription,
    path: '/services/' + service.slug,
    absoluteTitle: true,
  });
}

export default async function ServiceSearchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceSearchPage(slug);
  if (!service) notFound();

  const seo = await getSeoConfig();
  const canonical = seoAbsoluteUrl(seo, '/services/' + service.slug);
  const related = service.related
    .map((relatedSlug) => serviceSearchPageMap.get(relatedSlug))
    .filter((item): item is ServiceSearchPage => Boolean(item));

  const serviceSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': canonical + '#service',
    name: service.title,
    serviceType: service.eyebrow,
    description: service.metaDescription,
    url: canonical,
    provider: {
      '@id': seo.siteUrl + '/#organization',
    },
    areaServed: [
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'AdministrativeArea', name: 'Greater Accra Region' },
    ],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: seoAbsoluteUrl(seo, '/contact'),
    },
  };

  return (
    <PublicShell>
      <JsonLd data={serviceSchema} />
      <BreadcrumbJsonLd
        config={seo}
        items={[
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.eyebrow, path: '/services/' + service.slug },
        ]}
      />

      <main className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-amber-700 dark:text-white/35 dark:hover:text-amber-300"
            >
              <ArrowLeft className="size-3.5" />
              All technology services
            </Link>

            <div className="mt-9 grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
              <div>
                <div className="inline-flex items-center rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  {service.eyebrow}
                </div>
                <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                  {service.title}
                </h1>
              </div>

              <div>
                <p className="text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
                  {service.summary}
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-white/30">
                  <MapPin className="size-4 text-amber-600" />
                  Tema · Greater Accra · Serving Ghana and beyond
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,.72fr)]">
            <article>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                How we approach it
              </p>
              <div className="mt-5 space-y-5">
                {service.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/25">
                  Typical scope
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {service.deliverables.map((deliverable) => (
                    <div
                      key={deliverable}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-white/[0.07] dark:bg-white/[0.025]"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                        <Check className="size-3" />
                      </span>
                      <span className="text-sm font-medium leading-6 text-slate-700 dark:text-white/55">
                        {deliverable}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                  Outcomes we design for
                </p>
                <div className="mt-5 space-y-3">
                  {service.outcomes.map((outcome) => (
                    <div key={outcome} className="flex items-start gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <p className="text-sm leading-6 text-slate-600 dark:text-white/45">{outcome}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/70 bg-slate-950 p-6 text-white dark:border-white/[0.07] dark:bg-[#081119]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  A strong fit for
                </p>
                <div className="mt-5 space-y-3">
                  {service.idealFor.map((item) => (
                    <p key={item} className="border-b border-white/[0.07] pb-3 text-sm leading-6 text-white/55 last:border-0 last:pb-0">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white dark:border-white/[0.06] dark:bg-[#081119]">
          <div className="container-main section-padding">
            <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                  Related capabilities
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  Build the whole solution, not an isolated feature.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={'/services/' + item.slug}
                    className="group rounded-2xl border border-slate-200/70 bg-[#f7f9f8] p-4 transition hover:border-amber-300 hover:bg-amber-50/50 dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:bg-white/[0.04]"
                  >
                    <p className="text-sm font-semibold">{item.eyebrow}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-white/35">
                      {item.summary}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Explore <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main">
            <div className="flex flex-col gap-5 rounded-[32px] border border-amber-500/15 bg-amber-500/[0.07] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  Start with the problem
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Tell us what you want to improve.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/38">
                  You do not need a finished technical specification. Share the users, workflow, constraints and outcome, and we can help shape the right next step.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:bg-amber-400 dark:text-slate-950"
              >
                Discuss your project <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
