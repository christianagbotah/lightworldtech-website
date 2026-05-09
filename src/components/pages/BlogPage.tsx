'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, ChevronRight, Calendar, FileX, Keyboard, Star, ArrowRight, User, Tag, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useSEO } from '@/hooks/use-seo';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  slug: string;
  featured?: boolean;
}

interface CategoryCount {
  name: string;
  count: number;
}

const defaultPosts: BlogPost[] = [
  { id: '1', title: 'Why Every Business Needs a Professional Website in 2025', excerpt: 'In today\'s digital age, having a professional website is no longer a luxury but a necessity for businesses of all sizes.', category: 'Business', author: 'Lightworld Technologies', date: '2025-01-15', readTime: '5 min read', slug: 'why-every-business-needs-professional-website-2025', featured: true },
  { id: '2', title: 'The Complete Guide to Mobile App Development', excerpt: 'Learn everything you need to know about developing a mobile app for your business, from planning to launch.', category: 'Mobile Apps', author: 'Kwame Asante', date: '2025-01-10', readTime: '7 min read', slug: 'complete-guide-mobile-app-development-business', featured: true },
  { id: '3', title: 'Top 10 Web Development Trends to Watch in 2025', excerpt: 'Stay ahead of the curve with these essential web development trends that are shaping the future of the internet.', category: 'Web Development', author: 'Abena Mensah', date: '2025-01-05', readTime: '6 min read', slug: 'top-10-web-development-trends-2025', featured: false },
  { id: '4', title: 'How School Management Software Transforms Education', excerpt: 'Discover how digital school management systems are revolutionizing education administration in Ghana and across Africa.', category: 'Technology', author: 'Lightworld Technologies', date: '2024-12-28', readTime: '8 min read', slug: 'school-management-software-transforms-education-ghana', featured: true },
  { id: '5', title: 'UI/UX Design Principles Every Business Owner Should Know', excerpt: 'Understanding basic UI/UX design principles can help you make better decisions about your website and app projects.', category: 'Design', author: 'Abena Mensah', date: '2024-12-20', readTime: '5 min read', slug: 'ui-ux-design-principles-business-owners', featured: false },
  { id: '6', title: 'SEO Strategies to Grow Your Business Online in Ghana', excerpt: 'Learn effective SEO strategies specifically tailored for businesses operating in Ghana and the West African market.', category: 'SEO & Marketing', author: 'Kofi Amponsah', date: '2024-12-15', readTime: '6 min read', slug: 'seo-strategies-grow-business-online-ghana', featured: false },
];

const defaultCategories: CategoryCount[] = [
  { name: 'all', count: 6 },
  { name: 'Web Development', count: 1 },
  { name: 'Mobile Apps', count: 1 },
  { name: 'SEO & Marketing', count: 1 },
  { name: 'Technology', count: 1 },
  { name: 'Design', count: 1 },
  { name: 'Business', count: 1 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } },
};

