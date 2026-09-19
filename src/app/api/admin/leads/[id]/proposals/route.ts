import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import { generateProposalDraft } from '@/lib/proposal-assistant';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const lead = await db.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const proposals = await db.proposalDraft.findMany({
      where: { leadId: id },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: proposals });
  } catch (error) {
    console.error('Error fetching proposal drafts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposal drafts' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    const [lead, services, companySetting] = await Promise.all([
      db.lead.findUnique({
        where: { id },
        include: {
          contactMessage: true,
          notes: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      }),
      db.service.findMany({
        where: { active: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { title: true, description: true, features: true },
      }),
      db.siteSetting.findUnique({
        where: { key: 'company_name' },
        select: { value: true },
      }),
    ]);

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    let tags: string[] = [];
    try {
      const parsed = JSON.parse(lead.tags);
      if (Array.isArray(parsed)) tags = parsed.map(String).filter(Boolean);
    } catch {
      tags = [];
    }

    const generated = generateProposalDraft({
      companyName: companySetting?.value || 'Lightworld Technologies Ltd',
      contactName: lead.contactMessage.name,
      subject: lead.contactMessage.subject,
      message: lead.contactMessage.message,
      leadSummary: lead.summary,
      tags,
      notes: lead.notes.map((note) => ({ note: note.note })),
      services,
    });

    const proposal = await db.$transaction(async (tx) => {
      const latest = await tx.proposalDraft.findFirst({
        where: { leadId: id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = (latest?.version || 0) + 1;

      return tx.proposalDraft.create({
        data: {
          leadId: id,
          version,
          status: 'draft',
          ...generated,
          createdBy: session.name || session.email,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: proposal,
        warning:
          'Draft generated for human review. Pricing, delivery commitments and contractual terms must be added or approved by an authorized reviewer.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error generating proposal draft:', error);
    const code = (error as { code?: string })?.code;
    if (code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Another proposal version was created at the same time. Please retry.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to generate proposal draft' },
      { status: 500 },
    );
  }
}
