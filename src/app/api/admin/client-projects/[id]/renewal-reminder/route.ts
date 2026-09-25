import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  hubtelConfiguration,
  normalizePhone,
  renderSmsTemplate,
} from '@/lib/hubtel';
import { queueSingleSms } from '@/lib/sms';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (
    !actor ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.manage') ||
    !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const project = await db.clientProject.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          primaryContactName: true,
          primaryPhone: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  if (!project.organization.primaryPhone.trim()) {
    return NextResponse.json(
      { success: false, error: 'Client does not have a primary phone number' },
      { status: 409 },
    );
  }
  if (!project.nextRenewalDate) {
    return NextResponse.json(
      { success: false, error: 'Set the project next renewal date before sending a reminder' },
      { status: 409 },
    );
  }
  if (project.renewalAmount.lte(0)) {
    return NextResponse.json(
      { success: false, error: 'Set the project renewal amount before sending a reminder' },
      { status: 409 },
    );
  }

  const config = hubtelConfiguration();
  if (!config.sms || !config.senderId) {
    return NextResponse.json(
      { success: false, error: 'Hubtel SMS is not configured' },
      { status: 503 },
    );
  }

  const expired = project.nextRenewalDate.getTime() < Date.now();
  const template = await db.smsTemplate.findFirst({
    where: {
      key: expired ? 'project_expired' : 'project_renewal',
      active: true,
    },
  });
  if (!template) {
    return NextResponse.json(
      { success: false, error: 'System project renewal SMS template is unavailable' },
      { status: 503 },
    );
  }

  const recipient = normalizePhone(project.organization.primaryPhone);
  const renewalDate = new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Accra',
  }).format(project.nextRenewalDate);
  const amount = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: project.renewalCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(project.renewalAmount));

  const content = renderSmsTemplate(template.body, {
    name: project.organization.primaryContactName || project.organization.name,
    project: project.name,
    renewalDate,
    amount,
  });

  const duplicate = await db.smsMessage.findFirst({
    where: {
      recipient,
      templateId: template.id,
      content,
      status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
      createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  if (duplicate) {
    return NextResponse.json(
      {
        success: false,
        error: 'The same project renewal reminder was already sent or queued within the last 12 hours',
      },
      { status: 409 },
    );
  }

  try {
    const message = await queueSingleSms({
      recipient,
      senderId: config.senderId,
      content,
      templateId: template.id,
      createdBy: actor.name || actor.email,
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.project_renewal_reminder_sent',
      entity: 'ClientProject',
      entityId: project.id,
      details: {
        organizationId: project.organizationId,
        template: template.key,
        messageId: message.id,
        renewalDate: project.nextRenewalDate.toISOString(),
        renewalCurrency: project.renewalCurrency,
        renewalAmount: project.renewalAmount.toFixed(2),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        status: message.status,
        recipient: message.recipient,
        template: template.key,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send project renewal reminder',
      },
      {
        status: 503,
        headers: { 'Retry-After': '30' },
      },
    );
  }
}
