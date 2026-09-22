import { db } from '@/lib/db';
import { getSeoConfig, seoAbsoluteUrl } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET() {
  const seo = await getSeoConfig();

  let posts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  try {
    posts = await db.blogPost.findMany({
      where: { published: true },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        author: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  } catch {
    // Keep the feed endpoint valid even during a temporary CMS/database issue.
  }

  const feedUrl = seoAbsoluteUrl(seo, '/feed.xml');
  const latest = posts[0]?.updatedAt || new Date();

  const items = posts.map((post) => {
    const url = seoAbsoluteUrl(seo, '/blog/' + post.slug);
    return [
      '<item>',
      '<title>' + xml(post.title) + '</title>',
      '<link>' + xml(url) + '</link>',
      '<guid isPermaLink="true">' + xml(url) + '</guid>',
      '<description>' + xml(post.excerpt) + '</description>',
      '<author>' + xml(post.author || seo.legalName) + '</author>',
      '<pubDate>' + post.createdAt.toUTCString() + '</pubDate>',
      '</item>',
    ].join('');
  }).join('');

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    '<title>' + xml(seo.siteName + ' Insights') + '</title>',
    '<link>' + xml(seoAbsoluteUrl(seo, '/blog')) + '</link>',
    '<description>' + xml('Software, AI, web, mobile, cloud and digital transformation insights from ' + seo.legalName + ' in Ghana.') + '</description>',
    '<language>en-GH</language>',
    '<lastBuildDate>' + latest.toUTCString() + '</lastBuildDate>',
    '<atom:link href="' + xml(feedUrl) + '" rel="self" type="application/rss+xml" />',
    items,
    '</channel>',
    '</rss>',
  ].join('');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400',
    },
  });
}
