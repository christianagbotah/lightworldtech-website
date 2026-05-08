import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all testimonials
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');

    const testimonials = await db.testimonial.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

// POST create testimonial
const createTestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional().default(''),
  role: z.string().optional().default(''),
  content: z.string().min(1, 'Content is required'),
  image: z.string().optional().default(''),
  rating: z.number().int().min(1).max(5).optional().default(5),
  active: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTestimonialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const testimonial = await db.testimonial.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: testimonial }, { status: 201 });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}
