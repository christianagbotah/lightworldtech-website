import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import BlogPage from '@/components/pages/BlogPage';
import { db } from '@/lib/db';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_blog_title', 'Technology Insights');
  const description = contentText(
    settings,
    'seo_blog_description',
    'Practical insights from Lightworld Technologies on software, websites, mobile products, business systems, AI, cloud and digital transformation.',
  );

  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/blog',
    openGraphTitle: contentText(settings, 'seo_blog_social_title', 'Lightworld Technologies Insights'),
  });
}

export default async function Blog() {
  const [posts, settings] = await Promise.all([
    db.blogPost.findMany({
      where: { published: true },
      include: { category: true },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    getSiteSettings(),
  ]);

  const initialPosts = posts.map((post) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }));

  return (
    <PublicShell>
      <BlogPage initialPosts={initialPosts} settings={settings} />
    </PublicShell>
  );
}
