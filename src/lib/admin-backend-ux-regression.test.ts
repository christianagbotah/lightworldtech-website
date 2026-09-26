import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('admin backend and responsive UX regression coverage', () => {
  test('hardens remaining legacy admin workspaces against malformed JSON responses', () => {
    const resilient = [
      'src/components/admin/AdminBlog.tsx',
      'src/components/admin/AdminBlogEditor.tsx',
      'src/components/admin/AdminFAQs.tsx',
      'src/components/admin/AdminTeam.tsx',
      'src/components/admin/AdminServices.tsx',
      'src/components/admin/AdminTestimonials.tsx',
      'src/components/admin/AdminPortfolio.tsx',
      'src/components/admin/AdminMessages.tsx',
      'src/components/admin/AdminCRM.tsx',
      'src/components/admin/AdminClients.tsx',
      'src/components/admin/AdminProposals.tsx',
    ];

    for (const path of resilient) {
      const value = source(path);
      expect(value).toContain('readJsonResponse');
      expect(value).not.toContain('await res.json()');
    }

    const proposals = source('src/components/admin/AdminProposals.tsx');
    expect(proposals).not.toContain('proposalsRes.json()');
    expect(proposals).not.toContain('leadsRes.json()');

    const login = source('src/components/admin/AdminLogin.tsx');
    expect(login).toContain('async function readAuthPayload');
    expect(login).toContain('const raw = await response.text()');
    expect(login).toContain('The authentication service returned an invalid response');
    expect(login).not.toContain('await res.json()');
    expect(login).toContain('requiresTotp');
  });


  test('keeps the fixed-sidebar admin shell inside the viewport', () => {
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(layout).toContain('w-full overflow-x-hidden');
    expect(layout).toContain('lg:w-[calc(100%-16rem)]');
    expect(layout).toContain('min-w-0 max-w-full flex-1 overflow-x-hidden');
    expect(layout).toContain('h-dvh min-h-0');
    expect(layout).toContain('min-h-0 flex-1 py-3');
  });

  test('keeps the wide CRM board inside its own horizontal scroller', () => {
    const crm = source('src/components/admin/AdminCRM.tsx');

    expect(crm).toContain('max-w-full overflow-x-auto');
    expect(crm).toContain('min-w-[1960px]');
    expect(crm).toContain('md:grid-cols-12');
    expect(crm).toContain('max-w-5xl');
    expect(crm).toContain('DialogDescription');
    expect(crm).toContain('Original customer enquiry');
    expect(crm).toContain('max-h-[36vh] overflow-y-auto');
  });

  test('keeps client creation controls on one desktop row', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain('lg:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(200px,1.2fr)_minmax(150px,1fr)_auto]');
    expect(clients).toContain('lg:items-center');
  });

  test('keeps the client portal workspace inside the viewport', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('w-full overflow-x-hidden');
    expect(portal).toContain('lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]');
    expect(portal).toContain('lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]');
  });

  test('uses canonical validated CMS endpoints from admin screens', () => {
    const files = [
      ['src/components/admin/AdminServices.tsx', '/api/services'],
      ['src/components/admin/AdminTeam.tsx', '/api/team'],
      ['src/components/admin/AdminPortfolio.tsx', '/api/portfolio'],
      ['src/components/admin/AdminTestimonials.tsx', '/api/testimonials'],
      ['src/components/admin/AdminFAQs.tsx', '/api/faqs'],
    ] as const;

    for (const [path, endpoint] of files) {
      const value = source(path);
      expect(value).toContain(endpoint);
      expect(value).not.toContain(endpoint.replace('/api/', '/api/admin/'));
    }
  });

  test('provides a permission-aware command palette and notification centre', () => {
    const layout = source('src/components/admin/AdminLayout.tsx');
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(layout).toContain("event.key.toLowerCase() === 'k'");
    expect(layout).toContain('CommandDialog');
    expect(layout).toContain("fetch('/api/admin/notifications'");
    expect(layout).toContain('Notification centre');
    expect(layout).toContain("sessionStorage.setItem('lw-crm-overdue-filter', '1')");
    expect(notifications).toContain('getActiveAdminContext(request)');
    expect(notifications).toContain("'overdue-followups'");
    expect(notifications).toContain("'support-sla-breached'");
    expect(notifications).toContain("'unread-client-tickets'");
    expect(notifications).toContain("'newsletter-failures'");
  });

  test('supports saved CRM views and overdue deep links', () => {
    const crm = source('src/components/admin/AdminCRM.tsx');
    const leads = source('src/app/api/admin/leads/route.ts');

    expect(crm).toContain("localStorage.getItem('lw-crm-saved-views')");
    expect(crm).toContain("localStorage.setItem('lw-crm-saved-views'");
    expect(crm).toContain("sessionStorage.getItem('lw-crm-overdue-filter')");
    expect(crm).toContain("params.set('overdue', 'true')");
    expect(crm).toContain('Save current view');
    expect(leads).toContain("searchParams.get('overdue') === 'true'");
    expect(leads).toContain("where.status = status && status !== 'all' ? status : { notIn: ['won', 'lost'] }");
  });

  test('adds human-controlled CRM operating intelligence and governed proposal readiness', () => {
    const crm = source('src/components/admin/AdminCRM.tsx');
    const leadList = source('src/app/api/admin/leads/route.ts');
    const leadDetail = source('src/app/api/admin/leads/[id]/route.ts');
    const crmIntelligence = source('src/lib/crm-operating-intelligence.ts');
    const proposals = source('src/components/admin/AdminProposals.tsx');
    const convertClientRoute = source('src/app/api/admin/proposals/[id]/convert-client/route.ts');
    const proposalList = source('src/app/api/admin/proposals/route.ts');
    const proposalDetail = source('src/app/api/admin/proposals/[id]/route.ts');
    const proposalReadiness = source('src/lib/proposal-readiness.ts');

    expect(crm).toContain('Operating intelligence');
    expect(crm).toContain('Use as next action');
    expect(crm).toContain('operatingIntelligence.urgency');
    expect(leadList).toContain('deriveCrmOperatingIntelligence');
    expect(leadDetail).toContain('deriveCrmOperatingIntelligence');
    expect(crmIntelligence).toContain('overdue follow-up');
    expect(crmIntelligence).toContain('human-controlled');

    expect(proposals).toContain('Proposal readiness');
    expect(proposals).toContain('Approval blockers');
    expect(proposals).toContain('Qualification warnings');
    expect(proposals).toContain("status.id === 'sent' && !selected.approvedAt");
    expect(proposalList).toContain('readinessFor');
    expect(proposalDetail).toContain('Proposal must be human-approved as Ready before it can be marked Sent.');
    expect(proposalDetail).toContain('Proposal must be marked Sent before it can be marked Accepted.');
    expect(proposalDetail).toContain('Sent or accepted proposals cannot be edited in place.');
    expect(proposalDetail).toContain('Proposal content changes must be reviewed and approved');
    expect(proposalReadiness).toContain('readyForApproval');
    expect(proposalReadiness).toContain('Pricing, taxes, payment terms');
  });

  test('keeps customer email replies inside the Lightworld admin portal', () => {
    const schema = source('prisma/schema.prisma');
    const replies = source('src/app/api/admin/messages/[id]/replies/route.ts');
    const retryReply = source('src/app/api/admin/messages/[id]/replies/[replyId]/retry/route.ts');
    const replyMail = source('src/lib/contact-reply-mail.ts');
    const messages = source('src/components/admin/AdminMessages.tsx');
    const crm = source('src/components/admin/AdminCRM.tsx');
    const proposals = source('src/components/admin/AdminProposals.tsx');
    const convertClientRoute = source('src/app/api/admin/proposals/[id]/convert-client/route.ts');

    expect(schema).toContain('model ContactMessageReply');
    expect(schema).toContain('replies ContactMessageReply[]');
    expect(replies).toContain('sendTransactionalMail');
    expect(replies).toContain("'admin.message_replied'");
    expect(replies).toContain("'admin.message_reply_failed'");
    expect(replies).toContain('lastContactedAt: sentAt');
    expect(replies).toContain("status: 'sending'");
    expect(replies).toContain("status: 'sent'");
    expect(replies).toContain("status: 'failed'");
    expect(replies).toContain('status: 503');
    expect(replies).toContain("'Retry-After': '30'");
    expect(replies).toContain('details: safeError');
    expect(replies).toContain('buildContactReplyMail');
    expect(retryReply).toContain("status: 'failed'");
    expect(retryReply).toContain("data: { status: 'sending', error: '' }");
    expect(retryReply).toContain("'admin.message_reply_retried'");
    expect(retryReply).toContain("'admin.message_reply_retry_failed'");
    expect(retryReply).toContain('sendTransactionalMail');
    expect(replyMail).toContain('buildContactReplyMail');
    expect(messages).toContain('readMessageReplyApiPayload');
    expect(messages).toContain('Retry delivery');
    expect(messages).toContain('response.text()');
    expect(messages).toContain('Reply internally');
    expect(messages).toContain('Internal correspondence history');
    expect(messages).toContain("fetch('/api/admin/messages/'");
    expect(messages).toContain("sessionStorage.getItem('lw-reply-message-id')");
    expect(messages).not.toContain("href={'mailto:' + viewing.email}");
    expect(crm).toContain("sessionStorage.setItem('lw-reply-message-id'");
    expect(crm).not.toContain("href={'mailto:' + selected.contactMessage.email}");
    expect(proposals).toContain("sessionStorage.setItem('lw-reply-message-id'");
    expect(proposals).toContain('Accepted proposal → client & project handoff');
    expect(proposals).toContain('Project expiry date');
    expect(proposals).toContain('Next renewal date');
    expect(proposals).toContain('Project budget');
    expect(proposals).toContain('Renewal amount');
    expect(proposals).toContain('Review these commercial fields before conversion');
    expect(proposals).toContain('Review & create client workspace');
    expect(proposals).not.toContain("href={'mailto:' + selected.lead.contactMessage.email}");
    expect(convertClientRoute).toContain('budgetAmount');
    expect(convertClientRoute).toContain('renewalAmount');
    expect(convertClientRoute).toContain('nextRenewalDate');
    expect(convertClientRoute).toContain('renewalNoticeDays');
    expect(convertClientRoute).toContain("'admin.proposal_converted_to_client'");
  });

  test('implements the enterprise Support Desk across admin and client portal', () => {
    const schema = source('prisma/schema.prisma');
    const support = source('src/components/admin/AdminSupportDesk.tsx');
    const listApi = source('src/app/api/admin/support-tickets/route.ts');
    const detailApi = source('src/app/api/admin/support-tickets/[id]/route.ts');
    const notesApi = source('src/app/api/admin/support-tickets/[id]/notes/route.ts');
    const clientCreate = source('src/app/api/client/tickets/route.ts');
    const clientReply = source('src/app/api/client/tickets/[id]/messages/route.ts');
    const adminReply = source('src/app/api/admin/client-tickets/[id]/messages/route.ts');
    const clientPortal = source('src/components/client/ClientPortalPage.tsx');
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(schema).toMatch(/ticketNumber\s+String\s+@unique/);
    expect(schema).toContain('firstResponseDueAt DateTime?');
    expect(schema).toContain('internalNotes      ClientTicketInternalNote[]');
    expect(schema).toContain('model ClientTicketInternalNote');
    expect(support).toContain('Enterprise Support Desk');
    expect(support).toContain('Private staff notes');
    expect(support).toContain('SLA breached');
    expect(listApi).toContain('supportSlaState');
    expect(detailApi).toContain('unreadByAdmin: false');
    expect(notesApi).toContain("'admin.support_ticket_internal_note_added'");
    expect(clientCreate).toContain('nextSupportTicketNumber');
    expect(clientCreate).toContain('notifySupportDesk');
    expect(clientReply).toContain("status === 'awaiting_client'");
    expect(adminReply).toContain('notifyClientOfSupportReply');
    expect(adminReply).toContain("status: nextStatus");
    expect(clientPortal).toContain('Search ticket number or subject');
    expect(clientPortal).toContain('ticket.category');
    expect(layout).toContain("label: 'Support Desk'");
  });

  test('supports bounded multi-file evidence selection on both support surfaces', () => {
    const client = source('src/components/client/ClientPortalPage.tsx');
    const admin = source('src/components/admin/AdminSupportDesk.tsx');

    expect(client).toContain('uploadTicketAttachments');
    expect(client).toContain('Array.from(selectedFiles).slice(0, 5)');
    expect(client).toContain('multiple');
    expect(client).toContain('Select up to 5 files at once');
    expect(admin).toContain('uploadAttachments');
    expect(admin).toContain('Array.from(selectedFiles).slice(0, 5)');
    expect(admin).toContain('multiple');
    expect(admin).toContain('Select up to 5 at once');
  });

  test('keeps support evidence private and records a ticket activity timeline', () => {
    const schema = source('prisma/schema.prisma');
    const clientUpload = source('src/app/api/client/tickets/[id]/attachments/route.ts');
    const adminUpload = source('src/app/api/admin/support-tickets/[id]/attachments/route.ts');
    const download = source('src/app/api/support-attachments/[id]/route.ts');
    const support = source('src/components/admin/AdminSupportDesk.tsx');
    const clientPortal = source('src/components/client/ClientPortalPage.tsx');

    expect(schema).toContain('model ClientTicketAttachment');
    expect(schema).toContain('model ClientTicketEvent');
    expect(clientUpload).toContain('detectSupportAttachment');
    expect(clientUpload).toContain("uploadedByType: 'client'");
    expect(adminUpload).toContain("uploadedByType: 'admin'");
    expect(download).toContain("if (!admin && !client)");
    expect(download.indexOf("if (!admin && !client)")).toBeLessThan(
      download.indexOf('db.clientTicketAttachment.findUnique'),
    );
    expect(download).toContain("hasAdminPermission(admin.role, admin.permissions, 'clients.manage')");
    expect(download).toContain('client.user.organizationId !== attachment.ticket.organizationId');
    expect(download).toContain("'Cache-Control': 'private, no-store, max-age=0'");
    expect(download).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(support).toContain('Evidence & attachments');
    expect(support).toContain('Activity timeline');
    expect(clientPortal).toContain('Add evidence');
    expect(clientPortal).toContain("'/api/support-attachments/' + attachment.id");
  });

  test('keeps export controls available on operational detail tables', () => {
    const support = source('src/components/admin/AdminSupportDesk.tsx');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(support).toContain('exportFileName="lightworld-support-desk"');
    expect(support).not.toContain('<Table hideExport exportFileName="lightworld-support-desk"');
    expect(details).toContain('exportFileName="lightworld-finance-record-activity"');
    expect(details).toContain('exportFileName="lightworld-finance-record-lines"');
    expect(details).not.toContain('<Table hideExport');
  });

  test('surfaces and retries failed customer payment confirmation channels', () => {
    const notification = source('src/lib/payment-notification.ts');
    const retry = source('src/app/api/admin/finance/payments/[id]/notification/route.ts');
    const commercial = source('src/components/admin/ClientCommercialAccount.tsx');
    const notices = source('src/app/api/admin/notifications/route.ts');

    expect(notification).toContain('retryFailedChannels');
    expect(notification).toContain("previousSuccesses.has('email')");
    expect(notification).toContain("previousSuccesses.has('sms')");
    expect(retry).toContain("'admin.finance_payment_confirmation_retried'");
    expect(retry).toContain("['failed', 'partial']");
    expect(commercial).toContain('Retry confirmation');
    expect(commercial).toContain('/notification');
    expect(commercial).toContain('customerNotificationChannels');
    expect(notices).toContain("id: 'payment-confirmation-failures'");
    expect(notices).toContain('Payment confirmations need attention');
  });

  test('uses the approved support SMS template for best-effort client updates', () => {
    const support = source('src/lib/support-ticket.ts');
    const reply = source('src/app/api/admin/client-tickets/[id]/messages/route.ts');
    const status = source('src/app/api/admin/client-tickets/[id]/route.ts');
    const bulk = source('src/app/api/admin/support-tickets/bulk/route.ts');

    expect(support).toContain("key: 'support_update'");
    expect(support).toContain("createdBy: 'System support update'");
    expect(support).toContain('30 * 60 * 1000');
    expect(support).toContain('queueSingleSms');
    expect(support).toContain('notifySupportUpdateSms');
    expect(reply).toContain('organization: { select: { primaryPhone: true } }');
    expect(reply).toContain('phone: ticket.organization.primaryPhone');
    expect(status).toContain('phone: existing.organization.primaryPhone');
    expect(bulk).toContain('phone: ticket.organization.primaryPhone');
  });

  test('sends idempotent customer payment confirmations for manual and Hubtel receipts', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260926123500_payment_customer_notifications/migration.sql');
    const notification = source('src/lib/payment-notification.ts');
    const manualPayments = source('src/app/api/admin/finance/payments/route.ts');
    const hubtelPayment = source('src/lib/hubtel-payment.ts');

    expect(schema).toContain('customerNotificationStatus');
    expect(schema).toContain('customerNotificationChannels');
    expect(migration).toContain('customerNotificationStatus');
    expect(notification).toContain('pg_advisory_xact_lock');
    expect(notification).toContain("key: 'payment_received'");
    expect(notification).toContain("createdBy: 'System payment confirmation'");
    expect(notification).toContain("customerNotificationStatus: 'sending'");
    expect(notification).toContain("'partial'");
    expect(notification).toContain("'skipped'");
    expect(notification).toContain('sendTransactionalMail');
    expect(manualPayments).toContain('notifyCustomerPaymentReceived(payment.id)');
    expect(hubtelPayment).toContain('notifyCustomerPaymentReceived');
  });

  test('gives clients secure printable invoice and receipt documents', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');
    const invoiceDocument = source('src/app/api/client/invoices/[id]/document/route.ts');
    const receiptDocument = source('src/app/api/client/payments/[id]/receipt/route.ts');

    expect(portal).toContain("/api/client/invoices/");
    expect(portal).toContain("/document");
    expect(portal).toContain("/api/client/payments/");
    expect(portal).toContain("/receipt");
    expect(portal).toContain('View / print');
    expect(invoiceDocument).toContain('getActiveClientContext');
    expect(invoiceDocument).toContain('organizationId: context.user.organizationId');
    expect(invoiceDocument).toContain("status: { notIn: ['draft', 'void'] }");
    expect(invoiceDocument).toContain('Print / Save PDF');
    expect(invoiceDocument).toContain("Cache-Control': 'private, no-store");
    expect(receiptDocument).toContain('getActiveClientContext');
    expect(receiptDocument).toContain('organizationId: context.user.organizationId');
    expect(receiptDocument).toContain('Print / Save PDF');
  });

  test('provides searchable self-service help alongside the client portal', () => {
    const page = source('src/app/client/page.tsx');
    const knowledge = source('src/components/client/ClientKnowledgeWidget.tsx');

    expect(page).toContain('ClientKnowledgeWidget');
    expect(knowledge).toContain("fetch('/api/faqs?active=true'");
    expect(knowledge).toContain('Client help & knowledge');
    expect(knowledge).toContain('Search client help');
    expect(knowledge).toContain('account-specific help');
  });

  test('warns support operations before SLA breach', () => {
    const support = source('src/components/admin/AdminSupportDesk.tsx');
    const api = source('src/app/api/admin/support-tickets/route.ts');
    const notifications = source('src/app/api/admin/notifications/route.ts');
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(api).toContain('SUPPORT_SLA_WARNING_MINUTES');
    expect(api).toContain("sla === 'at_risk'");
    expect(api).toContain('atRisk');
    expect(support).toContain('SLA at risk');
    expect(support).toContain('<option value="at_risk">SLA at risk</option>');
    expect(notifications).toContain('Support SLA approaching deadline');
    expect(notifications).toContain("action: 'admin-support-at-risk'");
    expect(layout).toContain("sessionStorage.setItem('lw-support-sla-filter', 'at_risk')");
  });

  test('measures support backlog age and reopen incidence', () => {
    const api = source('src/app/api/admin/support-tickets/route.ts');
    const support = source('src/components/admin/AdminSupportDesk.tsx');

    expect(api).toContain("where: { type: 'ticket_reopened' }");
    expect(api).toContain('avgOpenAgeMinutes');
    expect(api).toContain('oldestOpenAgeMinutes');
    expect(api).toContain('reopenedTickets');
    expect(api).toContain('reopenIncidencePct');
    expect(api).toContain('not a defect attribution metric');
    expect(support).toContain('Avg open age');
    expect(support).toContain('Reopen incidence');
    expect(support).toContain('oldestOpenAgeMinutes');
  });

  test('supports real Support Desk agents, bounded bulk actions, exports and SLA escalation', () => {
    const support = source('src/components/admin/AdminSupportDesk.tsx');
    const agents = source('src/app/api/admin/support-agents/route.ts');
    const bulk = source('src/app/api/admin/support-tickets/bulk/route.ts');
    const exportRoute = source('src/app/api/admin/support-tickets/export/route.ts');
    const ticketUpdate = source('src/app/api/admin/client-tickets/[id]/route.ts');
    const supportLib = source('src/lib/support-ticket.ts');
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(agents).toContain("normalizeAdminPermissions(admin.permissions).includes('clients.manage')");
    expect(support).toContain("fetch('/api/admin/support-agents'");
    expect(support).toContain("fetch('/api/admin/support-tickets/bulk'");
    expect(support).toContain("fetch('/api/admin/support-tickets/export?'");
    expect(support).toContain('Select all visible support tickets');
    expect(bulk).toContain('.max(100)');
    expect(bulk).toContain('Bulk status changes are limited to 25 tickets at a time');
    expect(bulk).toContain("'admin.support_tickets_bulk_updated'");
    expect(exportRoute).toContain("'admin.support_tickets_exported'");
    expect(ticketUpdate).toContain('Selected assignee is not an active Support Desk agent');
    expect(supportLib).toContain('reconcileSupportEscalations');
    expect(supportLib).toContain("type: 'sla_escalated'");
    expect(notifications).toContain('await reconcileSupportEscalations()');
  });

  test('keeps the client portfolio searchable and exportable at management scale', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain('Export portfolio');
    expect(clients).toContain('lightworld-client-portfolio-');
    expect(clients).toContain('Priority action queue');
    expect(clients).toContain('organizationQuery');
    expect(clients).toContain('organizationStatus');
    expect(clients).toContain('Filter client organizations by status');
    expect(clients).toContain('No client organizations match this search.');
  });

  test('provides a finance-authorized cross-customer executive portfolio cockpit', () => {
    const clients = source('src/components/admin/AdminClients.tsx');
    const portfolio = source('src/app/api/admin/clients/portfolio-intelligence/route.ts');

    expect(clients).toContain('Executive client portfolio');
    expect(clients).toContain('Accounts by management priority');
    expect(clients).toContain('Priority action queue');
    expect(clients).toContain('openPortfolioAction');
    expect(clients).toContain("import { useAppStore } from '@/lib/store';");
    expect(portfolio).toContain('const actionQueue = rows');
    expect(portfolio).toContain("'collections' | 'renewals' | 'agreements' | 'support' | 'projects' | 'budget'");
    expect(portfolio).toContain('Correct project budget overrun');
    expect(portfolio).toContain('agreementsInNoticeWindow');
    expect(portfolio).toContain('expiredAgreements');
    expect(portfolio).toContain('Review expired agreements');
    expect(clients).toContain('Agreement exceptions');
    expect(clients).toContain("action.type === 'agreements'");
    expect(clients).toContain("'client-agreements'");
    expect(clients).toContain('Currency exposure');
    expect(clients).toContain('portfolio-intelligence');
    expect(clients).toContain('setSelectedId(row.id)');
    expect(portfolio).toContain("'finance.manage'");
    expect(portfolio).toContain('invoiceBalance');
    expect(portfolio).toContain('overdueReceivables');
    expect(portfolio).toContain('renewals30');
    expect(portfolio).toContain('budgetPressure');
    expect(portfolio).toContain('overBudget');
    expect(portfolio).toContain('slaBreaches');
    expect(portfolio).toContain('Currency values are never converted');
  });

  test('prepares bounded duplicate-safe renewal invoice drafts without issuing them', () => {
    const automation = source('src/lib/renewal-draft-automation.ts');
    const dispatcher = source('src/lib/sms.ts');

    expect(automation).toContain("AUTO_RENEWAL_DRAFT_INVOICES === 'true'");
    expect(automation).toContain('RENEWAL_DRAFT_INVOICE_BATCH_SIZE');
    expect(automation).toContain('autoRenew: true');
    expect(automation).toContain("status: 'draft'");
    expect(automation).toContain("taxTreatment: 'none'");
    expect(automation).toContain('human finance review');
    expect(automation).toContain('pg_advisory_xact_lock');
    expect(automation).toContain('renewalForDate: renewalDate');
    expect(automation).toContain("'system.finance_renewal_draft_created'");
    expect(dispatcher).toContain('renewalDraftQueue');
  });

  test('exports a multi-currency executive finance management snapshot', () => {
    const dashboard = source('src/components/admin/FinanceExecutiveDashboard.tsx');

    expect(dashboard).toContain('Download management pack');
    expect(dashboard).toContain('Executive finance management snapshot');
    expect(dashboard).toContain('Cash runway months');
    expect(dashboard).toContain('Collections control');
    expect(dashboard).toContain('Currencies remain separate');
    expect(dashboard).toContain('lightworld-finance-management-');
  });

  test('supports bounded bulk Hubtel reminders from collections', () => {
    const workspace = source('src/components/admin/FinanceCollectionsWorkspace.tsx');
    const bulk = source('src/app/api/admin/finance/collections/bulk-reminders/route.ts');

    expect(workspace).toContain('Send selected reminders');
    expect(workspace).toContain('maximum 25 per action');
    expect(workspace).toContain('/api/admin/finance/collections/bulk-reminders');
    expect(bulk).toContain('.max(25)');
    expect(bulk).toContain('promise_to_pay');
    expect(bulk).toContain("createdAt: { gte: duplicateCutoff }");
    expect(bulk).toContain("type: 'sms_reminder_scheduled'");
    expect(bulk).toContain("'admin.finance_collection_bulk_sms_scheduled'");
  });

  test('measures per-currency customer receivable concentration without FX assumptions', () => {
    const api = source('src/app/api/admin/finance/dashboard/route.ts');
    const dashboard = source('src/components/admin/FinanceExecutiveDashboard.tsx');

    expect(api).toContain('receivableConcentrationRaw');
    expect(api).toContain('topSharePct');
    expect(api).toContain('top3SharePct');
    expect(api).toContain('No FX conversion is applied');
    expect(dashboard).toContain('Customer concentration');
    expect(dashboard).toContain('Largest customer receivable share %');
  });

  test('reports renewal workflow completion without presenting it as retention', () => {
    const api = source('src/app/api/admin/finance/dashboard/route.ts');
    const dashboard = source('src/components/admin/FinanceExecutiveDashboard.tsx');

    expect(api).toContain('renewalPerformance');
    expect(api).toContain('completedDueInPeriod');
    expect(api).toContain('overdueOpenRenewals');
    expect(api).toContain('This is not a customer-retention rate');
    expect(dashboard).toContain('Renewal workflow performance');
    expect(dashboard).toContain('Renewal workflow completion %');
  });

  test('normalizes recurring service revenue into MRR and ARR without guessing custom cycles', () => {
    const api = source('src/app/api/admin/finance/dashboard/route.ts');
    const dashboard = source('src/components/admin/FinanceExecutiveDashboard.tsx');

    expect(api).toContain('recurringRevenueRaw');
    expect(api).toContain("service.billingCycle === 'quarterly'");
    expect(api).toContain("service.billingCycle === 'semiannual'");
    expect(api).toContain("service.billingCycle === 'annual'");
    expect(api).toContain('One-time and custom cycles are excluded rather than estimated');
    expect(dashboard).toContain('Recurring revenue');
    expect(dashboard).toContain("'MRR'");
    expect(dashboard).toContain("'ARR'");
  });

  test('adds per-currency historical cash runway without FX assumptions', () => {
    const dashboardApi = source('src/app/api/admin/finance/dashboard/route.ts');
    const dashboard = source('src/components/admin/FinanceExecutiveDashboard.tsx');

    expect(dashboardApi).toContain('const runway = Object.fromEntries');
    expect(dashboardApi).toContain('averageMonthlyCashOut');
    expect(dashboardApi).toContain('sampleMonths');
    expect(dashboardApi).toContain('Historical cash-out coverage');
    expect(dashboardApi).toContain('Future collections and currency conversion are excluded');
    expect(dashboard).toContain('Cash runway');
    expect(dashboard).toContain('avg monthly cash out');
    expect(dashboard).toContain('runway.methodology');
  });

  test('implements customer accounts billing debtors creditors cashflow and management P&L', () => {
    const schema = source('prisma/schema.prisma');
    const permissions = source('src/lib/admin-permissions.ts');
    const finance = source('src/components/admin/AdminFinance.tsx');
    const executiveFinance = source('src/components/admin/FinanceExecutiveDashboard.tsx');
    const executiveActions = source('src/components/admin/FinanceExecutiveActionCenter.tsx');
    const executiveActionsApi = source('src/app/api/admin/finance/executive-actions/route.ts');
    const clients = source('src/components/admin/AdminClients.tsx');
    const clientCommercial = source('src/components/admin/ClientCommercialAccount.tsx');
    const clientCommercialApi = source('src/app/api/admin/clients/[id]/commercial/route.ts');
    const adminStatement = source('src/app/api/admin/clients/[id]/statement/route.ts');
    const clientStatement = source('src/app/api/client/account/statement/route.ts');
    const customerStatement = source('src/lib/customer-statement.ts');
    const projectCreateApi = source('src/app/api/admin/clients/[id]/projects/route.ts');
    const projectUpdateApi = source('src/app/api/admin/client-projects/[id]/route.ts');
    const dashboard = source('src/app/api/admin/finance/dashboard/route.ts');
    const invoices = source('src/app/api/admin/finance/invoices/route.ts');
    const invoiceAccessLink = source('src/lib/invoice-access-link.ts');
    const invoiceAccessApi = source('src/app/api/admin/finance/invoices/[id]/access-link/route.ts');
    const invoiceSendApi = source('src/app/api/admin/finance/invoices/[id]/send/route.ts');
    const publicInvoiceApi = source('src/app/api/invoice/[token]/route.ts');
    const publicInvoicePay = source('src/app/api/invoice/[token]/pay/route.ts');
    const publicInvoicePage = source('src/components/invoice/PublicInvoicePage.tsx');
    const invoiceAccessMigration = source('prisma/migrations/20260924233000_invoice_secure_delivery/migration.sql');
    const receipts = source('src/app/api/admin/finance/payments/route.ts');
    const bills = source('src/app/api/admin/finance/bills/route.ts');
    const expenses = source('src/app/api/admin/finance/expenses/route.ts');
    const expenseAttributionMigration = source('prisma/migrations/20260925114500_finance_expense_customer_attribution/migration.sql');
    const vendorPayments = source('src/app/api/admin/finance/vendor-payments/route.ts');
    const renewalReminder = source('src/app/api/admin/finance/services/[id]/renewal-reminder/route.ts');
    const projectRenewalReminder = source('src/app/api/admin/client-projects/[id]/renewal-reminder/route.ts');
    const projectRenewalTemplateMigration = source('prisma/migrations/20260925140500_project_renewal_sms_templates/migration.sql');
    const recordDetails = source('src/app/api/admin/finance/records/[type]/[id]/route.ts');
    const financeDetails = source('src/components/admin/FinanceRecordDetailsDialog.tsx');
    const accounting = source('src/components/admin/FinanceAccountingWorkspace.tsx');
    const statementsWorkspace = source('src/components/admin/FinanceFinancialStatements.tsx');
    const collections = source('src/components/admin/FinanceCollectionsWorkspace.tsx');
    const renewals = source('src/components/admin/FinanceRenewalBillingWorkspace.tsx');
    const financeMeta = source('src/app/api/admin/finance/meta/route.ts');
    const renewalCompletionApi = source('src/app/api/admin/finance/invoices/[id]/complete-renewal/route.ts');
    const serviceRenewalLib = source('src/lib/service-renewal.ts');
    const serviceRenewalTest = source('src/lib/service-renewal.test.ts');
    const collectionsApi = source('src/app/api/admin/finance/collections/route.ts');
    const collectionCompleteApi = source('src/app/api/admin/finance/collections/[id]/route.ts');
    const collectionsMigration = source('prisma/migrations/20260924003000_finance_collections_workflow/migration.sql');
    const renewalCycleMigration = source('prisma/migrations/20260924004500_invoice_renewal_cycle_marker/migration.sql');
    const renewalCompletionMigration = source('prisma/migrations/20260924010000_service_renewal_completion/migration.sql');
    const accountsApi = source('src/app/api/admin/finance/accounting/accounts/route.ts');
    const periodsApi = source('src/app/api/admin/finance/accounting/periods/route.ts');
    const periodActionApi = source('src/app/api/admin/finance/accounting/periods/[id]/route.ts');
    const journalsApi = source('src/app/api/admin/finance/accounting/journals/route.ts');
    const journalReversalApi = source('src/app/api/admin/finance/accounting/journals/[id]/reverse/route.ts');
    const trialBalanceApi = source('src/app/api/admin/finance/accounting/reports/trial-balance/route.ts');
    const generalLedgerApi = source('src/app/api/admin/finance/accounting/reports/general-ledger/route.ts');
    const financialStatementsApi = source('src/app/api/admin/finance/accounting/reports/financial-statements/route.ts');
    const cashbookApi = source('src/app/api/admin/finance/accounting/reports/cashbook/route.ts');
    const financialStatements = source('src/components/admin/FinanceFinancialStatements.tsx');
    const cashbookWorkspace = source('src/components/admin/FinanceCashbookWorkspace.tsx');
    const ledgerInitialization = source('src/components/admin/FinanceLedgerInitialization.tsx');
    const ledgerBackfillApi = source('src/app/api/admin/finance/accounting/backfill/route.ts');
    const financeLedger = source('src/lib/finance-ledger.ts');
    const creditNotesApi = source('src/app/api/admin/finance/credit-notes/route.ts');
    const refundsApi = source('src/app/api/admin/finance/refunds/route.ts');
    const customerCredits = source('src/components/admin/FinanceCustomerCredits.tsx');
    const reconciliationApi = source('src/app/api/admin/finance/accounting/reconciliation/route.ts');
    const reconciliationDetailApi = source('src/app/api/admin/finance/accounting/reconciliation/[id]/route.ts');
    const reconciliationMatchApi = source('src/app/api/admin/finance/accounting/reconciliation/[id]/match/route.ts');
    const reconciliationFinalizeApi = source('src/app/api/admin/finance/accounting/reconciliation/[id]/finalize/route.ts');
    const reconciliationWorkspace = source('src/components/admin/FinanceReconciliationWorkspace.tsx');
    const closeReadinessApi = source('src/app/api/admin/finance/accounting/close-readiness/route.ts');
    const monthCloseApi = source('src/app/api/admin/finance/accounting/month-close/route.ts');
    const closeWorkspace = source('src/components/admin/FinanceCloseWorkspace.tsx');
    const financeClose = source('src/lib/finance-close.ts');
    const financeControlsMigration = source('prisma/migrations/20260923151500_finance_controls_credit_refund_reconciliation/migration.sql');
    const monthCloseMigration = source('prisma/migrations/20260923154500_finance_month_close_locks/migration.sql');
    const taxMigration = source('prisma/migrations/20260923162500_ghana_vat_tax_controls/migration.sql');
    const financeVendorBillTaxRepair = source('prisma/migrations/20260925151500_finance_vendor_bill_tax_recoverable_repair/migration.sql');
    const projectCommercialMigration = source('prisma/migrations/20260923165000_client_project_commercial_lifecycle/migration.sql');
    const projectBudgetMigration = source('prisma/migrations/20260925120500_client_project_budget_planning/migration.sql');
    const approvalMigration = source('prisma/migrations/20260923172000_finance_outflow_maker_checker/migration.sql');
    const approvalPolicyApi = source('src/app/api/admin/finance/approvals/policy/route.ts');
    const approvalsApi = source('src/app/api/admin/finance/approvals/route.ts');
    const approvalDecisionApi = source('src/app/api/admin/finance/approvals/[id]/route.ts');
    const approvalLib = source('src/lib/finance-approvals.ts');
    const approvalWorkspace = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const taxProfileApi = source('src/app/api/admin/finance/accounting/tax/profile/route.ts');
    const taxReportApi = source('src/app/api/admin/finance/accounting/tax/report/route.ts');
    const taxWorkspace = source('src/components/admin/FinanceTaxWorkspace.tsx');
    const sourceIntegrityMigration = source('prisma/migrations/20260923134500_finance_source_journal_integrity/migration.sql');
    const accountingMigration = source('prisma/migrations/20260923132000_double_entry_accounting_core/migration.sql');
    const portalApi = source('src/app/api/client/portal/route.ts');
    const statement = source('src/app/api/client/account/statement/route.ts');
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(schema).toContain('model ClientServiceAccount');
    expect(schema).toContain('model ClientInvoice');
    expect(schema).toContain('model ClientPaymentAllocation');
    expect(schema).toContain('model FinanceVendorBill');
    expect(schema).toContain('model FinanceExpense');
    expect(schema).toContain('organizationId String?');
    expect(schema).toContain('projectId      String?');
    expect(schema).toContain('serviceId      String?');
    expect(schema).toContain('model FinanceAccount');
    expect(schema).toContain('model FinanceAccountingPeriod');
    expect(schema).toContain('model FinanceJournalEntry');
    expect(schema).toContain('model FinanceJournalLine');
    expect(schema).toContain('model FinanceCreditNote');
    expect(schema).toContain('model FinanceCustomerRefund');
    expect(schema).toContain('model FinanceReconciliationBatch');
    expect(schema).toContain('model FinanceReconciliationLine');
    expect(schema).toContain('model FinanceMonthClose');
    expect(schema).toContain('model FinanceTaxProfile');
    expect(schema).toContain('taxTreatment');
    expect(schema).toContain('taxRecoverable');
    expect(schema).toContain('vatAmount');
    expect(schema).toContain('nhilAmount');
    expect(schema).toContain('getfundAmount');
    expect(schema).toContain('nextRenewalDate');
    expect(schema).toContain('renewalAmount');
    expect(schema).toContain('budgetCurrency');
    expect(schema).toContain('budgetAmount');
    expect(schema).toContain('renewalCurrency');
    expect(schema).toContain('renewalNoticeDays');
    expect(schema).toContain('model FinanceApprovalPolicy');
    expect(schema).toContain('model FinanceOutflowApproval');
    expect(schema).toContain('model FinanceCollectionActivity');
    expect(schema).toContain('renewalForDate');
    expect(schema).toContain('renewalCompletedAt');
    expect(schema).toContain('sourceInvoiceId');
    expect(schema).toContain('previousExpiryDate');
    expect(schema).toContain('newNextDueDate');
    expect(permissions).toContain("key: 'finance.manage'");
    expect(permissions).toContain("key: 'finance.approve'");
    expect(permissions).toContain("pathname.startsWith('/api/admin/finance')");
    expect(finance).toContain('Finance & Accounts');
    expect(finance).toContain('const raw = await response.text()');
    expect(finance).toContain('Finance endpoint returned invalid JSON');
    expect(finance).toContain('Finance endpoint returned an empty response');
    expect(finance).toContain("const maxAttempts = method === 'GET' ? 2 : 1");
    expect(finance).toContain('[502, 503, 504].includes(response.status)');
    expect(finance).not.toContain('const payload = await response.json();');
    expect(finance).toContain('Customer accounts');
    expect(finance).toContain('Suppliers & expenses');
    expect(finance).toContain("['accounting', 'Accounting']");
    expect(finance).toContain("['collections', 'Collections']");
    expect(finance).toContain("['renewals', 'Renewals']");
    expect(finance).toContain('projects={data.organizations.flatMap');
    expect(finance).toContain('FinanceAccountingWorkspace');
    expect(finance).toContain('FinanceExecutiveDashboard');
    expect(executiveFinance).toContain('FinanceExecutiveActionCenter');
    expect(executiveActions).toContain('Executive action centre');
    expect(executiveActions).toContain('Paid cycles awaiting completion');
    expect(executiveActions).toContain('Outflows awaiting approval');
    expect(executiveActions).toContain('Prior-month close');
    expect(executiveActions).toContain('/api/admin/finance/executive-actions');
    expect(executiveActionsApi).toContain("'finance.manage'");
    expect(executiveActionsApi).toContain("status: 'pending'");
    expect(executiveActionsApi).toContain('renewalCompletedAt: null');
    expect(executiveActionsApi).toContain('invoiceBalance');
    expect(executiveActionsApi).toContain('assessFinanceClose');
    expect(finance).toContain("setAccountingView('approvals')");
    expect(finance).toContain("setAccountingView('close')");
    expect(finance).toContain('FinanceRenewalBillingWorkspace');
    expect(finance).toContain('FinanceCollectionsWorkspace');
    expect(finance).toContain('Manage service');
    expect(finance).toContain('Save service change');
    expect(finance).toContain('Service history');
    expect(finance).toContain("changeType: 'renewal'");
    expect(finance).toContain('Prepare renewal invoice');
    expect(finance).toContain('Send renewal SMS');
    expect(finance).toContain('/renewal-reminder');
    expect(finance).toContain('FinanceRecordDetailsDialog');
    expect(finance).toContain("openFinanceRecord('invoice'");
    expect(finance).toContain("openFinanceRecord('receipt'");
    expect(finance).toContain("openFinanceRecord('bill'");
    expect(finance).toContain("openFinanceRecord('expense'");
    expect(finance).toContain('prepareReceiptFromInvoice');
    expect(finance).toContain('prepareSupplierPaymentFromBill');
    expect(executiveFinance).toContain('Financial command centre');
    expect(executiveFinance).toContain('Available liquidity');
    expect(executiveFinance).toContain('Receivables');
    expect(executiveFinance).toContain('Payables');
    expect(executiveFinance).toContain('Net profit');
    expect(executiveFinance).toContain('Renewal exposure');
    expect(executiveFinance).toContain('Collection pressure');
    expect(executiveFinance).toContain('Performance trend');
    expect(executiveFinance).toContain('Cashflow trend');
    expect(executiveFinance).toContain('Receivables health');
    expect(executiveFinance).toContain('Largest customer balances');
    expect(executiveFinance).toContain('Largest supplier balances');
    expect(executiveFinance).toContain('Renewal action centre');
    expect(executiveFinance).toContain('Currencies remain separate');
    expect(executiveFinance).toContain('ChartContainer');
    expect(executiveFinance).toContain('lightworld-executive-debtors');
    expect(executiveFinance).toContain('lightworld-executive-creditors');
    expect(finance).toContain("setAccountingView('cashbook')");
    expect(finance).toContain("setAccountingView('statements')");
    expect(collections).toContain('Receivables collection queue');
    expect(collections).toContain('Promise to pay');
    expect(collections).toContain('Send Hubtel payment reminder');
    expect(collections).toContain('Send payment reminder email');
    expect(collections).toContain('Log email contact (no send)');
    expect(collections).toContain('onOpenCustomer');
    expect(collections).toContain('Mark complete');
    expect(collections).toContain('exportFileName="lightworld-receivables-collection-queue"');
    expect(collectionsApi).toContain("'promise_to_pay'");
    expect(collectionsApi).toContain("'sms_reminder'");
    expect(collectionsApi).toContain("'email_reminder'");
    expect(collectionsApi).toContain("'email_reminder_sending'");
    expect(collectionsApi).toContain("'communications.manage'");
    expect(collectionsApi).toContain('getMailTransportStatus');
    expect(collectionsApi).toContain('sendTransactionalMail');
    expect(collectionsApi).toContain('sanitizeMailError');
    expect(collectionsApi).toContain("'admin.finance_collection_email_reminder_sent'");
    expect(collectionsApi).toContain("'admin.finance_collection_email_reminder_failed'");
    expect(collectionsApi).toContain("key: 'payment_due'");
    expect(collectionsApi).toContain('12 * 60 * 60 * 1000');
    expect(collectionsApi).toContain('queueSingleSms');
    expect(collectionCompleteApi).toContain('completedAt: new Date()');
    expect(collectionsMigration).toContain('CREATE TABLE "FinanceCollectionActivity"');
    expect(finance).toContain('exportFileName="lightworld-client-services"');
    expect(finance).toContain('exportFileName="lightworld-client-invoices"');
    expect(finance).toContain('exportFileName="lightworld-client-receipts"');
    expect(finance).toContain('exportFileName="lightworld-supplier-bills"');
    expect(finance).toContain('exportFileName="lightworld-direct-expenses"');
    expect(finance).toContain('Customer attribution');
    expect(finance).toContain('feeds Customer 360 profitability reporting');
    expect(finance).toContain('lw-finance-action');
    expect(finance).toContain("deepLinkAction === 'invoice'");
    expect(finance).toContain("deepLinkAction === 'receipt'");
    expect(finance).toContain("deepLinkAction === 'service'");
    expect(expenses).toContain('Project does not belong to the selected customer');
    expect(expenses).toContain('Service is linked to a different project');
    expect(expenses).toContain('organizationId,');
    expect(expenses).toContain('projectId,');
    expect(expenses).toContain('serviceId,');
    expect(expenseAttributionMigration).toContain('FinanceExpense_organizationId_fkey');
    expect(expenseAttributionMigration).toContain('FinanceExpense_projectId_fkey');
    expect(expenseAttributionMigration).toContain('FinanceExpense_serviceId_fkey');
    expect(finance).toContain('Tax treatment');
    expect(finance).toContain('Ghana standard VAT');
    expect(finance).toContain('Recoverable input tax');
    expect(finance).toContain('invoiceVatPreview');
    expect(finance).toContain('billVatPreview');
    expect(clients).toContain('ClientCommercialAccount');
    expect(clients).toContain('Client command centre sections');
    expect(clients).toContain('Primary contact');
    expect(clients).toContain('Portal access');
    expect(clients).toContain('Delivery portfolio');
    expect(clients).toContain('Support load');
    expect(clients).toContain('client-overview');
    expect(clients).toContain('client-portal-users');
    expect(clients).toContain('client-commercial');
    expect(clients).toContain('client-communications');
    expect(clients).toContain('client-projects');
    expect(clients).toContain('client-support');
    expect(clients).toContain('scrollIntoView');
    expect(clients).toContain('Commercial lifecycle');
    expect(clients).toContain('Expiry date');
    expect(clients).toContain('Next renewal');
    expect(clients).toContain('Renewal amount');
    expect(clients).toContain('Project budget');
    expect(clients).toContain('Budget CCY');
    expect(clients).toContain('Auto-renew');
    expect(clientCommercial).toContain('Account & billing');
    expect(clientCommercial).toContain('Record customer payment');
    expect(clientCommercial).toContain('Invoices & balances');
    expect(clientCommercial).toContain('Service expiry & renewal');
    expect(clientCommercial).toContain('Customer payment history');
    expect(clientCommercial).toContain('Service commercial history');
    expect(clientCommercial).toContain('Customer 360 commercial pulse');
    expect(clientCommercial).toContain('Executive intelligence brief');
    expect(clientCommercial).toContain('Management priorities');
    expect(clientCommercial).toContain('Evidence:');
    expect(clientCommercial).toContain('executiveBrief.controls');
    expect(clientCommercial).toContain('Customer quick actions');
    expect(clientCommercial).toContain('Issue invoice');
    expect(clientCommercial).toContain('Add service');
    expect(clientCommercial).toContain('Project dates');
    expect(clientCommercial).toContain('Create project');
    expect(clientCommercial).toContain('SMS customer');
    expect(clientCommercial).toContain('Payment reminder');
    expect(clientCommercial).toContain('Renewal reminder');
    expect(clientCommercial).toContain('Project renewal reminder');
    expect(clientCommercial).toContain("setPendingReminder('project_renewal_sms')");
    expect(clientCommercial).toContain('/api/admin/client-projects/');
    expect(clientCommercial).toContain("setPendingReminder('payment_sms')");
    expect(clientCommercial).toContain("setPendingReminder('renewal_sms')");
    expect(clientCommercial).toContain("fetch('/api/admin/finance/collections'");
    expect(clientCommercial).toContain('/renewal-reminder');
    expect(clientCommercial).toContain('Duplicate reminders are blocked for 12 hours');
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-client-action', 'new-project')");
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-sms-recipient'");
    expect(clients).toContain("sessionStorage.getItem('lw-client-action')");
    expect(clients).toContain("pendingClientAction === 'new-project'");
    expect(clients).toContain('client-new-project-name');
    expect(clientCommercialApi).toContain('nextCollectionInvoice');
    expect(clientCommercialApi).toContain('collectionTarget');
    expect(clientCommercial).toContain('Create project');
    expect(clientCommercial).toContain('SMS customer');
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-client-action', 'new-project')");
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-sms-recipient'");
    expect(clients).toContain("sessionStorage.getItem('lw-client-action')");
    expect(clients).toContain("pendingClientAction === 'new-project'");
    expect(clients).toContain('client-new-project-name');
    expect(clientCommercial).toContain('Direct profitability');
    expect(clientCommercial).toContain('Project profitability & completion forecast');
    expect(clientCommercial).toContain('% budget used');
    expect(clientCommercial).toContain('budgetRemaining');
    expect(clientCommercial).toContain('Service margins');
    expect(clientCommercial).toContain('Forecasts are decision support');
    expect(clientCommercial).toContain('Actual cost');
    expect(clientCommercial).toContain('Progress / burn');
    expect(clientCommercial).toContain('EAC');
    expect(clientCommercial).toContain('ETC');
    expect(clientCommercial).toContain('Forecast variance');
    expect(clientCommercial).toContain('Forecast margin');
    expect(clientCommercial).toContain('Cost +');
    expect(clientCommercial).toContain('vs issued revenue');

    expect(clientCommercial).toContain('Drill down');
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-finance-project-id'");
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-finance-service-id'");
    expect(finance).toContain("sessionStorage.getItem('lw-finance-project-id')");
    expect(finance).toContain("sessionStorage.getItem('lw-finance-service-id')");
    expect(finance).toContain('Customer finance drill-down');
    expect(finance).toContain('scopedCustomerServices');
    expect(finance).toContain('scopedCustomerInvoices');
    expect(finance).toContain('scopedCustomerReceipts');
    expect(finance).toContain('scopedCustomerExpenses');
    expect(finance).toContain('Attributed direct expenses');
    expect(finance).toContain('Show all customer finance');
    expect(clientCommercial).toContain('30 / 90 day commercial forecast');
    expect(clientCommercial).toContain('Receivables due');
    expect(clientCommercial).toContain('Account health');
    expect(clientCommercial).toContain('Recommended next actions');
    expect(clientCommercial).toContain('Recent customer activity');
    expect(clientCommercial).toContain('Payments, invoices, collections, client announcements and support conversations');
    expect(clientCommercial).toContain('Customer communications');
    expect(clientCommercial).toContain('Next collection follow-up');
    expect(clientCommercial).toContain('Next promise to pay');
    expect(clientCommercial).toContain('SLA breaches');
    expect(clientCommercial).toContain('Reply internally');
    expect(clientCommercial).toContain('lw-reply-message-id');
    expect(clientCommercial).toContain('lw-open-message-id');
    expect(clientCommercial).toContain('runCustomerAction');
    expect(clientCommercial).toContain('Delivery portfolio');
    expect(clientCommercial).toContain('Support pressure');
    expect(clientCommercial).toContain('Due in 30 days');
    expect(clientCommercial).toContain('lightworld-client-project-commercial-pulse');
    expect(clientCommercial).toContain('lightworld-client-open-support-pulse');
    expect(clientCommercial).toContain('lightworld-client-service-history');
    expect(clientCommercialApi).toContain('activeProjects');
    expect(clientCommercialApi).toContain('atRiskProjects');
    expect(clientCommercialApi).toContain('urgentTickets');
    expect(clientCommercialApi).toContain('overdueInvoices');
    expect(clientCommercialApi).toContain('renewalsDue30');
    expect(clientCommercialApi).toContain('expiredServices');
    expect(clientCommercialApi).toContain('nextRenewal');
    expect(clientCommercialApi).toContain('nextProjectRenewal');
    expect(clientCommercialApi).toContain('projectRenewalsDue30');
    expect(clientCommercialApi).toContain('overdueProjectRenewals');
    expect(clientCommercialApi).toContain('project_renewal_overdue');
    expect(clientCommercialApi).toContain('accountHealth');
    expect(clientCommercialApi).toContain('executiveBrief');
    expect(clientCommercialApi).toContain('executivePriorities');
    expect(clientCommercialApi).toContain('negativeMarginRows');
    expect(clientCommercialApi).toContain('budgetPressureRows');
    expect(clientCommercialApi).toContain('overBudgetRows');
    expect(clientCommercialApi).toContain('Decision support only');
    expect(clientCommercialApi).toContain('riskSignals');
    expect(clientCommercialApi).toContain('nextActions');
    expect(clientCommercialApi).toContain('recentActivity');
    expect(clientCommercialApi).toContain('communicationThreads');
    expect(clientCommercialApi).toContain('commitments');
    expect(clientCommercialApi).toContain('slaBreachedTickets');
    expect(clientCommercialApi).toContain('nextCollectionFollowUp');
    expect(clientCommercialApi).toContain('nextPaymentPromise');
    expect(clientCommercialApi).toContain('financeExpense.findMany');
    expect(clientCommercialApi).toContain('profitabilityRows');
    expect(clientCommercialApi).toContain('directCost');
    expect(clientCommercialApi).toContain('marginPercent');
    expect(clientCommercialApi).toContain('budgetUtilizationPercent');
    expect(clientCommercialApi).toContain('budgetRemaining');
    expect(clientCommercialApi).toContain('forecastCostAtCompletion');
    expect(clientCommercialApi).toContain('forecastCostToComplete');
    expect(clientCommercialApi).toContain('forecastBudgetVariance');
    expect(clientCommercialApi).toContain('forecastBudgetVariancePercent');
    expect(clientCommercialApi).toContain('forecastMargin');
    expect(clientCommercialApi).toContain('costProgressGapPercent');
    expect(clientCommercialApi).toContain('forecastMaturity');
    expect(clientCommercialApi).toContain('forecastOverBudgetRows');
    expect(clientCommercialApi).toContain('costAheadOfProgressRows');
    expect(clientCommercialApi).toContain('forecast_budget_overrun');
    expect(clientCommercialApi).toContain('cost_ahead_of_progress');
    expect(clientCommercialApi).toContain('EAC = actual direct cost');

    expect(clientCommercialApi).toContain('buildForecast');
    expect(clientCommercialApi).toContain('next30Days');
    expect(clientCommercialApi).toContain('next90Days');
    expect(clientCommercialApi).toContain('serviceRenewals');
    expect(clientCommercialApi).toContain('projectRenewals');
    expect(clientCommercialApi).toContain('contactMessage.findMany');
    expect(clientCommercialApi).toContain("mode: 'insensitive'");
    expect(clientCommercialApi).toContain('financeCollectionActivity.findMany');
    expect(clientCommercialApi).toContain('clientAnnouncement.findMany');
    expect(clientCommercialApi).toContain('clientTicketMessage.findMany');
    expect(clientCommercialApi).toContain('overdue_receivables');
    expect(clientCommercialApi).toContain('urgent_support');
    expect(clientCommercialApi).toContain('delivery_risk');
    expect(clientCommercial).toContain('lw-finance-section');
    expect(clientCommercial).toContain('/statement');
    expect(clientCommercial).toContain("fetch('/api/admin/finance/payments'");
    expect(adminStatement).toContain("'finance.manage'");
    expect(adminStatement).toContain('admin.client_account_statement_downloaded');
    expect(adminStatement).toContain('buildCustomerAccountStatement');
    expect(clientStatement).toContain('buildCustomerAccountStatement');
    expect(customerStatement).toContain('Credit Note');
    expect(customerStatement).toContain('Closing balances');
    expect(clientCommercialApi).toContain("'finance.manage'");
    expect(clientCommercialApi).toContain('invoiceBalance');
    expect(clientCommercialApi).toContain('paymentUnallocated');
    expect(projectCreateApi).toContain('nextRenewalDate');
    expect(projectCreateApi).toContain('renewalAmount');
    expect(projectUpdateApi).toContain('nextRenewalDate');
    expect(projectUpdateApi).toContain('renewalCurrency');