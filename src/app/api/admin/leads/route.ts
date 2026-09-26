import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { ensureHistoricalLeads } from '@/lib/crm';
import { deriveCrmOperatingIntelligence } from '@/lib/crm-operating-intelligence';

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
        proposal: { select: { status: true, approvedAt: true, sentAt: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    const all = await db.lead.findMany({
      select: {
        status: true,
        priority: true,
        nextFollowUp: true,
        international: true,
        countryRegion: true,
        industry: true,
        currency: true,
        expectedRevenue: true,
        probability: true,
        nextAction: true,
        assignedTo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const stages = ['new', 'qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];
    const byStatus = Object.fromEntries(
      stages.map((stage) => [stage, all.filter((lead) => lead.status === stage).length]),
    );
    const now = new Date();
    const openLeads = all.filter((lead) => !['won', 'lost'].includes(lead.status));
    const overdueFollowUps = openLeads.filter(
      (lead) => lead.nextFollowUp && lead.nextFollowUp < now,
    ).length;

    const wonCount = all.filter((lead) => lead.status === 'won').length;
    const lostCount = all.filter((lead) => lead.status === 'lost').length;
    const decidedCount = wonCount + lostCount;
    const winRatePct = decidedCount
      ? Math.round((wonCount / decidedCount) * 1000) / 10
      : null;
    const openAgesDays = openLeads.map((lead) =>
      Math.max(0, now.getTime() - lead.createdAt.getTime()) / 86_400_000,
    );
    const avgOpenAgeDays = openAgesDays.length
      ? Math.round((openAgesDays.reduce((sum, value) => sum + value, 0) / openAgesDays.length) * 10) / 10
      : null;
    const oldestOpenAgeDays = openAgesDays.length
      ? Math.round(Math.max(...openAgesDays) * 10) / 10
      : null;
    const followUpCoveragePct = openLeads.length
      ? Math.round((openLeads.filter((lead) => Boolean(lead.nextFollowUp)).length / openLeads.length) * 1000) / 10
      : null;
    const staleCutoff = new Date(now.getTime() - 14 * 86_400_000);
    const staleOpen = openLeads.filter((lead) => lead.updatedAt < staleCutoff).length;
    const unassignedOpen = openLeads.filter((lead) => !lead.assignedTo.trim()).length;

    const pipeline = new Map<string, { currency: string; opportunities: number; expectedRevenue: number; weightedRevenue: number }>();
    for (const lead of openLeads) {
      const amount = Number(lead.expectedRevenue.toString());
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const currency = lead.currency.trim().toUpperCase() || 'UNSPECIFIED';
      const current = pipeline.get(currency) || { currency, opportunities: 0, expectedRevenue: 0, weightedRevenue: 0 };
      current.opportunities += 1;
      current.expectedRevenue += amount;
      current.weightedRevenue += amount * Math.max(0, Math.min(100, lead.probability)) / 100;
      pipeline.set(currency, current);
    }

    const countBy = (values: string[]) => {
      const counts = new Map<string, number>();
      for (const raw of values) {
        const value = raw.trim() || 'Unspecified';
        counts.set(value, (counts.get(value) || 0) + 1);
      }
      return Array.from(counts, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 8);
    };

    return NextResponse.json({
      success: true,
      data: leads.map((lead) => ({
        ...lead,
        operatingIntelligence: deriveCrmOperatingIntelligence({
          status: lead.status,
          priority: lead.priority,
          assignedTo: lead.assignedTo,
          company: lead.company,
          industry: lead.industry,
          countryRegion: lead.countryRegion,
          serviceInterest: lead.serviceInterest,
          currency: lead.currency,
          budgetRange: lead.budgetRange,
          deliveryWindow: lead.deliveryWindow,
          engagementModel: lead.engagementModel,
          expectedRevenue: Number(lead.expectedRevenue.toString()),
          probability: lead.probability,
          nextAction: lead.nextAction,
          nextFollowUp: lead.nextFollowUp,
          lastContactedAt: lead.lastContactedAt,
          proposal: lead.proposal,
          now,
        }),
      })),
      summary: {
        total: all.length,
        open: openLeads.length,
        highPriority: openLeads.filter((lead) => lead.priority === 'high').length,
        international: all.filter((lead) => lead.international).length,
        internationalOpen: openLeads.filter((lead) => lead.international).length,
        domesticOpen: openLeads.filter((lead) => !lead.international).length,
        actionGaps: openLeads.filter((lead) => !lead.nextAction.trim()).length,
        valuedOpportunities: openLeads.filter((lead) => Number(lead.expectedRevenue.toString()) > 0).length,
        overdueFollowUps,
        execution: {
          decided: decidedCount,
          won: wonCount,
          lost: lostCount,
          winRatePct,
          avgOpenAgeDays,
          oldestOpenAgeDays,
          followUpCoveragePct,
          staleOpen,
          unassignedOpen,
          staleAfterDays: 14,
          methodology: 'Win rate uses only won/lost decisions. Lead age uses currently open opportunities. Follow-up coverage is the share of open opportunities with a scheduled next follow-up. Dormant means no CRM update for at least 14 days.',
        },
        pipelineByCurrency: Array.from(pipeline.values()).sort((a, b) => b.expectedRevenue - a.expectedRevenue),
        countries: countBy(openLeads.map((lead) => lead.countryRegion)),
        industries: countBy(openLeads.map((lead) => lead.industry)),
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
