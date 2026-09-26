import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance } from '@/lib/finance';
import { hubtelConfiguration, normalizePhone, renderSmsTemplate } from '@/lib/hubtel';
import { queueSingleSms } from '@/lib/sms';

const schema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1).max(25),
});

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }
  if (!hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
    return NextResponse.json({ success: false, error: 'Communications permission is required to send payment reminders' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Select between 1 and 25 invoices' }, { status: 400 });
  }

  const config = hubtelConfiguration();
  if (!config.sms || !config.senderId) {
    return NextResponse.json({ success: false, error: 'Hubtel SMS is not configured' }, { status: 503 });
  }

  const template = await db.smsTemplate.findFirst({
    where: { key: 'payment_due', active: true },
  });
  if (!template) {
    return NextResponse.json({ success: false, error: 'Payment reminder SMS template is unavailable' }, { status: 503 });
  }

  const invoices = await db.clientInvoice.findMany({
    where: { id: { in: [...new Set(parsed.data.invoiceIds)] } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          primaryContactName: true,
          primaryPhone: true,
        },
      },
      allocations: true,
      creditNotes: { where: { status: 'posted' } },
      collectionActivities: {
        where: { type: 'promise_to_pay', promisedDate: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const now = new Date();
  const duplicateCutoff = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  let queued = 0;
  let duplicate = 0;
  let activePromise = 0;
  let invalid = 0;
  const failures: Array<{ invoiceId: string; reason: string }> = [];

  for (const invoice of invoices) {
    try {
      if (['draft', 'void'].includes(invoice.status) || invoice.dueDate >= now) {
        invalid += 1;
        continue;
      }

      const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      if (balance.lte(0) || !invoice.organization.primaryPhone.trim()) {
        invalid += 1;
        continue;
      }

      const latestPromise = invoice.collectionActivities[0];
      if (latestPromise?.promisedDate && latestPromise.promisedDate.getTime() >= now.getTime()) {
        activePromise += 1;
        continue;
      }

      const recipient = normalizePhone(invoice.organization.primaryPhone);
      const amount = new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: invoice.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(balance));
      const dueDate = new Intl.DateTimeFormat('en-GH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Accra',
      }).format(invoice.dueDate);
      const content = renderSmsTemplate(template.body, {
        name: invoice.organization.primaryContactName || invoice.organization.name,
        invoice: invoice.invoiceNumber,
        amount,
        dueDate,
        paymentLink: siteOrigin() + '/client#account',
      });

      const existing = await db.smsMessage.findFirst({
        where: {
          recipient,
          templateId: template.id,
          content,
          status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
          createdAt: { gte: duplicateCutoff },
        },
        select: { id: true },
      });
      if (existing) {
        duplicate += 1;
        continue;
      }

      const message = await queueSingleSms({
        recipient,
        senderId: config.senderId,
        content,
        templateId: template.id,
        scheduledAt: new Date(now.getTime() + 30 * 1000),
        createdBy: actor.name || actor.email,
      });

      await db.financeCollectionActivity.create({
        data: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          type: 'sms_reminder_scheduled',
          note: 'Bulk payment reminder scheduled from the receivables collection queue.',
          smsMessageId: message.id,
          createdBy: actor.name || actor.email,
        },
      });
      queued += 1;
    } catch (error) {
      failures.push({
        invoiceId: invoice.id,
        reason: error instanceof Error ? error.message.slice(0, 240) : 'Unable to schedule reminder',
      });
    }
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_collection_bulk_sms_scheduled',
    entity: 'FinanceCollectionActivity',
    details: {
      requested: parsed.data.invoiceIds.length,
      matched: invoices.length,
      queued,
      duplicate,
      activePromise,
      invalid,
      failed: failures.length,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      requested: parsed.data.invoiceIds.length,
      matched: invoices.length,
      queued,
      duplicate,
      activePromise,
      invalid,
      failed: failures.length,
      failures,
    },
  });
}
