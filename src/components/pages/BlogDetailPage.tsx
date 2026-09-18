'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  FileText,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  readTime: number;
  createdAt: string;
  category?: { name?: string | null } | null;
}

export default function BlogDetailPage({ slug }: { slug?: string } = {}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) {
      setMissing(true);
      setLoading(false);
      return;
    }

    fetch('/api/blog/' + encodeURIComponent(slug))
      .then((response) => {
        if (!response.ok) throw new Error('Post unavailable');
        return response.json();
      })
      .then((payload) => {
        if (payload?.success && payload?.data) {
          setPost(payload.data);
        } else {
          setMissing(true);
        }
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const publishedDate = useMemo(() => {
    if (!post?.createdAt) return '';
    return new Date(post.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [post?.createdAt]);

  const share = async () => {
    if (typeof window === 'undefined' || !post) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      toast.success('Article link copied.');
    } catch {
      // User may cancel native sharing.
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70svh] bg-[#f7f9f8] dark:bg-[#050b10]">
        <div className="container-main py-16">
          <div className="h-5 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.05]" />
          <div className="mt-8 h-20 max-w-4xl animate-pulse rounded-3xl bg-slate-200 dark:bg-white/[0.05]" />
          <div className="mt-8 aspect-[16/7] animate-pulse rounded-[32px] bg-slate-200 dark:bg-white/[0.05]" />
        </div>
      </div>
    );
  }

  if (missing || !post) {
    return (
      <section className="container-main flex min-h-[65svh] items-center py-16">
        <div className="max-w-xl">
          <FileText className="size-8 text-emerald-500" />
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">This insight is not available.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/38">
            It may have been unpublished, moved or the link may be incorrect.
          </p>
          <Link href="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <ArrowLeft className="size-4" /> Back to insights
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <header className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="container-main py-12 sm:py-16 lg:py-20">
          <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-600 dark:text-white/30 dark:hover:text-emerald-300">
            <ArrowLeft className="size-3.5" />
            Insights
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8 max-w-5xl">
            <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              {post.category?.name || 'Technology'}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-7xl">{post.title}</h1>
            {post.excerpt && (
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">{post.excerpt}</p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 dark:text-white/25">
              <span>{post.author}</span>
              <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />{publishedDate}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{post.readTime} min read</span>
              <button onClick={share} className="inline-flex items-center gap-1.5 font-medium text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300">
                <Share2 className="size-3.5" /> Share
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      {post.coverImage && (
        <div className="container-main pt-8">
          <div className="relative aspect-[16/7] overflow-hidden rounded-[30px] bg-slate-100 dark:bg-white/[0.03]">
            <Image src={post.coverImage} alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" unoptimized priority />
          </div>
        </div>
      )}

      <div className="container-main py-10 sm:py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
          <div className="min-w-0">
            <div className="lw-article prose prose-slate max-w-none dark:prose-invert prose-headings:tracking-[-0.025em] prose-p:leading-8 prose-a:text-emerald-600 dark:prose-a:text-emerald-300 prose-img:rounded-2xl">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-[24px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/20">Article</p>
              <p className="mt-3 text-sm font-semibold">{post.author}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/30">{publishedDate}</p>
              <button onClick={share} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:text-white/45">
                <Copy className="size-3.5" /> Copy or share
              </button>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
