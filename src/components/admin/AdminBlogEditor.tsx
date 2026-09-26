'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import AdminMediaField from '@/components/admin/AdminMediaField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { readJsonResponse } from '@/lib/client-api';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  readTime: number;
  published: boolean;
  featured: boolean;
  categoryId: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminBlogEditor() {
  const { blogPostSlug, navigate } = useAppStore();
  const isEditing = !!blogPostSlug;
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [autoSlug, setAutoSlug] = useState(true);

  const [form, setForm] = useState<PostData>({
    title: '', slug: '', excerpt: '', content: '', coverImage: '',
    author: 'Lightworld Technologies', readTime: 5,
    published: false, featured: false, categoryId: '',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/blog/categories');
      if (res.ok) setCategories(await readJsonResponse<any>(res, 'Invalid server response'));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (!blogPostSlug) {
      setLoading(false);
      return;
    }
    async function fetchPost() {
      try {
        const res = await fetch(`/api/blog/${blogPostSlug}`);
        if (!res.ok) throw new Error('Post not found');
        const payload = await readJsonResponse<any>(res, 'Invalid server response');
        const post = payload.data || payload;
        setForm({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          coverImage: post.coverImage || '',
          author: post.author || 'Lightworld Technologies',
          readTime: post.readTime || 5,
          published: Boolean(post.published),
          featured: Boolean(post.featured),
          categoryId: post.categoryId || '',
        });
        setAutoSlug(false);
      } catch {
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [blogPostSlug]);

  const handleTitleChange = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      ...(autoSlug ? { slug: slugify(title) } : {}),
    }));
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, published: publish || form.published };

      let res: Response;
      if (isEditing && blogPostSlug) {
        res = await fetch(`/api/blog/${blogPostSlug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await readJsonResponse<any>(res, 'Invalid server response');
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(publish ? 'Post published' : 'Post saved');
      if (!isEditing) {
        navigate('admin-blog');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader
        eyebrow="Website & content"
        title={isEditing ? 'Edit Post' : 'New Post'}
        description={isEditing ? 'Update the article content, media, metadata and publication state.' : 'Create a new article with reusable media, metadata and publication controls.'}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('admin-blog')}>
              <ArrowLeft className="mr-2 size-4" /> Back to posts
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              {form.published ? 'Update' : 'Publish'}
            </Button>
          </>
        }
      />

      {/* Form */}
      <div className="border border-border rounded-xl bg-card p-6 space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="post-title">Title</Label>
          <Input
            id="post-title"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title"
            className="text-lg font-semibold"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-slug">Slug</Label>
          <Input
            id="post-slug"
            value={form.slug}
            onChange={(e) => { setForm(f => ({ ...f, slug: e.target.value })); setAutoSlug(false); }}
            placeholder="post-slug"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-excerpt">Excerpt</Label>
          <Textarea
            id="post-excerpt"
            value={form.excerpt}
            onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))}
            placeholder="Brief description of the post..."
            rows={2}
          />
        </div>

        <AdminMediaField
          label="Cover image"
          value={form.coverImage}
          onChange={(coverImage) => setForm((current) => ({ ...current, coverImage }))}
          help="Choose a reusable CMS image or enter an external image URL."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="post-category">Category</Label>
            <Select value={form.categoryId} onValueChange={(val) => setForm(f => ({ ...f, categoryId: val }))}>
              <SelectTrigger id="post-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="post-author">Author</Label>
            <Input
              id="post-author"
              value={form.author}
              onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))}
              placeholder="Author name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="post-readtime">Read Time (minutes)</Label>
            <Input
              id="post-readtime"
              type="number"
              min={1}
              value={form.readTime}
              onChange={(e) => setForm(f => ({ ...f, readTime: parseInt(e.target.value) || 5 }))}
            />
          </div>
          <div className="flex items-center gap-6 pt-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(checked) => setForm(f => ({ ...f, published: checked }))} />
              <Label>Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={(checked) => setForm(f => ({ ...f, featured: checked }))} />
              <Label>Featured</Label>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-content">Content (Markdown)</Label>
          <Textarea
            id="post-content"
            value={form.content}
            onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Write your blog post content here... (Markdown supported)"
            rows={20}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
