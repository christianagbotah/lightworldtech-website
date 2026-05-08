'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, Calendar, Clock, User, Tag, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultPost = {
  id: '1',
  title: 'Why Every Business Needs a Professional Website in 2025',
  content: `## Introduction

In today's digital age, having a professional website is no longer a luxury but a necessity for businesses of all sizes. For businesses in Ghana and across Africa, establishing a strong online presence is key to growth.

## Key Benefits of a Professional Website

### 1. Credibility and Trust
A professional website immediately builds trust with potential customers. It shows that you are a legitimate business committed to serving your clients.

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

export default function BlogDetailPage() {
  const { navigate, blogPostSlug } = useAppStore();
  const [post, setPost] = useState(defaultPost);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = blogPostSlug || 'future-web-development';
    fetcher(`/api/blog/${slug}`)
      .then((data) => {
        if (data && data.id) setPost(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [blogPostSlug]);

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
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">{post.category}</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="size-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                {new Date(post.date).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {post.readTime}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-white">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Article */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <motion.article
                  className="prose max-w-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </motion.article>
              )}

              {/* Back button */}
              <Separator className="my-10" />
              <Button
                onClick={() => navigate('blog')}
                variant="outline"
                className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Blog
              </Button>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-28 space-y-8">
                {/* Author card */}
                <Card className="border-slate-200">
                  <CardContent className="p-6 text-center">
                    <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-xl font-bold text-emerald-700">
                      {post.author.charAt(0)}
                    </div>
                    <h4 className="font-semibold">{post.author}</h4>
                    <p className="text-xs text-slate-500 mt-1">Contributing Writer</p>
                  </CardContent>
                </Card>

                {/* Related Posts */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Related Articles</h3>
                  <div className="space-y-3">
                    {relatedPosts.map((related) => (
                      <Card
                        key={related.id}
                        className="border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate('blog-detail', related.slug)}
                      >
                        <CardContent className="p-4">
                          <Badge variant="secondary" className="text-xs mb-2">{related.category}</Badge>
                          <h4 className="text-sm font-medium line-clamp-2 hover:text-emerald-600 transition-colors">
                            {related.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
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
