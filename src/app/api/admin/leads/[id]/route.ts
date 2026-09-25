import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { deriveLeadIntelligence } from '@/lib/lead-intelligence';

const statusSchema = z.enum(['new', 'qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost']);
const prioritySchema = z.enum(['low', 'normal', 'high']);

const updateSchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assignedTo: z.string().trim().max(120).optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
  lastContactedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  summary: z.string().trim().max(600).optional(),
  company: z.string().trim().max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  countryRegion: z.string().trim().max(120).optional(),
  timezone: z.string().trim().max(80).optional(),
  serviceInterest: z.string().trim().max(160).optional(),
  currency: z.string().trim().max(12).optional(),
  budgetRange: z.string().trim().max(120).optional(),
  deliveryWindow: z.string().trim().max(120).optional(),
  engagementModel: z.string().trim().max(120).optional(),
  international: z.boolean().optional(),
  expectedRevenue: z.coerce.number().min(0).max(1_000_000_000).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  nextAction: z.string().trim().max(240).optional(),
  regenerateIntelligence: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      contactMessage: true,
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: lead });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.lead.findUnique({
      where: { id },
      include: { contactMessage: true },
    });
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.priority) data.priority = parsed.data.priority;
    if (parsed.data.assignedTo !== undefined) data.assignedTo = parsed.data.assignedTo;
    if (parsed.data.summary !== undefined) data.summary = parsed.data.summary;
    if (parsed.data.tags !== undefined) data.tags = JSON.stringify(parsed.data.tags);
    if (parsed.data.company !== undefined) data.company = parsed.data.company;
    if (parsed.data.industry !== undefined) data.industry = parsed.data.industry;
    if (parsed.data.countryRegion !== undefined) data.countryRegion = parsed.data.countryRegion;
    if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
    if (parsed.data.serviceInterest !== undefined) data.serviceInterest = parsed.data.serviceInterest;
    if (parsed.data.currency !== undefined) data.currency = parsed.data.currency;
    if (parsed.data.budgetRange !== undefined) data.budgetRange = parsed.data.budgetRange;
    if (parsed.data.deliveryWindow !== undefined) data.deliveryWindow = parsed.data.deliveryWindow;
    if (parsed.data.engagementModel !== undefined) data.engagementModel = parsed.data.engagementModel;
    if (parsed.data.international !== undefined) data.international = parsed.data.international;
    if (parsed.data.expectedRevenue !== undefined) data.expectedRevenue = parsed.data.expectedRevenue;
    if (parsed.data.probability !== undefined) data.probability = parsed.data.probability;
    if (parsed.data.nextAction !== undefined) data.nextAction = parsed.data.nextAction;
    if (parsed.data.nextFollowUp !== undefined) {
      data.nextFollowUp = parsed.data.nextFollowUp ? new Date(parsed.data.nextFollowUp) : null;
    }
    if (parsed.data.lastContactedAt !== undefined) {
      data.lastContactedAt = parsed.data.lastContactedAt ? new Date(parsed.data.lastContactedAt) : null;
    }

    if (parsed.data.regenerateIntelligence) {
      const intelligence = deriveLeadIntelligence({
        subject: existing.contactMessage.subject,
        message: [existing.serviceInterest, existing.industry, existing.contactMessage.message].filter(Boolean).join(' '),
      });
      data.source = intelligence.source;
      data.summary = intelligence.summary;
      data.tags = JSON.stringify(intelligence.tags);
      if (!parsed.data.priority) data.priority = intelligence.priority;
    }

    const lead = await db.lead.update({
      where: { id },
      data,
      include: {
        contactMessage: true,
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error updating CRM lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update CRM lead' },
      { status: 500 },
    );
  }
}
