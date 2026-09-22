import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { answerConcierge } from '@/lib/assistant-knowledge';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

export const runtime = 'nodejs';

const scopeStateSchema = z.object({
  mode: z.literal('project-scope'),
  step: z.enum(['service', 'goal', 'users', 'timeline', 'done']),
  answers: z.object({
    service: z.string().max(300).optional(),
    goal: z.string().max(600).optional(),
    users: z.string().max(400).optional(),
    timeline: z.string().max(300).optional(),
  }),
});

const historyTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1000),
});

const schema = z.object({
  message: z.string().trim().min(1).max(1000),
  state: scopeStateSchema.nullable().optional(),
  history: z.array(historyTurnSchema).max(10).optional(),
});

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'assistant', 40, 5 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        reply: 'The assistant has received several requests from this connection. Please try again shortly, or use the Contact page to reach Lightworld.',
      },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid message.' },
        { status: 400 },
      );
    }

    const answer = await answerConcierge(
      parsed.data.message,
      parsed.data.state ?? null,
      parsed.data.history ?? [],
    );

    return NextResponse.json({
      success: true,
      ...answer,
    });
  } catch (error) {
    console.error('Assistant request failed:', error);
    return NextResponse.json(
      {
        success: false,
        reply: 'I could not answer that right now. Please contact Lightworld at mail@lightworldtech.com or 0243618186.',
      },
      { status: 500 },
    );
  }
}
