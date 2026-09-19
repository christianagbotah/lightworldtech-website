import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import BlogPage from '@/components/pages/BlogPage';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Technology Insights',
  description: 'Practical insights from Lightworld Technologies Ltd on software, websites, mobile products, business systems, AI, cloud and digital transformation.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Lightworld Technologies Ltd Insights',
    description: 'Practical thinking on software, product engineering and digital transformation.',
    url: '/blog',
  },
};

export default async function Blog() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    include: { category: true },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  const initialPosts = posts.map((post) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }));

  return (
    <PublicShell>
      <BlogPage initialPosts={initialPosts} />
    </PublicShell>
  );
}
