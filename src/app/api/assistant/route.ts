import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { answerCompanyQuestion } from '@/lib/company-profile';

const schema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Please enter a message.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reply: answerCompanyQuestion(parsed.data.message),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        reply: 'I could not answer that right now. Please contact Lightworld at mail@lightworldtech.com or +233 (024) 361 8186.',
      },
      { status: 500 },
    );
  }
}
