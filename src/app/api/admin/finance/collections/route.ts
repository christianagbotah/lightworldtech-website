import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance, invoiceStatusFromBalance } from '@/lib/finance';
import { hubtelConfiguration, normalizePhone, renderSmsTemplate } from '@/lib/hubtel';
import { queueSingleSms } from '@/lib/sms';

const activitySchema = z.object({
  invoiceId: z.string().min(1),
  type: z.enum(['note', 'call', 'email', 'follow_up', 'promise_to_pay', 'sms_reminder']),
  note: z.string().trim().max(4000).optional().default(''),
  promisedAmount: z.coerce.number().positive().max(999999999999).nullable().optional(),
  promisedDate: z.coerce.date().nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
});

function ageBucket(dueDate: Date, now: Date): 'current' | '1_30' | '31_60' | '61_90' | '90_plus' {
  const days = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '90_plus';
}

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '');
}

function sameCalendarDayOrLater(value: Date): boolean {
  return value.toISOString().slice(0, 10) >= new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const bucket = searchParams.get('bucket') || 'all';
  const state = searchParams.get('state') || 'all';

  const invoices = await db.clientInvoice.findMany({
    where: { status: { notIn: ['draft', 'void'] } },
    orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
    take: 3000,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          primaryContactName: true,
          primaryEmail: true,
          primaryPhone: true,
        },
      },
      service: { select: { id: true, name: true, planName: true } },
      allocations: true,
      creditNotes: { where: { status: 'posted' } },
      collectionActivities: {
        orderBy: { createdAt: 'desc' },
        take: 25,
      },
    },
  });

  const totalsByCurrency: Record<string, {
    outstanding: Prisma.Decimal;
    overdue: Prisma.Decimal;
    promised: Prisma.Decimal;
  }> = {};
  let followUpDue = 0;
  let brokenPromises = 0;

  const items = invoices.flatMap((invoice) => {
    const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    if (balance.lte(0)) return [];

    const daysOverdue = Math.max(0, Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000));
    const invoiceBucket = ageBucket(invoice.dueDate, now);
    const openFollowUp = invoice.collectionActivities.find((activity) => activity.nextFollowUpAt && !activity.completedAt) || null;
    const latestPromise = invoice.collectionActivities.find((activity) => activity.type === 'promise_to_pay' && activity.promisedDate) || null;
    const promiseFuture = Boolean(latestPromise?.promisedDate && latestPromise.promisedDate.getTime() >= now.getTime());
    const brokenPromise = Boolean(latestPromise?.promisedDate && latestPromise.promisedDate.getTime() < now.getTime());
    const dueFollowUp = Boolean(openFollowUp?.nextFollowUpAt && openFollowUp.nextFollowUpAt.getTime() <= now.getTime());

    const collectionState = dueFollowUp
      ? 'follow_up_due'
      : brokenPromise
        ? 'broken_promise'
        : promiseFuture
          ? 'promised'
          : daysOverdue > 0
            ? 'overdue'
            : 'current';

    if (!totalsByCurrency[invoice.currency]) {
      totalsByCurrency[invoice.currency] = {
        outstanding: new Prisma.Decimal(0),
        overdue: new Prisma.Decimal(0),
        promised: new Prisma.Decimal(0),
      };
    }
    totalsByCurrency[invoice.currency].outstanding =
      totalsByCurrency[invoice.currency].outstanding.plus(balance);
    if (daysOverdue > 0) {
      totalsByCurrency[invoice.currency].overdue =
        totalsByCurrency[invoice.currency].overdue.plus(balance);
    }
    if (promiseFuture && latestPromise?.promisedAmount) {
      totalsByCurrency[invoice.currency].promised =
        totalsByCurrency[invoice.currency].promised.plus(
          Prisma.Decimal.min(balance, latestPromise.promisedAmount),
        );
    }
    if (dueFollowUp) followUpDue += 1;
    if (brokenPromise) brokenPromises += 1;

    const searchable = [
      invoice.invoiceNumber,
      invoice.organization.name,
      invoice.organization.primaryContactName,
      invoice.organization.primaryEmail,
      invoice.organization.primaryPhone,
      invoice.service?.name || '',
      invoice.service?.planName || '',
    ].join(' ').toLowerCase();

    const item = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      organizationId: invoice.organizationId,
      customer: invoice.organization.name,
      contactName: invoice.organization.primaryContactName,
      email: invoice.organization.primaryEmail,
      phone: invoice.organization.primaryPhone,
      service: invoice.service?.name || '',
      planName: invoice.service?.planName || '',
      currency: invoice.currency,
      total: invoice.total.toFixed(2),
      balance: balance.toFixed(2),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      daysOverdue,
      bucket: invoiceBucket,
      invoiceStatus: invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: invoice.allocations,
        credits: invoice.creditNotes,
        dueDate: invoice.dueDate,
        now,
      }),
      collectionState,
      openFollowUp: openFollowUp ? {
        id: openFollowUp.id,
        nextFollowUpAt: openFollowUp.nextFollowUpAt,
        createdBy: openFollowUp.createdBy,
      } : null,
      latestPromise: latestPromise ? {
        promisedAmount: latestPromise.promisedAmount?.toFixed(2) || null,
        promisedDate: latestPromise.promisedDate,
        note: latestPromise.note,
      } : null,
      activities: invoice.collectionActivities.map((activity) => ({
        ...activity,
        promisedAmount: activity.promisedAmount?.toFixed(2) || null,
      })),
    };

    if (q && !searchable.includes(q)) return [];
    if (bucket !== 'all' && invoiceBucket !== bucket) return [];
    if (state !== 'all' && collectionState !== state) return [];
    return [item];
  }).sort((a, b) => {
    if (a.collectionState === 'follow_up_due' && b.collectionState !== 'follow_up_due') return -1;
    if (b.collectionState === 'follow_up_due' && a.collectionState !== 'follow_up_due') return 1;
    if (a.collectionState === 'broken_promise' && b.collectionState !== 'broken_promise') return -1;
    if (b.collectionState === 'broken_promise' && a.collectionState !== 'broken_promise') return 1;
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return Number(b.balance) - Number(a.balance);
  });

  return NextResponse.json({
    success: true,
    data: {
      items,
      summary: {
        totalsByCurrency: Object.fromEntries(
          Object.entries(totalsByCurrency).map(([currency, totals]) => [currency, {
            outstanding: totals.outstanding.toFixed(2),
            overdue: totals.overdue.toFixed(2),
            promised: totals.promised.toFixed(2),
          }]),
        ),
        invoices: items.length,
        followUpDue,
        brokenPromises,
      },
      smsConfigured: hubtelConfiguration().sms,
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = activitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid collection activity', details: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await db.clientInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
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
    },
  });
  if (!invoice || ['draft', 'void'].includes(invoice.status)) {
    return NextResponse.json({ success: false, error: 'Collectable invoice not found' }, { status: 404 });
  }

  const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
  if (balance.lte(0)) {
    return NextResponse.json({ success: false, error: 'This invoice no longer has an outstanding balance' }, { status: 409 });
  }

  if (parsed.data.promisedDate && !sameCalendarDayOrLater(parsed.data.promisedDate)) {
    return NextResponse.json({ success: false, error: 'Promise date cannot be in the past' }, { status: 400 });
  }
  if (parsed.data.nextFollowUpAt && !sameCalendarDayOrLater(parsed.data.nextFollowUpAt)) {
    return NextResponse.json({ success: false, error: 'Next follow-up cannot be in the past' }, { status: 400 });
  }

  let promisedAmount: Prisma.Decimal | null = null;
  if (parsed.data.type === 'promise_to_pay') {
    if (!parsed.data.promisedDate || !parsed.data.promisedAmount) {
      return NextResponse.json({ success: false, error: 'Promise-to-pay requires an amount and promise date' }, { status: 400 });
    }
    promisedAmount = new Prisma.Decimal(parsed.data.promisedAmount).toDecimalPlaces(2);
    if (promisedAmount.gt(balance)) {
      return NextResponse.json({ success: false, error: 'Promised amount cannot exceed the current invoice balance' }, { status: 400 });
    }
  }

  let smsMessageId = '';
  let note = parsed.data.note;
  if (parsed.data.type === 'sms_reminder') {
    if (!hasAdminPermission(actor.role, actor.permissions, 'communications.manage')) {
      return NextResponse.json({ success: false, error: 'Communications permission is required to send an SMS reminder' }, { status: 403 });
    }
    if (!invoice.organization.primaryPhone.trim()) {
      return NextResponse.json({ success: false, error: 'Client does not have a primary phone number' }, { status: 409 });
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

    const duplicate = await db.smsMessage.findFirst({
      where: {
        recipient,
        templateId: template.id,
        content,
        status: { in: ['queued', 'scheduled', 'sent', 'delivered'] },
        createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({
        success: false,
        error: 'The same payment reminder was already sent or queued within the last 12 hours',
      }, { status: 409 });
    }

    try {
      const message = await queueSingleSms({
        recipient,
        senderId: config.senderId,
        content,
        templateId: template.id,
        createdBy: actor.name || actor.email,
      });
      smsMessageId = message.id;
      note = note || 'Payment reminder sent through Hubtel SMS.';
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send payment reminder',
      }, { status: 503, headers: { 'Retry-After': '30' } });
    }
  }

  const activity = await db.financeCollectionActivity.create({
    data: {
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      type: parsed.data.type,
      note,
      promisedAmount,
      promisedDate: parsed.data.type === 'promise_to_pay' ? parsed.data.promisedDate : null,
      nextFollowUpAt: parsed.data.nextFollowUpAt || null,
      smsMessageId,
      createdBy: actor.name || actor.email,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_collection_activity_created',
    entity: 'FinanceCollectionActivity',
    entityId: activity.id,
    details: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      organizationId: invoice.organizationId,
      type: activity.type,
      promisedAmount: activity.promisedAmount?.toFixed(2) || null,
      promisedDate: activity.promisedDate?.toISOString() || null,
      nextFollowUpAt: activity.nextFollowUpAt?.toISOString() || null,
      smsMessageId: activity.smsMessageId || null,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...activity,
      promisedAmount: activity.promisedAmount?.toFixed(2) || null,
    },
  }, { status: 201 });
}
