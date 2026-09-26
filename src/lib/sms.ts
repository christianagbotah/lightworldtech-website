import 'server-only';

import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { recordAdminAudit } from '@/lib/admin-governance';
import { invoiceBalance } from '@/lib/finance';
import { createDueProjectRenewalInvoiceDrafts, createDueRenewalInvoiceDrafts } from '@/lib/renewal-draft-automation';
import { getMailTransportStatus, sanitizeMailError, sendTransactionalMail } from '@/lib/mail';
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

export async function queueDueServiceRenewalReminders() {
  const enabled = process.env.AUTO_SERVICE_RENEWAL_SMS === 'true';
  const config = hubtelConfiguration();
  if (!enabled || !config.sms || !config.senderId) {
    return {
      enabled,
      configured: Boolean(config.sms && config.senderId),
      considered: 0,
      queued: 0,
      skipped: 0,
      invalidPhone: 0,
    };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 86400000);
  const configuredBatch = Number(process.env.SERVICE_RENEWAL_SMS_BATCH_SIZE || 10);
  const batchSize = Math.max(
    1,
    Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10),
  );

  const [services, templates] = await Promise.all([
    db.clientServiceAccount.findMany({
      where: {
        status: { in: ['active', 'pending', 'suspended'] },
        expiryDate: { not: null, lte: horizon },
        organization: { primaryPhone: { not: '' } },
      },
      include: {
        organization: {
          select: {
            name: true,
            primaryContactName: true,
            primaryPhone: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
      take: 500,
    }),
    db.smsTemplate.findMany({
      where: {
        key: { in: ['service_renewal', 'service_expired'] },
        active: true,
      },
    }),
  ]);

  const templateByKey = new Map(templates.map((template) => [template.key, template]));
  let considered = 0;
  let queued = 0;
  let skipped = 0;
  let invalidPhone = 0;

  for (const service of services) {
    if (queued >= batchSize || !service.expiryDate) break;

    const expired = service.expiryDate.getTime() < now.getTime();
    const daysUntilExpiry = Math.ceil(
      (service.expiryDate.getTime() - now.getTime()) / 86400000,
    );
    if (!expired && daysUntilExpiry > service.renewalNoticeDays) continue;

    considered += 1;
    const template = templateByKey.get(expired ? 'service_expired' : 'service_renewal');
    if (!template) {
      skipped += 1;
      continue;
    }

    let recipient = '';
    try {
      recipient = normalizePhone(service.organization.primaryPhone);
    } catch {
      invalidPhone += 1;
      continue;
    }

    const expiryDate = new Intl.DateTimeFormat('en-GH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Accra',
    }).format(service.expiryDate);
    const amount = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: service.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(service.recurringAmount));
    const content = renderSmsTemplate(template.body, {
      name: service.organization.primaryContactName || service.organization.name,
      service: service.name,
      expiryDate,
      amount,
    });

    const duplicate = await db.smsMessage.findFirst({
      where: {
        recipient,
        templateId: template.id,
        content,
        status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    await queueSingleSms({
      recipient,
      senderId: config.senderId,
      content,
      templateId: template.id,
      scheduledAt: new Date(now.getTime() + 30 * 1000),
      createdBy: 'System renewal scheduler',
    });
    queued += 1;
  }

  return {
    enabled: true,
    configured: true,
    considered,
    queued,
    skipped,
    invalidPhone,
  };
}

export async function queueDueProjectRenewalReminders() {
  const enabled = process.env.AUTO_PROJECT_RENEWAL_SMS === 'true';
  const config = hubtelConfiguration();
  if (!enabled || !config.sms || !config.senderId) {
    return {
      enabled,
      configured: Boolean(config.sms && config.senderId),
      considered: 0,
      queued: 0,
      skipped: 0,
      invalidPhone: 0,
    };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 86400000);
  const configuredBatch = Number(process.env.PROJECT_RENEWAL_SMS_BATCH_SIZE || 10);
  const batchSize = Math.max(
    1,
    Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10),
  );

  const [projects, templates] = await Promise.all([
    db.clientProject.findMany({
      where: {
        status: { in: ['planned', 'active', 'on_hold'] },
        nextRenewalDate: { not: null, lte: horizon },
        renewalAmount: { gt: 0 },
        organization: { primaryPhone: { not: '' } },
      },
      include: {
        organization: {
          select: {
            name: true,
            primaryContactName: true,
            primaryPhone: true,
          },
        },
      },
      orderBy: { nextRenewalDate: 'asc' },
      take: 500,
    }),
    db.smsTemplate.findMany({
      where: {
        key: { in: ['project_renewal', 'project_expired'] },
        active: true,
      },
    }),
  ]);

  const templateByKey = new Map(templates.map((template) => [template.key, template]));
  let considered = 0;
  let queued = 0;
  let skipped = 0;
  let invalidPhone = 0;

  for (const project of projects) {
    if (queued >= batchSize || !project.nextRenewalDate) break;

    const expired = project.nextRenewalDate.getTime() < now.getTime();
    const daysUntilRenewal = Math.ceil(
      (project.nextRenewalDate.getTime() - now.getTime()) / 86400000,
    );
    if (!expired && daysUntilRenewal > project.renewalNoticeDays) continue;

    considered += 1;
    const template = templateByKey.get(expired ? 'project_expired' : 'project_renewal');
    if (!template) {
      skipped += 1;
      continue;
    }

    let recipient = '';
    try {
      recipient = normalizePhone(project.organization.primaryPhone);
    } catch {
      invalidPhone += 1;
      continue;
    }

    const renewalDate = new Intl.DateTimeFormat('en-GH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Accra',
    }).format(project.nextRenewalDate);
    const amount = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: project.renewalCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(project.renewalAmount));
    const content = renderSmsTemplate(template.body, {
      name: project.organization.primaryContactName || project.organization.name,
      project: project.name,
      renewalDate,
      amount,
    });

    const duplicate = await db.smsMessage.findFirst({
      where: {
        recipient,
        templateId: template.id,
        content,
        status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    await queueSingleSms({
      recipient,
      senderId: config.senderId,
      content,
      templateId: template.id,
      scheduledAt: new Date(now.getTime() + 30 * 1000),
      createdBy: 'System project renewal scheduler',
    });
    queued += 1;
  }

  return {
    enabled: true,
    configured: true,
    considered,
    queued,
    skipped,
    invalidPhone,
  };
}



function portalOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '');
}

function renewalEmailIdentity(id: string, date: Date, state: 'notice' | 'expired'): string {
  return id + ':' + date.toISOString().slice(0, 10) + ':' + state;
}

async function sendRenewalEmail(input: {
  recipient: string;
  customerName: string;
  subject: string;
  heading: string;
  summary: string;
  detailLabel: string;
  detailValue: string;
  amount: string;
  portalPath?: string;
}) {
  const portalUrl = portalOrigin() + (input.portalPath || '/client#billing');
  const text =
    'Hello ' + input.customerName + ',\n\n' +
    input.summary + '\n' +
    input.detailLabel + ': ' + input.detailValue + '\n' +
    'Amount: ' + input.amount + '\n\n' +
    'Review your account in the Lightworld Client Portal:\n' +
    portalUrl + '\n\n' +
    'Regards,\nLightworld Technologies Ltd';
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
    '<div style="padding:32px;border:1px solid #e2e8f0;border-radius:24px">' +
    '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b7791f;font-weight:700;margin:0 0 18px">Lightworld Technologies</p>' +
    '<h1 style="font-size:24px;margin:0 0 18px">' + escapeHtml(input.heading) + '</h1>' +
    '<p>Hello ' + escapeHtml(input.customerName) + ',</p>' +
    '<p>' + escapeHtml(input.summary) + '</p>' +
    '<div style="margin:20px 0;padding:16px;border-radius:14px;background:#f8fafc">' +
    '<p style="margin:0 0 6px"><strong>' + escapeHtml(input.detailLabel) + ':</strong> ' + escapeHtml(input.detailValue) + '</p>' +
    '<p style="margin:0"><strong>Amount:</strong> ' + escapeHtml(input.amount) + '</p>' +
    '</div>' +
    '<p><a href="' + escapeHtml(portalUrl) + '" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#b7791f;color:#fff;text-decoration:none;font-weight:700">Open client account</a></p>' +
    '<p style="margin-top:24px">Regards,<br><strong>Lightworld Technologies Ltd</strong></p>' +
    '</div></div>';
  return sendTransactionalMail({ to: input.recipient, subject: input.subject, text, html });
}

export async function sendDueServiceRenewalEmailReminders() {
  const enabled = process.env.AUTO_SERVICE_RENEWAL_EMAIL === 'true';
  const mail = getMailTransportStatus();
  if (!enabled || !mail.configured) {
    return { enabled, configured: mail.configured, considered: 0, sent: 0, skipped: 0, failed: 0, missingEmail: 0 };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 86400000);
  const configuredBatch = Number(process.env.SERVICE_RENEWAL_EMAIL_BATCH_SIZE || 10);
  const batchSize = Math.max(1, Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10));
  const services = await db.clientServiceAccount.findMany({
    where: {
      status: { in: ['active', 'pending', 'suspended'] },
      expiryDate: { not: null, lte: horizon },
    },
    include: {
      organization: {
        select: { name: true, primaryContactName: true, primaryEmail: true },
      },
    },
    orderBy: { expiryDate: 'asc' },
    take: 500,
  });

  let considered = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let missingEmail = 0;

  for (const service of services) {
    if (sent >= batchSize || !service.expiryDate) break;
    const expired = service.expiryDate.getTime() < now.getTime();
    const daysUntilExpiry = Math.ceil((service.expiryDate.getTime() - now.getTime()) / 86400000);
    if (!expired && daysUntilExpiry > service.renewalNoticeDays) continue;
    considered += 1;

    const recipient = service.organization.primaryEmail.trim().toLowerCase();
    if (!recipient) {
      missingEmail += 1;
      continue;
    }

    const state: 'notice' | 'expired' = expired ? 'expired' : 'notice';
    const entityId = renewalEmailIdentity(service.id, service.expiryDate, state);
    const duplicate = await db.adminAuditLog.findFirst({
      where: {
        action: 'system.service_renewal_email_sent',
        entity: 'ClientServiceAccountRenewal',
        entityId,
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const expiryDate = new Intl.DateTimeFormat('en-GH', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Accra',
    }).format(service.expiryDate);
    const amount = new Intl.NumberFormat('en-GH', {
      style: 'currency', currency: service.currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(service.recurringAmount));
    const customerName = service.organization.primaryContactName || service.organization.name;

    try {
      const result = await sendRenewalEmail({
        recipient,
        customerName,
        subject: (expired ? 'Service expired · ' : 'Service renewal reminder · ') + service.name,
        heading: expired ? 'Service renewal required' : 'Upcoming service renewal',
        summary: expired
          ? 'Your ' + service.name + ' service has passed its recorded expiry date.'
          : 'Your ' + service.name + ' service is approaching its recorded renewal date.',
        detailLabel: 'Expiry date',
        detailValue: expiryDate,
        amount,
      });
      await recordAdminAudit({
        action: 'system.service_renewal_email_sent',
        entity: 'ClientServiceAccountRenewal',
        entityId,
        details: {
          serviceId: service.id,
          organizationName: service.organization.name,
          recipient,
          state,
          expiryDate: service.expiryDate.toISOString(),
          transport: result.transport,
        },
      });
      sent += 1;
    } catch (error) {
      await recordAdminAudit({
        action: 'system.service_renewal_email_failed',
        entity: 'ClientServiceAccountRenewal',
        entityId,
        details: {
          serviceId: service.id,
          recipient,
          state,
          error: sanitizeMailError(error),
        },
      });
      failed += 1;
    }
  }

  return { enabled: true, configured: true, considered, sent, skipped, failed, missingEmail };
}

export async function sendDueProjectRenewalEmailReminders() {
  const enabled = process.env.AUTO_PROJECT_RENEWAL_EMAIL === 'true';
  const mail = getMailTransportStatus();
  if (!enabled || !mail.configured) {
    return { enabled, configured: mail.configured, considered: 0, sent: 0, skipped: 0, failed: 0, missingEmail: 0 };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 86400000);
  const configuredBatch = Number(process.env.PROJECT_RENEWAL_EMAIL_BATCH_SIZE || 10);
  const batchSize = Math.max(1, Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10));
  const projects = await db.clientProject.findMany({
    where: {
      status: { in: ['planned', 'active', 'on_hold'] },
      nextRenewalDate: { not: null, lte: horizon },
      renewalAmount: { gt: 0 },
    },
    include: {
      organization: {
        select: { name: true, primaryContactName: true, primaryEmail: true },
      },
    },
    orderBy: { nextRenewalDate: 'asc' },
    take: 500,
  });

  let considered = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let missingEmail = 0;

  for (const project of projects) {
    if (sent >= batchSize || !project.nextRenewalDate) break;
    const overdue = project.nextRenewalDate.getTime() < now.getTime();
    const daysUntilRenewal = Math.ceil((project.nextRenewalDate.getTime() - now.getTime()) / 86400000);
    if (!overdue && daysUntilRenewal > project.renewalNoticeDays) continue;
    considered += 1;

    const recipient = project.organization.primaryEmail.trim().toLowerCase();
    if (!recipient) {
      missingEmail += 1;
      continue;
    }

    const state: 'notice' | 'expired' = overdue ? 'expired' : 'notice';
    const entityId = renewalEmailIdentity(project.id, project.nextRenewalDate, state);
    const duplicate = await db.adminAuditLog.findFirst({
      where: {
        action: 'system.project_renewal_email_sent',
        entity: 'ClientProjectRenewal',
        entityId,
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const renewalDate = new Intl.DateTimeFormat('en-GH', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Accra',
    }).format(project.nextRenewalDate);
    const amount = new Intl.NumberFormat('en-GH', {
      style: 'currency', currency: project.renewalCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(project.renewalAmount));
    const customerName = project.organization.primaryContactName || project.organization.name;

    try {
      const result = await sendRenewalEmail({
        recipient,
        customerName,
        subject: (overdue ? 'Project renewal overdue · ' : 'Project renewal reminder · ') + project.name,
        heading: overdue ? 'Project renewal requires attention' : 'Upcoming project renewal',
        summary: overdue
          ? 'The recorded renewal date for ' + project.name + ' has passed.'
          : 'The recorded renewal date for ' + project.name + ' is approaching.',
        detailLabel: 'Renewal date',
        detailValue: renewalDate,
        amount,
      });
      await recordAdminAudit({
        action: 'system.project_renewal_email_sent',
        entity: 'ClientProjectRenewal',
        entityId,
        details: {
          projectId: project.id,
          organizationName: project.organization.name,
          recipient,
          state,
          renewalDate: project.nextRenewalDate.toISOString(),
          transport: result.transport,
        },
      });
      sent += 1;
    } catch (error) {
      await recordAdminAudit({
        action: 'system.project_renewal_email_failed',
        entity: 'ClientProjectRenewal',
        entityId,
        details: {
          projectId: project.id,
          recipient,
          state,
          error: sanitizeMailError(error),
        },
      });
      failed += 1;
    }
  }

  return { enabled: true, configured: true, considered, sent, skipped, failed, missingEmail };
}

function automatedCollectionCycleCount(activities: Array<{
  type: string;
  createdBy: string;
  createdAt: Date;
}>): number {
  const days = new Set(
    activities
      .filter((activity) =>
        (
          activity.type === 'sms_reminder_scheduled'
          && activity.createdBy === 'System collections scheduler'
        ) || (
          activity.type === 'email_reminder'
          && activity.createdBy === 'System collections email scheduler'
        ),
      )
      .map((activity) => activity.createdAt.toISOString().slice(0, 10)),
  );
  return days.size;
}

export async function queueDueCollectionReminders() {
  const enabled = process.env.AUTO_COLLECTION_REMINDER_SMS === 'true';
  const config = hubtelConfiguration();
  if (!enabled || !config.sms || !config.senderId) {
    return {
      enabled,
      configured: Boolean(config.sms && config.senderId),
      considered: 0,
      queued: 0,
      skipped: 0,
      invalidPhone: 0,
      promisesDeferred: 0,
      manualReviewRequired: 0,
    };
  }

  const now = new Date();
  const configuredBatch = Number(process.env.COLLECTION_REMINDER_SMS_BATCH_SIZE || 10);
  const batchSize = Math.max(
    1,
    Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10),
  );
  const configuredIntervalDays = Number(process.env.COLLECTION_REMINDER_SMS_INTERVAL_DAYS || 7);
  const intervalDays = Math.max(
    1,
    Math.min(30, Number.isFinite(configuredIntervalDays) ? configuredIntervalDays : 7),
  );
  const configuredMinDays = Number(process.env.COLLECTION_REMINDER_SMS_MIN_DAYS_OVERDUE || 1);
  const minDaysOverdue = Math.max(
    1,
    Math.min(365, Number.isFinite(configuredMinDays) ? configuredMinDays : 1),
  );
  const configuredMaxCycles = Number(process.env.COLLECTION_REMINDER_MAX_AUTOMATED_CYCLES || 3);
  const maxAutomatedCycles = Math.max(
    1,
    Math.min(12, Number.isFinite(configuredMaxCycles) ? configuredMaxCycles : 3),
  );
  const duplicateCutoff = new Date(now.getTime() - intervalDays * 86400000);

  const [invoices, template] = await Promise.all([
    db.clientInvoice.findMany({
      where: {
        status: { notIn: ['draft', 'void', 'paid'] },
        dueDate: { lt: now },
        organization: { primaryPhone: { not: '' } },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryPhone: true,
          },
        },
        allocations: true,
        creditNotes: { where: { status: 'posted' } },
        collectionActivities: {
          where: {
            type: { in: ['promise_to_pay', 'sms_reminder_scheduled', 'email_reminder', 'automation_hold'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
      take: 500,
    }),
    db.smsTemplate.findFirst({
      where: { key: 'payment_due', active: true },
    }),
  ]);

  if (!template) {
    return {
      enabled: true,
      configured: true,
      considered: 0,
      queued: 0,
      skipped: invoices.length,
      invalidPhone: 0,
      promisesDeferred: 0,
      manualReviewRequired: 0,
    };
  }

  let considered = 0;
  let queued = 0;
  let skipped = 0;
  let invalidPhone = 0;
  let promisesDeferred = 0;
  let manualReviewRequired = 0;

  for (const invoice of invoices) {
    if (queued >= batchSize) break;

    const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    if (balance.lte(0)) {
      skipped += 1;
      continue;
    }

    const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000);
    if (daysOverdue < minDaysOverdue) continue;

    considered += 1;

    const latestPromise = invoice.collectionActivities.find(
      (activity) => activity.type === 'promise_to_pay' && activity.promisedDate,
    );
    if (latestPromise?.promisedDate && latestPromise.promisedDate.getTime() >= now.getTime()) {
      promisesDeferred += 1;
      continue;
    }

    const existingHold = invoice.collectionActivities.find(
      (activity) => activity.type === 'automation_hold' && !activity.completedAt,
    );
    const automatedCycles = automatedCollectionCycleCount(invoice.collectionActivities);
    if (existingHold || automatedCycles >= maxAutomatedCycles) {
      manualReviewRequired += 1;
      if (!existingHold) {
        await db.financeCollectionActivity.create({
          data: {
            organizationId: invoice.organizationId,
            invoiceId: invoice.id,
            type: 'automation_hold',
            note:
              'Automatic collection outreach paused after ' +
              automatedCycles +
              ' reminder cycle' +
              (automatedCycles === 1 ? '' : 's') +
              '. Human review is required before further customer contact.',
            nextFollowUpAt: now,
            createdBy: 'System collections scheduler',
          },
        });
      }
      continue;
    }

    let recipient = '';
    try {
      recipient = normalizePhone(invoice.organization.primaryPhone);
    } catch {
      invalidPhone += 1;
      continue;
    }

    const amount = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: invoice.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(balance));
    const dueDate = new Intl.DateTimeFormat('en-GH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Accra',
    }).format(invoice.dueDate);
    const paymentLink =
      (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
        .trim()
        .replace(/\/$/, '') + '/client#account';
    const content = renderSmsTemplate(template.body, {
      name: invoice.organization.primaryContactName || invoice.organization.name,
      invoice: invoice.invoiceNumber,
      amount,
      dueDate,
      paymentLink,
    });

    const [duplicateMessage, recentInvoiceReminder] = await Promise.all([
      db.smsMessage.findFirst({
        where: {
          recipient,
          templateId: template.id,
          content,
          status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
          createdAt: { gte: duplicateCutoff },
        },
        select: { id: true },
      }),
      db.financeCollectionActivity.findFirst({
        where: {
          invoiceId: invoice.id,
          type: 'sms_reminder_scheduled',
          createdAt: { gte: duplicateCutoff },
        },
        select: { id: true },
      }),
    ]);
    if (duplicateMessage || recentInvoiceReminder) {
      skipped += 1;
      continue;
    }

    const message = await queueSingleSms({
      recipient,
      senderId: config.senderId,
      content,
      templateId: template.id,
      scheduledAt: new Date(now.getTime() + 30 * 1000),
      createdBy: 'System collections scheduler',
    });

    await db.financeCollectionActivity.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        type: 'sms_reminder_scheduled',
        note:
          'Automatic payment reminder scheduled for ' +
          invoice.invoiceNumber +
          ' at ' +
          daysOverdue +
          ' day' +
          (daysOverdue === 1 ? '' : 's') +
          ' overdue.',
        smsMessageId: message.id,
        createdBy: 'System collections scheduler',
      },
    });

    queued += 1;
  }

  return {
    enabled: true,
    configured: true,
    considered,
    queued,
    skipped,
    invalidPhone,
    promisesDeferred,
    manualReviewRequired,
  };
}


export async function sendDueCollectionEmailReminders() {
  const enabled = process.env.AUTO_COLLECTION_REMINDER_EMAIL === 'true';
  const mail = getMailTransportStatus();
  if (!enabled || !mail.configured) {
    return {
      enabled,
      configured: mail.configured,
      considered: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      promisesDeferred: 0,
      missingEmail: 0,
      manualReviewRequired: 0,
    };
  }

  const now = new Date();
  const configuredBatch = Number(process.env.COLLECTION_REMINDER_EMAIL_BATCH_SIZE || 10);
  const batchSize = Math.max(1, Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10));
  const configuredIntervalDays = Number(process.env.COLLECTION_REMINDER_EMAIL_INTERVAL_DAYS || 7);
  const intervalDays = Math.max(1, Math.min(30, Number.isFinite(configuredIntervalDays) ? configuredIntervalDays : 7));
  const configuredMinDays = Number(process.env.COLLECTION_REMINDER_EMAIL_MIN_DAYS_OVERDUE || 1);
  const minDaysOverdue = Math.max(1, Math.min(365, Number.isFinite(configuredMinDays) ? configuredMinDays : 1));
  const configuredMaxCycles = Number(process.env.COLLECTION_REMINDER_MAX_AUTOMATED_CYCLES || 3);
  const maxAutomatedCycles = Math.max(1, Math.min(12, Number.isFinite(configuredMaxCycles) ? configuredMaxCycles : 3));
  const duplicateCutoff = new Date(now.getTime() - intervalDays * 86400000);

  const invoices = await db.clientInvoice.findMany({
    where: {
      status: { notIn: ['draft', 'void', 'paid'] },
      dueDate: { lt: now },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          primaryContactName: true,
          primaryEmail: true,
        },
      },
      allocations: true,
      creditNotes: { where: { status: 'posted' } },
      collectionActivities: {
        where: {
          type: { in: ['promise_to_pay', 'sms_reminder_scheduled', 'email_reminder', 'automation_hold'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
    orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
    take: 500,
  });

  let considered = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let promisesDeferred = 0;
  let missingEmail = 0;
  let manualReviewRequired = 0;

  for (const invoice of invoices) {
    if (sent >= batchSize) break;

    const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    if (balance.lte(0)) {
      skipped += 1;
      continue;
    }

    const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000);
    if (daysOverdue < minDaysOverdue) continue;
    considered += 1;

    const latestPromise = invoice.collectionActivities.find(
      (activity) => activity.type === 'promise_to_pay' && activity.promisedDate,
    );
    if (latestPromise?.promisedDate && latestPromise.promisedDate.getTime() >= now.getTime()) {
      promisesDeferred += 1;
      continue;
    }

    const existingHold = invoice.collectionActivities.find(
      (activity) => activity.type === 'automation_hold' && !activity.completedAt,
    );
    const automatedCycles = automatedCollectionCycleCount(invoice.collectionActivities);
    if (existingHold || automatedCycles >= maxAutomatedCycles) {
      manualReviewRequired += 1;
      if (!existingHold) {
        await db.financeCollectionActivity.create({
          data: {
            organizationId: invoice.organizationId,
            invoiceId: invoice.id,
            type: 'automation_hold',
            note:
              'Automatic collection outreach paused after ' +
              automatedCycles +
              ' reminder cycle' +
              (automatedCycles === 1 ? '' : 's') +
              '. Human review is required before further customer contact.',
            nextFollowUpAt: now,
            createdBy: 'System collections email scheduler',
          },
        });
      }
      continue;
    }

    const recipient = invoice.organization.primaryEmail.trim().toLowerCase();
    if (!recipient) {
      missingEmail += 1;
      continue;
    }

    const claim = await db.$transaction(async (tx) => {
      const lockKey = 'lightworld-auto-collection-email:' + invoice.id;
      await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', lockKey);

      const duplicate = await tx.financeCollectionActivity.findFirst({
        where: {
          invoiceId: invoice.id,
          type: { in: ['email_reminder', 'email_reminder_sending', 'email_reminder_scheduled'] },
          createdAt: { gte: duplicateCutoff },
        },
        select: { id: true },
      });
      if (duplicate) return null;

      return tx.financeCollectionActivity.create({
        data: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          type: 'email_reminder_sending',
          note:
            'Automatic payment reminder email prepared for ' +
            invoice.invoiceNumber +
            ' at ' +
            daysOverdue +
            ' day' +
            (daysOverdue === 1 ? '' : 's') +
            ' overdue.',
          createdBy: 'System collections email scheduler',
        },
      });
    });

    if (!claim) {
      skipped += 1;
      continue;
    }

    const amount = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: invoice.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(balance));
    const dueDate = new Intl.DateTimeFormat('en-GH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Accra',
    }).format(invoice.dueDate);
    const customerName = invoice.organization.primaryContactName || invoice.organization.name;
    const origin =
      (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
        .trim()
        .replace(/\/$/, '');
    const paymentLink = origin + '/client#billing';
    const subject = 'Payment reminder · ' + invoice.invoiceNumber;
    const text =
      'Hello ' + customerName + ',\n\n' +
      'This is a payment reminder for invoice ' + invoice.invoiceNumber + '.\n' +
      'Outstanding balance: ' + amount + '\n' +
      'Due date: ' + dueDate + '\n\n' +
      'Review your account and payment options in the Lightworld Client Portal:\n' +
      paymentLink + '\n\n' +
      'If payment has already been made, please disregard this reminder or contact Lightworld with the payment reference.\n\n' +
      'Regards,\nLightworld Technologies Ltd';
    const html =
      '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:32px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b7791f;font-weight:700;margin:0 0 18px">Lightworld Technologies</p>' +
      '<h1 style="font-size:24px;margin:0 0 18px">Payment reminder</h1>' +
      '<p>Hello ' + escapeHtml(customerName) + ',</p>' +
      '<p>Invoice <strong>' + invoice.invoiceNumber + '</strong> has an outstanding balance of <strong>' + amount + '</strong>.</p>' +
      '<p><strong>Due date:</strong> ' + dueDate + '</p>' +
      '<p><a href="' + paymentLink + '" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#b7791f;color:#fff;text-decoration:none;font-weight:700">Open client account</a></p>' +
      '<p style="font-size:13px;color:#64748b">If payment has already been made, please disregard this reminder or contact Lightworld with the payment reference.</p>' +
      '<p style="margin-top:24px">Regards,<br><strong>Lightworld Technologies Ltd</strong></p>' +
      '</div></div>';

    try {
      const result = await sendTransactionalMail({ to: recipient, subject, text, html });
      await db.financeCollectionActivity.update({
        where: { id: claim.id },
        data: {
          type: 'email_reminder',
          note:
            'Automatic payment reminder emailed to ' +
            recipient +
            ' via ' +
            result.transport +
            ' for ' +
            invoice.invoiceNumber +
            '.',
        },
      });
      sent += 1;
    } catch (error) {
      const safeError = sanitizeMailError(error);
      await db.financeCollectionActivity.update({
        where: { id: claim.id },
        data: {
          type: 'email_reminder_failed',
          note: 'Automatic payment reminder email failed: ' + safeError,
        },
      }).catch(() => null);
      failed += 1;
    }
  }

  return {
    enabled: true,
    configured: true,
    considered,
    sent,
    skipped,
    failed,
    promisesDeferred,
    missingEmail,
    manualReviewRequired,
  };
}

export async function dispatchDueSms() {
  const renewalQueue = await queueDueServiceRenewalReminders();
  const projectRenewalQueue = await queueDueProjectRenewalReminders();
  const serviceRenewalEmailQueue = await sendDueServiceRenewalEmailReminders();
  const projectRenewalEmailQueue = await sendDueProjectRenewalEmailReminders();
  const collectionQueue = await queueDueCollectionReminders();
  const renewalDraftQueue = await createDueRenewalInvoiceDrafts();
  const projectRenewalDraftQueue = await createDueProjectRenewalInvoiceDrafts();
  const collectionEmailQueue = await sendDueCollectionEmailReminders();
  if (!hubtelConfiguration().sms) {
    return {
      configured: false,
      singleSent: 0,
      singleFailed: 0,
      campaignsProcessed: 0,
      renewalQueue,
      projectRenewalQueue,
      serviceRenewalEmailQueue,
      projectRenewalEmailQueue,
      collectionQueue,
      renewalDraftQueue,
      projectRenewalDraftQueue,
      collectionEmailQueue,
    };
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

  return {
    configured: true,
    singleSent,
    singleFailed,
    campaignsProcessed,
    renewalQueue,
    projectRenewalQueue,
    serviceRenewalEmailQueue,
    projectRenewalEmailQueue,
    collectionQueue,
    renewalDraftQueue,
    projectRenewalDraftQueue,
    collectionEmailQueue,
  };
}
