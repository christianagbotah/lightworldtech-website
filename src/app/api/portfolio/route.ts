import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all portfolio projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');
    const featured = searchParams.get('featured');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};

    if (activeOnly === 'true') {
      where.active = true;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (category) {
      where.category = category;
    }

    const projects = await db.portfolioProject.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching portfolio projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio projects' },
      { status: 500 }
    );
  }
}

// POST create portfolio project
const createPortfolioSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  url: z.string().optional().default(''),
  category: z.string().optional().default(''),
  technologies: z.string().optional().default('[]'),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPortfolioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await db.portfolioProject.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portfolio project' },
      { status: 500 }
    );
  }
}
