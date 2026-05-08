'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, ChevronRight, Calendar, User, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultPosts = [
  { id: '1', title: 'The Future of Web Development in South Africa', excerpt: 'Discover the latest trends and technologies shaping the web development landscape in South Africa and beyond.', category: 'Web Development', author: 'Thabo Molefe', date: '2024-12-15', readTime: '5 min read', slug: 'future-web-development' },
  { id: '2', title: 'Why Mobile Apps Are Essential for Business Growth', excerpt: 'Learn how a well-designed mobile app can significantly boost your business revenue and customer engagement.', category: 'Mobile Apps', author: 'Naledi Dlamini', date: '2024-12-10', readTime: '4 min read', slug: 'mobile-apps-business-growth' },
  { id: '3', title: 'SEO Strategies for South African Businesses in 2025', excerpt: 'Practical SEO tips and strategies specifically tailored for the South African market to improve your online visibility.', category: 'SEO & Marketing', author: 'Aisha Patel', date: '2024-12-05', readTime: '6 min read', slug: 'seo-strategies-2025' },
  { id: '4', title: 'Cybersecurity Best Practices for Small Businesses', excerpt: 'Protect your business from cyber threats with these essential security measures and best practices.', category: 'Security', author: 'Pieter van Wyk', date: '2024-11-28', readTime: '7 min read', slug: 'cybersecurity-best-practices' },
  { id: '5', title: 'The Rise of Cloud Computing in Africa', excerpt: 'How cloud technology is transforming businesses across Africa and leveling the playing field for SMEs.', category: 'Technology', author: 'Thabo Molefe', date: '2024-11-20', readTime: '5 min read', slug: 'cloud-computing-africa' },
  { id: '6', title: 'Building Accessible Websites: A Complete Guide', excerpt: 'Why web accessibility matters and how to ensure your website is inclusive for all users.', category: 'Web Development', author: 'Aisha Patel', date: '2024-11-15', readTime: '8 min read', slug: 'accessible-websites-guide' },
];

const categories = ['all', 'Web Development', 'Mobile Apps', 'SEO & Marketing', 'Technology', 'Security'];

export default function BlogPage() {
  const { navigate, blogSearch, setBlogSearch, blogCategory, setBlogCategory } = useAppStore();
  const [posts, setPosts] = useState(defaultPosts);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const postsPerPage = 6;

  useEffect(() => {
    fetcher('/api/blog')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPosts(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = blogCategory === 'all' || post.category === blogCategory;
    const matchesSearch = !blogSearch ||
      post.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(blogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice((page - 1) * postsPerPage, page * postsPerPage);

  const handlePostClick = (slug: string) => {
    navigate('blog-detail', slug);
  };

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">Blog</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-emerald-400">Blog</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Insights, tips, and trends from our team of technology experts.
          </motion.p>
        </div>
      </section>

      {/* Blog Content */}
      <section className="section-padding bg-slate-50">
        <div className="container-main">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search articles..."
                value={blogSearch}
                onChange={(e) => { setBlogSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setBlogCategory(cat); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                    blogCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Blog Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <div className="p-5">
                    <Skeleton className="h-4 w-20 mb-3" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : paginatedPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card
                      className="group overflow-hidden border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer h-full"
                      onClick={() => handlePostClick(post.slug)}
                    >
                      <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 relative overflow-hidden">
                        <div className="absolute inset-0 grid-pattern opacity-30" />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-white/90 text-slate-800 text-xs">{post.category}</Badge>
                        </div>
                      </div>
                      <CardContent className="p-5 flex flex-col h-full">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(post.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {post.readTime}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                      className={page === i + 1 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-slate-400 mb-4">
                <Search className="size-12 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium">No articles found</h3>
                <p className="text-sm">Try adjusting your search or filter criteria.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
