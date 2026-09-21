import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { hubtelConfiguration, sendHubtelOtp, verifyHubtelOtp } from '@/lib/hubtel';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send'),
    phoneNumber: z.string().trim().min(8).max(30),
    countryCode: z.string().trim().length(2).default('GH'),
  }),
  z.object({
    action: z.literal('verify'),
    requestId: z.string().min(1).max(300),
    prefix: z.string().max(40).default(''),
    code: z.string().trim().min(4).max(12),
  }),
]);

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  if (!hubtelConfiguration().otp) {
    return NextResponse.json({ success: false, error: 'Hubtel OTP endpoints are not configured' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid OTP request' }, { status: 400 });

  try {
    if (parsed.data.action === 'send') {
      const result = await sendHubtelOtp(parsed.data);
      await recordAdminAudit({
        admin: actor,
        action: 'admin.hubtel_otp_sent',
        entity: 'HubtelOtp',
        entityId: result.requestId,
        details: { phone: parsed.data.phoneNumber.replace(/.(?=.{4})/g, '*') },
      });
      return NextResponse.json({ success: true, data: { requestId: result.requestId, prefix: result.prefix } });
    }

    const result = await verifyHubtelOtp(parsed.data);
    await recordAdminAudit({
      admin: actor,
      action: 'admin.hubtel_otp_verified',
      entity: 'HubtelOtp',
      entityId: parsed.data.requestId,
      details: { verified: result.verified },
    });
    return NextResponse.json({ success: true, data: { verified: result.verified } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Hubtel OTP request failed' }, { status: 502 });
  }
}
