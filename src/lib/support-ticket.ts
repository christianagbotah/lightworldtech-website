import { db } from '@/lib/db';
import { getMailTransportStatus, sanitizeMailError, sendTransactionalMail } from '@/lib/mail';
import { hubtelConfiguration, normalizePhone, renderSmsTemplate } from '@/lib/hubtel';
import { queueSingleSms } from '@/lib/sms';

export const SUPPORT_TICKET_CATEGORIES = [
  'technical',
  'billing',
  'hosting',
  'project_change',
  'training',
  'account',
  'general',
] as const;

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type SupportTicketPriority = 'low' | 'normal' | 'high';

const SLA_HOURS: Record<SupportTicketPriority, { firstResponse: number; resolution: number }> = {
  high: { firstResponse: 2, resolution: 24 },
  normal: { firstResponse: 8, resolution: 72 },
  low: { firstResponse: 24, resolution: 120 },
};

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function supportSla(priority: SupportTicketPriority, createdAt = new Date()) {
  const policy = SLA_HOURS[priority];
  return {
    firstResponseDueAt: addHours(createdAt, policy.firstResponse),
    resolutionDueAt: addHours(createdAt, policy.resolution),
  };
}

export async function reconcileSupportEscalations(now = new Date()): Promise<number> {
  const breached = await db.clientSupportTicket.findMany({
    where: {
      escalatedAt: null,
      status: { notIn: ['resolved', 'closed'] },
      OR: [
        { firstRespondedAt: null, firstResponseDueAt: { lt: now } },
        { resolutionDueAt: { lt: now } },
      ],
    },
    select: {
      id: true,
      ticketNumber: true,
    },
    take: 100,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  if (!breached.length) return 0;

  await db.$transaction(async (tx) => {
    for (const ticket of breached) {
      await tx.clientSupportTicket.update({
        where: { id: ticket.id },
        data: { escalatedAt: now },
      });
      await tx.clientTicketEvent.create({
        data: {
          ticketId: ticket.id,
          type: 'sla_escalated',
          actorType: 'system',
          actorName: 'Lightworld SLA Monitor',
          details: JSON.stringify({ ticketNumber: ticket.ticketNumber }),
        },
      });
    }
  });

  return breached.length;
}

export function supportSlaState(ticket: {
  status: string;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
}, now = new Date()) {
  const closed = ticket.status === 'closed' || ticket.status === 'resolved';
  const firstResponseBreached =
    !ticket.firstRespondedAt &&
    Boolean(ticket.firstResponseDueAt && ticket.firstResponseDueAt.getTime() < now.getTime());
  const resolutionBreached =
    !closed &&
    Boolean(ticket.resolutionDueAt && ticket.resolutionDueAt.getTime() < now.getTime());

  return {
    firstResponseBreached,
    resolutionBreached,
    breached: firstResponseBreached || resolutionBreached,
  };
}

export async function nextSupportTicketNumber(now = new Date()): Promise<string> {
  const rows = await db.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('"client_support_ticket_number_seq"') AS value
  `;
  const sequence = Number(rows[0]?.value || 0);
  if (!Number.isFinite(sequence) || sequence <= 0) {
    throw new Error('Unable to allocate support ticket number');
  }
  return 'LWT-' + now.getUTCFullYear() + '-' + String(sequence).padStart(5, '0');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function portalUrl(): string {
  const origin = (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '');
  return origin + '/client';
}

export async function notifyClientTicketCreated(input: {
  to: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  firstResponseDueAt: Date;
}) {
  try {
    await sendTransactionalMail({
      to: input.to,
      subject: '[' + input.ticketNumber + '] Support request received: ' + input.subject,
      text:
        'Hello ' + input.customerName + ',\n\n' +
        'We received your support request ' + input.ticketNumber + '.\n' +
        'Subject: ' + input.subject + '\n' +
        'First-response target: ' + input.firstResponseDueAt.toUTCString() + '\n\n' +
        'Track and reply securely in your Lightworld Client Portal:\n' + portalUrl() + '\n\n' +
        'Lightworld Technologies Ltd',
      html:
        '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
        '<p>Hello ' + escapeHtml(input.customerName) + ',</p>' +
        '<h2 style="margin:0 0 8px">' + escapeHtml(input.ticketNumber) + '</h2>' +
        '<p>We received your support request: <strong>' + escapeHtml(input.subject) + '</strong>.</p>' +
        '<p><strong>First-response target:</strong> ' + escapeHtml(input.firstResponseDueAt.toUTCString()) + '</p>' +
        '<p><a href="' + portalUrl() + '">Track and reply in your secure Lightworld Client Portal</a></p>' +
        '<p>Lightworld Technologies Ltd</p>' +
        '</div>',
    });
  } catch (error) {
    console.error('Support ticket confirmation email failed:', sanitizeMailError(error));
  }
}

async function notifySupportUpdateSms(input: {
  phone?: string;
  customerName: string;
  ticketNumber: string;
  status: string;
}) {
  if (!input.phone?.trim()) return;
  const config = hubtelConfiguration();
  if (!config.sms || !config.senderId) return;

  try {
    const template = await db.smsTemplate.findFirst({
      where: { key: 'support_update', active: true },
    });
    if (!template) return;

    const recipient = normalizePhone(input.phone);
    const statusLabel = input.status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const content = renderSmsTemplate(template.body, {
      name: input.customerName,
      ticket: input.ticketNumber,
      status: statusLabel,
    });

    const duplicate = await db.smsMessage.findFirst({
      where: {
        recipient,
        templateId: template.id,
        content,
        status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (duplicate) return;

    await queueSingleSms({
      recipient,
      senderId: config.senderId,
      content,
      templateId: template.id,
      scheduledAt: new Date(Date.now() + 30_000),
      createdBy: 'System support update',
    });
  } catch (error) {
    console.error(
      'Client support SMS notification failed:',
      error instanceof Error ? error.message.slice(0, 500) : 'SMS notification failed',
    );
  }
}

export async function notifyClientOfSupportStatus(input: {
  to: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  status: string;
  phone?: string;
}) {
  const statusLabel = input.status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  try {
    await sendTransactionalMail({
      to: input.to,
      subject: '[' + input.ticketNumber + '] Ticket status: ' + statusLabel,
      text:
        'Hello ' + input.customerName + ',\n\n' +
        'Your support ticket ' + input.ticketNumber + ' has been updated.\n' +
        'Subject: ' + input.subject + '\n' +
        'Status: ' + statusLabel + '\n\n' +
        'View the ticket in your secure Lightworld Client Portal:\n' + portalUrl() + '\n\n' +
        'Lightworld Technologies Ltd',
      html:
        '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
        '<p>Hello ' + escapeHtml(input.customerName) + ',</p>' +
        '<p>Your support ticket <strong>' + escapeHtml(input.ticketNumber) + '</strong> has been updated.</p>' +
        '<p><strong>Subject:</strong> ' + escapeHtml(input.subject) + '<br>' +
        '<strong>Status:</strong> ' + escapeHtml(statusLabel) + '</p>' +
        '<p><a href="' + portalUrl() + '">View the ticket in your secure Lightworld Client Portal</a></p>' +
        '<p>Lightworld Technologies Ltd</p>' +
        '</div>',
    });
  } catch (error) {
    console.error('Support ticket status email failed:', sanitizeMailError(error));
  }

  await notifySupportUpdateSms({
    phone: input.phone,
    customerName: input.customerName,
    ticketNumber: input.ticketNumber,
    status: input.status,
  });
}

export async function notifySupportDesk(input: {
  ticketNumber: string;
  organizationName: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  priority: string;
  category: string;
  kind: 'created' | 'client_reply' | 'reopened';
}) {
  const target = getMailTransportStatus().replyTo;
  try {
    await sendTransactionalMail({
      to: target,
      subject:
        '[' + input.ticketNumber + '] ' +
        (input.kind === 'created'
          ? 'New support ticket: '
          : input.kind === 'reopened'
            ? 'Ticket reopened: '
            : 'Client reply: ') +
        input.subject,
      text:
        input.organizationName + '\n' +
        input.customerName + ' <' + input.customerEmail + '>\n' +
        'Priority: ' + input.priority + '\n' +
        'Category: ' + input.category + '\n\n' +
        input.message + '\n\n' +
        'Open Support Desk: https://lightworldtech.com/admin',
      html:
        '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
        '<h2 style="margin:0 0 10px">' + escapeHtml(input.ticketNumber) + '</h2>' +
        '<p style="margin:0 0 16px"><strong>' + escapeHtml(input.subject) + '</strong></p>' +
        '<p style="margin:0 0 6px">' + escapeHtml(input.organizationName) + '</p>' +
        '<p style="margin:0 0 16px;color:#64748b">' +
        escapeHtml(input.customerName) + ' &lt;' + escapeHtml(input.customerEmail) + '&gt;</p>' +
        '<p style="margin:0 0 16px">' +
        '<strong>Priority:</strong> ' + escapeHtml(input.priority) + ' &nbsp; ' +
        '<strong>Category:</strong> ' + escapeHtml(input.category) + '</p>' +
        '<div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap">' +
        escapeHtml(input.message) + '</div>' +
        '<p style="margin-top:20px"><a href="https://lightworldtech.com/admin">Open Lightworld Support Desk</a></p>' +
        '</div>',
    });
  } catch (error) {
    console.error('Support desk notification failed:', sanitizeMailError(error));
  }
}

export async function notifyClientOfSupportReply(input: {
  to: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  message: string;
  authorName: string;
  phone?: string;
  status?: string;
}) {
  try {
    await sendTransactionalMail({
      to: input.to,
      subject: '[' + input.ticketNumber + '] Re: ' + input.subject,
      text:
        'Hello ' + input.customerName + ',\n\n' +
        input.message + '\n\n' +
        'Reply in your secure Lightworld Client Portal:\n' + portalUrl() + '\n\n' +
        'Regards,\n' + input.authorName + '\nLightworld Technologies Ltd',
      html:
        '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
        '<p>Hello ' + escapeHtml(input.customerName) + ',</p>' +
        '<div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap">' +
        escapeHtml(input.message) + '</div>' +
        '<p style="margin-top:20px"><a href="' + portalUrl() + '">Reply in your secure Lightworld Client Portal</a></p>' +
        '<p>Regards,<br>' + escapeHtml(input.authorName) + '<br>Lightworld Technologies Ltd</p>' +
        '</div>',
    });
  } catch (error) {
    console.error('Client ticket reply notification failed:', sanitizeMailError(error));
  }

  await notifySupportUpdateSms({
    phone: input.phone,
    customerName: input.customerName,
    ticketNumber: input.ticketNumber,
    status: input.status || 'awaiting_client',
  });
}
