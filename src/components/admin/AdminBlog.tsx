'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Eye, Star, StarOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { readJsonResponse } from '@/lib/client-api';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
  category?: { name: string } | null;
}

const categoryColors: Record<string, string> = {
  'Technology': 'border-l-blue-500 dark:border-l-blue-400',
  'Web Development': 'border-l-amber-500 dark:border-l-amber-400',
  'Mobile Apps': 'border-l-violet-500 dark:border-l-violet-400',
  'Digital Marketing': 'border-l-amber-500 dark:border-l-amber-400',
  'Cloud Solutions': 'border-l-cyan-500 dark:border-l-cyan-400',
  'Design': 'border-l-pink-500 dark:border-l-pink-400',
};

const defaultCategoryBorder = 'border-l-slate-400 dark:border-l-slate-500';

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState('');
  const { navigate, blogPostSlug } = useAppStore();

  const filteredPosts = posts.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || (p.category?.name || '').toLowerCase().includes(q);
  });

  const fetchPosts = useCallback(async (f: string = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (f === 'published') params.set('published', 'true');
      if (f === 'draft') params.set('published', 'false');
      if (f === 'featured') params.set('featured', 'true');
      const res = await fetch(`/api/blog?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const payload = await readJsonResponse<any>(res, 'Invalid server response');
      setPosts(Array.isArray(payload) ? payload : (payload.data || []));
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleTabChange = (value: string) => {
    setFilter(value);
    fetchPosts(value);
  };

  const handleCreate = () => {
    navigate('admin-blog-editor');
  };

  const handleEdit = (post: BlogPost) => {
    navigate('admin-blog-editor', post.id);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/blog/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Post deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchPosts();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const toggleFeatured = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !post.featured }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchPosts();
    } catch {
      toast.error('Failed to update post');
    }
  };

  const togglePublished = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchPosts();
    } catch {
      toast.error('Failed to update post');
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <AdminPageHeader
        eyebrow="Website & content"
        title="Blog Posts"
        description={posts.length + ' post' + (posts.length === 1 ? '' : 's') + ' in the publishing workspace.'}
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 size-4" /> New Post
            </Button>
          </motion.div>
        }
      />

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts by title or category..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 transition-all duration-200"
        />
      </div>

      <Tabs value={filter} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="max-w-full overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table exportFileName="lightworld-blog-posts">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
                  <TableHead className="text-xs font-semibold">Title</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-center hidden md:table-cell">Featured</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Date</TableHead>
                  <TableHead data-export-ignore className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search ? 'No posts match your search.' : 'No posts found. Create your first blog post!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow key={post.id} onClick={() => handleEdit(post)} className={`cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200 border-l-[3px] ${categoryColors[post.category?.name || ''] || defaultCategoryBorder}`}>
                      <TableCell className="font-medium text-sm max-w-[250px] truncate">{post.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {post.category?.name || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={(event) => { event.stopPropagation(); void togglePublished(post); }} className="cursor-pointer">
                          <Badge className={
                            post.published
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-sm'
                              : 'bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500 text-white border-0'
                          }>
                            {post.published ? 'Active' : 'Draft'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <button onClick={(event) => { event.stopPropagation(); void toggleFeatured(post); }} className="cursor-pointer">
                          {post.featured ? (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 mx-auto" />
                          ) : (
                            <StarOff className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-export-ignore className="text-right">
                      <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); handleEdit(post); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setDeleting(post); setDeleteOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
