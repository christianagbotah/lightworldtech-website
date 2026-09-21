import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  body: z.string().trim().min(1).max(2000).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one template change is required');

function variables(body: string): string[] {
  return Array.from(new Set(Array.from(body.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((match) => match[1])));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid SMS template update', details: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await params;
  const current = await db.smsTemplate.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ success: false, error: 'SMS template not found' }, { status: 404 });

  const template = await db.smsTemplate.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.body ? { variables: JSON.stringify(variables(parsed.data.body)) } : {}),
    },
  });
  await recordAdminAudit({
    admin: actor,
    action: 'admin.sms_template_updated',
    entity: 'SmsTemplate',
    entityId: id,
    details: { changedFields: Object.keys(parsed.data), key: template.key },
  });
  return NextResponse.json({ success: true, data: template });
}
