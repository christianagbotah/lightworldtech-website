import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { buildNewsletterCampaignMessage } from '@/lib/newsletter-campaign';
import { sanitizeMailError, sendTransactionalMail } from '@/lib/mail';

export const runtime = 'nodejs';

const sendSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('test'),
    email: z.string().trim().email(),
  }),
  z.object({
    mode: z.literal('batch'),
    batchSize: z.number().int().min(1).max(10).optional().default(10),
  }),
]);

async function runLimited<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await worker(items[index]);
      }
    },
  );
  await Promise.all(workers);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid send request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const campaign = await db.newsletterCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (parsed.data.mode === 'test') {
      const message = buildNewsletterCampaignMessage(
        campaign,
        { id: 'campaign-test', email: parsed.data.email },
        { test: true },
      );

      try {
        const result = await sendTransactionalMail(message);
        await db.newsletterDelivery.create({
          data: {
            recipient: parsed.data.email,
            kind: 'campaign_test',
            subject: campaign.subject,
            status: 'sent',
            transport: result.transport,
          },
        });
        return NextResponse.json({
          success: true,
          message: 'Campaign test accepted by the outbound mail transport.',
          data: { transport: result.transport },
        });
      } catch (error) {
        const safe = sanitizeMailError(error);
        await db.newsletterDelivery.create({
          data: {
            recipient: parsed.data.email,
            kind: 'campaign_test',
            subject: campaign.subject,
            status: 'failed',
            error: safe,
          },
        }).catch((auditError) => console.error('Campaign test audit failed:', auditError));

        return NextResponse.json(
          { success: false, error: 'Campaign test failed', details: safe },
          { status: 502 },
        );
      }
    }

    if (!['ready', 'sending'].includes(campaign.status)) {
      return NextResponse.json(
        {
          success: false,
          error: campaign.status === 'sent'
            ? 'This campaign has already been sent'
            : 'Mark the campaign Ready before sending to subscribers',
        },
        { status: 409 },
      );
    }

    const staleBefore = new Date(Date.now() - 15 * 60_000);
    const subscribers = await db.newsletterSubscriber.findMany({
      where: {
        active: true,
        OR: [
          { campaignDeliveries: { none: { campaignId: id } } },
          { campaignDeliveries: { some: { campaignId: id, status: 'failed' } } },
          {
            campaignDeliveries: {
              some: { campaignId: id, status: 'sending', updatedAt: { lt: staleBefore } },
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: parsed.data.batchSize,
      select: { id: true, email: true },
    });

    await db.newsletterCampaign.update({
      where: { id },
      data: { status: 'sending' },
    });

    let sentThisBatch = 0;
    let failedThisBatch = 0;

    await runLimited(subscribers, 3, async (subscriber) => {
      await db.newsletterCampaignDelivery.upsert({
        where: {
          campaignId_subscriberId: {
            campaignId: id,
            subscriberId: subscriber.id,
          },
        },
        create: {
          campaignId: id,
          subscriberId: subscriber.id,
          recipient: subscriber.email,
          status: 'sending',
          attempts: 1,
        },
        update: {
          recipient: subscriber.email,
          status: 'sending',
          error: '',
          attempts: { increment: 1 },
        },
      });

      const message = buildNewsletterCampaignMessage(campaign, subscriber);

      try {
        const result = await sendTransactionalMail(message);
        sentThisBatch += 1;
        await db.newsletterCampaignDelivery.update({
          where: {
            campaignId_subscriberId: {
              campaignId: id,
              subscriberId: subscriber.id,
            },
          },
          data: {
            status: 'sent',
            transport: result.transport,
            error: '',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        failedThisBatch += 1;
        await db.newsletterCampaignDelivery.update({
          where: {
            campaignId_subscriberId: {
              campaignId: id,
              subscriberId: subscriber.id,
            },
          },
          data: {
            status: 'failed',
            error: sanitizeMailError(error),
          },
        });
      }
    });

    const [activeSubscribers, sentCount, failedCount] = await Promise.all([
      db.newsletterSubscriber.count({ where: { active: true } }),
      db.newsletterCampaignDelivery.count({ where: { campaignId: id, status: 'sent' } }),
      db.newsletterCampaignDelivery.count({ where: { campaignId: id, status: 'failed' } }),
    ]);

    const remaining = Math.max(0, activeSubscribers - sentCount);
    const finalStatus = remaining === 0 ? 'sent' : 'sending';

    await db.newsletterCampaign.update({
      where: { id },
      data: {
        status: finalStatus,
        ...(finalStatus === 'sent' ? { sentAt: new Date() } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        status: finalStatus,
        processed: subscribers.length,
        sentThisBatch,
        failedThisBatch,
        activeSubscribers,
        sent: sentCount,
        failed: failedCount,
        remaining,
      },
      message:
        finalStatus === 'sent'
          ? 'Campaign delivery is complete.'
          : 'Batch processed. Continue sending until remaining reaches zero.',
    });
  } catch (error) {
    console.error('Newsletter campaign send failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to process campaign delivery', details: sanitizeMailError(error) },
      { status: 500 },
    );
  }
}
