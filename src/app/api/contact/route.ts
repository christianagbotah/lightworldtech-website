import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/admin-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';
import { deriveLeadIntelligence } from '@/lib/lead-intelligence';

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

    return NextResponse.json(
      { success: true, data: message, message: 'Message sent successfully' },
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
