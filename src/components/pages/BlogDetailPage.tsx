'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, Calendar, Clock, User, ArrowLeft, Share2, List, ChevronDown, Tag, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { useSEO } from '@/hooks/use-seo';
import ShareButtons from '@/components/ui/share-buttons';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

const defaultPost = {
  id: '1',
  title: 'Why Every Business Needs a Professional Website in 2025',
  content: `## Introduction

In today's digital age, having a professional website is no longer a luxury but a necessity for businesses of all sizes. For businesses in Ghana and across Africa, establishing a strong online presence is key to growth.

## Key Benefits of a Professional Website

### 1. Credibility and Trust
A professional website immediately builds trust with potential customers. It shows that you are a legitimate business committed to serving its clients.

### 2. 24/7 Accessibility
Unlike a physical store, your website works for you around the clock, allowing customers to learn about your products and services at any time.

### 3. Marketing Hub
Your website serves as the central hub for all your digital marketing efforts, from SEO to social media.

### 4. Competitive Advantage
In Ghana's growing digital economy, businesses with professional websites have a significant advantage over those without.

## What Makes a Great Website

- **Mobile-responsive design** - Over 70% of internet users in Ghana access the web via mobile devices
- **Fast loading speed** - Users expect pages to load in under 3 seconds
- **Clear calls-to-action** - Guide visitors toward conversion
- **Search engine optimization** - Ensure your business can be found on Google
- **Regular updates** - Keep your content fresh and relevant

## Conclusion

Investing in a professional website is one of the smartest business decisions you can make in 2025. Contact Lightworld Technologies today to get started.`,
  excerpt: 'Discover why having a professional website is essential for businesses in Ghana and across Africa.',
  category: 'Business',
  author: 'Lightworld Technologies',
  date: '2025-01-15',
  readTime: '5 min read',
  slug: 'why-every-business-needs-professional-website-2025',
};

const relatedPosts = [
  { id: '2', title: 'The Complete Guide to Mobile App Development', category: 'Mobile Apps', date: '2025-01-10', slug: 'complete-guide-mobile-app-development-business' },
  { id: '4', title: 'How School Management Software Transforms Education', category: 'Technology', date: '2024-12-28', slug: 'school-management-software-transforms-education-ghana' },
  { id: '6', title: 'SEO Strategies to Grow Your Business Online in Ghana', category: 'SEO & Marketing', date: '2024-12-15', slug: 'seo-strategies-grow-business-online-ghana' },
];

function parseTOC(content: string): TOCItem[] {
  const items: TOCItem[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      items.push({ id, text, level });
    }
  }
  return items;
}

