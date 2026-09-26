import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/admin-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';
import { deriveLeadIntelligence } from '@/lib/lead-intelligence';
import { getMailTransportStatus, sanitizeMailError, sendTransactionalMail } from '@/lib/mail';

// GET all contact messages
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread');
    const requestedPage = parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 20;

    const where: Record<string, unknown> = {};
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.contactMessage.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contactMessage.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact messages' },
      { status: 500 }
    );
  }
}

// POST submit contact form
const createContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().max(254).email('Valid email is required').transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(50).optional().default(''),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(1, 'Message is required').max(8000),
  company: z.string().trim().max(160).optional().default(''),
  industry: z.string().trim().max(120).optional().default(''),
  countryRegion: z.string().trim().max(120).optional().default(''),
  timezone: z.string().trim().max(80).optional().default(''),
  serviceInterest: z.string().trim().max(160).optional().default(''),
  currency: z.string().trim().max(12).optional().default(''),
  budgetRange: z.string().trim().max(120).optional().default(''),
  deliveryWindow: z.string().trim().max(120).optional().default(''),
  engagementModel: z.string().trim().max(120).optional().default(''),
});

function isInternationalCountry(countryRegion: string): boolean {
  const normalized = countryRegion.trim().toLowerCase();
  if (!normalized) return false;
  return !/\bghana\b|\bgh\b/.test(normalized);
}


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function notifyContactLead(input: {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  company: string;
  serviceInterest: string;
  countryRegion: string;
  priority: string;
}) {
  const recipient = (process.env.CONTACT_NOTIFICATION_EMAIL || process.env.MAIL_REPLY_TO || '').trim();
  const mail = getMailTransportStatus();
  if (!recipient || !mail.configured) return { sent: false, reason: 'not_configured' as const };

  const subject = '[Website lead] ' + (input.subject || input.serviceInterest || 'New project enquiry');
  const adminUrl = (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com')
    .trim()
    .replace(/\/$/, '') + '/admin';

  try {
    const result = await sendTransactionalMail({
      to: recipient,
      subject,
      text:
        'New Lightworld website enquiry\n\n' +
        'Name: ' + input.name + '\n' +
        'Email: ' + input.email + '\n' +
        'Phone: ' + (input.phone || '—') + '\n' +
        'Company: ' + (input.company || '—') + '\n' +
        'Country / region: ' + (input.countryRegion || '—') + '\n' +
        'Service interest: ' + (input.serviceInterest || '—') + '\n' +
        'Lead priority: ' + input.priority + '\n\n' +
        'Message:\n' + input.message + '\n\n' +
        'Open the Lightworld admin CRM: ' + adminUrl,
      html:
        '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
        '<div style="padding:28px;border:1px solid #e2e8f0;border-radius:20px">' +
        '<p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#b7791f">Lightworld website lead</p>' +
        '<h1 style="margin:0 0 18px;font-size:22px">' + escapeHtml(input.subject || input.serviceInterest || 'New project enquiry') + '</h1>' +
        '<p><strong>Name:</strong> ' + escapeHtml(input.name) + '</p>' +
        '<p><strong>Email:</strong> ' + escapeHtml(input.email) + '</p>' +
        '<p><strong>Phone:</strong> ' + escapeHtml(input.phone || '—') + '</p>' +
        '<p><strong>Company:</strong> ' + escapeHtml(input.company || '—') + '</p>' +
        '<p><strong>Country / region:</strong> ' + escapeHtml(input.countryRegion || '—') + '</p>' +
        '<p><strong>Service interest:</strong> ' + escapeHtml(input.serviceInterest || '—') + '</p>' +
        '<p><strong>Lead priority:</strong> ' + escapeHtml(input.priority) + '</p>' +
        '<div style="margin:18px 0;padding:16px;border-radius:12px;background:#f8fafc;white-space:pre-wrap">' + escapeHtml(input.message) + '</div>' +
        '<p><a href="' + escapeHtml(adminUrl) + '" style="display:inline-block;padding:10px 15px;border-radius:9px;background:#b7791f;color:white;text-decoration:none;font-weight:700">Open admin CRM</a></p>' +
        '</div></div>',
    });
    return { sent: true, transport: result.transport };
  } catch (error) {
    console.error('Contact lead notification failed:', sanitizeMailError(error));
    return { sent: false, reason: 'delivery_failed' as const };
  }
}

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'contact', 12, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many contact submissions. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = createContactSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const intelligence = deriveLeadIntelligence({
      subject: parsed.data.subject,
      message: [parsed.data.serviceInterest, parsed.data.industry, parsed.data.message].filter(Boolean).join(' '),
    });
    const industryTag = parsed.data.industry
      ? parsed.data.industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : '';
    const tags = Array.from(new Set([...intelligence.tags, industryTag].filter(Boolean))).slice(0, 8);

    const message = await db.$transaction(async (tx) => {
      const created = await tx.contactMessage.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          subject: parsed.data.subject,
          message: parsed.data.message,
        },
      });

      await tx.lead.create({
        data: {
          contactMessageId: created.id,
          source: intelligence.source,
          summary: intelligence.summary,
          tags: JSON.stringify(tags),
          priority: intelligence.priority,
          company: parsed.data.company,
          industry: parsed.data.industry,
          countryRegion: parsed.data.countryRegion,
          timezone: parsed.data.timezone,
          serviceInterest: parsed.data.serviceInterest,
          currency: parsed.data.currency,
          budgetRange: parsed.data.budgetRange,
          deliveryWindow: parsed.data.deliveryWindow,
          engagementModel: parsed.data.engagementModel,
          international: isInternationalCountry(parsed.data.countryRegion),
        },
      });

      return created;
    });

    const notification = await notifyContactLead({
      id: message.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      message: parsed.data.message,
      company: parsed.data.company,
      serviceInterest: parsed.data.serviceInterest,
      countryRegion: parsed.data.countryRegion,
      priority: intelligence.priority,
    });

    return NextResponse.json(
      {
        success: true,
        data: message,
        message: 'Message sent successfully',
        notificationSent: notification.sent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contact message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
