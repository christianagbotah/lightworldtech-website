import 'server-only';

import { db } from '@/lib/db';
import { buildNewsletterCampaignMessage } from '@/lib/newsletter-campaign';
import { sanitizeMailError, sendTransactionalMail } from '@/lib/mail';

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

export async function dispatchNewsletterCampaignBatch(
  campaignId: string,
  requestedBatchSize = 10,
) {
  const batchSize = Math.max(1, Math.min(10, requestedBatchSize));
  const campaign = await db.newsletterCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found');
  if (!['ready', 'sending'].includes(campaign.status)) {
    throw new Error(
      campaign.status === 'sent'
        ? 'This campaign has already been sent'
        : 'Mark the campaign Ready before sending to subscribers',
    );
  }

  const staleBefore = new Date(Date.now() - 15 * 60_000);
  const subscribers = await db.newsletterSubscriber.findMany({
    where: {
      active: true,
      OR: [
        { campaignDeliveries: { none: { campaignId } } },
        { campaignDeliveries: { some: { campaignId, status: 'failed' } } },
        {
          campaignDeliveries: {
            some: { campaignId, status: 'sending', updatedAt: { lt: staleBefore } },
          },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
    select: { id: true, email: true },
  });

  await db.newsletterCampaign.update({
    where: { id: campaignId },
    data: { status: 'sending' },
  });

  let sentThisBatch = 0;
  let failedThisBatch = 0;

  await runLimited(subscribers, 3, async (subscriber) => {
    await db.newsletterCampaignDelivery.upsert({
      where: {
        campaignId_subscriberId: {
          campaignId,
          subscriberId: subscriber.id,
        },
      },
      create: {
        campaignId,
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
            campaignId,
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
            campaignId,
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
    db.newsletterCampaignDelivery.count({ where: { campaignId, status: 'sent' } }),
    db.newsletterCampaignDelivery.count({ where: { campaignId, status: 'failed' } }),
  ]);

  const remaining = Math.max(0, activeSubscribers - sentCount);
  const finalStatus = remaining === 0 ? 'sent' : 'sending';
  await db.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      ...(finalStatus === 'sent' ? { sentAt: new Date() } : {}),
    },
  });

  return {
    status: finalStatus,
    processed: subscribers.length,
    sentThisBatch,
    failedThisBatch,
    activeSubscribers,
    sent: sentCount,
    failed: failedCount,
    remaining,
  };
}

export async function dispatchDueNewsletterCampaigns() {
  const enabled = process.env.AUTO_NEWSLETTER_CAMPAIGN_DISPATCH === 'true';
  if (!enabled) {
    return { enabled: false, considered: 0, processed: 0, completed: 0, failed: 0 };
  }

  const configuredBatch = Number(process.env.NEWSLETTER_CAMPAIGN_BATCH_SIZE || 10);
  const batchSize = Math.max(1, Math.min(10, Number.isFinite(configuredBatch) ? configuredBatch : 10));
  const configuredCampaigns = Number(process.env.NEWSLETTER_CAMPAIGNS_PER_RUN || 2);
  const campaignLimit = Math.max(1, Math.min(4, Number.isFinite(configuredCampaigns) ? configuredCampaigns : 2));
  const now = new Date();

  const campaigns = await db.newsletterCampaign.findMany({
    where: {
      scheduledAt: { not: null, lte: now },
      status: { in: ['ready', 'sending'] },
    },
    orderBy: [{ scheduledAt: 'asc' }, { updatedAt: 'asc' }],
    take: campaignLimit,
    select: { id: true },
  });

  let processed = 0;
  let completed = 0;
  let failed = 0;
  for (const campaign of campaigns) {
    try {
      const result = await dispatchNewsletterCampaignBatch(campaign.id, batchSize);
      processed += 1;
      if (result.status === 'sent') completed += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    enabled: true,
    considered: campaigns.length,
    processed,
    completed,
    failed,
    batchSize,
    campaignLimit,
  };
}
