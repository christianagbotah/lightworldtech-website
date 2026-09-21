import 'server-only';

import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import {
  hubtelConfiguration,
  normalizePhone,
  renderSmsTemplate,
  sendHubtelSms,
} from '@/lib/hubtel';

function safeVariables(value: string): Record<string, string | number> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, item]) => ['string', 'number'].includes(typeof item)),
    ) as Record<string, string | number>;
  } catch {
    return {};
  }
}

function reference(prefix = 'SMS'): string {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + randomUUID().slice(0, 8).toUpperCase();
}

export async function queueSingleSms(input: {
  recipient: string;
  senderId: string;
  content: string;
  templateId?: string | null;
  scheduledAt?: Date | null;
  createdBy: string;
}) {
  const recipient = normalizePhone(input.recipient);
  const scheduledAt = input.scheduledAt || null;
  const shouldSchedule = Boolean(scheduledAt && scheduledAt.getTime() > Date.now());

  const message = await db.smsMessage.create({
    data: {
      recipient,
      senderId: input.senderId,
      content: input.content.trim(),
      templateId: input.templateId || null,
      clientReference: reference(),
      status: shouldSchedule ? 'scheduled' : 'queued',
      scheduledAt,
      createdBy: input.createdBy,
    },
  });

  if (!shouldSchedule) return dispatchSmsMessage(message.id);
  return message;
}

export async function dispatchSmsMessage(messageId: string) {
  const message = await db.smsMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new Error('SMS message not found');
  if (['sent', 'delivered'].includes(message.status)) return message;

  if (!hubtelConfiguration().sms) {
    throw new Error('Hubtel SMS is not configured');
  }

  try {
    const result = await sendHubtelSms({
      to: message.recipient,
      content: message.content,
      senderId: message.senderId,
    });

    return await db.smsMessage.update({
      where: { id: message.id },
      data: {
        status: result.status.toLowerCase().includes('deliver') ? 'delivered' : 'sent',
        providerMessageId: result.providerMessageId,
        networkId: result.networkId,
        rate: result.rate,
        error: '',
        sentAt: new Date(),
        deliveredAt: result.status.toLowerCase().includes('deliver') ? new Date() : null,
      },
    });
  } catch (error) {
    await db.smsMessage.update({
      where: { id: message.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 2000) : 'Hubtel SMS request failed',
      },
    });
    throw error;
  }
}

