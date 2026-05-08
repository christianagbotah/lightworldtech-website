import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all contact messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.contactMessage.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contactMessage.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact messages' },
      { status: 500 }
    );
  }
}

// POST submit contact form
const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  message: z.string().min(1, 'Message is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const message = await db.contactMessage.create({
      data: parsed.data,
    });

    return NextResponse.json(
      { success: true, data: message, message: 'Message sent successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contact message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
