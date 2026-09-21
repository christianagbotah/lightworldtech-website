import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('schedule'), scheduledAt: z.coerce.date() }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('ready') }),
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid campaign action' }, { status: 400 });
  const { id } = await params;
  const campaign = await db.smsCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ success: false, error: 'SMS campaign not found' }, { status: 404 });
  if (campaign.status === 'sent') return NextResponse.json({ success: false, error: 'A completed campaign cannot be changed' }, { status: 409 });

  const data = parsed.data.action === 'schedule'
    ? { status: 'scheduled', scheduledAt: parsed.data.scheduledAt }
    : parsed.data.action === 'cancel'
      ? { status: 'cancelled', completedAt: new Date() }
      : { status: 'ready', scheduledAt: null, completedAt: null };

  const updated = await db.smsCampaign.update({ where: { id }, data });
  await recordAdminAudit({
    admin: actor,
    action: 'admin.sms_campaign_' + parsed.data.action,
    entity: 'SmsCampaign',
    entityId: id,
    details: { scheduledAt: updated.scheduledAt, status: updated.status },
  });
  return NextResponse.json({ success: true, data: updated });
}
