import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual FAQ
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const faq = await db.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: faq });
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FAQ' },
      { status: 500 }
    );
  }
}

// PUT update FAQ
const updateFAQSchema = z.object({
  question: z.string().min(1, 'Question is required').optional(),
  answer: z.string().min(1, 'Answer is required').optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateFAQSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.fAQ.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    const faq = await db.fAQ.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: faq });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update FAQ' },
      { status: 500 }
    );
  }
}

// DELETE FAQ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.fAQ.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    await db.fAQ.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete FAQ' },
      { status: 500 }
    );
  }
}
