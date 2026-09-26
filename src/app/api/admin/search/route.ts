import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

export const runtime = 'nodejs';

type SearchResult = {
  kind: 'client' | 'project' | 'invoice' | 'payment' | 'support' | 'lead' | 'proposal' | 'message';
  id: string;
  title: string;
  subtitle: string;
  workspace: 'admin-clients' | 'admin-finance' | 'admin-support' | 'admin-crm' | 'admin-proposals' | 'admin-messages';
};

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] as SearchResult[] });
  }

  const canClients = hasAdminPermission(actor.role, actor.permissions, 'clients.manage');
  const canFinance = hasAdminPermission(actor.role, actor.permissions, 'finance.manage');
  const canCrm = hasAdminPermission(actor.role, actor.permissions, 'crm.manage');

  const [clients, projects, invoices, payments, tickets, leads, proposals, messages] = await Promise.all([
    canClients
      ? db.clientOrganization.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { primaryContactName: { contains: q, mode: 'insensitive' } },
              { primaryEmail: { contains: q, mode: 'insensitive' } },
              { primaryPhone: { contains: q, mode: 'insensitive' } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryEmail: true,
          },
        })
      : Promise.resolve([]),
    canClients
      ? db.clientProject.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { manager: { contains: q, mode: 'insensitive' } },
              { organization: { name: { contains: q, mode: 'insensitive' } } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            name: true,
            status: true,
            health: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canFinance
      ? db.clientInvoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q, mode: 'insensitive' } },
              { organization: { name: { contains: q, mode: 'insensitive' } } },
              { service: { name: { contains: q, mode: 'insensitive' } } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            currency: true,
            total: true,
            organization: { select: { name: true } },
            service: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canFinance
      ? db.clientPayment.findMany({
          where: {
            OR: [
              { paymentNumber: { contains: q, mode: 'insensitive' } },
              { reference: { contains: q, mode: 'insensitive' } },
              { providerReference: { contains: q, mode: 'insensitive' } },
              { organization: { name: { contains: q, mode: 'insensitive' } } },
            ],
          },
          orderBy: { paidAt: 'desc' },
          take: 6,
          select: {
            id: true,
            paymentNumber: true,
            currency: true,
            amount: true,
            method: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canClients
      ? db.clientSupportTicket.findMany({
          where: {
            OR: [
              { ticketNumber: { contains: q, mode: 'insensitive' } },
              { subject: { contains: q, mode: 'insensitive' } },
              { organization: { name: { contains: q, mode: 'insensitive' } } },
              { createdBy: { name: { contains: q, mode: 'insensitive' } } },
              { createdBy: { email: { contains: q, mode: 'insensitive' } } },
            ],
          },
          orderBy: { lastActivityAt: 'desc' },
          take: 6,
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canCrm
      ? db.lead.findMany({
          where: {
            OR: [
              { company: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { serviceInterest: { contains: q, mode: 'insensitive' } },
              { contactMessage: { name: { contains: q, mode: 'insensitive' } } },
              { contactMessage: { email: { contains: q, mode: 'insensitive' } } },
              { contactMessage: { subject: { contains: q, mode: 'insensitive' } } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            company: true,
            status: true,
            serviceInterest: true,
            contactMessage: { select: { name: true, email: true, subject: true } },
          },
        })
      : Promise.resolve([]),
    hasAdminPermission(actor.role, actor.permissions, 'proposals.manage')
      ? db.proposal.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { executiveSummary: { contains: q, mode: 'insensitive' } },
              { lead: { company: { contains: q, mode: 'insensitive' } } },
              { lead: { contactMessage: { name: { contains: q, mode: 'insensitive' } } } },
              { lead: { contactMessage: { email: { contains: q, mode: 'insensitive' } } } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            title: true,
            status: true,
            version: true,
            lead: {
              select: {
                company: true,
                contactMessage: { select: { name: true, email: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    canCrm
      ? db.contactMessage.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { subject: { contains: q, mode: 'insensitive' } },
              { message: { contains: q, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            id: true,
            name: true,
            email: true,
            subject: true,
            read: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const results: SearchResult[] = [
    ...clients.map((client) => ({
      kind: 'client' as const,
      id: client.id,
      title: client.name,
      subtitle: [client.primaryContactName, client.primaryEmail].filter(Boolean).join(' · ') || 'Client organization',
      workspace: 'admin-clients' as const,
    })),
    ...projects.map((project) => ({
      kind: 'project' as const,
      id: project.id,
      title: project.name + ' · ' + project.organization.name,
      subtitle: 'Project · ' + project.status.replaceAll('_', ' ') + ' · ' + project.health.replaceAll('_', ' '),
      workspace: 'admin-clients' as const,
    })),
    ...invoices.map((invoice) => ({
      kind: 'invoice' as const,
      id: invoice.id,
      title: invoice.invoiceNumber + ' · ' + invoice.organization.name,
      subtitle:
        invoice.status.replaceAll('_', ' ') +
        ' · ' +
        invoice.currency +
        ' ' +
        Number(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        (invoice.service?.name ? ' · ' + invoice.service.name : ''),
      workspace: 'admin-finance' as const,
    })),
    ...payments.map((payment) => ({
      kind: 'payment' as const,
      id: payment.id,
      title: payment.paymentNumber + ' · ' + payment.organization.name,
      subtitle:
        'Payment · ' +
        payment.currency +
        ' ' +
        Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        ' · ' +
        payment.method.replaceAll('_', ' '),
      workspace: 'admin-finance' as const,
    })),
    ...tickets.map((ticket) => ({
      kind: 'support' as const,
      id: ticket.id,
      title: ticket.ticketNumber + ' · ' + ticket.subject,
      subtitle: ticket.organization.name + ' · ' + ticket.status.replaceAll('_', ' '),
      workspace: 'admin-support' as const,
    })),
    ...leads.map((lead) => ({
      kind: 'lead' as const,
      id: lead.id,
      title: lead.company || lead.contactMessage.name || lead.contactMessage.email,
      subtitle:
        'CRM ' +
        lead.status.replaceAll('_', ' ') +
        (lead.serviceInterest ? ' · ' + lead.serviceInterest : '') +
        (lead.contactMessage.subject ? ' · ' + lead.contactMessage.subject : ''),
      workspace: 'admin-crm' as const,
    })),
    ...proposals.map((proposal) => ({
      kind: 'proposal' as const,
      id: proposal.id,
      title: proposal.title,
      subtitle:
        (proposal.lead.company || proposal.lead.contactMessage.name || proposal.lead.contactMessage.email) +
        ' · ' +
        proposal.status.replaceAll('_', ' ') +
        ' · v' +
        proposal.version,
      workspace: 'admin-proposals' as const,
    })),
    ...messages.map((message) => ({
      kind: 'message' as const,
      id: message.id,
      title: message.name + (message.subject ? ' · ' + message.subject : ''),
      subtitle: message.email + ' · ' + (message.read ? 'read' : 'unread'),
      workspace: 'admin-messages' as const,
    })),
  ];

  return NextResponse.json(
    { success: true, data: results.slice(0, 24) },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
