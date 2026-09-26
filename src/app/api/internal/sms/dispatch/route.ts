import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueSms } from '@/lib/sms';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const expected = process.env.SMS_CRON_SECRET || '';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !supplied || supplied !== expected) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const runtimeId = 'communications-dispatcher';
  const startedAt = new Date();
  const startedMs = Date.now();

  await db.automationRuntimeState.upsert({
    where: { id: runtimeId },
    update: {
      status: 'running',
      lastStartedAt: startedAt,
      lastError: '',
    },
    create: {
      id: runtimeId,
      status: 'running',
      lastStartedAt: startedAt,
    },
  });

  try {
    const result = await dispatchDueSms();
    const completedAt = new Date();
    const durationMs = Math.max(0, Date.now() - startedMs);
    const resultJson = JSON.stringify(result).slice(0, 12000);

    await db.automationRuntimeState.update({
      where: { id: runtimeId },
      data: {
        status: 'healthy',
        lastCompletedAt: completedAt,
        lastSuccessAt: completedAt,
        durationMs,
        consecutiveFailures: 0,
        lastError: '',
        resultJson,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const completedAt = new Date();
    const durationMs = Math.max(0, Date.now() - startedMs);
    const message = error instanceof Error ? error.message.slice(0, 2000) : 'Automation dispatcher failed';

    await db.automationRuntimeState.update({
      where: { id: runtimeId },
      data: {
        status: 'failed',
        lastCompletedAt: completedAt,
        durationMs,
        consecutiveFailures: { increment: 1 },
        lastError: message,
      },
    }).catch(() => null);

    return NextResponse.json(
      { success: false, error: 'Automation dispatcher failed' },
      { status: 500 },
    );
  }
}
