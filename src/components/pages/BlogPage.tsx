'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, ChevronRight, Calendar, FileX, Keyboard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultPosts = [
  { id: '1', title: 'Why Every Business Needs a Professional Website in 2025', excerpt: 'In today\'s digital age, having a professional website is no longer a luxury but a necessity for businesses of all sizes.', category: 'Business', author: 'Lightworld Technologies', date: '2025-01-15', readTime: '5 min read', slug: 'why-every-business-needs-professional-website-2025' },
  { id: '2', title: 'The Complete Guide to Mobile App Development', excerpt: 'Learn everything you need to know about developing a mobile app for your business, from planning to launch.', category: 'Mobile Apps', author: 'Lightworld Technologies', date: '2025-01-10', readTime: '7 min read', slug: 'complete-guide-mobile-app-development-business' },
  { id: '3', title: 'Top 10 Web Development Trends to Watch in 2025', excerpt: 'Stay ahead of the curve with these essential web development trends that are shaping the future of the internet.', category: 'Web Development', author: 'Lightworld Technologies', date: '2025-01-05', readTime: '6 min read', slug: 'top-10-web-development-trends-2025' },
  { id: '4', title: 'How School Management Software Transforms Education', excerpt: 'Discover how digital school management systems are revolutionizing education administration in Ghana and across Africa.', category: 'Technology', author: 'Lightworld Technologies', date: '2024-12-28', readTime: '8 min read', slug: 'school-management-software-transforms-education-ghana' },
  { id: '5', title: 'UI/UX Design Principles Every Business Owner Should Know', excerpt: 'Understanding basic UI/UX design principles can help you make better decisions about your website and app projects.', category: 'Design', author: 'Lightworld Technologies', date: '2024-12-20', readTime: '5 min read', slug: 'ui-ux-design-principles-business-owners' },
  { id: '6', title: 'SEO Strategies to Grow Your Business Online in Ghana', excerpt: 'Learn effective SEO strategies specifically tailored for businesses operating in Ghana and the West African market.', category: 'SEO & Marketing', author: 'Lightworld Technologies', date: '2024-12-15', readTime: '6 min read', slug: 'seo-strategies-grow-business-online-ghana' },
];

const categories = ['all', 'Web Development', 'Mobile Apps', 'SEO & Marketing', 'Technology', 'Security'];

export default function BlogPage() {
  const { navigate, blogSearch, setBlogSearch, blogCategory, setBlogCategory } = useAppStore();
  const [posts, setPosts] = useState(defaultPosts);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState(blogSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const postsPerPage = 6;

  useEffect(() => {
    fetcher('/api/blog')
      .then((data) => {
        if (data.success && data.data?.posts) {
          const mapped = data.data.posts.map((p: Record<string, unknown>) => ({
            ...p,
            category: typeof p.category === 'object' ? (p.category as { name?: string }).name || 'Technology' : p.category,
            readTime: typeof p.readTime === 'number' ? `${p.readTime} min read` : p.readTime,
            date: p.date || p.createdAt,
          }));
          setPosts(mapped);
        } else if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p: Record<string, unknown>) => ({
            ...p,
            category: typeof p.category === 'object' ? (p.category as { name?: string }).name || 'Technology' : p.category,
            readTime: typeof p.readTime === 'number' ? `${p.readTime} min read` : p.readTime,
            date: p.date || p.createdAt,
          }));
          setPosts(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBlogSearch(value);
      setPage(1);
    }, 300);
  }, [setBlogSearch]);

  // Sync local search with store on category change
  useEffect(() => {
    setLocalSearch(blogSearch);
  }, [blogSearch]);

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
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search articles..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-16"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <Keyboard className="size-2.5" />
                ⌘K
              </kbd>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setBlogCategory(cat); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                    blogCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          {!loading && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Showing <span className="font-medium text-slate-700 dark:text-slate-200">{paginatedPosts.length}</span> of{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">{filteredPosts.length}</span> articles
              {blogSearch && (
                <span> matching &ldquo;<span className="text-emerald-600 dark:text-emerald-400">{blogSearch}</span>&rdquo;</span>
              )}
            </p>
          )}

          {/* Blog Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white dark:bg-slate-800">
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
                      className="group overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all duration-300 cursor-pointer h-full"
                      onClick={() => handlePostClick(post.slug)}
                    >
                      <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30 relative overflow-hidden">
                        <div className="absolute inset-0 grid-pattern opacity-30" />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm">{post.category}</Badge>
                        </div>
                      </div>
                      <CardContent className="p-5 flex flex-col h-full">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 text-slate-900 dark:text-white">
                          {post.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(post.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
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
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="max-w-sm mx-auto">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                  <FileX className="size-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No results found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  We couldn&apos;t find any articles matching your search. Try different keywords or clear the filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBlogSearch('');
                    setLocalSearch('');
                    setBlogCategory('all');
                    setPage(1);
                  }}
                  className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                >
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  );
}
