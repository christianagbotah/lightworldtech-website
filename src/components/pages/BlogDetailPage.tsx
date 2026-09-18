'use client';

import { useMemo } from 'react';
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
  updatedAt: string;
  category?: { name?: string | null } | null;
}

export default function BlogDetailPage({ initialPost }: { initialPost: BlogPost }) {
  const post = initialPost;

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
