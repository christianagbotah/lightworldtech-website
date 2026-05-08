import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// POST subscribe to newsletter
const subscribeSchema = z.object({
  email: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await db.newsletterSubscriber.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      if (existing.active) {
        return NextResponse.json(
          { success: false, error: 'This email is already subscribed' },
          { status: 400 }
        );
      }

      // Re-activate
      const subscriber = await db.newsletterSubscriber.update({
        where: { email: parsed.data.email },
        data: { active: true },
      });

      return NextResponse.json({
        success: true,
        data: subscriber,
        message: 'Subscription reactivated successfully',
      });
    }

    const subscriber = await db.newsletterSubscriber.create({
      data: { email: parsed.data.email },
    });

    return NextResponse.json(
      {
        success: true,
        data: subscriber,
        message: 'Subscribed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
