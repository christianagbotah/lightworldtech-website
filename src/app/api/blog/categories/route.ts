import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all blog categories
export async function GET() {
  try {
    const categories = await db.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog categories' },
      { status: 500 }
    );
  }
}

// POST create blog category
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await db.blogCategory.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A category with this slug already exists' },
        { status: 400 }
      );
    }

    const category = await db.blogCategory.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create blog category' },
      { status: 500 }
    );
  }
}
