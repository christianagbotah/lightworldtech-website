import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { hubtelConfiguration, renderSmsTemplate } from '@/lib/hubtel';
import { queueSingleSms } from '@/lib/sms';

const schema = z.object({
  recipient: z.string().trim().min(8).max(30),
  templateId: z.string().min(1).nullable().optional(),
  content: z.string().trim().max(2000).optional().default(''),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
  scheduledAt: z.coerce.date().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid SMS message', details: parsed.error.flatten() }, { status: 400 });
  }

  const config = hubtelConfiguration();
  if (!config.senderId) {
    return NextResponse.json({ success: false, error: 'Hubtel SMS sender ID is not configured' }, { status: 503 });
  }

  let content = parsed.data.content;
  let templateId = parsed.data.templateId || null;
  if (templateId) {
    const template = await db.smsTemplate.findFirst({ where: { id: templateId, active: true } });
    if (!template) return NextResponse.json({ success: false, error: 'SMS template not found' }, { status: 404 });
    content = renderSmsTemplate(template.body, parsed.data.variables);
  }
  if (!content.trim()) return NextResponse.json({ success: false, error: 'SMS content is required' }, { status: 400 });

  try {
    const message = await queueSingleSms({
      recipient: parsed.data.recipient,
      senderId: config.senderId,
      content,
      templateId,
      scheduledAt: parsed.data.scheduledAt || null,
      createdBy: actor.name || actor.email,
    });
    await recordAdminAudit({
      admin: actor,
      action: message.status === 'scheduled' ? 'admin.sms_scheduled' : 'admin.sms_sent',
      entity: 'SmsMessage',
      entityId: message.id,
      details: { recipient: message.recipient, scheduledAt: message.scheduledAt },
    });
    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to send SMS',
    }, { status: 502 });
  }
}
