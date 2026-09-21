import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { hubtelConfiguration, smsSegmentEstimate } from '@/lib/hubtel';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [templates, campaigns, messages, activeClients] = await Promise.all([
    db.smsTemplate.findMany({
      where: { active: true },
      orderBy: [{ system: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      take: 500,
    }),
    db.smsCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        template: { select: { id: true, name: true, key: true } },
      },
    }),
    db.smsMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 250,
      include: {
        template: { select: { id: true, name: true, key: true } },
        campaign: { select: { id: true, name: true } },
      },
    }),
    db.clientOrganization.count({
      where: { status: 'active', primaryPhone: { not: '' } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      configuration: hubtelConfiguration(),
      activeClients,
      templates: templates.map((template) => ({
        ...template,
        variables: JSON.parse(template.variables || '[]'),
        segmentEstimate: smsSegmentEstimate(template.body),
      })),
      campaigns,
      messages: messages.map((message) => ({
        ...message,
        rate: message.rate?.toFixed(4) ?? null,
        segmentEstimate: smsSegmentEstimate(message.content),
      })),
    },
  });
}
