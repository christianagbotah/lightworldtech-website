import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { generateProposalDraft } from '@/lib/proposal-draft';

const createSchema = z.object({
  leadId: z.string().min(1),
});

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const q = searchParams.get('q')?.trim();
    const where: Record<string, unknown> = {};

    if (status && status !== 'all') where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { lead: { summary: { contains: q } } },
        { lead: { contactMessage: { name: { contains: q } } } },
        { lead: { contactMessage: { email: { contains: q } } } },
        { lead: { contactMessage: { subject: { contains: q } } } },
      ];
    }

    const proposals = await db.proposal.findMany({
      where,
      include: {
        lead: {
          include: { contactMessage: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    const statuses = ['draft', 'review', 'ready', 'sent', 'accepted', 'declined'];
    const counts = await Promise.all(statuses.map((item) => db.proposal.count({ where: { status: item } })));

    return NextResponse.json({
      success: true,
      data: proposals,
      summary: {
        total: counts.reduce((sum, value) => sum + value, 0),
        byStatus: Object.fromEntries(statuses.map((item, index) => [item, counts[index]])),
      },
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const lead = await db.lead.findUnique({
      where: { id: parsed.data.leadId },
      include: { contactMessage: true, proposal: true },
    });

    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });

    if (lead.proposal) {
      const existing = await db.proposal.findUnique({
        where: { id: lead.proposal.id },
        include: { lead: { include: { contactMessage: true } } },
      });
      return NextResponse.json({ success: true, data: existing, created: false });
    }

    const draft = generateProposalDraft({
      lead: {
        summary: lead.summary,
        tags: parseTags(lead.tags),
        source: lead.source,
        priority: lead.priority,
      },
      contact: {
        name: lead.contactMessage.name,
        subject: lead.contactMessage.subject,
        message: lead.contactMessage.message,
      },
    });

    const proposal = await db.proposal.create({
      data: {
        leadId: lead.id,
        title: draft.title,
        executiveSummary: draft.executiveSummary,
        solution: draft.solution,
        scope: draft.scope,
        deliverables: JSON.stringify(draft.deliverables),
        assumptions: JSON.stringify(draft.assumptions),
        timeline: draft.timeline,
        commercialNotes: draft.commercialNotes,
        nextSteps: draft.nextSteps,
        lastGeneratedAt: new Date(),
      },
      include: { lead: { include: { contactMessage: true } } },
    });

    return NextResponse.json({ success: true, data: proposal, created: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json({ success: false, error: 'Failed to create proposal' }, { status: 500 });
  }
}
