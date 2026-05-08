import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual blog post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await db.blogPost.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

// PUT update blog post
const updateBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  coverImage: z.string().optional(),
  author: z.string().optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  readTime: z.number().int().min(1).optional(),
  categoryId: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check for duplicate slug if being updated
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const duplicate = await db.blogPost.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'A post with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const post = await db.blogPost.update({
      where: { id },
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

// DELETE blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    await db.blogPost.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}
