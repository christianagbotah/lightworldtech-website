import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  getMailTransportStatus,
  newsletterConfirmation,
  sanitizeMailError,
  sendTransactionalMail,
} from '@/lib/mail';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

export const runtime = 'nodejs';

const subscribeSchema = z.object({
  email: z.string().email('Valid email is required').transform((value) => value.trim().toLowerCase()),
});

async function recordDelivery(input: {
  subscriberId: string | null;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  transport: string;
  error?: string;
}) {
  try {
    await db.newsletterDelivery.create({
      data: {
        subscriberId: input.subscriberId,
        recipient: input.recipient,
        kind: 'confirmation',
        subject: input.subject,
        status: input.status,
        transport: input.transport,
        error: input.error || '',
      },
    });
  } catch (error) {
    console.error('Newsletter delivery audit failed:', error);
  }
}

async function sendConfirmation(subscriberId: string, email: string) {
  const message = newsletterConfirmation(email);

  try {
    const result = await sendTransactionalMail(message);
    await recordDelivery({
      subscriberId,
      recipient: email,
      subject: message.subject,
      status: 'sent',
      transport: result.transport,
    });
    return { sent: true, transport: result.transport };
  } catch (error) {
    const transport = getMailTransportStatus().mode;
    console.error('Newsletter confirmation email failed:', error);
    await recordDelivery({
      subscriberId,
      recipient: email,
      subject: message.subject,
      status: 'failed',
      transport,
      error: sanitizeMailError(error),
    });
    return { sent: false, transport };
  }
}

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'newsletter', 10, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many subscription requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

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

    const delivery = await sendConfirmation(subscriber.id, email);

    return NextResponse.json(
      {
        success: true,
        data: subscriber,
        emailSent: delivery.sent,
        message: delivery.sent
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
