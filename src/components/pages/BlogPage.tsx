'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Calendar, FileX, Keyboard, ArrowRight, Sparkles } from 'lucide-react';
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

const categoryColors: Record<string, string> = {
  'all': 'bg-white/10 text-white/70',
  'Business': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Mobile Apps': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Web Development': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'Technology': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Design': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'SEO & Marketing': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

const categoryBadgeColors: Record<string, string> = {
  'Business': 'bg-amber-500/15 text-amber-300',
  'Mobile Apps': 'bg-violet-500/15 text-violet-300',
  'Web Development': 'bg-cyan-500/15 text-cyan-300',
  'Technology': 'bg-emerald-500/15 text-emerald-300',
  'Design': 'bg-pink-500/15 text-pink-300',
  'SEO & Marketing': 'bg-orange-500/15 text-orange-300',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
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
  const [localSearch, setLocalSearch] = useState(blogSearch);
  const [categories, setCategories] = useState<CategoryCount[]>(defaultCategories);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetcher('/api/blog')
      .then((data) => {
        let mappedPosts: BlogPost[] = [];
        if (data.success && data.data?.posts) {
          mappedPosts = data.data.posts.map((p: Record<string, unknown>) => ({
            ...p,
            category: typeof p.category === 'object' ? (p.category as { name?: string }).name || 'Technology' : p.category,
            readTime: typeof p.readTime === 'number' ? p.readTime + ' min read' : p.readTime,
            date: p.date || p.createdAt,
          }));
        } else if (Array.isArray(data) && data.length > 0) {
          mappedPosts = data.map((p: Record<string, unknown>) => ({
            id: String(p.id || ''),
            title: String(p.title || ''),
            excerpt: String(p.excerpt || ''),
            category: typeof p.category === 'object' ? (p.category as { name?: string }).name || 'Technology' : String(p.category || 'Technology'),
            author: String(p.author || ''),
            date: String(p.date || p.createdAt || ''),
            readTime: typeof p.readTime === 'number' ? p.readTime + ' min read' : String(p.readTime || ''),
            slug: String(p.slug || ''),
            featured: p.featured === true,
          }));
        }
        if (mappedPosts.length > 0) setPosts(mappedPosts);

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

  const handlePostClick = (slug: string) => {
    navigate('blog-detail', slug);
  };

  return (
    <main className="h-[calc(100vh-5rem)] overflow-hidden bg-[#0a0f1a] flex flex-col">
      {/* Compact Title Bar */}
      <div className="shrink-0 px-4 lg:px-8 pt-4 pb-3">
        <div className="flex flex-col gap-3">
          {/* Row 1: Badge + Title + Search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <Sparkles className="size-3" />
                Blog
              </span>
              <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                Insights &amp; Articles
              </h1>
            </div>

            <div className="flex-1" />

            {/* Search input - compact */}
            <div className="relative w-48 lg:w-64 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
              <Input
                ref={searchInputRef}
                placeholder="Search articles..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 pl-8 pr-12 text-sm bg-white/[0.04] border-white/[0.08] rounded-lg text-white placeholder:text-white/30 focus:border-emerald-500/40 focus:ring-emerald-500/20"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 font-mono text-xs font-medium text-white/25">
                <Keyboard className="size-2" />
                {'⌘'}K
              </kbd>
            </div>
          </div>

          {/* Row 2: Category filter pills + result count */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setBlogCategory(cat.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize whitespace-nowrap border ${
                    blogCategory === cat.name
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-white border-transparent shadow-md shadow-emerald-500/20'
                      : categoryColors[cat.name] || 'bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-white/[0.08]'
                  }`}
                >
                  {cat.name === 'all' ? 'All' : cat.name}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {!loading && (
              <span className="text-xs text-white/30 shrink-0 hidden sm:block">
                {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
                {blogSearch && (
                  <span className="text-emerald-400/60"> {'·'} &ldquo;{blogSearch}&rdquo;</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="flex-1 min-h-0 px-4 lg:px-8 pb-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 lg:p-4 flex flex-col gap-2.5"
              >
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-14" />
                  <div className="flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 h-full"
            key={`${blogCategory}-${blogSearch}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  variants={itemVariants}
                  layout
                  className={`group cursor-pointer rounded-xl p-3 lg:p-4 flex flex-col transition-all duration-300 hover:bg-white/[0.05] ${
                    post.featured
                      ? 'bg-white/[0.03] border border-emerald-500/20 shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_-4px_rgba(16,185,129,0.25)]'
                      : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1]'
                  }`}
                  onClick={() => handlePostClick(post.slug)}
                >
                  {/* Category badge */}
                  <span className={`inline-flex self-start px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${
                    categoryBadgeColors[post.category] || 'bg-white/10 text-white/60'
                  }`}>
                    {post.category}
                  </span>

                  {/* Title - 2 lines max */}
                  <h3 className="text-sm lg:text-[15px] font-semibold text-white leading-snug line-clamp-2 mb-1.5 group-hover:text-emerald-300 transition-colors">
                    {post.title}
                  </h3>

                  {/* Excerpt - 2 lines */}
                  <p className="text-xs text-white/35 leading-relaxed line-clamp-2 mb-auto">
                    {post.excerpt}
                  </p>

                  {/* Meta row: author, date, read time, read more */}
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
                    {/* Author avatar */}
                    <div className={`size-5 rounded-full flex items-center justify-center shrink-0 ${
                      post.featured
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                        : 'bg-white/10'
                    }`}>
                      <span className="text-white text-[8px] font-bold">
                        {post.author?.charAt(0) || 'L'}
                      </span>
                    </div>
                    <span className="text-xs text-white/50 truncate max-w-[80px] lg:max-w-none">
                      {post.author}
                    </span>

                    <div className="flex-1" />

                    <span className="hidden sm:flex items-center gap-1 text-xs text-white/25">
                      <Calendar className="size-2.5" />
                      {new Date(post.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    </span>

                    <span className="hidden sm:flex items-center gap-1 text-xs text-white/25">
                      <Clock className="size-2.5" />
                      {post.readTime}
                    </span>

                    <span className="flex items-center gap-0.5 text-xs text-emerald-400/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Read <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="size-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
              <FileX className="size-6 text-white/25" />
            </div>
            <h3 className="text-sm font-medium text-white/50 mb-1">No results found</h3>
            <p className="text-xs text-white/30 mb-4 text-center max-w-xs">
              We couldn&apos;t find any articles matching your search. Try different keywords or clear the filters.
            </p>
            <button
              onClick={() => {
                setBlogSearch('');
                setLocalSearch('');
                setBlogCategory('all');
              }}
              className="px-4 py-1.5 rounded-full text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
