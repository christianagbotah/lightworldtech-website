import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

export const runtime = 'nodejs';

const metadataSchema = z.record(
  z.string().max(80),
  z.union([z.string().max(300), z.number().finite(), z.boolean()]),
).default({});

const analyticsSchema = z.object({
  sessionId: z.string().trim().min(8).max(120),
  event: z.enum([
    'session_start',
    'page_view',
    'assistant_open',
    'assistant_message',
    'assistant_project_scope',
    'assistant_feedback',
    'whatsapp_open',
    'contact_submit',
    'newsletter_subscribe',
    'cta_click',
  ]),
  path: z.string().trim().min(1).max(240).default('/'),
  referrer: z.string().trim().max(160).default(''),
  metadata: metadataSchema,
});

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'analytics', 240, 60_000);
  if (!rate.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfterSeconds) },
    });
  }

  try {
    const parsed = analyticsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await db.analyticsEvent.create({
      data: {
        sessionId: parsed.data.sessionId,
        event: parsed.data.event,
        path: parsed.data.path.startsWith('/') ? parsed.data.path : '/',
        referrer: parsed.data.referrer,
        metadata: JSON.stringify(parsed.data.metadata),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // Analytics failure should be quiet for public callers.
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
