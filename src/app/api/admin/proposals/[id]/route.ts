import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { generateProposalDraft } from '@/lib/proposal-draft';
import { deriveProposalReadiness } from '@/lib/proposal-readiness';

const statusSchema = z.enum(['draft', 'review', 'ready', 'sent', 'accepted', 'declined']);

const updateSchema = z.object({
  status: statusSchema.optional(),
  title: z.string().trim().min(1).max(240).optional(),
  executiveSummary: z.string().trim().max(6000).optional(),
  solution: z.string().trim().max(6000).optional(),
  scope: z.string().trim().max(8000).optional(),
  deliverables: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  timeline: z.string().trim().max(3000).optional(),
  commercialNotes: z.string().trim().max(5000).optional(),
  nextSteps: z.string().trim().max(5000).optional(),
  regenerateDraft: z.boolean().optional(),
});

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function readinessFor(proposal: {
  status: string;
  title: string;
  executiveSummary: string;
  solution: string;
  scope: string;
  deliverables: string;
  assumptions: string;
  timeline: string;
  commercialNotes: string;
  nextSteps: string;
  approvedAt: Date | null;
  sentAt: Date | null;
  lead: {
    assignedTo: string;
    company: string;
    serviceInterest: string;
    budgetRange: string;
    expectedRevenue: { toString(): string };
    deliveryWindow: string;
  };
}) {
  return deriveProposalReadiness({
    status: proposal.status,
    title: proposal.title,
    executiveSummary: proposal.executiveSummary,
    solution: proposal.solution,
    scope: proposal.scope,
    deliverables: proposal.deliverables,
    assumptions: proposal.assumptions,
    timeline: proposal.timeline,
    commercialNotes: proposal.commercialNotes,
    nextSteps: proposal.nextSteps,
    approvedAt: proposal.approvedAt,
    sentAt: proposal.sentAt,
    lead: {
      assignedTo: proposal.lead.assignedTo,
      company: proposal.lead.company,
      serviceInterest: proposal.lead.serviceInterest,
      budgetRange: proposal.lead.budgetRange,
      expectedRevenue: Number(proposal.lead.expectedRevenue.toString()),
      deliveryWindow: proposal.lead.deliveryWindow,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getActiveAdminContext(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const proposal = await db.proposal.findUnique({
    where: { id },
    include: {
      lead: { include: { contactMessage: true } },
      clientProject: { include: { organization: { select: { id: true, name: true } } } },
    },
  });

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...proposal, readiness: readinessFor(proposal) } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getActiveAdminContext(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.proposal.findUnique({
      where: { id },
      include: {
      lead: { include: { contactMessage: true } },
      clientProject: { include: { organization: { select: { id: true, name: true } } } },
    },
    });
    if (!existing) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    const contentKeys = ['title', 'executiveSummary', 'solution', 'scope', 'deliverables', 'assumptions', 'timeline', 'commercialNotes', 'nextSteps'] as const;
    const hasContentChanges = contentKeys.some((key) => parsed.data[key] !== undefined) || Boolean(parsed.data.regenerateDraft);

    if (hasContentChanges && ['sent', 'accepted'].includes(existing.status)) {
      return NextResponse.json(
        { success: false, error: 'Sent or accepted proposals cannot be edited in place. Move the commercial process into a reviewed revision workflow.' },
        { status: 409 },
      );
    }

    if (hasContentChanges && parsed.data.status && ['sent', 'accepted'].includes(parsed.data.status)) {
      return NextResponse.json(
        { success: false, error: 'Proposal content changes must be reviewed and approved before the proposal can be Sent or Accepted.' },
        { status: 409 },
      );
    }

    if (hasContentChanges && existing.status === 'ready' && parsed.data.status === undefined) {
      data.status = 'review';
      data.approvedBy = '';
      data.approvedAt = null;
      data.sentAt = null;
    }

    if (parsed.data.regenerateDraft) {
      const draft = generateProposalDraft({
        lead: {
          summary: existing.lead.summary,
          tags: parseTags(existing.lead.tags),
          source: existing.lead.source,
          priority: existing.lead.priority,
        },
        contact: {
          name: existing.lead.contactMessage.name,
          subject: existing.lead.contactMessage.subject,
          message: existing.lead.contactMessage.message,
        },
      });

      Object.assign(data, {
        title: draft.title,
        executiveSummary: draft.executiveSummary,
        solution: draft.solution,
        scope: draft.scope,
        deliverables: JSON.stringify(draft.deliverables),
        assumptions: JSON.stringify(draft.assumptions),
        timeline: draft.timeline,
        commercialNotes: draft.commercialNotes,
        nextSteps: draft.nextSteps,
        version: existing.version + 1,
        lastGeneratedAt: new Date(),
        status: 'draft',
        approvedBy: '',
        approvedAt: null,
        sentAt: null,
      });
    }

    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.executiveSummary !== undefined) data.executiveSummary = parsed.data.executiveSummary;
    if (parsed.data.solution !== undefined) data.solution = parsed.data.solution;
    if (parsed.data.scope !== undefined) data.scope = parsed.data.scope;
    if (parsed.data.deliverables !== undefined) data.deliverables = JSON.stringify(parsed.data.deliverables);
    if (parsed.data.assumptions !== undefined) data.assumptions = JSON.stringify(parsed.data.assumptions);
    if (parsed.data.timeline !== undefined) data.timeline = parsed.data.timeline;
    if (parsed.data.commercialNotes !== undefined) data.commercialNotes = parsed.data.commercialNotes;
    if (parsed.data.nextSteps !== undefined) data.nextSteps = parsed.data.nextSteps;

    if (parsed.data.status !== undefined) {
      if (parsed.data.status === 'sent' && !existing.approvedAt) {
        return NextResponse.json(
          { success: false, error: 'Proposal must be human-approved as Ready before it can be marked Sent.' },
          { status: 409 },
        );
      }
      if (parsed.data.status === 'accepted' && !existing.sentAt) {
        return NextResponse.json(
          { success: false, error: 'Proposal must be marked Sent before it can be marked Accepted.' },
          { status: 409 },
        );
      }

      if (parsed.data.status === 'ready') {
        const prospective = {
          ...existing,
          title: parsed.data.title ?? existing.title,
          executiveSummary: parsed.data.executiveSummary ?? existing.executiveSummary,
          solution: parsed.data.solution ?? existing.solution,
          scope: parsed.data.scope ?? existing.scope,
          deliverables: parsed.data.deliverables !== undefined ? JSON.stringify(parsed.data.deliverables) : existing.deliverables,
          assumptions: parsed.data.assumptions !== undefined ? JSON.stringify(parsed.data.assumptions) : existing.assumptions,
          timeline: parsed.data.timeline ?? existing.timeline,
          commercialNotes: parsed.data.commercialNotes ?? existing.commercialNotes,
          nextSteps: parsed.data.nextSteps ?? existing.nextSteps,
        };
        const readiness = readinessFor(prospective);
        if (!readiness.readyForApproval) {
          return NextResponse.json(
            { success: false, error: 'Proposal is not ready for approval', blockers: readiness.blockers, warnings: readiness.warnings },
            { status: 409 },
          );
        }
      }

      data.status = parsed.data.status;

      if (parsed.data.status === 'ready') {
        data.approvedBy = session.name || session.email;
        data.approvedAt = new Date();
      } else if (['draft', 'review'].includes(parsed.data.status)) {
        data.approvedBy = '';
        data.approvedAt = null;
        data.sentAt = null;
      }

      if (parsed.data.status === 'sent' && !existing.sentAt) {
        data.sentAt = new Date();
      }
    }

    const proposal = await db.proposal.update({
      where: { id },
      data,
      include: {
      lead: { include: { contactMessage: true } },
      clientProject: { include: { organization: { select: { id: true, name: true } } } },
    },
    });

    return NextResponse.json({ success: true, data: { ...proposal, readiness: readinessFor(proposal) } });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json({ success: false, error: 'Failed to update proposal' }, { status: 500 });
  }
}
