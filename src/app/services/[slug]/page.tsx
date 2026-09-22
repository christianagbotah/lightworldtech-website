import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';
import { BreadcrumbJsonLd, ServiceJsonLd } from '@/components/ui/json-ld';
import { db } from '@/lib/db';
import { buildPageMetadata, getSeoConfig } from '@/lib/seo-config';
import {
  getServiceSearchLanding,
  serviceSearchLandings,
  type ServiceSearchLanding,
} from '@/lib/service-search-content';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type CmsService = {
  title: string;
  description: string;
  features: string;
  image: string;
} | null;

function parseFeatures(value: string): string[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

async function getCmsService(service: ServiceSearchLanding): Promise<CmsService> {
  if (!service.cmsSlugs.length) return null;
  try {
    return await db.service.findFirst({
      where: {
        active: true,
        slug: { in: service.cmsSlugs },
      },
      orderBy: { order: 'asc' },
      select: {
        title: true,
        description: true,
        features: true,
        image: true,
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceSearchLanding(slug);
  if (!service) {
    return {
      title: 'Service not found',
      robots: { index: false, follow: false },
    };
  }

  const seo = await getSeoConfig();
  return buildPageMetadata(seo, {
    title: service.seoTitle,
    description: service.description,
    path: '/services/' + service.slug,
    absoluteTitle: true,
  });
}

export default async function ServiceLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceSearchLanding(slug);
  if (!service) notFound();

  const [seo, cmsService] = await Promise.all([
    getSeoConfig(),
    getCmsService(service),
  ]);

  const managedDeliverables = cmsService ? parseFeatures(cmsService.features) : [];
  const deliverables = managedDeliverables.length >= 3
    ? Array.from(new Set([...managedDeliverables, ...service.deliverables])).slice(0, 10)
    : service.deliverables;
  const related = serviceSearchLandings.filter((item) => item.slug !== service.slug).slice(0, 3);
  const path = '/services/' + service.slug;

  return (
    <PublicShell>
      <ServiceJsonLd
        config={seo}
        name={service.title}
        description={service.description}
        path={path}
        serviceType={service.eyebrow}
      />
      <BreadcrumbJsonLd
        config={seo}
        items={[
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.title, path },
        ]}
      />

      <main className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="border-b border-slate-200/70 bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.015]">
          <div className="container-main py-5">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/35">
              <Link href="/" className="transition hover:text-amber-700 dark:hover:text-amber-300">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/services" className="transition hover:text-amber-700 dark:hover:text-amber-300">Services</Link>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-700 dark:text-white/60">{service.eyebrow}</span>
            </nav>
          </div>
        </section>

        <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  {service.eyebrow}
                </div>
                <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                  {service.title}
                </h1>
              </div>
              <div className="lg:pb-1">
                <p className="text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
                  {service.intro}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-white/35">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-amber-600" /> Tema, Greater Accra</span>
                  <span>Serving Ghana and remote engagements</span>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-amber-700 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300">
                    Discuss this service <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/services" className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 dark:border-white/10 dark:text-white/60">
                    All services
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
            <article className="rounded-[30px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">Typical scope</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">What we can deliver</h2>
              {cmsService?.description && (
                <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38">
                  {cmsService.description}
                </p>
              )}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {deliverables.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-slate-200/65 bg-slate-50/70 p-4 dark:border-white/[0.055] dark:bg-white/[0.02]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                    <span className="text-sm font-medium leading-6 text-slate-700 dark:text-white/55">{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <div className="space-y-6">
              <section className="rounded-[30px] border border-slate-200/70 bg-slate-950 p-6 text-white dark:border-white/[0.07] dark:bg-[#081119] sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Business outcomes</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">What the work should improve</h2>
                <div className="mt-6 space-y-3">
                  {service.outcomes.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-300" />
                      <p className="text-sm leading-6 text-white/60">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-amber-500/20 bg-amber-500/[0.06] p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">A good fit when</p>
                <div className="mt-5 space-y-4">
                  {service.idealFor.map((item) => (
                    <p key={item} className="border-l-2 border-amber-400 pl-4 text-sm leading-7 text-slate-600 dark:text-white/45">{item}</p>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white dark:border-white/[0.06] dark:bg-[#081119]">
          <div className="container-main section-padding">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">Connected capabilities</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Related technology services</h2>
              </div>
              <Link href="/services" className="text-sm font-semibold text-amber-700 dark:text-amber-300">Explore every service</Link>
            </div>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={'/services/' + item.slug}
                  className="group rounded-[24px] border border-slate-200/70 bg-[#f7f9f8] p-5 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/[0.07] dark:bg-white/[0.025]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-300">{item.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold leading-7">{item.title}</h3>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    View service <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main">
            <div className="flex flex-col gap-5 rounded-[32px] border border-amber-500/15 bg-amber-500/[0.07] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Start with the business problem</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Need this capability inside a larger project?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-white/38">
                  Lightworld can combine product, software, cloud, security, growth and training into one delivery plan instead of forcing the project into a single service category.
                </p>
              </div>
              <Link href="/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:bg-amber-400 dark:text-slate-950">
                Start a conversation <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
