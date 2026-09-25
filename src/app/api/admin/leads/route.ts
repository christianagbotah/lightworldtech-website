import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { ensureHistoricalLeads } from '@/lib/crm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureHistoricalLeads();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const q = searchParams.get('q')?.trim();
    const industry = searchParams.get('industry')?.trim();
    const international = searchParams.get('international');
    const overdue = searchParams.get('overdue') === 'true';
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 100)));

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (industry && industry !== 'all') where.industry = industry;
    if (international === 'true') where.international = true;
    if (international === 'false') where.international = false;
    if (overdue) {
      where.nextFollowUp = { lt: new Date() };
      where.status = status && status !== 'all' ? status : { notIn: ['won', 'lost'] };
    }
    if (q) {
      where.OR = [
        { summary: { contains: q } },
        { assignedTo: { contains: q } },
        { company: { contains: q } },
        { industry: { contains: q } },
        { countryRegion: { contains: q } },
        { timezone: { contains: q } },
        { serviceInterest: { contains: q } },
        { nextAction: { contains: q } },
        { contactMessage: { name: { contains: q } } },
        { contactMessage: { email: { contains: q } } },
        { contactMessage: { subject: { contains: q } } },
      ];
    }

    const leads = await db.lead.findMany({
      where,
      include: {
        contactMessage: true,
        notes: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    const all = await db.lead.findMany({
      select: { status: true, priority: true, nextFollowUp: true, international: true },
    });

    const stages = ['new', 'qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];
    const byStatus = Object.fromEntries(
      stages.map((stage) => [stage, all.filter((lead) => lead.status === stage).length]),
    );
    const now = new Date();
    const overdueFollowUps = all.filter(
      (lead) => lead.nextFollowUp && lead.nextFollowUp < now && !['won', 'lost'].includes(lead.status),
    ).length;

    return NextResponse.json({
      success: true,
      data: leads,
      summary: {
        total: all.length,
        open: all.filter((lead) => !['won', 'lost'].includes(lead.status)).length,
        highPriority: all.filter((lead) => lead.priority === 'high').length,
        international: all.filter((lead) => lead.international).length,
        overdueFollowUps,
        byStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching CRM leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CRM leads' },
      { status: 500 },
    );
  }
}
