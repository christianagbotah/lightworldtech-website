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

  const mail = getMailTransportStatus();
  const mailHealthy = mail.configured;
  const hubtel = hubtelConfiguration();
  const automation = {
    serviceRenewals: process.env.AUTO_SERVICE_RENEWAL_SMS === 'true',
    projectRenewals: process.env.AUTO_PROJECT_RENEWAL_SMS === 'true',
    collections: process.env.AUTO_COLLECTION_REMINDER_SMS === 'true',
  };
  const automationEnabled = automation.serviceRenewals || automation.projectRenewals || automation.collections;
  const dispatcherConfigured = Boolean((process.env.SMS_CRON_SECRET || '').trim());
  const automationHealthy = !automationEnabled || (hubtel.sms && dispatcherConfigured);
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
          warning: automationHealthy
            ? ''
            : !hubtel.sms
              ? 'SMS automation is enabled but Hubtel SMS is not configured.'
              : 'SMS automation is enabled but the protected scheduler secret is not configured.',
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
