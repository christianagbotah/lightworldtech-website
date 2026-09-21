import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueSms } from '@/lib/sms';

export async function POST(request: NextRequest) {
  const expected = process.env.SMS_CRON_SECRET || '';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !supplied || supplied !== expected) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const result = await dispatchDueSms();
  return NextResponse.json({ success: true, data: result });
}
