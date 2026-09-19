import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().max(4000).default(''),
  status: z.enum(['planning', 'active', 'on_hold', 'completed']).default('planning'),
  progress: z.number().int().min(0).max(100).default(0),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  proposalId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id: accountId } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid project', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const account = await db.clientPortalAccount.findUnique({
      where: { id: accountId },
      select: { id: true, leadId: true },
    });
    if (!account) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    if (parsed.data.proposalId) {
      const proposal = await db.proposal.findUnique({
        where: { id: parsed.data.proposalId },
        select: { id: true, leadId: true, clientProject: { select: { id: true } } },
      });
      if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      if (proposal.clientProject) {
        return NextResponse.json({ error: 'Proposal is already linked to a client project' }, { status: 409 });
      }
      if (account.leadId && proposal.leadId !== account.leadId) {
        return NextResponse.json({ error: 'Proposal does not belong to this client lead' }, { status: 400 });
      }
    }

    const project = await db.clientProject.create({
      data: {
        accountId,
        proposalId: parsed.data.proposalId || null,
        title: parsed.data.title,
        summary: parsed.data.summary,
        status: parsed.data.status,
        progress: parsed.data.progress,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      },
      include: { milestones: true, documents: true },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error('Admin client project create failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to create client project' }, { status: 500 });
  }
}
