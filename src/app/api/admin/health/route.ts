import { NextRequest, NextResponse } from 'next/server';
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

  const runtimeState = await db.automationRuntimeState.findUnique({
    where: { id: 'communications-dispatcher' },
  }).catch(() => null);
  const mail = getMailTransportStatus();
  const mailHealthy = mail.configured;
  const hubtel = hubtelConfiguration();
  const automation = {
    serviceRenewals: process.env.AUTO_SERVICE_RENEWAL_SMS === 'true',
    projectRenewals: process.env.AUTO_PROJECT_RENEWAL_SMS === 'true',
    collections: process.env.AUTO_COLLECTION_REMINDER_SMS === 'true',
    collectionEmail: process.env.AUTO_COLLECTION_REMINDER_EMAIL === 'true',
    renewalDrafts: process.env.AUTO_RENEWAL_DRAFT_INVOICES === 'true',
    projectRenewalDrafts: process.env.AUTO_PROJECT_RENEWAL_DRAFT_INVOICES === 'true',
  };
  const smsAutomationEnabled =
    automation.serviceRenewals || automation.projectRenewals || automation.collections;
  const automationEnabled = smsAutomationEnabled || automation.collectionEmail || automation.renewalDrafts || automation.projectRenewalDrafts;
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
    (!automation.collectionEmail || mail.configured) &&
    runtimeHealthy;
  const overall =
    database.status === 'healthy' && mailHealthy && automationHealthy
      ? 'healthy'
      : 'attention';

  return NextResponse.json(
    {
      success: true,
      data: {
        status: overall,
        checkedAt: new Date().toISOString(),
        database,
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
                : automation.collectionEmail && !mail.configured
                  ? 'Collection email automation is enabled but outbound mail is not configured.'
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
