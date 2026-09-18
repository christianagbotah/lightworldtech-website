import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import BlogDetailPage from '@/components/pages/BlogDetailPage';

function humanize(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = humanize(slug);

  return {
    title,
    description: 'Read this technology insight from Lightworld Technologies on digital products, software engineering and business technology.',
    alternates: { canonical: '/blog/' + slug },
    openGraph: {
      title: title + ' | Lightworld Technologies',
      description: 'Technology insight from Lightworld Technologies.',
      type: 'article',
      url: '/blog/' + slug,
    },
  };
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicShell><BlogDetailPage slug={slug} /></PublicShell>;
}
