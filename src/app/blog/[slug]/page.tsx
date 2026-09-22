import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/layout/PublicShell';
import BlogDetailPage from '@/components/pages/BlogDetailPage';
import { BlogPostingJsonLd, BreadcrumbJsonLd } from '@/components/ui/json-ld';
import { db } from '@/lib/db';
import { getSeoConfig, seoAbsoluteUrl } from '@/lib/seo-config';

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
  const [post, seo] = await Promise.all([getPublishedPost(slug), getSeoConfig()]);

  if (!post) {
    return {
      title: 'Insight Not Found',
      robots: { index: false, follow: true },
    };
  }

  const canonical = '/blog/' + post.slug;
  const image = post.coverImage ? seoAbsoluteUrl(seo, post.coverImage) : seo.ogImage;

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: seoAbsoluteUrl(seo, canonical),
      siteName: seo.siteName,
      locale: seo.locale,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  };
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, seo] = await Promise.all([getPublishedPost(slug), getSeoConfig()]);

  if (!post) notFound();

  const initialPost = {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };

  return (
    <PublicShell>
      <BlogPostingJsonLd
        config={seo}
        post={{
          slug: post.slug,
          title: post.title,
          description: post.excerpt,
          author: post.author || seo.legalName,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
          image: post.coverImage ? seoAbsoluteUrl(seo, post.coverImage) : seo.ogImage,
        }}
      />
      <BreadcrumbJsonLd
        config={seo}
        items={[
          { name: 'Home', path: '/' },
          { name: 'Insights', path: '/blog' },
          { name: post.title, path: '/blog/' + post.slug },
        ]}
      />
      <BlogDetailPage initialPost={initialPost} />
    </PublicShell>
  );
}
