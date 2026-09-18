import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { newsletterConfirmation, sendTransactionalMail } from '@/lib/mail';

export const runtime = 'nodejs';

const subscribeSchema = z.object({
  email: z.string().email('Valid email is required').transform((value) => value.trim().toLowerCase()),
});

async function sendConfirmation(email: string) {
  try {
    await sendTransactionalMail(newsletterConfirmation(email));
    return true;
  } catch (error) {
    console.error('Newsletter confirmation email failed:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = subscribeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email;
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } });

    let subscriber;
    let created = false;

    if (existing) {
      subscriber = existing.active
        ? existing
        : await db.newsletterSubscriber.update({
            where: { email },
            data: { active: true },
          });
    } else {
      subscriber = await db.newsletterSubscriber.create({ data: { email } });
      created = true;
    }

    const emailSent = await sendConfirmation(email);

    return NextResponse.json(
      {
        success: true,
        data: subscriber,
        emailSent,
        message: emailSent
          ? 'Subscribed. A confirmation email is on its way.'
          : 'Subscribed successfully. Confirmation email delivery is temporarily delayed.',
      },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 },
    );
  }
}
