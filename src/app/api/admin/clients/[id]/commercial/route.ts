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
      users: {
        select: { email: true },
      },
    },
  });
  if (!organization) {
    return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });
  }

  const customerEmails = [...new Set(
    [organization.primaryEmail, ...organization.users.map((user) => user.email)]
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )];

  const [services, invoices, payments, projects, tickets, collectionActivities, announcements, ticketMessages, contactMessages, expenses] = await Promise.all([
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
        firstResponseDueAt: true,
        resolutionDueAt: true,
        firstRespondedAt: true,
        resolvedAt: true,
        lastActivityAt: true,
        updatedAt: true,
      },
    }),
    db.financeCollectionActivity.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        invoice: { select: { invoiceNumber: true, currency: true } },
      },
    }),
    db.clientAnnouncement.findMany({
      where: { organizationId: id },
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      include: {
        project: { select: { name: true } },
      },
    }),
    db.clientTicketMessage.findMany({
      where: { ticket: { organizationId: id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        ticket: { select: { ticketNumber: true, subject: true } },
      },
    }),
    db.contactMessage.findMany({
      where: customerEmails.length
        ? {
            OR: customerEmails.map((email) => ({
              email: { equals: email, mode: 'insensitive' },
            })),
          }
        : { id: { in: [] } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    }),
    db.financeExpense.findMany({
      where: { organizationId: id },
      orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 2000,
      select: {
        id: true,
        currency: true,
        amount: true,
        projectId: true,
        serviceId: true,
        incurredAt: true,
        description: true,
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
  const slaBreachedTickets = openTickets.filter((ticket) =>
    (ticket.firstResponseDueAt && ticket.firstResponseDueAt.getTime() < now.getTime() && !ticket.firstRespondedAt)
    || (ticket.resolutionDueAt && ticket.resolutionDueAt.getTime() < now.getTime() && !ticket.resolvedAt),
  );
  const pendingCollectionFollowUps = collectionActivities
    .filter((activity) => activity.nextFollowUpAt && !activity.completedAt && activity.nextFollowUpAt.getTime() >= now.getTime())
    .sort((a, b) => (a.nextFollowUpAt?.getTime() || 0) - (b.nextFollowUpAt?.getTime() || 0));
  const activePaymentPromises = collectionActivities
    .filter((activity) => activity.type === 'promise_to_pay' && activity.promisedDate && !activity.completedAt)
    .sort((a, b) => (a.promisedDate?.getTime() || 0) - (b.promisedDate?.getTime() || 0));

  type ProfitabilityRow = {
    scopeType: 'customer' | 'project' | 'service';
    scopeId: string;
    name: string;
    currency: string;
    revenue: Prisma.Decimal;
    directCost: Prisma.Decimal;
  };

  const profitability = new Map<string, ProfitabilityRow>();
  const profitabilityBucket = (
    scopeType: ProfitabilityRow['scopeType'],
    scopeId: string,
    name: string,
    currency: string,
  ) => {
    const key = [scopeType, scopeId, currency].join(':');
    if (!profitability.has(key)) {
      profitability.set(key, {
        scopeType,
        scopeId,
        name,
        currency,
        revenue: new Prisma.Decimal(0),
        directCost: new Prisma.Decimal(0),
      });
    }
    return profitability.get(key)!;
  };

  for (const invoice of invoices) {
    if (invoice.status === 'draft' || invoice.status === 'void') continue;
    const revenue = invoice.subtotal.minus(invoice.discount);
    profitabilityBucket('customer', id, organization.name, invoice.currency).revenue =
      profitabilityBucket('customer', id, organization.name, invoice.currency).revenue.plus(revenue);

    if (invoice.projectId) {
      const project = projects.find((item) => item.id === invoice.projectId);
      profitabilityBucket('project', invoice.projectId, project?.name || 'Project', invoice.currency).revenue =
        profitabilityBucket('project', invoice.projectId, project?.name || 'Project', invoice.currency).revenue.plus(revenue);
    }

    if (invoice.serviceId) {
      const service = services.find((item) => item.id === invoice.serviceId);
      profitabilityBucket('service', invoice.serviceId, service?.name || 'Service', invoice.currency).revenue =
        profitabilityBucket('service', invoice.serviceId, service?.name || 'Service', invoice.currency).revenue.plus(revenue);
    }
  }

  for (const expense of expenses) {
    profitabilityBucket('customer', id, organization.name, expense.currency).directCost =
      profitabilityBucket('customer', id, organization.name, expense.currency).directCost.plus(expense.amount);

    if (expense.projectId) {
      const project = projects.find((item) => item.id === expense.projectId);
      profitabilityBucket('project', expense.projectId, project?.name || 'Project', expense.currency).directCost =
        profitabilityBucket('project', expense.projectId, project?.name || 'Project', expense.currency).directCost.plus(expense.amount);
    }

    if (expense.serviceId) {
      const service = services.find((item) => item.id === expense.serviceId);
      profitabilityBucket('service', expense.serviceId, service?.name || 'Service', expense.currency).directCost =
        profitabilityBucket('service', expense.serviceId, service?.name || 'Service', expense.currency).directCost.plus(expense.amount);
    }
  }

  const profitabilityRows = [...profitability.values()].map((row) => {
    const margin = row.revenue.minus(row.directCost);
    const marginPercent = row.revenue.gt(0)
      ? margin.div(row.revenue).mul(100)
      : new Prisma.Decimal(0);
    return {
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      name: row.name,
      currency: row.currency,
      revenue: row.revenue.toFixed(2),
      directCost: row.directCost.toFixed(2),
      margin: margin.toFixed(2),
      marginPercent: marginPercent.toDecimalPlaces(2).toFixed(2),
    };
  });

  const buildForecast = (days: number) => {
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const buckets = new Map<string, {
      receivablesDue: Prisma.Decimal;
      serviceRenewals: Prisma.Decimal;
      projectRenewals: Prisma.Decimal;
    }>();

    const row = (currency: string) => {
      if (!buckets.has(currency)) {
        buckets.set(currency, {
          receivablesDue: new Prisma.Decimal(0),
          serviceRenewals: new Prisma.Decimal(0),
          projectRenewals: new Prisma.Decimal(0),
        });
      }
      return buckets.get(currency)!;
    };

    for (const invoice of invoices) {
      if (['draft', 'void'].includes(invoice.status) || invoice.dueDate > horizon) continue;
      const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      if (balance.gt(0)) row(invoice.currency).receivablesDue = row(invoice.currency).receivablesDue.plus(balance);
    }

    for (const service of services) {
      if (service.status === 'cancelled') continue;
      const due = service.nextDueDate || service.expiryDate;
      if (!due || due < now || due > horizon) continue;
      row(service.currency).serviceRenewals = row(service.currency).serviceRenewals.plus(service.recurringAmount);
    }

    for (const project of projects) {
      if (!project.nextRenewalDate || project.nextRenewalDate < now || project.nextRenewalDate > horizon) continue;
      if (project.renewalAmount.lte(0)) continue;
      row(project.renewalCurrency).projectRenewals = row(project.renewalCurrency).projectRenewals.plus(project.renewalAmount);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, values]) => ({
        currency,
        receivablesDue: values.receivablesDue.toFixed(2),
        serviceRenewals: values.serviceRenewals.toFixed(2),
        projectRenewals: values.projectRenewals.toFixed(2),
        totalPotential: values.receivablesDue.plus(values.serviceRenewals).plus(values.projectRenewals).toFixed(2),
      }));
  };

  const commercialForecast = {
    next30Days: buildForecast(30),
    next90Days: buildForecast(90),
    methodology: 'Potential commercial inflows combine unpaid invoice balances due by the horizon with scheduled service and project renewals. They are not a guaranteed cash forecast and currencies are not converted.',
  };

  const riskSignals = [
    ...(overdueInvoices.length ? [{ key: 'overdue_receivables', label: 'Overdue receivables', count: overdueInvoices.length, severity: 'high' as const }] : []),
    ...(expiredServices.length ? [{ key: 'expired_services', label: 'Expired services', count: expiredServices.length, severity: 'high' as const }] : []),
    ...(urgentTickets.length ? [{ key: 'urgent_support', label: 'Urgent support issues', count: urgentTickets.length, severity: 'high' as const }] : []),
    ...(slaBreachedTickets.length ? [{ key: 'sla_breach', label: 'Support SLA breaches', count: slaBreachedTickets.length, severity: 'high' as const }] : []),
    ...(atRiskProjects.length ? [{ key: 'delivery_risk', label: 'Projects needing attention', count: atRiskProjects.length, severity: 'medium' as const }] : []),
    ...(renewalsDue30.length ? [{ key: 'renewal_due', label: 'Renewals due within 30 days', count: renewalsDue30.length, severity: 'medium' as const }] : []),
  ];

  const accountHealth =
    riskSignals.some((signal) => signal.severity === 'high')
      ? 'action_required'
      : riskSignals.length
        ? 'watch'
        : 'healthy';

  const recentActivity = [
    ...payments.map((payment) => ({
      id: 'payment:' + payment.id,
      type: 'payment',
      title: 'Payment recorded',
      detail: payment.paymentNumber + ' · ' + payment.currency + ' ' + payment.amount.toFixed(2) + (payment.reference ? ' · ' + payment.reference : ''),
      actor: payment.receivedBy || 'Finance',
      occurredAt: payment.paidAt,
    })),
    ...invoices.map((invoice) => ({
      id: 'invoice:' + invoice.id,
      type: 'invoice',
      title: 'Invoice ' + invoice.invoiceNumber,
      detail: invoice.currency + ' ' + invoice.total.toFixed(2) + ' · due ' + invoice.dueDate.toISOString().slice(0, 10),
      actor: 'Finance',
      occurredAt: invoice.issueDate,
    })),
    ...collectionActivities.map((activity) => ({
      id: 'collection:' + activity.id,
      type: 'collection',
      title: activity.type.replaceAll('_', ' '),
      detail: activity.invoice.invoiceNumber + (activity.note ? ' · ' + activity.note : ''),
      actor: activity.createdBy || 'Admin',
      occurredAt: activity.createdAt,
    })),
    ...announcements.map((announcement) => ({
      id: 'announcement:' + announcement.id,
      type: 'announcement',
      title: announcement.title,
      detail: announcement.project?.name ? 'Project: ' + announcement.project.name : 'Organization-wide announcement',
      actor: 'Client communications',
      occurredAt: announcement.publishAt,
    })),
    ...ticketMessages.map((message) => ({
      id: 'ticket-message:' + message.id,
      type: 'support',
      title: message.ticket.ticketNumber + ' · ' + message.ticket.subject,
      detail: message.message.length > 140 ? message.message.slice(0, 137) + '...' : message.message,
      actor: message.authorName + ' · ' + (message.authorType === 'admin' ? 'Lightworld' : 'Client'),
      occurredAt: message.createdAt,
    })),
    ...contactMessages.map((message) => ({
      id: 'message:' + message.id,
      type: 'message',
      title: message.subject || 'Customer message',
      detail: message.message.length > 140 ? message.message.slice(0, 137) + '...' : message.message,
      actor: message.name + ' · Customer',
      occurredAt: message.createdAt,
    })),
    ...contactMessages.flatMap((message) =>
      message.replies.map((reply) => ({
        id: 'message-reply:' + reply.id,
        type: 'message',
        title: reply.subject || 'Lightworld reply',
        detail: reply.body.length > 140 ? reply.body.slice(0, 137) + '...' : reply.body,
        actor: (reply.authorName || 'Administrator') + ' · Lightworld',
        occurredAt: reply.sentAt || reply.createdAt,
      })),
    ),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 40);

  const nextActions = [
    ...(overdueInvoices.length
      ? [{ key: 'collections', label: 'Work overdue receivables', detail: overdueInvoices.length + ' invoice' + (overdueInvoices.length === 1 ? '' : 's') + ' need collection follow-up.' }]
      : []),
    ...(renewalsDue30.length || expiredServices.length
      ? [{ key: 'renewals', label: 'Review renewals', detail: (renewalsDue30.length + expiredServices.length) + ' service' + ((renewalsDue30.length + expiredServices.length) === 1 ? '' : 's') + ' need renewal attention.' }]
      : []),
    ...(urgentTickets.length || slaBreachedTickets.length
      ? [{ key: 'support', label: 'Resolve support pressure', detail: (urgentTickets.length + slaBreachedTickets.length) + ' urgent or SLA-breached support item' + ((urgentTickets.length + slaBreachedTickets.length) === 1 ? '' : 's') + ' need attention.' }]
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
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        primaryContactName: organization.primaryContactName,
        primaryEmail: organization.primaryEmail,
        primaryPhone: organization.primaryPhone,
      },
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
        slaBreaches: slaBreachedTickets.length,
        overdueInvoices: overdueInvoices.length,
        renewalsDue30: renewalsDue30.length,
        expiredServices: expiredServices.length,
        accountHealth,
        riskSignals,
        nextActions,
        recentActivity,
        forecast: commercialForecast,
        profitability: {
          customer: profitabilityRows.filter((row) => row.scopeType === 'customer'),
          projects: profitabilityRows
            .filter((row) => row.scopeType === 'project')
            .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
          services: profitabilityRows
            .filter((row) => row.scopeType === 'service')
            .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
          methodology: 'Invoice revenue excludes tax; direct cost includes only finance expenses explicitly attributed to this customer, project or service. Currencies are not converted.',
        },
        commitments: {
          nextCollectionFollowUp: pendingCollectionFollowUps[0]
            ? {
                id: pendingCollectionFollowUps[0].id,
                invoiceNumber: pendingCollectionFollowUps[0].invoice.invoiceNumber,
                type: pendingCollectionFollowUps[0].type,
                note: pendingCollectionFollowUps[0].note,
                nextFollowUpAt: pendingCollectionFollowUps[0].nextFollowUpAt,
                createdBy: pendingCollectionFollowUps[0].createdBy,
              }
            : null,
          nextPaymentPromise: activePaymentPromises[0]
            ? {
                id: activePaymentPromises[0].id,
                invoiceNumber: activePaymentPromises[0].invoice.invoiceNumber,
                note: activePaymentPromises[0].note,
                promisedAmount: activePaymentPromises[0].promisedAmount?.toFixed(2) ?? null,
                promisedDate: activePaymentPromises[0].promisedDate,
                currency: activePaymentPromises[0].invoice.currency,
                createdBy: activePaymentPromises[0].createdBy,
              }
            : null,
        },
        communicationThreads: contactMessages.map((message) => ({
          id: message.id,
          name: message.name,
          email: message.email,
          phone: message.phone,
          subject: message.subject,
          message: message.message,
          read: message.read,
          createdAt: message.createdAt,
          replies: message.replies.map((reply) => ({
            id: reply.id,
            authorName: reply.authorName,
            subject: reply.subject,
            body: reply.body,
            status: reply.status,
            sentAt: reply.sentAt,
            createdAt: reply.createdAt,
          })),
        })),
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
