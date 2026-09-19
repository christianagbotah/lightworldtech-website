import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  getMailTransportStatus,
  mailTransportTest,
  sanitizeMailError,
  sendTransactionalMail,
} from '@/lib/mail';

export const runtime = 'nodejs';

const testSchema = z.object({
  action: z.literal('test'),
  email: z.string().trim().email(),
});

async function recordTestDelivery(input: {
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  transport: string;
  error?: string;
}) {
  try {
    await db.newsletterDelivery.create({
      data: {
        subscriberId: null,
        recipient: input.recipient,
        kind: 'transport_test',
        subject: input.subject,
        status: input.status,
        transport: input.transport,
        error: input.error || '',
      },
    });
  } catch (error) {
    console.error('Mail test delivery audit failed:', error);
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(searchParams.get('limit') || '50', 10) || 50));
    const skip = (page - 1) * limit;

    const [
      subscribers,
      totalSubscribers,
      activeSubscribers,
      sentDeliveries,
      failedDeliveries,
      recentDeliveries,
    ] = await Promise.all([
      db.newsletterSubscriber.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.newsletterSubscriber.count(),
      db.newsletterSubscriber.count({ where: { active: true } }),
      db.newsletterDelivery.count({ where: { status: 'sent' } }),
      db.newsletterDelivery.count({ where: { status: 'failed' } }),
      db.newsletterDelivery.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscribers,
        deliveries: recentDeliveries,
        summary: {
          totalSubscribers,
          activeSubscribers,
          inactiveSubscribers: Math.max(0, totalSubscribers - activeSubscribers),
          sentDeliveries,
          failedDeliveries,
        },
        transport: getMailTransportStatus(),
      },
      pagination: {
        page,
        limit,
        total: totalSubscribers,
        totalPages: Math.max(1, Math.ceil(totalSubscribers / limit)),
      },
    });
  } catch (error) {
    console.error('Failed to load newsletter operations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load newsletter operations' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = testSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'A valid test email address is required' },
      { status: 400 },
    );
  }

  const message = mailTransportTest(parsed.data.email);

  try {
    const result = await sendTransactionalMail(message);
    await recordTestDelivery({
      recipient: parsed.data.email,
      subject: message.subject,
      status: 'sent',
      transport: result.transport,
    });

    return NextResponse.json({
      success: true,
      data: {
        transport: result.transport,
        recipient: parsed.data.email,
      },
      message: 'Test email accepted by the outbound mail transport.',
    });
  } catch (error) {
    const transport = getMailTransportStatus().mode;
    const details = sanitizeMailError(error);
    await recordTestDelivery({
      recipient: parsed.data.email,
      subject: message.subject,
      status: 'failed',
      transport,
      error: details,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Mail transport test failed',
        details,
        transport,
      },
      { status: 502 },
    );
  }
}
