import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  paymentUnallocated,
  sumAmounts,
} from '@/lib/finance';

type CurrencySummary = {
  invoiced: Prisma.Decimal;
  paid: Prisma.Decimal;
  outstanding: Prisma.Decimal;
  unapplied: Prisma.Decimal;
};

function freshSummary(): CurrencySummary {
  return {
    invoiced: new Prisma.Decimal(0),
    paid: new Prisma.Decimal(0),
    outstanding: new Prisma.Decimal(0),
    unapplied: new Prisma.Decimal(0),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }

  const { id } = await params;
  const organization = await db.clientOrganization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      primaryContactName: true,
      primaryEmail: true,
      primaryPhone: true,
    },
  });
  if (!organization) {
    return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });
  }

  const [services, invoices, payments, projects, tickets] = await Promise.all([
    db.clientServiceAccount.findMany({
      where: { organizationId: id },
      orderBy: [{ status: 'asc' }, { nextDueDate: 'asc' }, { expiryDate: 'asc' }],
      take: 500,
      include: {
        project: { select: { id: true, name: true } },
        changes: { orderBy: { effectiveAt: 'desc' }, take: 8 },
        _count: { select: { invoices: true } },
      },
    }),
    db.clientInvoice.findMany({
      where: { organizationId: id },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      include: {
        project: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, planName: true } },
        allocations: true,
        creditNotes: { where: { status: 'posted' } },
      },
    }),
    db.clientPayment.findMany({
      where: { organizationId: id },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      include: {
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
    }),
    db.clientProject.findMany({
      where: { organizationId: id },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        name: true,
        status: true,
        health: true,
        progress: true,
        manager: true,
        targetDate: true,
        expiryDate: true,
        nextRenewalDate: true,
        renewalCurrency: true,
        renewalAmount: true,
        updatedAt: true,
      },
    }),
    db.clientSupportTicket.findMany({
      where: { organizationId: id },
      orderBy: [{ lastActivityAt: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        assignedTo: true,
        lastActivityAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const summary = new Map<string, CurrencySummary>();
  const bucket = (currency: string) => {
    if (!summary.has(currency)) summary.set(currency, freshSummary());
    return summary.get(currency)!;
  };

  for (const invoice of invoices) {
    if (invoice.status === 'draft' || invoice.status === 'void') continue;
    const row = bucket(invoice.currency);
    row.invoiced = row.invoiced.plus(invoice.total);
    row.outstanding = row.outstanding.plus(
      invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes),
    );
  }

  for (const payment of payments) {
    const row = bucket(payment.currency);
    row.paid = row.paid.plus(payment.amount);
    row.unapplied = row.unapplied.plus(paymentUnallocated(payment.amount, payment.allocations));
  }

  const now = new Date();
  const renewalWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeProjects = projects.filter((project) => !['completed', 'cancelled', 'archived'].includes(project.status));
  const atRiskProjects = activeProjects.filter((project) => !['on_track', 'healthy'].includes(project.health));
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status));
  const urgentTickets = openTickets.filter((ticket) => ['urgent', 'critical', 'high'].includes(ticket.priority));
  const overdueInvoices = invoices.filter((invoice) => {
    if (['draft', 'void'].includes(invoice.status)) return false;
    const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
    return balance.gt(0) && invoice.dueDate.getTime() < now.getTime();
  });
  const renewalCandidates = services
    .filter((service) => service.status !== 'cancelled')
    .map((service) => ({
      service,
      date: service.nextDueDate || service.expiryDate,
    }))
    .filter((item): item is { service: typeof services[number]; date: Date } => Boolean(item.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const renewalsDue30 = renewalCandidates.filter((item) => item.date >= now && item.date <= renewalWindow);
  const expiredServices = services.filter((service) => service.expiryDate && service.expiryDate.getTime() < now.getTime() && service.status !== 'cancelled');

  const riskSignals = [
    ...(overdueInvoices.length ? [{ key: 'overdue_receivables', label: 'Overdue receivables', count: overdueInvoices.length, severity: 'high' as const }] : []),
    ...(expiredServices.length ? [{ key: 'expired_services', label: 'Expired services', count: expiredServices.length, severity: 'high' as const }] : []),
    ...(urgentTickets.length ? [{ key: 'urgent_support', label: 'Urgent support issues', count: urgentTickets.length, severity: 'high' as const }] : []),
    ...(atRiskProjects.length ? [{ key: 'delivery_risk', label: 'Projects needing attention', count: atRiskProjects.length, severity: 'medium' as const }] : []),
    ...(renewalsDue30.length ? [{ key: 'renewal_due', label: 'Renewals due within 30 days', count: renewalsDue30.length, severity: 'medium' as const }] : []),
  ];

  const accountHealth =
    riskSignals.some((signal) => signal.severity === 'high')
      ? 'action_required'
      : riskSignals.length
        ? 'watch'
        : 'healthy';

  const nextActions = [
    ...(overdueInvoices.length
      ? [{ key: 'collections', label: 'Work overdue receivables', detail: overdueInvoices.length + ' invoice' + (overdueInvoices.length === 1 ? '' : 's') + ' need collection follow-up.' }]
      : []),
    ...(renewalsDue30.length || expiredServices.length
      ? [{ key: 'renewals', label: 'Review renewals', detail: (renewalsDue30.length + expiredServices.length) + ' service' + ((renewalsDue30.length + expiredServices.length) === 1 ? '' : 's') + ' need renewal attention.' }]
      : []),
    ...(urgentTickets.length
      ? [{ key: 'support', label: 'Resolve urgent support', detail: urgentTickets.length + ' urgent support ticket' + (urgentTickets.length === 1 ? '' : 's') + ' remain open.' }]
      : []),
    ...(atRiskProjects.length
      ? [{ key: 'projects', label: 'Review delivery risk', detail: atRiskProjects.length + ' project' + (atRiskProjects.length === 1 ? '' : 's') + ' need delivery attention.' }]
      : []),
    ...(!riskSignals.length
      ? [{ key: 'statement', label: 'Review account statement', detail: 'No urgent commercial or delivery risks are currently flagged.' }]
      : []),
  ].slice(0, 4);

  return NextResponse.json({
    success: true,
    data: {
      organization,
      byCurrency: Object.fromEntries(
        [...summary.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, row]) => [
          currency,
          {
            invoiced: row.invoiced.toFixed(2),
            paid: row.paid.toFixed(2),
            outstanding: row.outstanding.toFixed(2),
            unapplied: row.unapplied.toFixed(2),
          },
        ]),
      ),
      customer360: {
        activeProjects: activeProjects.length,
        atRiskProjects: atRiskProjects.length,
        openTickets: openTickets.length,
        urgentTickets: urgentTickets.length,
        overdueInvoices: overdueInvoices.length,
        renewalsDue30: renewalsDue30.length,
        expiredServices: expiredServices.length,
        accountHealth,
        riskSignals,
        nextActions,
        nextRenewal: renewalCandidates[0]
          ? {
              serviceId: renewalCandidates[0].service.id,
              serviceName: renewalCandidates[0].service.name,
              date: renewalCandidates[0].date,
              currency: renewalCandidates[0].service.currency,
              amount: renewalCandidates[0].service.recurringAmount.toFixed(2),
            }
          : null,
        projects: projects.slice(0, 12).map((project) => ({
          ...project,
          renewalAmount: project.renewalAmount.toFixed(2),
        })),
        tickets: openTickets.slice(0, 12),
      },
      services: services.map((service) => ({
        ...service,
        recurringAmount: service.recurringAmount.toFixed(2),
        changes: service.changes.map((change) => ({
          ...change,
          previousAmount: change.previousAmount?.toFixed(2) ?? null,
          newAmount: change.newAmount?.toFixed(2) ?? null,
        })),
      })),
      invoices: invoices.map((invoice) => {
        const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          projectId: invoice.projectId,
          project: invoice.project,
          serviceId: invoice.serviceId,
          service: invoice.service,
          currency: invoice.currency,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          renewalForDate: invoice.renewalForDate,
          renewalCompletedAt: invoice.renewalCompletedAt,
          renewalCompletedBy: invoice.renewalCompletedBy,
          total: invoice.total.toFixed(2),
          amountPaid: sumAmounts(invoice.allocations).toFixed(2),
          balance: balance.toFixed(2),
          status: invoice.status,
          derivedStatus: invoiceStatusFromBalance({
            storedStatus: invoice.status,
            total: invoice.total,
            allocations: invoice.allocations,
            credits: invoice.creditNotes,
            dueDate: invoice.dueDate,
          }),
        };
      }),
      payments: payments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        currency: payment.currency,
        amount: payment.amount.toFixed(2),
        allocatedAmount: sumAmounts(payment.allocations).toFixed(2),
        unallocatedAmount: paymentUnallocated(payment.amount, payment.allocations).toFixed(2),
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference,
        notes: payment.notes,
        receivedBy: payment.receivedBy,
        allocations: payment.allocations.map((allocation) => ({
          id: allocation.id,
          invoiceId: allocation.invoiceId,
          invoiceNumber: allocation.invoice.invoiceNumber,
          amount: allocation.amount.toFixed(2),
        })),
      })),
    },
  });
}
