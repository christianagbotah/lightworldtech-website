import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all blog posts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const published = searchParams.get('published');
    const featured = searchParams.get('featured');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (published !== null && published !== undefined) {
      where.published = published === 'true';
    }

    if (featured !== null && featured !== undefined) {
      where.featured = featured === 'true';
    }

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.blogPost.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

// POST create blog post
const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  excerpt: z.string().optional().default(''),
  content: z.string().optional().default(''),
  coverImage: z.string().optional().default(''),
  author: z.string().optional().default('Lightworld Technologies'),
  published: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  readTime: z.number().int().min(1).optional().default(5),
  categoryId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await db.blogPost.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }

    // If categoryId is provided, check it exists
    if (parsed.data.categoryId) {
      const categoryExists = await db.blogCategory.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { success: false, error: 'Category not found' },
          { status: 400 }
        );
      }
    }

    const post = await db.blogPost.create({
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