export default function BlogPage() {
  const { navigate, blogSearch, setBlogSearch, blogCategory, setBlogCategory } = useAppStore();
  useSEO({
    title: 'Blog',
    description: 'Insights, tips, and trends from the Lightworld Technologies team. Expert articles on web development, mobile apps, SEO, digital marketing, and technology in Ghana.',
    keywords: ['tech blog Ghana', 'web development blog', 'mobile app trends', 'SEO tips', 'digital marketing Africa', 'IT insights'],
  });
  const [posts, setPosts] = useState<BlogPost[]>(defaultPosts);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState(blogSearch);
  const [categories, setCategories] = useState<CategoryCount[]>(defaultCategories);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const postsPerPage = 6;

  useEffect(() => {
    fetcher('/api/blog')
      .then((data) => {
        let mappedPosts: BlogPost[] = [];
        if (data.success && data.data?.posts) {
          mappedPosts = data.data.posts.map((p: Record<string, unknown>) => ({
            ...p,
            category: typeof p.category === 'object' ? (p.category as { name?: string }).name || 'Technology' : p.category,
            readTime: typeof p.readTime === 'number' ? `${p.readTime} min read` : p.readTime,
            date: p.date || p.createdAt,
          }));
        } else if (Array.isArray(data) && data.length > 0) {
          mappedPosts = data.map((p: Record<string, unknown>) => ({
            ...p,
            category: typeof p.category === 'object' ? (p.category as { name?: string }).name || 'Technology' : p.category,
            readTime: typeof p.readTime === 'number' ? `${p.readTime} min read` : p.readTime,
            date: p.date || p.createdAt,
          }));
        }
        if (mappedPosts.length > 0) setPosts(mappedPosts);

        // Build category counts from posts
        const counts: Record<string, number> = {};
        for (const post of (mappedPosts.length > 0 ? mappedPosts : defaultPosts)) {
          counts[post.category] = (counts[post.category] || 0) + 1;
        }
        const cats: CategoryCount[] = [{ name: 'all', count: mappedPosts.length > 0 ? mappedPosts.length : 6 }];
        for (const [name, count] of Object.entries(counts)) {
          cats.push({ name, count });
        }
        setCategories(cats);
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

  // Separate featured and regular posts, only show featured hero on first page with no filters
  const featuredPosts = filteredPosts.filter(p => p.featured);
  const regularPosts = filteredPosts.filter(p => !p.featured);
  const showFeaturedHero = page === 1 && !blogSearch && blogCategory === 'all' && featuredPosts.length > 0;
  const mainFeatured = showFeaturedHero ? featuredPosts[0] : null;
  const otherPostsForGrid = showFeaturedHero
    ? [...featuredPosts.slice(1), ...regularPosts]
    : filteredPosts;

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = otherPostsForGrid.slice(0, showFeaturedHero ? postsPerPage - 1 : postsPerPage);

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
            <button onClick={() => navigate('home')} className="hover:text-amber-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-amber-400">Blog</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-amber-400">Blog</span>
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
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
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
                {/* Mobile category pills with amber gradient when active */}
                <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => { setBlogCategory(cat.name); setPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize whitespace-nowrap flex items-center gap-1.5 ${
                        blogCategory === cat.name
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-emerald-600/25'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-amber-900/30 hover:text-emerald-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {cat.name === 'all' ? 'All' : cat.name}
                      <span className="text-xs opacity-70">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result count */}
              {!loading && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Showing <span className="font-medium text-slate-700 dark:text-slate-200">{(showFeaturedHero ? 1 : 0) + paginatedPosts.length}</span> of{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-200">{filteredPosts.length}</span> articles
                  {blogSearch && (
                    <span> matching &ldquo;<span className="text-emerald-600 dark:text-amber-400">{blogSearch}</span>&rdquo;</span>
                  )}
                </p>
              )}

              {/* Blog Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              ) : paginatedPosts.length > 0 || mainFeatured ? (
                <>
                  {/* Featured Hero Card - full width, large layout */}
                  {mainFeatured && (
                    <motion.div
                      className="mb-8"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card
                        className="group overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 h-full"
                        onClick={() => handlePostClick(mainFeatured.slug)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2">
                          {/* Image placeholder with gradient overlay */}
                          <div className="relative h-64 md:h-full min-h-[280px] bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 overflow-hidden">
                            <div className="absolute inset-0 grid-pattern opacity-20" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="size-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <Sparkles className="size-10 text-white/80" />
                              </div>
                            </div>
                            {/* Featured badge */}
                            <div className="absolute top-4 left-4">
                              <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs font-bold gap-1 shadow-lg">
                                <Star className="size-3 fill-amber-400" />
                                Featured
                              </Badge>
                            </div>
                          </div>
                          {/* Content */}
                          <div className="p-6 sm:p-8 flex flex-col justify-center bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-300 text-xs font-medium">
                                {mainFeatured.category}
                              </Badge>
                              <span className="text-xs text-slate-400 dark:text-slate-500">Editor&apos;s Pick</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-3 group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 text-slate-900 dark:text-white leading-snug">
                              {mainFeatured.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-5 line-clamp-3">
                              {mainFeatured.excerpt}
                            </p>
                            {/* Author row */}
                            <div className="flex items-center gap-3 mb-4">
                              <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-md">
                                <span className="text-white text-sm font-bold">{mainFeatured.author?.charAt(0) || 'L'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{mainFeatured.author}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="size-3" />
                                    {new Date(mainFeatured.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {mainFeatured.readTime}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-amber-400 font-semibold">
                              Read Article
                              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Regular blog cards grid */}
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    key={`${blogCategory}-${blogSearch}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <AnimatePresence mode="popLayout">
                      {paginatedPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          variants={itemVariants}
                          layout
                        >
                          <Card
                            className={`group overflow-hidden bg-white dark:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer h-full relative ${
                              post.featured ? 'ring-2 ring-amber-400/60 dark:ring-emerald-500/50' : ''
                            }`}
                            onClick={() => handlePostClick(post.slug)}
                          >
                            {/* Subtle gradient border on hover - implemented with a pseudo-element approach via wrapper */}
                            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none p-[1px]">
                              <div className="w-full h-full rounded-lg bg-gradient-to-br from-amber-400 via-transparent to-amber-400 dark:from-amber-500 dark:via-transparent dark:to-amber-500" />
                            </div>
                            <div className="relative">
                              <div className="h-48 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30 relative overflow-hidden transition-transform duration-500 group-hover:scale-[1.03]">
                                <div className="absolute inset-0 grid-pattern opacity-30" />
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 via-transparent to-transparent" />
                                <div className="absolute top-3 left-3">
                                  <Badge className="bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs backdrop-blur-sm">
                                    {post.category}
                                  </Badge>
                                </div>
                                {/* Featured badge */}
                                {post.featured && (
                                  <div className="absolute top-3 right-3">
                                    <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs font-semibold gap-1 shadow-sm">
                                      <Star className="size-3" />
                                      Featured
                                    </Badge>
                                  </div>
                                )}
                                {/* Read time badge */}
                                <div className="absolute bottom-3 right-3">
                                  <Badge className="bg-black/40 backdrop-blur-sm text-white text-[10px] gap-1 border-0">
                                    <Clock className="size-2.5" />
                                    {post.readTime}
                                  </Badge>
                                </div>
                              </div>
                              <CardContent className="p-5 flex flex-col h-full">
                                <h3 className="font-semibold text-lg mb-2 group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 text-slate-900 dark:text-white">
                                  {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-2">
                                  {post.excerpt}
                                </p>
                                {/* Author row */}
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                                    <span className="text-white text-[10px] font-bold">{post.author?.charAt(0) || 'L'}</span>
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{post.author}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700">
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
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-amber-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Read <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                                  </span>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {/* Load More Button */}
                  {filteredPosts.length > paginatedPosts.length + (mainFeatured ? 1 : 0) && (
                    <motion.div
                      className="flex justify-center mt-10"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Button
                        onClick={() => setPage(p => p + 1)}
                        className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-300 px-8 gap-2"
                      >
                        <ArrowRight className="size-4" />
                        Load More Articles
                      </Button>
                    </motion.div>
                  )}

                  {/* Pagination fallback */}
                  {totalPages > 1 && filteredPosts.length <= paginatedPosts.length + (mainFeatured ? 1 : 0) && (
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
                          className={page === i + 1 ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-emerald-600/25' : ''}
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
                      className="border-amber-300 dark:border-emerald-500 text-emerald-600 dark:text-amber-400"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar - Categories with glass card effect */}
            <aside className="lg:w-72 shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* Categories - glass card */}
                <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/50 dark:border-slate-700/50 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="size-4 text-emerald-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-slate-900 dark:text-white">Categories</h3>
                    </div>
                    <nav className="space-y-1" aria-label="Blog categories">
                      {categories.map((cat) => {
                        const isActive = blogCategory === cat.name;
                        return (
                          <button
                            key={cat.name}
                            onClick={() => { setBlogCategory(cat.name); setPage(1); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium shadow-md shadow-emerald-600/25'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <span className="capitalize">{cat.name === 'all' ? 'All Articles' : cat.name}</span>
                            <Badge
                              variant="secondary"
                              className={`text-xs h-5 min-w-[24px] justify-center px-1.5 ${
                                isActive
                                  ? 'bg-white/20 text-white border-0'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {cat.count}
                            </Badge>
                          </button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>

                {/* Popular Posts - glass card */}
                <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/50 dark:border-slate-700/50 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="size-4 text-amber-500" />
                      <h3 className="font-semibold text-slate-900 dark:text-white">Featured Posts</h3>
                    </div>
                    <div className="space-y-4">
                      {posts.filter(p => p.featured).slice(0, 3).map((post) => (
                        <button
                          key={post.id}
                          onClick={() => handlePostClick(post.slug)}
                          className="block w-full text-left group"
                        >
                          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 mb-1">
                            {post.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                            <Calendar className="size-3" />
                            <span>{new Date(post.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <Clock className="size-3" />
                            <span>{post.readTime}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* About Widget - glass card */}
                <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/50 dark:border-slate-700/50 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="size-4 text-emerald-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-slate-900 dark:text-white">About Our Blog</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Stay updated with the latest trends in technology, web development, mobile apps, and digital marketing from the team at Lightworld Technologies.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
