import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const testimonials = await db.testimonial.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(testimonials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, company, role, content, image, rating, active, order } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
    }

    const testimonial = await db.testimonial.create({
      data: {
        name, content,
        company: company || '', role: role || '',
        image: image || '', rating: rating || 5,
        active: active !== false, order: order || 0,
      },
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 });
  }
}
