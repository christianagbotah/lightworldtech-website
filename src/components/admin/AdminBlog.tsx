'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, Star, StarOff } from 'lucide-react';
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

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);
  const { navigate, blogPostSlug } = useAppStore();

  const fetchPosts = useCallback(async (f: string = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f !== 'all') params.set('filter', f);
      const res = await fetch(`/api/blog?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setPosts(await res.json());
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-muted-foreground text-sm mt-1">{posts.length} posts</p>
        </div>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> New Post
        </Button>
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
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Title</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-center hidden md:table-cell">Featured</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No posts found. Create your first blog post!
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium text-sm max-w-[250px] truncate">{post.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {post.category?.name || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => togglePublished(post)} className="cursor-pointer">
                          <Badge className={
                            post.published
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }>
                            {post.published ? 'Published' : 'Draft'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <button onClick={() => toggleFeatured(post)} className="cursor-pointer">
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setDeleting(post); setDeleteOpen(true); }}>
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
