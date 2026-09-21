'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getBlogCoverImage } from '@/lib/blog-visuals';
import { contentText, type SiteSettings } from '@/lib/site-content';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  readTime: number;
  featured: boolean;
  coverImage: string;
  createdAt: string;
  category?: { name?: string | null; slug?: string | null } | null;
}

export default function BlogPage({ initialPosts, settings = {} }: { initialPosts: BlogPost[]; settings?: SiteSettings }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const heroEyebrow = contentText(settings, 'blog_hero_eyebrow', 'Insights');
  const heroTitle = contentText(settings, 'blog_hero_title', 'Useful thinking for people building with technology.');
  const heroDescription = contentText(
    settings,
    'blog_hero_description',
    'Notes from Lightworld on software engineering, digital operations, product design, AI, cloud, growth and the practical decisions behind modern technology.',
  );
  const searchPlaceholder = contentText(settings, 'blog_search_placeholder', 'Search insights');
  const emptyTitle = contentText(settings, 'blog_empty_title', 'No published insight matches this view.');
  const emptyDescription = contentText(
    settings,
    'blog_empty_description',
    'Try another category or search term. New articles can be published through the Lightworld CMS.',
  );

  useEffect(() => {
    fetch('/api/blog?published=true&limit=50')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load insights');
        return response.json();
      })
      .then((payload) => {
        const items = Array.isArray(payload?.data) ? payload.data : [];
        setPosts(items);
      })
      .catch(() => {
        // Keep server-rendered content if background refresh is unavailable.
      });
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(posts.map((post) => post.category?.name || 'Technology')))],
    [posts],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      const postCategory = post.category?.name || 'Technology';
      const categoryMatch = category === 'All' || postCategory === category;
      const searchMatch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [posts, category, search]);

  const featured = filtered.find((post) => post.featured) || filtered[0];
  const remaining = featured ? filtered.filter((post) => post.id !== featured.id) : filtered;

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
        <CmsHeroMedia settings={settings} settingKey="blog_hero_image" />
        <div className="relative container-main py-16 sm:py-20 lg:py-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Sparkles className="size-3.5" />
                {heroEyebrow}
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {heroTitle}
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
              {heroDescription}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={
                    category === item
                      ? 'shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-slate-950'
                      : 'shrink-0 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-xs font-medium text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white/35'
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            <label className="relative block w-full lg:w-80">
              <span className="sr-only">Search insights</span>
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-white/25" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-full border border-slate-200/80 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white dark:placeholder:text-white/20"
              />
            </label>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <div className="aspect-[16/10] animate-pulse rounded-[30px] bg-slate-200/70 dark:bg-white/[0.04]" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="min-h-60 animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-white/[0.04]" />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 rounded-[30px] border border-slate-200/70 bg-white p-10 text-center dark:border-white/[0.07] dark:bg-white/[0.025]">
              <FileText className="mx-auto size-7 text-emerald-500" />
              <h2 className="mt-4 text-xl font-semibold">{emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-white/35">
                {emptyDescription}
              </p>
            </div>
          ) : (
            <>
              {featured && (
                <motion.article
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 grid overflow-hidden rounded-[32px] border border-slate-200/70 bg-white dark:border-white/[0.07] dark:bg-white/[0.025] lg:grid-cols-[1.06fr_.94fr]"
                >
                  <div className="relative min-h-[280px] bg-slate-100 dark:bg-white/[0.03] lg:min-h-[420px]">
                    <Image
                      src={getBlogCoverImage(featured)}
                      alt={featured.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      className="object-cover transition duration-700 hover:scale-[1.02]"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-col p-7 sm:p-9 lg:p-10">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                        {featured.category?.name || 'Technology'}
                      </span>
                      {featured.featured && (
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-white/20">Featured</span>
                      )}
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{featured.title}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38 sm:text-base">{featured.excerpt}</p>
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-white/25">
                      <span>{featured.author}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />{new Date(featured.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{featured.readTime} min read</span>
                    </div>
                    <div className="mt-auto pt-8">
                      <Link href={'/blog/' + featured.slug} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Read article <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              )}

              {remaining.length > 0 && (
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {remaining.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(index * 0.04, 0.18) }}
                    >
                      <Link
                        href={'/blog/' + post.slug}
                        className="group flex h-full min-h-[330px] flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-white dark:border-white/[0.07] dark:bg-white/[0.025]"
                      >
                        <div className="relative aspect-[16/8] overflow-hidden bg-slate-100 dark:bg-white/[0.03]">
                          <Image
                            src={getBlogCoverImage(post)}
                            alt={post.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition duration-700 group-hover:scale-[1.04]"
                            unoptimized
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-amber-600 dark:text-amber-300">{post.category?.name || 'Technology'}</p>
                          <h2 className="mt-3 text-xl font-semibold leading-snug tracking-[-0.025em]">{post.title}</h2>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-white/35">{post.excerpt}</p>
                          <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-[11px] text-slate-400 dark:text-white/22">
                            <span>{post.author}</span>
                            <span>{post.readTime} min</span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
