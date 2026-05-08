import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual testimonial
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const testimonial = await db.testimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch testimonial' },
      { status: 500 }
    );
  }
}

// PUT update testimonial
const updateTestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  content: z.string().min(1, 'Content is required').optional(),
  image: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTestimonialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    const testimonial = await db.testimonial.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

// DELETE testimonial
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    await db.testimonial.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}
