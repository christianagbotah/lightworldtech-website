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
    if (parsed.data.nextFollowUp !== undefined) {
      data.nextFollowUp = parsed.data.nextFollowUp ? new Date(parsed.data.nextFollowUp) : null;
    }
    if (parsed.data.lastContactedAt !== undefined) {
      data.lastContactedAt = parsed.data.lastContactedAt ? new Date(parsed.data.lastContactedAt) : null;
    }

    if (parsed.data.regenerateIntelligence) {
      const intelligence = deriveLeadIntelligence({
        subject: existing.contactMessage.subject,
        message: existing.contactMessage.message,
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
