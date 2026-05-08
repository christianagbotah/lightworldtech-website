import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all FAQs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');

    const faqs = await db.fAQ.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}

// POST create FAQ
const createFAQSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  order: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createFAQSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const faq = await db.fAQ.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: faq }, { status: 201 });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create FAQ' },
      { status: 500 }
    );
  }
}
