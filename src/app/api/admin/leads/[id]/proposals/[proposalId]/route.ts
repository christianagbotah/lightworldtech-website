import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

const textField = z.string().max(20000);

const updateProposalSchema = z.object({
  status: z.enum(['draft', 'approved', 'archived']).optional(),
  title: z.string().trim().min(1).max(220).optional(),
  executiveSummary: textField.optional(),
  problemStatement: textField.optional(),
  proposedSolution: textField.optional(),
  capabilities: textField.optional(),
  phases: textField.optional(),
  assumptions: textField.optional(),
  exclusions: textField.optional(),
  discoveryQuestions: textField.optional(),
  nextSteps: textField.optional(),
  commercialNotes: textField.optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, proposalId } = await params;
    const proposal = await db.proposalDraft.findFirst({
      where: { id: proposalId, leadId: id },
    });

    if (!proposal) return NextResponse.json({ error: 'Proposal draft not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: proposal });
  } catch (error) {
    console.error('Error fetching proposal draft:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposal draft' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, proposalId } = await params;
    const parsed = updateProposalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid proposal update', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.proposalDraft.findFirst({
      where: { id: proposalId, leadId: id },
    });
    if (!existing) return NextResponse.json({ error: 'Proposal draft not found' }, { status: 404 });

    const data: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.status === 'approved') {
      data.approvedBy = session.name || session.email;
      data.approvedAt = new Date();
    } else if (parsed.data.status === 'draft') {
      data.approvedBy = '';
      data.approvedAt = null;
    }

    const proposal = await db.proposalDraft.update({
      where: { id: proposalId },
      data,
    });

    return NextResponse.json({
      success: true,
      data: proposal,
      warning:
        proposal.status === 'approved'
          ? undefined
          : 'Draft remains subject to human review and must not be treated as an issued commercial commitment.',
    });
  } catch (error) {
    console.error('Error updating proposal draft:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update proposal draft' },
      { status: 500 },
    );
  }
}