export async function createSmsCampaign(input: {
  name: string;
  senderId: string;
  body: string;
  templateId?: string | null;
  audienceType: 'manual' | 'clients';
  scheduledAt?: Date | null;
  recipients?: Array<{ phone: string; name?: string; variables?: Record<string, string | number> }>;
  createdBy: string;
}) {
  let recipients = input.recipients || [];

  if (input.audienceType === 'clients') {
    const clients = await db.clientOrganization.findMany({
      where: {
        status: 'active',
        primaryPhone: { not: '' },
      },
      select: {
        primaryPhone: true,
        primaryContactName: true,
        name: true,
      },
      orderBy: { name: 'asc' },
      take: 5000,
    });
    recipients = clients.map((client) => ({
      phone: client.primaryPhone,
      name: client.primaryContactName || client.name,
      variables: { company: client.name },
    }));
  }

  const unique = new Map<string, { phone: string; name: string; variables: Record<string, string | number> }>();
  for (const item of recipients) {
    try {
      const phone = normalizePhone(item.phone);
      unique.set(phone, {
        phone,
        name: (item.name || '').trim(),
        variables: item.variables || {},
      });
    } catch {
      // Invalid recipients are excluded at creation; caller receives final count.
    }
  }

  if (!unique.size) throw new Error('Campaign requires at least one valid recipient');

  const scheduledAt = input.scheduledAt || null;
  const future = Boolean(scheduledAt && scheduledAt.getTime() > Date.now());

  return db.smsCampaign.create({
    data: {
      name: input.name.trim(),
      templateId: input.templateId || null,
      senderId: input.senderId.trim(),
      body: input.body.trim(),
      audienceType: input.audienceType,
      status: future ? 'scheduled' : 'ready',
      scheduledAt,
      recipientCount: unique.size,
      createdBy: input.createdBy,
      recipients: {
        create: [...unique.values()].map((item) => ({
          phone: item.phone,
          name: item.name,
          variables: JSON.stringify(item.variables),
        })),
      },
    },
    include: {
      template: true,
      recipients: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function dispatchSmsCampaign(campaignId: string, requestedBatchSize?: number) {
  if (!hubtelConfiguration().sms) throw new Error('Hubtel SMS is not configured');

  const configuredBatch = Number(process.env.HUBTEL_SMS_BATCH_SIZE || 5);
  const batchSize = Math.max(1, Math.min(50, requestedBatchSize || (Number.isFinite(configuredBatch) ? configuredBatch : 5)));

  const campaign = await db.smsCampaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        where: { status: { in: ['pending', 'failed'] } },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      },
    },
  });
  if (!campaign) throw new Error('SMS campaign not found');
  if (campaign.status === 'cancelled') throw new Error('Cancelled SMS campaigns cannot be sent');
  if (campaign.status === 'sent') return { campaign, sentThisBatch: 0, failedThisBatch: 0, remaining: 0 };
  if (campaign.scheduledAt && campaign.scheduledAt.getTime() > Date.now()) {
    throw new Error('This SMS campaign is scheduled for a future time');
  }

  if (!campaign.startedAt) {
    await db.smsCampaign.update({
      where: { id: campaign.id },
      data: { status: 'sending', startedAt: new Date() },
    });
  } else if (campaign.status !== 'sending') {
    await db.smsCampaign.update({ where: { id: campaign.id }, data: { status: 'sending' } });
  }

  let sentThisBatch = 0;
  let failedThisBatch = 0;

  for (const recipient of campaign.recipients) {
    const variables = {
      ...safeVariables(recipient.variables),
      name: recipient.name,
      phone: recipient.phone,
    };
    const content = renderSmsTemplate(campaign.body, variables);
    const clientReference = 'SMS-CAM-' + campaign.id + '-' + recipient.id;

    const message = await db.smsMessage.upsert({
      where: { clientReference },
      update: {
        senderId: campaign.senderId,
        recipient: recipient.phone,
        content,
        templateId: campaign.templateId,
        campaignId: campaign.id,
        status: 'queued',
        error: '',
      },
      create: {
        senderId: campaign.senderId,
        recipient: recipient.phone,
        content,
        templateId: campaign.templateId,
        campaignId: campaign.id,
        clientReference,
        status: 'queued',
        createdBy: campaign.createdBy,
      },
    });

    try {
      await dispatchSmsMessage(message.id);
      sentThisBatch += 1;
      await db.smsCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'sent',
          attempts: { increment: 1 },
          error: '',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      failedThisBatch += 1;
      await db.smsCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'failed',
          attempts: { increment: 1 },
          error: error instanceof Error ? error.message.slice(0, 2000) : 'SMS delivery failed',
        },
      });
    }
  }

  const [sentCount, failedCount, pendingCount] = await Promise.all([
    db.smsCampaignRecipient.count({ where: { campaignId, status: 'sent' } }),
    db.smsCampaignRecipient.count({ where: { campaignId, status: 'failed' } }),
    db.smsCampaignRecipient.count({ where: { campaignId, status: 'pending' } }),
  ]);

  const remaining = pendingCount + failedCount;
  const complete = pendingCount === 0 && failedCount === 0;
  const updated = await db.smsCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount,
      failedCount,
      status: complete ? 'sent' : 'sending',
      completedAt: complete ? new Date() : null,
    },
  });

  return {
    campaign: updated,
    sentThisBatch,
    failedThisBatch,
    remaining,
  };
}

export async function dispatchDueSms() {
  if (!hubtelConfiguration().sms) {
    return { configured: false, singleSent: 0, singleFailed: 0, campaignsProcessed: 0 };
  }

  const now = new Date();
  const singles = await db.smsMessage.findMany({
    where: {
      status: 'scheduled',
      campaignId: null,
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
    select: { id: true },
  });

  let singleSent = 0;
  let singleFailed = 0;
  for (const message of singles) {
    try {
      await dispatchSmsMessage(message.id);
      singleSent += 1;
    } catch {
      singleFailed += 1;
    }
  }

  const campaigns = await db.smsCampaign.findMany({
    where: {
      status: { in: ['scheduled', 'sending'] },
      OR: [
        { scheduledAt: { lte: now } },
        { scheduledAt: null },
      ],
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    take: 4,
    select: { id: true },
  });

  let campaignsProcessed = 0;
  for (const campaign of campaigns) {
    try {
      await dispatchSmsCampaign(campaign.id);
      campaignsProcessed += 1;
    } catch {
      // Keep the campaign available for retry; recipient-level failures are recorded.
    }
  }

  return { configured: true, singleSent, singleFailed, campaignsProcessed };
}
