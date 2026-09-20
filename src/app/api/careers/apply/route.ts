import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  careersApplicationMessage,
  careersApplicationSchema,
} from '@/lib/careers-application';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'careers-apply', 6, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many application submissions. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = careersApplicationSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid application',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const application = parsed.data;

    await db.contactMessage.create({
      data: {
        name: application.name,
        email: application.email,
        phone: application.phone,
        subject: 'Job Application: ' + application.position,
        message: careersApplicationMessage(application),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully!',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Career application submission failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application.' },
      { status: 500 },
    );
  }
}
