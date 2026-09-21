import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { dispatchSmsCampaign } from '@/lib/sms';

const schema = z.object({ batchSize: z.coerce.number().int().min(1).max(50).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid batch size' }, { status: 400 });
  const { id } = await params;
  try {
    const result = await dispatchSmsCampaign(id, parsed.data.batchSize);
    await recordAdminAudit({
      admin: actor,
      action: 'admin.sms_campaign_dispatched',
      entity: 'SmsCampaign',
      entityId: id,
      details: {
        sentThisBatch: result.sentThisBatch,
        failedThisBatch: result.failedThisBatch,
        remaining: result.remaining,
      },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'SMS campaign dispatch failed' }, { status: 502 });
  }
}
