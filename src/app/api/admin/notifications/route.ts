import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getMailTransportStatus } from '@/lib/mail';
import { invoiceBalance } from '@/lib/finance';
import { reconcileSupportEscalations } from '@/lib/support-ticket';

type Notice = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  count: number;
  action: string;
};

export async function GET(request: NextRequest) {
  const admin = await getActiveAdminContext(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const notices: Notice[] = [];
  const canCrm = hasAdminPermission(admin.role, admin.permissions, 'crm.manage');
  const canClients = hasAdminPermission(admin.role, admin.permissions, 'clients.manage');
  const canProposals = hasAdminPermission(admin.role, admin.permissions, 'proposals.manage');
  const canComms = hasAdminPermission(admin.role, admin.permissions, 'communications.manage');
  const canFinance = hasAdminPermission(admin.role, admin.permissions, 'finance.manage');

  if (canCrm) {
    const [unreadMessages, overdueFollowUps] = await Promise.all([
      db.contactMessage.count({ where: { read: false } }),
      db.lead.count({
        where: {
          nextFollowUp: { lt: new Date() },
          status: { notIn: ['won', 'lost'] },
        },
      }),
    ]);

    if (unreadMessages > 0) {
      notices.push({
        id: 'unread-messages',
        severity: 'info',
        title: 'Unread customer messages',
        message: unreadMessages + ' website message' + (unreadMessages === 1 ? ' needs' : 's need') + ' review.',
        count: unreadMessages,
        action: 'admin-messages',
      });
    }

    if (overdueFollowUps > 0) {
      notices.push({
        id: 'overdue-followups',
        severity: 'critical',
        title: 'CRM follow-ups overdue',
        message: overdueFollowUps + ' lead' + (overdueFollowUps === 1 ? ' is' : 's are') + ' past the scheduled follow-up time.',
        count: overdueFollowUps,
        action: 'admin-crm-overdue',
      });
    }
  }

  if (canClients) {
    await reconcileSupportEscalations();
    const now = new Date();
    const [unreadTickets, slaBreached] = await Promise.all([
      db.clientSupportTicket.count({
        where: { unreadByAdmin: true },
      }),
      db.clientSupportTicket.count({
        where: {
          OR: [
            { firstRespondedAt: null, firstResponseDueAt: { lt: now } },
            { status: { notIn: ['resolved', 'closed'] }, resolutionDueAt: { lt: now } },
          ],
        },
      }),
    ]);

    if (slaBreached > 0) {
      notices.push({
        id: 'support-sla-breached',
        severity: 'critical',
        title: 'Support SLA breached',
        message: slaBreached + ' support ticket' + (slaBreached === 1 ? ' needs' : 's need') + ' immediate attention.',
        count: slaBreached,
        action: 'admin-support',
      });
    }

    if (unreadTickets > 0) {
      notices.push({
        id: 'unread-client-tickets',
        severity: 'warning',
        title: 'New client support activity',
        message: unreadTickets + ' ticket' + (unreadTickets === 1 ? ' has' : 's have') + ' unread client activity.',
        count: unreadTickets,
        action: 'admin-support',
      });
    }
  }

  if (canProposals) {
    const proposalsNeedingReview = await db.proposal.count({
      where: { status: { in: ['draft', 'review'] } },
    });
    if (proposalsNeedingReview > 0) {
      notices.push({
        id: 'proposal-review',
        severity: 'info',
        title: 'Proposals awaiting review',
        message: proposalsNeedingReview + ' proposal' + (proposalsNeedingReview === 1 ? ' needs' : 's need') + ' human review.',
        count: proposalsNeedingReview,
        action: 'admin-proposals',
      });
    }
  }

  if (canFinance) {
    const now = new Date();
    const renewalWindow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const [overdueInvoices, overdueBills, renewalCandidates, projectRenewalCandidates, expiredServices, collectionInvoices] = await Promise.all([
      db.clientInvoice.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['draft', 'void'] },
        },
        select: {
          total: true,
          allocations: { select: { amount: true } },
          creditNotes: { where: { status: 'posted' }, select: { appliedAmount: true } },
        },
        take: 3000,
      }),
      db.financeVendorBill.findMany({
        where: {
          dueDate: { lt: now },
          status: { not: 'void' },
        },
        select: {
          total: true,
          allocations: { select: { amount: true } },
        },
        take: 3000,
      }),
      db.clientServiceAccount.findMany({
        where: {
          status: { in: ['active', 'suspended'] },
          expiryDate: { gte: now, lte: renewalWindow },
        },
        select: { expiryDate: true, renewalNoticeDays: true },
        take: 1000,
      }),
      db.clientProject.findMany({
        where: {
          status: { in: ['planned', 'active', 'on_hold'] },
          nextRenewalDate: { gte: now, lte: renewalWindow },
          renewalAmount: { gt: 0 },
        },
        select: { nextRenewalDate: true, renewalNoticeDays: true },
        take: 1000,
      }),
      db.clientServiceAccount.count({
        where: {
          status: { in: ['active', 'suspended'] },
          expiryDate: { lt: now },
        },
      }),
      db.clientInvoice.findMany({
        where: {
          status: { notIn: ['draft', 'void'] },
          collectionActivities: {
            some: {
              completedAt: null,
              OR: [
                { nextFollowUpAt: { lt: now } },
                { type: 'promise_to_pay', promisedDate: { lt: now } },
              ],
            },
          },
        },
        select: {
          total: true,
          allocations: { select: { amount: true } },
          creditNotes: { where: { status: 'posted' }, select: { appliedAmount: true } },
          collectionActivities: {
            where: { completedAt: null },
            orderBy: { createdAt: 'desc' },
            select: {
              type: true,
              nextFollowUpAt: true,
              promisedDate: true,
            },
          },
        },
        take: 3000,
      }),
    ]);

    const overdueInvoiceCount = overdueInvoices.filter(
      (invoice) => invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes).gt(0),
    ).length;
    const overdueBillCount = overdueBills.filter(
      (bill) => invoiceBalance(bill.total, bill.allocations).gt(0),
    ).length;

    const liveCollectionInvoices = collectionInvoices.filter(
      (invoice) => invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes).gt(0),
    );
    const collectionFollowUps = liveCollectionInvoices.filter(
      (invoice) => invoice.collectionActivities.some(
        (activity) => activity.nextFollowUpAt && activity.nextFollowUpAt.getTime() < now.getTime(),
      ),
    ).length;
    const brokenPromises = liveCollectionInvoices.filter((invoice) => {
      const latestPromise = invoice.collectionActivities.find(
        (activity) => activity.type === 'promise_to_pay' && activity.promisedDate,
      );
      return Boolean(latestPromise?.promisedDate && latestPromise.promisedDate.getTime() < now.getTime());
    }).length;

    const renewalsDue = renewalCandidates.filter((service) => {
      if (!service.expiryDate) return false;
      const days = Math.ceil((service.expiryDate.getTime() - now.getTime()) / 86400000);
      return days <= service.renewalNoticeDays;
    }).length;
    const projectRenewalsDue = projectRenewalCandidates.filter((project) => {
      if (!project.nextRenewalDate) return false;
      const days = Math.ceil((project.nextRenewalDate.getTime() - now.getTime()) / 86400000);
      return days <= project.renewalNoticeDays;
    }).length;

    if (overdueInvoiceCount > 0) {
      notices.push({
        id: 'finance-overdue-invoices',
        severity: 'critical',
        title: 'Customer invoices overdue',
        message: overdueInvoiceCount + ' customer invoice' + (overdueInvoiceCount === 1 ? ' is' : 's are') + ' past the due date with an outstanding balance.',
        count: overdueInvoiceCount,
        action: 'admin-finance-collections',
      });
    }

    if (overdueBillCount > 0) {
      notices.push({
        id: 'finance-overdue-bills',
        severity: 'warning',
        title: 'Supplier bills overdue',
        message: overdueBillCount + ' supplier bill' + (overdueBillCount === 1 ? ' is' : 's are') + ' past the due date with an outstanding balance.',
        count: overdueBillCount,
        action: 'admin-finance-suppliers',
      });
    }

    if (renewalsDue > 0) {
      notices.push({
        id: 'finance-service-renewals',
        severity: 'warning',
        title: 'Service renewals due',
        message: renewalsDue + ' client service' + (renewalsDue === 1 ? ' is' : 's are') + ' inside the renewal-notice window.',
        count: renewalsDue,
        action: 'admin-finance-renewals',
      });
    }

    if (projectRenewalsDue > 0) {
      notices.push({
        id: 'finance-project-renewals',
        severity: 'warning',
        title: 'Project renewals due',
        message: projectRenewalsDue + ' client project' + (projectRenewalsDue === 1 ? ' is' : 's are') + ' inside the renewal-notice window.',
        count: projectRenewalsDue,
        action: 'admin-finance-renewals',
      });
    }

    if (expiredServices > 0) {
      notices.push({
        id: 'finance-expired-services',
        severity: 'critical',
        title: 'Client services expired',
        message: expiredServices + ' service' + (expiredServices === 1 ? ' has' : 's have') + ' passed the recorded expiry date and need renewal or status review.',
        count: expiredServices,
        action: 'admin-finance-renewals',
      });
    }

    if (collectionFollowUps > 0) {
      notices.push({
        id: 'finance-collection-followups',
        severity: 'warning',
        title: 'Collection follow-ups due',
        message: collectionFollowUps + ' collection follow-up' + (collectionFollowUps === 1 ? ' is' : 's are') + ' due for action.',
        count: collectionFollowUps,
        action: 'admin-finance-collections',
      });
    }

    if (brokenPromises > 0) {
      notices.push({
        id: 'finance-broken-promises',
        severity: 'critical',
        title: 'Payment promises overdue',
        message: brokenPromises + ' promise-to-pay commitment' + (brokenPromises === 1 ? ' is' : 's are') + ' past the promised date.',
        count: brokenPromises,
        action: 'admin-finance-collections',
      });
    }
  }

  if (canComms) {
    const failedDeliveries = await db.newsletterCampaignDelivery.count({
      where: {
        status: 'failed',
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (failedDeliveries > 0) {
      notices.push({
        id: 'newsletter-failures',
        severity: 'warning',
        title: 'Mail delivery failures',
        message: failedDeliveries + ' campaign deliver' + (failedDeliveries === 1 ? 'y has' : 'ies have') + ' failed in the last 7 days.',
        count: failedDeliveries,
        action: 'admin-newsletter',
      });
    }
  }

  const mail = getMailTransportStatus();
  if (!mail.configured) {
    notices.unshift({
      id: 'mail-configuration',
      severity: 'critical',
      title: 'Mail transport needs attention',
      message: mail.warning || 'Transactional email is not fully configured.',
      count: 1,
      action: 'admin-settings',
    });
  }

  const severityWeight = { critical: 0, warning: 1, info: 2 } as const;
  notices.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity] || b.count - a.count);

  return NextResponse.json(
    {
      success: true,
      data: {
        total: notices.reduce((sum, item) => sum + item.count, 0),
        notices,
        checkedAt: new Date().toISOString(),
      },
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
