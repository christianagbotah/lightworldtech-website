import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/layout/PublicShell';
import BlogDetailPage from '@/components/pages/BlogDetailPage';
import { JsonLd } from '@/components/ui/json-ld';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const getPublishedPost = cache(async (slug: string) =>
  db.blogPost.findFirst({
    where: { slug, published: true },
    include: { category: true },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    return {
      title: 'Insight Not Found',
      robots: { index: false, follow: true },
    };
  }

  const canonical = '/blog/' + post.slug;

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: canonical,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
      images: post.coverImage ? [{ url: post.coverImage, alt: post.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) notFound();

  const initialPost = {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };

  const articleSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: 'https://www.lightworldtech.com/blog/' + post.slug,
    author: {
      '@type': 'Organization',
      name: post.author || 'Lightworld Technologies Ltd',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Lightworld Technologies Ltd',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.lightworldtech.com/logo.png',
      },
    },
  };

  if (post.coverImage) {
    articleSchema.image = post.coverImage.startsWith('http')
      ? post.coverImage
      : 'https://www.lightworldtech.com' + post.coverImage;
  }

  return (
    <PublicShell>
      <JsonLd data={articleSchema} />
      <BlogDetailPage initialPost={initialPost} />
    </PublicShell>
  );
}
