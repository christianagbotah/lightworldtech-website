import { NextRequest, NextResponse } from 'next/server';
import { statfs } from 'node:fs/promises';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { getMailTransportStatus } from '@/lib/mail';
import { hubtelConfiguration } from '@/lib/hubtel';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const admin = await getActiveAdminContext(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = performance.now();
  let database: { status: 'healthy' | 'unhealthy'; latencyMs: number; message?: string };

  try {
    await db.$queryRaw`SELECT 1`;
    database = {
      status: 'healthy',
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  } catch (error) {
    console.error('Admin health database check failed:', error);
    database = {
      status: 'unhealthy',
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      message: 'Database check failed',
    };
  }

  const diskPath = '/home/lightworld/shared/lightworldtech';
  const diskMinimumFreeBytes = 2 * 1024 ** 3;
  const diskWarningFreeBytes = 5 * 1024 ** 3;
  let disk: {
    status: 'healthy' | 'attention';
    path: string;
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedPercent: number;
    minimumFreeBytes: number;
    warning: string;
  };

  try {
    const stats = await statfs(diskPath, { bigint: true });
    const totalBytes = Number(stats.blocks * stats.bsize);
    const availableBytes = Number(stats.bavail * stats.bsize);
    const usedBytes = Math.max(0, totalBytes - availableBytes);
    const usedPercent = totalBytes > 0
      ? Math.round((usedBytes / totalBytes) * 1000) / 10
      : 0;
    const healthy = availableBytes >= diskWarningFreeBytes && usedPercent < 95;
    disk = {
      status: healthy ? 'healthy' : 'attention',
      path: diskPath,
      totalBytes,
      usedBytes,
      availableBytes,
      usedPercent,
      minimumFreeBytes: diskMinimumFreeBytes,
      warning: healthy
        ? ''
        : availableBytes < diskMinimumFreeBytes
          ? 'Disk space is below the 2 GB deployment safety reserve. Free space before deploying.'
          : 'Disk capacity is inside the warning band. Review old artifacts, releases, logs or caches before it becomes critical.',
    };
  } catch (error) {
    console.error('Admin health disk check failed:', error);
    disk = {
      status: 'attention',
      path: diskPath,
      totalBytes: 0,
      usedBytes: 0,
      availableBytes: 0,
      usedPercent: 0,
      minimumFreeBytes: diskMinimumFreeBytes,
      warning: 'Disk capacity could not be verified from the production host.',
    };
  }

  const runtimeState = await db.automationRuntimeState.findUnique({
    where: { id: 'communications-dispatcher' },
  }).catch(() => null);
  const mail = getMailTransportStatus();
  const mailHealthy = mail.configured;
  const hubtel = hubtelConfiguration();
  const automation = {
    serviceRenewals: process.env.AUTO_SERVICE_RENEWAL_SMS === 'true',
    serviceRenewalEmail: process.env.AUTO_SERVICE_RENEWAL_EMAIL === 'true',
    projectRenewals: process.env.AUTO_PROJECT_RENEWAL_SMS === 'true',
    projectRenewalEmail: process.env.AUTO_PROJECT_RENEWAL_EMAIL === 'true',
    collections: process.env.AUTO_COLLECTION_REMINDER_SMS === 'true',
    collectionEmail: process.env.AUTO_COLLECTION_REMINDER_EMAIL === 'true',
    newsletterCampaigns: process.env.AUTO_NEWSLETTER_CAMPAIGN_DISPATCH === 'true',
    renewalDrafts: process.env.AUTO_RENEWAL_DRAFT_INVOICES === 'true',
    projectRenewalDrafts: process.env.AUTO_PROJECT_RENEWAL_DRAFT_INVOICES === 'true',
  };
  const smsAutomationEnabled =
    automation.serviceRenewals || automation.projectRenewals || automation.collections;
  const emailAutomationEnabled =
    automation.collectionEmail ||
    automation.serviceRenewalEmail ||
    automation.projectRenewalEmail ||
    automation.newsletterCampaigns;
  const automationEnabled = smsAutomationEnabled || emailAutomationEnabled || automation.renewalDrafts || automation.projectRenewalDrafts;
  const dispatcherConfigured = Boolean((process.env.SMS_CRON_SECRET || '').trim());
  const runtimeMaxAgeMinutes = Math.max(
    2,
    Math.min(60, Number(process.env.AUTOMATION_RUNTIME_MAX_AGE_MINUTES || 5) || 5),
  );
  const lastSuccessAgeMinutes = runtimeState?.lastSuccessAt
    ? Math.max(0, (Date.now() - runtimeState.lastSuccessAt.getTime()) / 60000)
    : null;
  const runtimeHealthy =
    !automationEnabled ||
    Boolean(
      runtimeState &&
      runtimeState.status === 'healthy' &&
      lastSuccessAgeMinutes !== null &&
      lastSuccessAgeMinutes <= runtimeMaxAgeMinutes,
    );
  const automationHealthy =
    (!automationEnabled || dispatcherConfigured) &&
    (!smsAutomationEnabled || hubtel.sms) &&
    (!emailAutomationEnabled || mail.configured) &&
    runtimeHealthy;
  const overall =
    database.status === 'healthy' && disk.status === 'healthy' && mailHealthy && automationHealthy
      ? 'healthy'
      : 'attention';

  return NextResponse.json(
    {
      success: true,
      data: {
        status: overall,
        checkedAt: new Date().toISOString(),
        database,
        disk,
        mail: {
          status: mailHealthy ? 'healthy' : 'attention',
          mode: mail.mode,
          configured: mail.configured,
          warning: mail.warning || '',
        },
        communications: {
          status: automationHealthy ? 'healthy' : 'attention',
          smsConfigured: hubtel.sms,
          otpConfigured: hubtel.otp,
          paymentsConfigured: hubtel.payments,
          dispatcherConfigured,
          automationEnabled,
          automation,
          runtime: {
            status: runtimeState?.status || 'not_recorded',
            lastSuccessAt: runtimeState?.lastSuccessAt || null,
            lastCompletedAt: runtimeState?.lastCompletedAt || null,
            durationMs: runtimeState?.durationMs || 0,
            consecutiveFailures: runtimeState?.consecutiveFailures || 0,
            ageMinutes: lastSuccessAgeMinutes,
            maxAgeMinutes: runtimeMaxAgeMinutes,
          },
          warning: automationHealthy
            ? ''
            : !dispatcherConfigured && automationEnabled
              ? 'Automation is enabled but the protected scheduler secret is not configured.'
              : smsAutomationEnabled && !hubtel.sms
                ? 'SMS automation is enabled but Hubtel SMS is not configured.'
                : emailAutomationEnabled && !mail.configured
                  ? 'Email automation is enabled but outbound mail is not configured.'
                  : runtimeState?.status === 'failed'
                    ? 'The protected automation dispatcher is reporting a failed run.'
                    : automationEnabled && !runtimeHealthy
                      ? 'Automation is enabled but no recent successful dispatcher run was recorded.'
                      : 'Communication automation needs attention.',
        },
      },
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}