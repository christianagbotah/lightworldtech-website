import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getMailTransportStatus } from '@/lib/mail';
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
