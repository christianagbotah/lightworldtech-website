import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  key: z.string().trim().min(2).max(100).regex(/^[a-z0-9_-]+$/),
  category: z.string().trim().min(2).max(80).default('general'),
  body: z.string().trim().min(1).max(2000),
});

function variables(body: string): string[] {
  return Array.from(new Set(Array.from(body.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((match) => match[1])));
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid SMS template', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const template = await db.smsTemplate.create({
      data: {
        ...parsed.data,
        variables: JSON.stringify(variables(parsed.data.body)),
        active: true,
        system: false,
      },
    });
    await recordAdminAudit({
      admin: actor,
      action: 'admin.sms_template_created',
      entity: 'SmsTemplate',
      entityId: template.id,
      details: { key: template.key, name: template.name },
    });
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error('SMS template create error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create SMS template; ensure the key is unique' }, { status: 409 });
  }
}
