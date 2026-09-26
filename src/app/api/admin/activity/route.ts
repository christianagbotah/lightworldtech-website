import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

type ActivityItem = {
  id: string;
  type: 'payment' | 'invoice' | 'collection' | 'support';
  title: string;
  detail: string;
  occurredAt: Date;
  targetId: string;
  organizationId: string;
};

export async function GET(request: NextRequest) {
  const admin = await getActiveAdminContext(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const canFinance = hasAdminPermission(admin.role, admin.permissions, 'finance.manage');
  const canClients = hasAdminPermission(admin.role, admin.permissions, 'clients.manage');

  const [payments, invoices, collections, tickets] = await Promise.all([
    canFinance
      ? db.clientPayment.findMany({
          orderBy: { paidAt: 'desc' },
          take: 8,
          include: { organization: { select: { name: true } } },
        })
      : Promise.resolve([]),
    canFinance
      ? db.clientInvoice.findMany({
          where: { status: { not: 'draft' } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { organization: { select: { name: true } } },
        })
      : Promise.resolve([]),
    canFinance
      ? db.financeCollectionActivity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            organization: { select: { name: true } },
            invoice: { select: { invoiceNumber: true } },
          },
        })
      : Promise.resolve([]),
    canClients
      ? db.clientSupportTicket.findMany({
          orderBy: { lastActivityAt: 'desc' },
          take: 8,
          include: { organization: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const items: ActivityItem[] = [
    ...payments.map((payment) => ({
      id: 'payment-' + payment.id,
      type: 'payment' as const,
      title: 'Payment received · ' + payment.paymentNumber,
      detail: payment.organization.name + ' · ' + payment.currency + ' ' + payment.amount.toFixed(2),
      occurredAt: payment.paidAt,
      targetId: payment.id,
      organizationId: payment.organizationId,
    })),
    ...invoices.map((invoice) => ({
      id: 'invoice-' + invoice.id,
      type: 'invoice' as const,
      title: 'Invoice ' + invoice.invoiceNumber + ' · ' + invoice.status.replaceAll('_', ' '),
      detail: invoice.organization.name + ' · ' + invoice.currency + ' ' + invoice.total.toFixed(2),
      occurredAt: invoice.createdAt,
      targetId: invoice.id,
      organizationId: invoice.organizationId,
    })),
    ...collections.map((activity) => ({
      id: 'collection-' + activity.id,
      type: 'collection' as const,
      title: 'Collection · ' + activity.invoice.invoiceNumber,
      detail: activity.organization.name + ' · ' + activity.type.replaceAll('_', ' '),
      occurredAt: activity.createdAt,
      targetId: activity.invoiceId,
      organizationId: activity.organizationId,
    })),
    ...tickets.map((ticket) => ({
      id: 'support-' + ticket.id,
      type: 'support' as const,
      title: 'Support ' + ticket.ticketNumber + ' · ' + ticket.status.replaceAll('_', ' '),
      detail: ticket.organization.name + ' · ' + ticket.subject,
      occurredAt: ticket.lastActivityAt,
      targetId: ticket.id,
      organizationId: ticket.organizationId,
    })),
  ];

  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return NextResponse.json(
    {
      success: true,
      data: items.slice(0, 12),
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
