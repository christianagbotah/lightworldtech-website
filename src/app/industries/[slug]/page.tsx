import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/layout/PublicShell';
import IndustrySolutionPage from '@/components/pages/IndustrySolutionPage';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';
import { industrySolutionBySlug, industrySolutions } from '@/lib/industry-solutions';
import { buildPageMetadata, getSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return industrySolutions.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = industrySolutionBySlug(slug);
  if (!industry) return { title: 'Industry Solution Not Found', robots: { index: false, follow: true } };

  const seo = await getSeoConfig();
  const title = industry.name + ' Software Solutions | Lightworld Technologies';
  return buildPageMetadata(seo, {
    title,
    description: industry.description,
    path: '/industries/' + industry.slug,
    absoluteTitle: true,
  });
}

export default async function IndustrySolution({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = industrySolutionBySlug(slug);
  if (!industry) notFound();

  const seo = await getSeoConfig();
  const title = industry.name + ' Software Solutions | Lightworld Technologies';

  return (
    <PublicShell>
      <EntityWebPageJsonLd
        config={seo}
        path={'/industries/' + industry.slug}
        name={title}
        description={industry.description}
      />
      <BreadcrumbJsonLd
        config={seo}
        items={[
          { name: 'Home', path: '/' },
          { name: 'Industry solutions', path: '/industries' },
          { name: industry.name, path: '/industries/' + industry.slug },
        ]}
      />
      <IndustrySolutionPage industry={industry} />
    </PublicShell>
  );
}
