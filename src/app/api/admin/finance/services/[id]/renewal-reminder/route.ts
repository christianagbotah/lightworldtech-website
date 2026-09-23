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
  const service = await db.clientServiceAccount.findUnique({
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

  if (!service) {
    return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
  }
  if (!service.organization.primaryPhone.trim()) {
    return NextResponse.json(
      { success: false, error: 'Client does not have a primary phone number' },
      { status: 409 },
    );
  }
  if (!service.expiryDate) {
    return NextResponse.json(
      { success: false, error: 'Set the service expiry date before sending a renewal reminder' },
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

  const expired = service.expiryDate.getTime() < Date.now();
  const template = await db.smsTemplate.findFirst({
    where: {
      key: expired ? 'service_expired' : 'service_renewal',
      active: true,
    },
  });
  if (!template) {
    return NextResponse.json(
      { success: false, error: 'System renewal SMS template is unavailable' },
      { status: 503 },
    );
  }

  const recipient = normalizePhone(service.organization.primaryPhone);
  const expiryDate = new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Accra',
  }).format(service.expiryDate);
  const amount = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: service.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(service.recurringAmount));

  const content = renderSmsTemplate(template.body, {
    name: service.organization.primaryContactName || service.organization.name,
    service: service.name,
    expiryDate,
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
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        success: false,
        error: 'The same renewal reminder was already sent or queued within the last 12 hours',
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
      action: 'admin.finance_service_renewal_reminder_sent',
      entity: 'ClientServiceAccount',
      entityId: service.id,
      details: {
        organizationId: service.organizationId,
        template: template.key,
        messageId: message.id,
        expiryDate: service.expiryDate.toISOString(),
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
        error: error instanceof Error ? error.message : 'Unable to send renewal reminder',
      },
      {
        status: 503,
        headers: { 'Retry-After': '30' },
      },
    );
  }
}