function estimateReadTime(content: string): number {
  // Average reading speed: ~200 words per minute
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogDetailPage() {
  const { navigate, blogPostSlug } = useAppStore();
  useSEO({
    title: 'Blog Article',
    description: 'Read this article on the Lightworld Technologies blog - insights on technology, web development, and digital innovation in Ghana.',
    keywords: ['blog post', 'technology article', 'web development', 'Ghana tech', 'digital innovation'],
    ogType: 'article',
  });
  const [post, setPost] = useState(defaultPost);
  const [loading, setLoading] = useState(true);
  const [activeHeading, setActiveHeading] = useState('');
  const [tocOpen, setTocOpen] = useState(false);

  // Reading progress state
  const [readingProgress, setReadingProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  const tocItems = useMemo(() => parseTOC(post.content), [post.content]);
  const totalReadTime = useMemo(() => estimateReadTime(post.content), [post.content]);

  useEffect(() => {
    const slug = blogPostSlug || 'future-web-development';
    fetcher(`/api/blog/${slug}`)
      .then((data) => {
        if (data && data.id) setPost(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [blogPostSlug]);

  // Scroll-based reading progress and remaining time
  const handleScroll = useCallback(() => {
    const article = articleRef.current;
    if (!article) return;

    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const articleHeight = rect.height;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    // Calculate progress (0-100)
    const scrolled = scrollY - articleTop + viewportHeight * 0.3;
    const progress = Math.min(Math.max(scrolled / articleHeight, 0), 1);
    setReadingProgress(Math.round(progress * 100));

    // Calculate remaining time based on remaining content
    const remainingProgress = Math.max(1 - progress, 0);
    setRemainingTime(Math.ceil(remainingProgress * totalReadTime));
  }, [totalReadTime]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // IntersectionObserver for active heading tracking
  useEffect(() => {
    if (tocItems.length === 0) return;

    const headingElements = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          const sorted = [...visible].sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveHeading(sorted[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0.1,
      }
    );

    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <button onClick={() => navigate('blog')} className="hover:text-emerald-400 transition-colors">Blog</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400 truncate max-w-[200px]">{post.title}</span>
          </nav>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                <Tag className="size-3" />
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30 text-xs font-medium">
                <Calendar className="size-3" />
                {new Date(post.date).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30 text-xs font-medium">
                <Clock className="size-3" />
                {post.readTime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="size-4" />
                {post.author}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Reading Progress Bar - Fixed at top of content */}
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: '0%' }}
            style={{ width: `${readingProgress}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>
        <div className="container-main flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-3">
            <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">{readingProgress}% read</span>
          </div>
          <div className="flex items-center gap-2">
            {readingProgress < 100 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <Clock className="size-3 inline mr-1" />
                {remainingTime} min remaining
              </span>
            ) : (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Article complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile TOC toggle */}
      {tocItems.length > 0 && (
        <div className="lg:hidden sticky top-[88px] z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="flex items-center justify-between w-full py-3 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <span className="flex items-center gap-2">
              <List className="size-4 text-emerald-600 dark:text-emerald-400" />
              Table of Contents ({tocItems.length})
            </span>
            <ChevronDown className={`size-4 transition-transform duration-200 ${tocOpen ? 'rotate-180' : ''}`} />
          </button>
          {tocOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pb-3 max-h-48 overflow-y-auto"
            >
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToHeading(item.id);
                    setTocOpen(false);
                  }}
                  className={`block text-left w-full py-1.5 px-3 text-sm rounded-md transition-colors ${
                    activeHeading === item.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  } ${item.level === 3 ? 'pl-6' : 'pl-3'}`}
                >
                  {item.text}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Content */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Article */}
            <div className="lg:col-span-2" ref={articleRef}>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <motion.article
                  className="prose max-w-none prose-slate dark:prose-invert prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-strong:text-slate-900 dark:prose-strong:text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </motion.article>
              )}

              {/* Share section */}
              <Separator className="my-10" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Button
                  onClick={() => navigate('blog')}
                  variant="outline"
                  className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Blog
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Share2 className="size-4" />
                    <span className="font-medium">Share this article</span>
                  </div>
                  <ShareButtons
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={post.title}
                    description={post.excerpt}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-28 space-y-8">
                {/* Table of Contents */}
                {tocItems.length > 0 && (
                  <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                        <List className="size-4 text-emerald-600 dark:text-emerald-400" />
                        Table of Contents
                      </h3>
                      <nav className="space-y-1">
                        {tocItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => scrollToHeading(item.id)}
                            className={`block text-left w-full py-1.5 text-sm rounded-md transition-colors ${
                              activeHeading === item.id
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            } ${item.level === 3 ? 'pl-6' : 'pl-3'}`}
                          >
                            {item.text}
                          </button>
                        ))}
                      </nav>
                    </CardContent>
                  </Card>
                )}

                {/* Reading progress card */}
                <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Reading Progress</h3>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 mb-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${readingProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{readingProgress}%</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {readingProgress < 100 ? `${remainingTime} min left` : 'Complete ✓'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Author card */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6 text-center">
                    <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {post.author.charAt(0)}
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{post.author}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Contributing Writer</p>
                  </CardContent>
                </Card>

                {/* Related Posts */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">Related Articles</h3>
                  <div className="space-y-3">
                    {relatedPosts.map((related) => (
                      <Card
                        key={related.id}
                        className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate('blog-detail', related.slug)}
                      >
                        <CardContent className="p-4">
                          <Badge variant="secondary" className="text-xs mb-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{related.category}</Badge>
                          <h4 className="text-sm font-medium line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-slate-900 dark:text-white">
                            {related.title}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(related.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
