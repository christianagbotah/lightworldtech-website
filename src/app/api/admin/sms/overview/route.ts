import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { hubtelConfiguration, smsSegmentEstimate } from '@/lib/hubtel';
import { getMailTransportStatus } from '@/lib/mail';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [templates, campaigns, messages, activeClients, runtime] = await Promise.all([
    db.smsTemplate.findMany({
      where: { active: true },
      orderBy: [{ system: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      take: 500,
    }),
    db.smsCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        template: { select: { id: true, name: true, key: true } },
      },
    }),
    db.smsMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 250,
      include: {
        template: { select: { id: true, name: true, key: true } },
        campaign: { select: { id: true, name: true } },
      },
    }),
    db.clientOrganization.count({
      where: { status: 'active', primaryPhone: { not: '' } },
    }),
    db.automationRuntimeState.findUnique({
      where: { id: 'communications-dispatcher' },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      configuration: hubtelConfiguration(),
      automation: {
        dispatcherConfigured: Boolean((process.env.SMS_CRON_SECRET || '').trim()),
        runtime: runtime ? {
          status: runtime.status,
          lastStartedAt: runtime.lastStartedAt,
          lastCompletedAt: runtime.lastCompletedAt,
          lastSuccessAt: runtime.lastSuccessAt,
          durationMs: runtime.durationMs,
          consecutiveFailures: runtime.consecutiveFailures,
          lastError: runtime.lastError,
          result: (() => {
            try { return JSON.parse(runtime.resultJson || '{}'); } catch { return {}; }
          })(),
        } : null,
        serviceRenewals: {
          enabled: process.env.AUTO_SERVICE_RENEWAL_SMS === 'true',
          batchSize: Math.max(1, Math.min(50, Number(process.env.SERVICE_RENEWAL_SMS_BATCH_SIZE || 10) || 10)),
        },
        serviceRenewalEmail: {
          enabled: process.env.AUTO_SERVICE_RENEWAL_EMAIL === 'true',
          configured: getMailTransportStatus().configured,
          batchSize: Math.max(1, Math.min(50, Number(process.env.SERVICE_RENEWAL_EMAIL_BATCH_SIZE || 10) || 10)),
        },
        projectRenewals: {
          enabled: process.env.AUTO_PROJECT_RENEWAL_SMS === 'true',
          batchSize: Math.max(1, Math.min(50, Number(process.env.PROJECT_RENEWAL_SMS_BATCH_SIZE || 10) || 10)),
        },
        projectRenewalEmail: {
          enabled: process.env.AUTO_PROJECT_RENEWAL_EMAIL === 'true',
          configured: getMailTransportStatus().configured,
          batchSize: Math.max(1, Math.min(50, Number(process.env.PROJECT_RENEWAL_EMAIL_BATCH_SIZE || 10) || 10)),
        },
        renewalDrafts: {
          enabled: process.env.AUTO_RENEWAL_DRAFT_INVOICES === 'true',
          batchSize: Math.max(1, Math.min(50, Number(process.env.RENEWAL_DRAFT_INVOICE_BATCH_SIZE || 10) || 10)),
          dueDays: Math.max(0, Math.min(60, Number(process.env.RENEWAL_DRAFT_INVOICE_DUE_DAYS || 7) || 7)),
        },
        projectRenewalDrafts: {
          enabled: process.env.AUTO_PROJECT_RENEWAL_DRAFT_INVOICES === 'true',
          batchSize: Math.max(1, Math.min(50, Number(process.env.PROJECT_RENEWAL_DRAFT_INVOICE_BATCH_SIZE || 10) || 10)),
          dueDays: Math.max(0, Math.min(60, Number(process.env.PROJECT_RENEWAL_DRAFT_INVOICE_DUE_DAYS || 7) || 7)),
        },
        newsletterCampaigns: {
          enabled: process.env.AUTO_NEWSLETTER_CAMPAIGN_DISPATCH === 'true',
          configured: getMailTransportStatus().configured,
          batchSize: Math.max(1, Math.min(10, Number(process.env.NEWSLETTER_CAMPAIGN_BATCH_SIZE || 10) || 10)),
          campaignsPerRun: Math.max(1, Math.min(4, Number(process.env.NEWSLETTER_CAMPAIGNS_PER_RUN || 2) || 2)),
        },
        collectionEmail: {
          enabled: process.env.AUTO_COLLECTION_REMINDER_EMAIL === 'true',
          configured: getMailTransportStatus().configured,
          batchSize: Math.max(1, Math.min(50, Number(process.env.COLLECTION_REMINDER_EMAIL_BATCH_SIZE || 10) || 10)),
          intervalDays: Math.max(1, Math.min(30, Number(process.env.COLLECTION_REMINDER_EMAIL_INTERVAL_DAYS || 7) || 7)),
          minDaysOverdue: Math.max(1, Math.min(365, Number(process.env.COLLECTION_REMINDER_EMAIL_MIN_DAYS_OVERDUE || 1) || 1)),
        },
        collections: {
          enabled: process.env.AUTO_COLLECTION_REMINDER_SMS === 'true',
          batchSize: Math.max(1, Math.min(50, Number(process.env.COLLECTION_REMINDER_SMS_BATCH_SIZE || 10) || 10)),
          intervalDays: Math.max(1, Math.min(30, Number(process.env.COLLECTION_REMINDER_SMS_INTERVAL_DAYS || 7) || 7)),
          minDaysOverdue: Math.max(1, Math.min(365, Number(process.env.COLLECTION_REMINDER_SMS_MIN_DAYS_OVERDUE || 1) || 1)),
        },
      },
      activeClients,
      templates: templates.map((template) => ({
        ...template,
        variables: JSON.parse(template.variables || '[]'),
        segmentEstimate: smsSegmentEstimate(template.body),
      })),
      campaigns,
      messages: messages.map((message) => ({
        ...message,
        rate: message.rate?.toFixed(4) ?? null,
        segmentEstimate: smsSegmentEstimate(message.content),
      })),
    },
  });
}
