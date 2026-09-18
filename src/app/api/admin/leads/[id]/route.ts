import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const statusSchema = z.enum(['new', 'qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost']);
const prioritySchema = z.enum(['normal', 'medium', 'high']);

const updateLeadSchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  category: z.string().trim().min(1).max(100).optional(),
  assignedTo: z.string().trim().max(160).optional(),
  nextAction: z.string().trim().max(600).optional(),
  notes: z.string().trim().max(5000).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const lead = await db.lead.findUnique({
      where: { id },
      include: { contactMessage: true },
    });

    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = updateLeadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.lead.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });

    const lead = await db.lead.update({
      where: { id },
      data: {
        ...parsed.data,
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await db.lead.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete lead' }, { status: 500 });
  }
}
