import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance } from '@/lib/finance';

type CurrencyExposure = {
  overdueReceivables: Prisma.Decimal;
  renewals30: Prisma.Decimal;
};

function freshExposure(): CurrencyExposure {
  return {
    overdueReceivables: new Prisma.Decimal(0),
    renewals30: new Prisma.Decimal(0),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }

  const now = new Date();
  const horizon30 = new Date(now.getTime() + 30 * 86_400_000);

  const organizations = await db.clientOrganization.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    take: 500,
    select: {
      id: true,
      name: true,
      status: true,
      primaryContactName: true,
      primaryEmail: true,
      primaryPhone: true,
      invoices: {
        where: { status: { notIn: ['draft', 'void'] } },
        select: {
          id: true,
          currency: true,
          total: true,
          dueDate: true,
          status: true,
          allocations: { select: { amount: true } },
          creditNotes: { where: { status: 'posted' }, select: { appliedAmount: true } },
        },
      },
      services: {
        select: {
          id: true,
          status: true,
          currency: true,
          recurringAmount: true,
          expiryDate: true,
          nextDueDate: true,
        },
      },
      projects: {
        select: {
          id: true,
          status: true,
          health: true,
          nextRenewalDate: true,
          renewalCurrency: true,
          renewalAmount: true,
          budgetCurrency: true,
          budgetAmount: true,
        },
      },
      tickets: {
        where: { status: { notIn: ['resolved', 'closed'] } },
        select: {
          id: true,
          priority: true,
          firstResponseDueAt: true,
          resolutionDueAt: true,
          firstRespondedAt: true,
          resolvedAt: true,
        },
      },
      expenses: {
        select: {
          amount: true,
          currency: true,
          projectId: true,
        },
      },
      _count: { select: { users: true, projects: true, tickets: true } },
    },
  });

  const portfolioCurrencies = new Map<string, CurrencyExposure>();
  const portfolioBucket = (currency: string) => {
    const code = currency.trim().toUpperCase() || 'UNSPECIFIED';
    if (!portfolioCurrencies.has(code)) portfolioCurrencies.set(code, freshExposure());
    return portfolioCurrencies.get(code)!;
  };

  const rows = organizations.map((organization) => {
    const exposure = new Map<string, CurrencyExposure>();
    const bucket = (currency: string) => {
      const code = currency.trim().toUpperCase() || 'UNSPECIFIED';
      if (!exposure.has(code)) exposure.set(code, freshExposure());
      return exposure.get(code)!;
    };

    let overdueInvoices = 0;
    for (const invoice of organization.invoices) {
      const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      if (balance.gt(0) && invoice.dueDate < now) {
        overdueInvoices += 1;
        bucket(invoice.currency).overdueReceivables = bucket(invoice.currency).overdueReceivables.plus(balance);
        portfolioBucket(invoice.currency).overdueReceivables = portfolioBucket(invoice.currency).overdueReceivables.plus(balance);
      }
    }

    let expiredServices = 0;
    let renewalsDue30 = 0;
    for (const service of organization.services) {
      if (service.status === 'cancelled') continue;
      const renewalDate = service.nextDueDate || service.expiryDate;
      if (service.expiryDate && service.expiryDate < now) expiredServices += 1;
      if (renewalDate && renewalDate >= now && renewalDate <= horizon30) {
        renewalsDue30 += 1;
        bucket(service.currency).renewals30 = bucket(service.currency).renewals30.plus(service.recurringAmount);
        portfolioBucket(service.currency).renewals30 = portfolioBucket(service.currency).renewals30.plus(service.recurringAmount);
      }
    }

    let projectRenewals30 = 0;
    const activeProjects = organization.projects.filter((project) => !['completed', 'cancelled'].includes(project.status));
    const atRiskProjects = activeProjects.filter((project) => !['on_track', 'healthy'].includes(project.health)).length;
    for (const project of organization.projects) {
      if (
        project.nextRenewalDate
        && project.nextRenewalDate >= now
        && project.nextRenewalDate <= horizon30
        && project.renewalAmount.gt(0)
      ) {
        projectRenewals30 += 1;
        bucket(project.renewalCurrency).renewals30 = bucket(project.renewalCurrency).renewals30.plus(project.renewalAmount);
        portfolioBucket(project.renewalCurrency).renewals30 = portfolioBucket(project.renewalCurrency).renewals30.plus(project.renewalAmount);
      }
    }

    const projectCosts = new Map<string, Prisma.Decimal>();
    for (const expense of organization.expenses) {
      if (!expense.projectId) continue;
      const key = expense.projectId + ':' + expense.currency.toUpperCase();
      projectCosts.set(key, (projectCosts.get(key) || new Prisma.Decimal(0)).plus(expense.amount));
    }

    let budgetPressure = 0;
    let overBudget = 0;
    for (const project of organization.projects) {
      if (project.budgetAmount.lte(0)) continue;
      const cost = projectCosts.get(project.id + ':' + project.budgetCurrency.toUpperCase()) || new Prisma.Decimal(0);
      const utilization = cost.div(project.budgetAmount).mul(100);
      if (utilization.gte(85)) budgetPressure += 1;
      if (cost.gt(project.budgetAmount)) overBudget += 1;
    }

    const urgentTickets = organization.tickets.filter((ticket) =>
      ['urgent', 'critical', 'high'].includes(ticket.priority.toLowerCase())
    ).length;
    const slaBreaches = organization.tickets.filter((ticket) =>
      Boolean(
        (!ticket.firstRespondedAt && ticket.firstResponseDueAt && ticket.firstResponseDueAt < now)
        || (!ticket.resolvedAt && ticket.resolutionDueAt && ticket.resolutionDueAt < now)
      )
    ).length;

    let riskScore = 0;
    if (overdueInvoices) riskScore += 3;
    if (expiredServices) riskScore += 3;
    if (urgentTickets) riskScore += 3;
    if (slaBreaches) riskScore += 3;
    if (overBudget) riskScore += 3;
    if (atRiskProjects) riskScore += 1;
    if (renewalsDue30 || projectRenewals30) riskScore += 1;
    if (budgetPressure && !overBudget) riskScore += 1;

    const posture = riskScore >= 3 ? 'intervention_required' : riskScore > 0 ? 'attention' : 'stable';

    return {
      id: organization.id,
      name: organization.name,
      status: organization.status,
      primaryContactName: organization.primaryContactName,
      primaryEmail: organization.primaryEmail,
      primaryPhone: organization.primaryPhone,
      posture,
      riskScore,
      metrics: {
        users: organization._count.users,
        projects: organization._count.projects,
        activeProjects: activeProjects.length,
        atRiskProjects,
        openTickets: organization.tickets.length,
        urgentTickets,
        slaBreaches,
        overdueInvoices,
        expiredServices,
        renewalsDue30: renewalsDue30 + projectRenewals30,
        budgetPressure,
        overBudget,
      },
      exposure: [...exposure.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, values]) => ({
          currency,
          overdueReceivables: values.overdueReceivables.toFixed(2),
          renewals30: values.renewals30.toFixed(2),
        })),
    };
  });

  rows.sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name));

  const actionQueue = rows
    .flatMap((row) => {
      const actions: Array<{
        id: string;
        organizationId: string;
        organizationName: string;
        type: 'collections' | 'renewals' | 'support' | 'projects' | 'budget';
        severity: 'high' | 'medium';
        title: string;
        detail: string;
        score: number;
      }> = [];

      if (row.metrics.overdueInvoices > 0) {
        actions.push({
          id: row.id + ':collections',
          organizationId: row.id,
          organizationName: row.name,
          type: 'collections',
          severity: 'high',
          title: 'Collect overdue receivables',
          detail: row.metrics.overdueInvoices + ' overdue invoice' + (row.metrics.overdueInvoices === 1 ? '' : 's') + ' require collection action.',
          score: row.riskScore + 8,
        });
      }

      if (row.metrics.expiredServices > 0 || row.metrics.renewalsDue30 > 0) {
        actions.push({
          id: row.id + ':renewals',
          organizationId: row.id,
          organizationName: row.name,
          type: 'renewals',
          severity: row.metrics.expiredServices > 0 ? 'high' : 'medium',
          title: row.metrics.expiredServices > 0 ? 'Resolve expired services' : 'Prepare upcoming renewals',
          detail:
            row.metrics.expiredServices +
            ' expired service' +
            (row.metrics.expiredServices === 1 ? '' : 's') +
            ' · ' +
            row.metrics.renewalsDue30 +
            ' renewal' +
            (row.metrics.renewalsDue30 === 1 ? '' : 's') +
            ' due within 30 days.',
          score: row.riskScore + (row.metrics.expiredServices > 0 ? 7 : 3),
        });
      }

      if (row.metrics.slaBreaches > 0 || row.metrics.urgentTickets > 0) {
        actions.push({
          id: row.id + ':support',
          organizationId: row.id,
          organizationName: row.name,
          type: 'support',
          severity: row.metrics.slaBreaches > 0 ? 'high' : 'medium',
          title: row.metrics.slaBreaches > 0 ? 'Recover breached support SLA' : 'Resolve urgent support cases',
          detail:
            row.metrics.slaBreaches +
            ' SLA breach' +
            (row.metrics.slaBreaches === 1 ? '' : 'es') +
            ' · ' +
            row.metrics.urgentTickets +
            ' urgent/high-priority ticket' +
            (row.metrics.urgentTickets === 1 ? '' : 's') +
            '.',
          score: row.riskScore + (row.metrics.slaBreaches > 0 ? 7 : 5),
        });
      }

      if (row.metrics.atRiskProjects > 0) {
        actions.push({
          id: row.id + ':projects',
          organizationId: row.id,
          organizationName: row.name,
          type: 'projects',
          severity: 'medium',
          title: 'Review delivery risk',
          detail: row.metrics.atRiskProjects + ' active project' + (row.metrics.atRiskProjects === 1 ? ' is' : 's are') + ' not currently on track.',
          score: row.riskScore + 3,
        });
      }

      if (row.metrics.overBudget > 0 || row.metrics.budgetPressure > 0) {
        actions.push({
          id: row.id + ':budget',
          organizationId: row.id,
          organizationName: row.name,
          type: 'budget',
          severity: row.metrics.overBudget > 0 ? 'high' : 'medium',
          title: row.metrics.overBudget > 0 ? 'Correct project budget overrun' : 'Review project budget pressure',
          detail:
            row.metrics.overBudget +
            ' over-budget project' +
            (row.metrics.overBudget === 1 ? '' : 's') +
            ' · ' +
            row.metrics.budgetPressure +
            ' project' +
            (row.metrics.budgetPressure === 1 ? '' : 's') +
            ' at or above the pressure threshold.',
          score: row.riskScore + (row.metrics.overBudget > 0 ? 6 : 2),
        });
      }

      return actions;
    })
    .sort((a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1)
      || b.score - a.score
      || a.organizationName.localeCompare(b.organizationName)
    )
    .slice(0, 100);

  const summary = {
    organizations: rows.length,
    activeOrganizations: rows.filter((row) => row.status === 'active').length,
    interventionRequired: rows.filter((row) => row.posture === 'intervention_required').length,
    attention: rows.filter((row) => row.posture === 'attention').length,
    stable: rows.filter((row) => row.posture === 'stable').length,
    overdueInvoices: rows.reduce((sum, row) => sum + row.metrics.overdueInvoices, 0),
    renewalsDue30: rows.reduce((sum, row) => sum + row.metrics.renewalsDue30, 0),
    atRiskProjects: rows.reduce((sum, row) => sum + row.metrics.atRiskProjects, 0),
    budgetPressure: rows.reduce((sum, row) => sum + row.metrics.budgetPressure, 0),
    overBudget: rows.reduce((sum, row) => sum + row.metrics.overBudget, 0),
    urgentTickets: rows.reduce((sum, row) => sum + row.metrics.urgentTickets, 0),
    slaBreaches: rows.reduce((sum, row) => sum + row.metrics.slaBreaches, 0),
  };

  return NextResponse.json({
    success: true,
    data: rows,
    actionQueue,
    summary,
    byCurrency: [...portfolioCurrencies.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, values]) => ({
        currency,
        overdueReceivables: values.overdueReceivables.toFixed(2),
        renewals30: values.renewals30.toFixed(2),
      })),
    methodology: 'Portfolio posture is deterministic. High-severity exceptions include overdue receivables, expired services, urgent/SLA-breached support and over-budget projects. Currency values are never converted.',
  });
}
