import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { hubtelConfiguration } from '@/lib/hubtel';
import { createSmsCampaign } from '@/lib/sms';

const recipientSchema = z.object({
  phone: z.string().trim().min(8).max(30),
  name: z.string().trim().max(180).optional().default(''),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
});

const schema = z.object({
  name: z.string().trim().min(2).max(180),
  templateId: z.string().min(1).nullable().optional(),
  body: z.string().trim().max(2000).optional().default(''),
  audienceType: z.enum(['manual', 'clients']).default('manual'),
  recipients: z.array(recipientSchema).max(5000).optional().default([]),
  scheduledAt: z.coerce.date().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid SMS campaign', details: parsed.error.flatten() }, { status: 400 });
  }

  const config = hubtelConfiguration();
  if (!config.senderId) {
    return NextResponse.json({ success: false, error: 'Hubtel SMS sender ID is not configured' }, { status: 503 });
  }

  let body = parsed.data.body;
  if (parsed.data.templateId) {
    const template = await db.smsTemplate.findFirst({ where: { id: parsed.data.templateId, active: true } });
    if (!template) return NextResponse.json({ success: false, error: 'SMS template not found' }, { status: 404 });
    body = template.body;
  }
  if (!body.trim()) return NextResponse.json({ success: false, error: 'Campaign message is required' }, { status: 400 });

  try {
    const campaign = await createSmsCampaign({
      name: parsed.data.name,
      senderId: config.senderId,
      body,
      templateId: parsed.data.templateId || null,
      audienceType: parsed.data.audienceType,
      scheduledAt: parsed.data.scheduledAt || null,
      recipients: parsed.data.recipients,
      createdBy: actor.name || actor.email,
    });
    await recordAdminAudit({
      admin: actor,
      action: campaign.status === 'scheduled' ? 'admin.sms_campaign_scheduled' : 'admin.sms_campaign_created',
      entity: 'SmsCampaign',
      entityId: campaign.id,
      details: {
        name: campaign.name,
        audienceType: campaign.audienceType,
        recipientCount: campaign.recipientCount,
        scheduledAt: campaign.scheduledAt,
      },
    });
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to create SMS campaign',
    }, { status: 400 });
  }
}
