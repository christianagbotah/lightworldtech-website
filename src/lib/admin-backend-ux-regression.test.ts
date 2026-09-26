import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('admin backend and responsive UX regression coverage', () => {
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

    expect(schema).toContain('ticketNumber       String              @unique');
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

  test('provides a finance-authorized cross-customer executive portfolio cockpit', () => {
    const clients = source('src/components/admin/AdminClients.tsx');
    const portfolio = source('src/app/api/admin/clients/portfolio-intelligence/route.ts');

    expect(clients).toContain('Executive client portfolio');
    expect(clients).toContain('Accounts by management priority');
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
    expect(clients).toContain("pendingClientAction !== 'new-project'");
    expect(clients).toContain('client-new-project-name');
    expect(clientCommercialApi).toContain('nextCollectionInvoice');
    expect(clientCommercialApi).toContain('collectionTarget');
    expect(clientCommercial).toContain('Create project');
    expect(clientCommercial).toContain('SMS customer');
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-client-action', 'new-project')");
    expect(clientCommercial).toContain("sessionStorage.setItem('lw-sms-recipient'");
    expect(clients).toContain("sessionStorage.getItem('lw-client-action')");
    expect(clients).toContain("pendingClientAction !== 'new-project'");
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
    expect(financeMeta).toContain('nextRenewalDate: true');
    expect(financeMeta).toContain('renewalAmount: true');
    expect(financeMeta).toContain('renewalNoticeDays: true');
    expect(financeMeta).toContain('renewalAmount: project.renewalAmount.toFixed(2)');
    expect(projectRenewalReminder).toContain("'finance.manage'");
    expect(projectRenewalReminder).toContain("'communications.manage'");
    expect(projectRenewalReminder).toContain("'project_renewal'");
    expect(projectRenewalReminder).toContain("'project_expired'");
    expect(projectRenewalReminder).toContain('12 * 60 * 60 * 1000');
    expect(projectRenewalReminder).toContain("'admin.project_renewal_reminder_sent'");
    expect(projectRenewalTemplateMigration).toContain("'project_renewal'");
    expect(projectRenewalTemplateMigration).toContain("'project_expired'");
    expect(dashboard).toContain('netCashflow');
    expect(dashboard).toContain('netProfit');
    expect(dashboard).toContain('agedDebtors');
    expect(dashboard).toContain('agedCreditors');
    expect(dashboard).toContain('cashBalances');
    expect(dashboard).toContain('SUM(line."debit" - line."credit")');
    expect(dashboard).toContain('cashPosition');
    expect(dashboard).toContain('renewalExposure');
    expect(dashboard).toContain('latestPromises');
    expect(dashboard).toContain('DISTINCT ON (activity."invoiceId")');
    expect(dashboard).toContain('dueFollowUps');
    expect(dashboard).toContain('followUpDueInvoices');
    expect(dashboard).toContain('brokenPromises');
    expect(dashboard).toContain('promiseAmounts');
    expect(dashboard).toContain('trendPeriods');
    expect(dashboard).toContain('trends');
    expect(dashboard).toContain('earnedInvoiceRevenue');
    expect(dashboard).toContain('invoice.subtotal.minus(invoice.discount)');
    expect(dashboard).toContain('supplierExpenseBase');
    expect(dashboard).toContain('bill.taxRecoverable');
    expect(dashboard).toContain('note.subtotal.negated()');
    expect(dashboard).not.toContain('take: 20000');
    expect(dashboard).not.toContain('take: 10000');
    expect(invoices).toContain('const subtotal = lines.reduce');
    expect(invoices).toContain('Discount cannot exceed invoice subtotal');
    expect(schema).toContain('model InvoiceAccessLink');
    expect(schema).toContain('accessLinks          InvoiceAccessLink[]');
    expect(invoiceAccessMigration).toContain('CREATE TABLE "InvoiceAccessLink"');
    expect(invoiceAccessLink).toContain('randomBytes(32).toString');
    expect(invoiceAccessLink).toContain('hashInvoiceAccessToken');
    expect(invoiceAccessLink).toContain('https://lightworldtech.com');
    expect(invoiceAccessApi).toContain("'admin.finance_invoice_secure_link_rotated'");
    expect(invoiceAccessApi).toContain("status: 'revoked'");
    expect(invoiceSendApi).toContain("'communications.manage'");
    expect(invoiceSendApi).toContain('sendTransactionalMail');
    expect(invoiceSendApi).toContain("'admin.finance_invoice_emailed'");
    expect(publicInvoiceApi).toContain('hashInvoiceAccessToken');
    expect(publicInvoiceApi).toContain("'X-Robots-Tag'");
    expect(publicInvoiceApi).toContain('hubtelConfiguration');
    expect(publicInvoicePay).toContain('initiateHubtelCheckout');
    expect(publicInvoicePay).toContain("consumePublicRateLimit");
    expect(publicInvoicePage).toContain('Print / Save PDF');
    expect(publicInvoicePage).toContain('Pay securely');
    expect(financeDetails).toContain('Invoice document & delivery');
    expect(financeDetails).toContain('Create & copy secure link');
    expect(financeDetails).toContain('Email invoice');
    expect(receipts).toContain('invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes)');
    expect(receipts).toContain('postCustomerPaymentJournal');
    expect(bills).toContain('postVendorBillJournal');
    expect(expenses).toContain('postExpenseJournal');
    expect(vendorPayments).toContain('invoiceBalance(bill.total, bill.allocations)');
    expect(vendorPayments).toContain('postVendorPaymentJournal');
    expect(vendorPayments).toContain('getFinanceApprovalPolicy');
    expect(vendorPayments).toContain('pendingApproval: true');
    expect(vendorPayments).toContain('createOutflowApproval');
    expect(invoices).toContain('postInvoiceJournal');
    expect(invoices).toContain('renewalForDate');
    expect(invoices).toContain('pg_advisory_xact_lock');
    expect(invoices).toContain('A renewal invoice already exists for this service and renewal date');
    expect(renewals).toContain('Renewal billing queue');
    expect(renewals).toContain('projects: RenewalProject[]');
    expect(renewals).toContain('Project renewals needing action');
    expect(renewals).toContain('Project renewal value in view');
    expect(renewals).toContain('Project renewal queue');
    expect(renewals).toContain('lightworld-project-renewal-queue');
    expect(renewals).toContain("'notice_window'");
    expect(renewals).toContain("'overdue'");
    expect(renewals).toContain('/api/admin/client-projects/');
    expect(renewals).toContain('Send project renewal reminder?');
    expect(renewals).toContain('duplicate sends are blocked for 12 hours');
    expect(renewals).toContain('auto-renew never means auto-charge');
    expect(renewals).toContain('exportFileName="lightworld-renewal-billing-queue"');
    expect(renewals).toContain('Complete renewal');
    expect(renewals).toContain('paid_ready_to_complete');
    expect(renewals).toContain('This does not charge the customer again');
    expect(renewals).toContain('Next 7 days');
    expect(renewals).toContain('Next 14 days');
    expect(renewals).toContain('Next 30 days');
    expect(renewals).toContain('Next 60 days');
    expect(renewals).toContain('Completed renewals · last');
    expect(renewals).toContain('lightworld-completed-renewals');
    expect(finance).toContain('lw-finance-section');
    expect(finance).toContain('lw-client-organization-id');
    expect(clients).toContain("sessionStorage.getItem('lw-client-organization-id')");
    expect(collections).toContain('initialQuery');
    expect(renewalCycleMigration).toContain('ADD COLUMN "renewalForDate"');
    expect(renewalCompletionMigration).toContain('ADD COLUMN "renewalCompletedAt"');
    expect(renewalCompletionMigration).toContain('ClientServiceChange_sourceInvoiceId_key');
    expect(renewalCompletionApi).toContain('The renewal invoice must be fully paid');
    expect(renewalCompletionApi).toContain('pg_advisory_xact_lock');
    expect(renewalCompletionApi).toContain('sourceInvoiceId: invoice.id');
    expect(renewalCompletionApi).toContain("invoice.service.status === 'expired' ? 'active'");
    expect(renewalCompletionApi).toContain('financeCollectionActivity.updateMany');
    expect(serviceRenewalLib).toContain('calculateRenewedServiceDates');
    expect(serviceRenewalLib).toContain('Custom and one-time billing cycles require manual renewal dates');
    expect(serviceRenewalTest).toContain('clamps month-end dates instead of overflowing');
    expect(invoices).toContain('computeTaxComponents');
    expect(invoices).toContain('Standard Ghana VAT is disabled');
    expect(bills).toContain('computeTaxComponents');
    expect(bills).toContain('taxRecoverable');
    expect(renewalReminder).toContain("'finance.manage'");
    expect(renewalReminder).toContain("'communications.manage'");
    expect(renewalReminder).toContain("'service_renewal'");
    expect(renewalReminder).toContain("'service_expired'");
    expect(renewalReminder).toContain('12 * 60 * 60 * 1000');
    expect(renewalReminder).toContain('queueSingleSms');
    expect(renewalReminder).toContain("'admin.finance_service_renewal_reminder_sent'");
    expect(recordDetails).toContain("type === 'invoice'");
    expect(recordDetails).toContain("type === 'receipt'");
    expect(recordDetails).toContain("type === 'bill'");
    expect(recordDetails).toContain("type === 'expense'");
    expect(recordDetails).toContain('invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes)');
    expect(recordDetails).toContain('invoiceBalance(bill.total, bill.allocations)');
    expect(recordDetails).toContain("auditTrail('ClientInvoice'");
    expect(recordDetails).toContain("auditTrail('ClientPayment'");
    expect(recordDetails).toContain("auditTrail('FinanceVendorBill'");
    expect(recordDetails).toContain("auditTrail('FinanceExpense'");
    expect(financeDetails).toContain('Payment allocations');
    expect(financeDetails).toContain('Invoice allocations');
    expect(financeDetails).toContain('Related account activity');
    expect(financeDetails).toContain('Audit trail');
    expect(financeDetails).toContain('Record receipt');
    expect(financeDetails).toContain('Pay supplier');
    expect(financeDetails).toContain('max-w-6xl');
    expect(accounting).toContain('Chart of accounts');
    expect(accounting).toContain('Posted journals');
    expect(accounting).toContain('Trial balance');
    expect(accounting).toContain('General ledger');
    expect(accounting).toContain('lg:grid-cols-[minmax(280px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)_120px_minmax(140px,auto)]');
    expect(accounting).toContain('lg:grid-cols-[160px_120px_minmax(130px,auto)]');
    expect(accounting).toContain('lg:items-end');
    expect(accounting).toContain('Accounting periods');
    expect(accounting).toContain('Post balanced journal');
    expect(accounting).toContain('Control difference');
    expect(accounting).toContain('Opening balance');
    expect(accounting).toContain('Closing balance');
    expect(accounting).toContain('Reverse posted journal?');
    expect(accounting).toContain('Post reversal');
    expect(accounting).toContain('Financial statements');
    expect(accounting).toContain('FinanceFinancialStatements');
    expect(cashbookWorkspace).toContain('lg:grid-cols-[150px_150px_110px_minmax(150px,170px)_minmax(140px,auto)]');
    expect(statementsWorkspace).toContain('lg:grid-cols-[160px_160px_120px_minmax(150px,auto)]');
    expect(taxWorkspace).toContain('lg:grid-cols-[160px_160px_110px_minmax(130px,auto)]');
    expect(accounting).toContain('Cashbook & treasury');
    expect(accounting).toContain('FinanceCashbookWorkspace');
    expect(accounting).toContain('FinanceLedgerInitialization');
    expect(accounting).toContain('FinanceReconciliationWorkspace');
    expect(accounting).toContain('FinanceCloseWorkspace');
    expect(accounting).toContain('Reconciliation');
    expect(accounting).toContain('Month-end close');
    expect(accounting).toContain('Tax control');
    expect(accounting).toContain('FinanceTaxWorkspace');
    expect(accounting).toContain('Approvals');
    expect(accounting).toContain('FinanceOutflowApprovals');
    expect(accounting).toContain('initialView');
    expect(accounting).toContain('FinanceAccountingView');
    expect(accountsApi).toContain("'finance.manage'");
    expect(periodsApi).toContain('Accounting periods cannot overlap');
    expect(periodActionApi).toContain('Only a super admin can reopen a closed accounting period');
    expect(periodActionApi).toContain('Period cannot be closed because an unbalanced journal was detected');
    expect(journalsApi).toContain('isBalancedJournal');
    expect(journalsApi).toContain('No accounting period covers this posting date');
    expect(journalsApi).toContain('The accounting period for this posting date is closed');
    expect(journalReversalApi).toContain("sourceType: 'reversal'");
    expect(journalReversalApi).toContain("data: { status: 'reversed' }");
    expect(journalReversalApi).toContain('Reversal date cannot be earlier than the original journal date');
    expect(journalReversalApi).toContain('The accounting period for the reversal date is closed');
    expect(trialBalanceApi).toContain('closing');
    expect(trialBalanceApi).toContain('balanced: difference.eq(0)');
    expect(generalLedgerApi).toContain('runningBalance');
    expect(generalLedgerApi).toContain('accountNormalSide');
    expect(generalLedgerApi).toContain('openingBalance');
    expect(generalLedgerApi).toContain("status: { in: ['posted', 'reversed'] }");
    expect(trialBalanceApi).toContain("status: { in: ['posted', 'reversed'] }");
    expect(financialStatementsApi).toContain('profitLoss');
    expect(financialStatementsApi).toContain('balanceSheet');
    expect(financialStatementsApi).toContain('cashFlow');
    expect(financialStatementsApi).toContain('currentEarnings');
    expect(financialStatementsApi).toContain('classifyCashFlow');
    expect(cashbookApi).toContain("systemKey: { in: systemKeys }");
    expect(cashbookApi).toContain("status: { in: ['posted', 'reversed'] }");
    expect(cashbookApi).toContain('internalTransfer: cashLegs > 1');
    expect(cashbookApi).toContain('runningBalance');
    expect(cashbookWorkspace).toContain('Cashbook & treasury');
    expect(cashbookWorkspace).toContain('Internal transfer');
    expect(cashbookWorkspace).toContain('exportFileName="lightworld-cashbook"');
    expect(financialStatements).toContain('Profit & Loss');
    expect(financialStatements).toContain('Balance Sheet');
    expect(financialStatements).toContain('Cash Flow Statement');
    expect(financialStatements).toContain('Currencies are kept separate');
    expect(ledgerInitialization).toContain('Historical ledger initialization required');
    expect(ledgerInitialization).toContain('Initialize journals');
    expect(ledgerInitialization).toContain('preview.canBackfill');
    expect(ledgerBackfillApi).toContain('getSuperAdminContext(request)');
    expect(ledgerBackfillApi).toContain('Only a super admin can initialize historical ledger journals');
    expect(ledgerBackfillApi).toContain('remaining: after.candidates.length');
    expect(financeLedger).toContain("sourceType: 'client_invoice'");
    expect(financeLedger).toContain("sourceType: 'client_payment'");
    expect(financeLedger).toContain("sourceType: 'vendor_bill'");
    expect(financeLedger).toContain("sourceType: 'vendor_payment'");
    expect(financeLedger).toContain("sourceType: 'finance_expense'");
    expect(financeLedger).toContain("sourceType: 'finance_expense_payment'");
    expect(financeLedger).toContain("sourceType: 'credit_note'");
    expect(financeLedger).toContain("sourceType: 'customer_refund'");
    expect(financeLedger).toContain("'customer_deposits'");
    expect(financeLedger).toContain("'vat_payable'");
    expect(financeLedger).toContain("'nhil_payable'");
    expect(financeLedger).toContain("'getfund_payable'");
    expect(financeLedger).toContain("'vat_input'");
    expect(financeLedger).toContain("'nhil_input'");
    expect(financeLedger).toContain("'getfund_input'");
    expect(financeLedger).toContain('taxRecoverable');
    expect(financeLedger).toContain('financeMonthClose.findFirst');
    expect(financeLedger).toContain('Automatic journal is not balanced');
    expect(sourceIntegrityMigration).toContain('FinanceJournalEntry_source_event_unique');
    expect(sourceIntegrityMigration).toContain("WHERE \"sourceId\" <> ''");
    expect(sourceIntegrityMigration).toContain("'FY 2026'");
    expect(financeControlsMigration).toContain('finance_credit_note_number_seq');
    expect(financeControlsMigration).toContain('FinanceCreditNote_total_consistent');
    expect(financeControlsMigration).toContain('FinanceReconciliationLine_matchedJournalLineId_key');
    expect(financeControlsMigration).toContain('FinanceCustomerRefund_positive_amount');
    expect(monthCloseMigration).toContain('FinanceMonthClose_valid_status');
    expect(taxMigration).toContain('FinanceTaxProfile');
    expect(taxMigration).toContain("'VAT Payable'");
    expect(taxMigration).toContain("'NHIL Payable'");
    expect(taxMigration).toContain("'GETFund Levy Payable'");
    expect(taxMigration).toContain("'VAT Input Tax'");
    expect(taxMigration).toContain("'NHIL Input Tax'");
    expect(taxMigration).toContain("'GETFund Input Levy'");
    expect(financeVendorBillTaxRepair).toContain('ADD COLUMN IF NOT EXISTS "taxRecoverable"');
    expect(projectCommercialMigration).toContain('"expiryDate"');
    expect(projectCommercialMigration).toContain('"nextRenewalDate"');
    expect(projectCommercialMigration).toContain('"renewalAmount"');
    expect(projectCommercialMigration).toContain('ClientProject_valid_renewal_cycle');
    expect(approvalMigration).toContain('FinanceApprovalPolicy');
    expect(approvalMigration).toContain('FinanceOutflowApproval');
    expect(approvalMigration).toContain("DEFAULT false");
    expect(approvalMigration).toContain('finance_outflow_approval_number_seq');
    expect(approvalMigration).toContain('FinanceOutflowApproval_valid_status');
    expect(approvalPolicyApi).toContain('eligibleApprovers < 2');
    expect(approvalPolicyApi).toContain('Only a super admin can change finance approval policy');
    expect(approvalsApi).toContain('currentAdminId');
    expect(approvalDecisionApi).toContain('Maker-checker prevents you from deciding your own outflow request');
    expect(approvalDecisionApi).toContain('executeOutflowApproval');
    expect(approvalLib).toContain("'finance.manage'");
    expect(approvalLib).toContain("'finance.approve'");
    expect(approvalLib).toContain('approval.requestedByAdminId === actor.id');
    expect(approvalLib).toContain('invoiceBalance(bill.total, bill.allocations)');
    expect(approvalLib).toContain('refundableBalance');
    expect(approvalWorkspace).toContain('Maker-checker cash-out approval');
    expect(approvalWorkspace).toContain('Pending approvals');
    expect(approvalWorkspace).toContain('Approval history');
    expect(approvalWorkspace).toContain('Enable maker-checker');
    expect(finance).toContain('Supplier payment submitted for approval');
    expect(customerCredits).toContain('Customer refund submitted for approval');
    expect(taxProfileApi).toContain('getSuperAdminContext(request)');
    expect(taxProfileApi).toContain('Only a super admin can change the statutory tax profile');
    expect(taxReportApi).toContain('standardSales');
    expect(taxReportApi).toContain('recoverablePurchases');
    expect(taxReportApi).toContain('nonRecoverablePurchases');
    expect(taxReportApi).toContain('legacyOutputTax');
    expect(taxWorkspace).toContain('Ghana VAT, NHIL & GETFund control');
    expect(taxWorkspace).toContain('Tax control report');
    expect(taxWorkspace).toContain('VAT registration number');
    expect(periodsApi).toContain('endDate.setUTCHours(23, 59, 59, 999)');
    expect(accountingMigration).toContain('FinanceJournalLine_one_sided');
    expect(accountingMigration).toContain('finance_journal_number_seq');
    expect(accountingMigration).toContain("'accounts_receivable'");
    expect(accountingMigration).toContain("'accounts_payable'");
    expect(accountingMigration).toContain("'service_revenue'");
    expect(portalApi).toContain('accountSummary');
    expect(portalApi).toContain('organization.invoices.map');
    expect(portalApi).toContain('payableInvoiceByService');
    expect(portalApi).toContain('payableInvoice: payableInvoiceByService.get(service.id) || null');
    expect(creditNotesApi).toContain('postCreditNoteJournal');
    expect(creditNotesApi).toContain('remainingRevenue');
    expect(creditNotesApi).toContain('remainingTax');
    expect(creditNotesApi).toContain('remainingCreditable');
    expect(refundsApi).toContain('refundableBalance');
    expect(refundsApi).toContain('postCustomerRefundJournal');
    expect(refundsApi).toContain('getFinanceApprovalPolicy');
    expect(refundsApi).toContain('pendingApproval: true');
    expect(refundsApi).toContain('pendingRefundApprovals');
    expect(customerCredits).toContain('Customer credits & refunds');
    expect(customerCredits).toContain('Issue credit note');
    expect(customerCredits).toContain('Refund customer credit');
    expect(customerCredits).toContain('VAT reversal');
    expect(customerCredits).toContain('Legacy tax reversal');
    expect(creditNotesApi).toContain('invoice.taxTreatment');
    expect(creditNotesApi).toContain('vatAmount');
    expect(creditNotesApi).toContain('nhilAmount');
    expect(creditNotesApi).toContain('getfundAmount');
    expect(reconciliationApi).toContain('Statement lines do not reconcile to the supplied closing balance');
    expect(reconciliationApi).toContain('A reconciliation batch already covers part of this account and statement period');
    expect(reconciliationDetailApi).toContain('suggestions');
    expect(reconciliationMatchApi).toContain('This ledger line is already matched to another statement line');
    expect(reconciliationMatchApi).toContain('Ledger posting date falls outside this statement period');
    expect(reconciliationFinalizeApi).toContain('Ledger opening balance does not agree with the statement opening balance');
    expect(reconciliationFinalizeApi).toContain('Every bank/mobile-money ledger movement in the statement period must be matched');
    expect(reconciliationFinalizeApi).toContain('Ledger closing balance does not agree with the statement closing balance');
    expect(reconciliationWorkspace).toContain('Bank & mobile-money reconciliation');
    expect(reconciliationWorkspace).toContain('Finalize reconciliation');
    expect(financeClose).toContain('cash_reconciliation_coverage');
    expect(financeClose).toContain('source_journals');
    expect(closeReadinessApi).toContain('canClose');
    expect(monthCloseApi).toContain('A month cannot be closed before its calendar end has passed');
    expect(monthCloseApi).toContain('Only a super admin can reopen a closed month');
    expect(closeWorkspace).toContain('Month-end close control centre');
    expect(closeWorkspace).toContain('Close month');
    expect(customerStatement).toContain('Client Account Statement');
    expect(customerStatement).toContain('Running balance');
    expect(customerStatement).toContain("'Credit Note'");
    expect(customerStatement).toContain("'Refund'");
    expect(statement).toContain('Content-Disposition');
    expect(statement).toContain('getActiveClientContext(request)');
    expect(portal).toContain('Account & billing');
    expect(portal).toContain('Download statement');
    expect(portal).toContain('/api/client/account/statement');
    expect(portal).toContain('Invoice history');
    expect(portal).toContain('Payment / receipt history');
  });

  test('adds responsive operational filters to Messages and Newsletter', () => {
    const messages = source('src/components/admin/AdminMessages.tsx');
    const newsletter = source('src/components/admin/AdminNewsletter.tsx');

    expect(messages).toContain('Search sender, email, phone, subject or message');
    expect(messages).toContain('Filter messages by read status');
    expect(messages).toContain('visibleMessages');
    expect(messages).toContain('Select all visible messages');
    expect(messages).toContain('lg:grid-cols-[minmax(260px,2fr)_170px_auto]');

    expect(newsletter).toContain('Search subscriber email');
    expect(newsletter).toContain('Filter subscribers by status');
    expect(newsletter).toContain('Search recipient, subject or error');
    expect(newsletter).toContain('Filter delivery activity by status');
    expect(newsletter).toContain('visibleSubscribers');
    expect(newsletter).toContain('visibleDeliveries');
    expect(newsletter).toContain('lg:min-w-[480px]');
  });

  test('uses desktop workspace splits for SMS and campaigns from lg', () => {
    const sms = source('src/components/admin/AdminSms.tsx');
    const campaigns = source('src/components/admin/AdminCampaigns.tsx');

    expect(sms).toContain('lg:grid-cols-4');
    expect(sms).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]');
    expect(sms).toContain('lg:grid-cols-[minmax(0,1fr)_320px]');
    expect(campaigns).toContain('lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]');
    expect(campaigns).toContain('xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]');
  });

  test('keeps Support Desk filters responsive and aligned on desktop', () => {
    const support = source('src/components/admin/AdminSupportDesk.tsx');

    expect(support).toContain('sm:grid-cols-2 lg:grid-cols-[minmax(220px,2fr)_repeat(4,minmax(105px,1fr))_minmax(135px,1.2fr)_auto]');
    expect(support).toContain('lg:items-center');
    expect(support).toContain('lg:flex-row lg:items-center lg:justify-between');
    expect(support).toContain('lg:min-w-[680px] xl:min-w-[760px]');
  });

  test('provides CSV export from the shared table primitive', () => {
    const table = source('src/components/ui/table.tsx');

    expect(table).toContain('Export CSV');
    expect(table).toContain('downloadTableCsv');
    expect(table).toContain('data-export-ignore');
    expect(table).toContain('overscroll-x-contain');
  });

  test('implements Hubtel invoice payments and templated SMS operations safely', () => {
    const schema = source('prisma/schema.prisma');
    const hubtel = source('src/lib/hubtel.ts');
    const payment = source('src/lib/hubtel-payment.ts');
    const callback = source('src/app/api/payments/hubtel/callback/route.ts');
    const sms = source('src/lib/sms.ts');
    const smsAdmin = source('src/components/admin/AdminSms.tsx');
    const smsOverview = source('src/app/api/admin/sms/overview/route.ts');
    const portal = source('src/components/client/ClientPortalPage.tsx');
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(schema).toContain('model HubtelPaymentIntent');
    expect(schema).toContain('model SmsTemplate');
    expect(schema).toContain('model SmsCampaign');
    expect(schema).toContain('model SmsMessage');
    expect(hubtel).toContain('https://smsc.hubtel.com/v1/messages/send');
    expect(hubtel).toContain('HUBTEL_CHECKOUT_INITIATE_URL');
    expect(hubtel).toContain('HUBTEL_TRANSACTION_STATUS_URL');
    expect(payment).toContain('checkHubtelPaymentStatus');
    expect(payment).toContain("source: 'hubtel'");
    expect(payment).toContain("status: 'recording'");
    expect(callback).toContain('finalizeHubtelPayment');
    expect(sms).toContain('dispatchDueSms');
    expect(sms).toContain('queueDueServiceRenewalReminders');
    expect(sms).toContain('queueDueProjectRenewalReminders');
    expect(sms).toContain('AUTO_PROJECT_RENEWAL_SMS');
    expect(sms).toContain('PROJECT_RENEWAL_SMS_BATCH_SIZE');
    expect(sms).toContain('project.renewalNoticeDays');
    expect(sms).toContain("createdBy: 'System project renewal scheduler'");
    expect(sms).toContain('AUTO_SERVICE_RENEWAL_SMS');
    expect(sms).toContain('SERVICE_RENEWAL_SMS_BATCH_SIZE');
    expect(sms).toContain('service.renewalNoticeDays');
    expect(sms).toContain("createdBy: 'System renewal scheduler'");
    expect(sms).toContain('HUBTEL_SMS_BATCH_SIZE');
    expect(sms).toContain('AUTO_COLLECTION_REMINDER_SMS');
    expect(sms).toContain('COLLECTION_REMINDER_SMS_BATCH_SIZE');
    expect(sms).toContain('COLLECTION_REMINDER_SMS_INTERVAL_DAYS');
    expect(sms).toContain('COLLECTION_REMINDER_SMS_MIN_DAYS_OVERDUE');
    expect(sms).toContain("createdBy: 'System collections scheduler'");
    expect(sms).toContain("type: 'sms_reminder_scheduled'");
    expect(sms).toContain('promisesDeferred');
    expect(sms).toContain('AUTO_COLLECTION_REMINDER_EMAIL');
    expect(sms).toContain('COLLECTION_REMINDER_EMAIL_BATCH_SIZE');
    expect(sms).toContain('COLLECTION_REMINDER_EMAIL_INTERVAL_DAYS');
    expect(sms).toContain("createdBy: 'System collections email scheduler'");
    expect(sms).toContain('sendDueCollectionEmailReminders');
    expect(sms).toContain('collectionEmailQueue');
    expect(sms).toContain('createDueRenewalInvoiceDrafts');
    expect(smsOverview).toContain('AUTO_RENEWAL_DRAFT_INVOICES');
    expect(smsOverview).toContain('RENEWAL_DRAFT_INVOICE_BATCH_SIZE');
    expect(smsAdmin).toContain('SMS, campaigns, scheduling & OTP');
    expect(smsAdmin).toContain('Reusable SMS templates');
    expect(smsAdmin).toContain('Scheduled campaigns');
    expect(smsAdmin).toContain('Communication automation readiness');
    expect(smsAdmin).toContain('Dispatcher ready');
    expect(smsAdmin).toContain('Overdue collections');
    expect(smsOverview).toContain('dispatcherConfigured');
    expect(smsOverview).toContain('AUTO_COLLECTION_REMINDER_SMS');
    expect(smsOverview).toContain('AUTO_COLLECTION_REMINDER_EMAIL');
    expect(smsOverview).toContain('COLLECTION_REMINDER_EMAIL_INTERVAL_DAYS');
    expect(smsAdmin).toContain('Collection email');
    expect(smsOverview).toContain('COLLECTION_REMINDER_SMS_INTERVAL_DAYS');
    expect(smsAdmin).toContain("sessionStorage.getItem('lw-sms-recipient')");
    expect(smsAdmin).toContain('lw-single-sms-recipient');
    expect(smsAdmin).toContain('lw-single-sms-content');
    expect(portal).toContain('Pay with Hubtel');
    expect(portal).toContain('Pay service with Hubtel');
    expect(portal).toContain('No outstanding invoice for this service.');
    expect(portal).toContain('/api/client/payments/hubtel/status?reference=');
    expect(layout).toContain("label: 'SMS & OTP'");
  });

  test('persists communications automation runtime health without unbounded run logs', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260926122500_automation_runtime_state/migration.sql');
    const dispatcher = source('src/app/api/internal/sms/dispatch/route.ts');
    const overview = source('src/app/api/admin/sms/overview/route.ts');
    const smsAdmin = source('src/components/admin/AdminSms.tsx');

    expect(schema).toContain('model AutomationRuntimeState');
    expect(schema).toContain('consecutiveFailures');
    expect(migration).toContain('CREATE TABLE "AutomationRuntimeState"');
    expect(dispatcher).toContain("runtimeId = 'communications-dispatcher'");
    expect(dispatcher).toContain("status: 'running'");
    expect(dispatcher).toContain("status: 'healthy'");
    expect(dispatcher).toContain("status: 'failed'");
    expect(dispatcher).toContain('consecutiveFailures: { increment: 1 }');
    expect(dispatcher).toContain('resultJson');
    expect(overview).toContain("id: 'communications-dispatcher'");
    expect(overview).toContain('lastSuccessAt');
    expect(smsAdmin).toContain('Last successful run');
    expect(smsAdmin).toContain('Consecutive failures');
    expect(smsAdmin).toContain('Dispatcher healthy');
  });

  test('supports filtered super-admin governance audit exports', () => {
    const governance = source('src/components/admin/AdminGovernance.tsx');
    const auditExport = source('src/app/api/admin/governance/audit-export/route.ts');

    expect(governance).toContain('Export audit CSV');
    expect(governance).toContain('/api/admin/governance/audit-export?');
    expect(governance).toContain('exportFileName="lightworld-governance-visible-audit"');
    expect(auditExport).toContain('getSuperAdminContext');
    expect(auditExport).toContain('take: 5000');
    expect(auditExport).toContain("'admin.governance_audit_exported'");
    expect(auditExport).toContain("'Content-Type': 'text/csv; charset=utf-8'");
    expect(auditExport).toContain("'Cache-Control': 'private, no-store, max-age=0'");
  });

  test('supports audited enterprise exports and bounded message bulk actions', () => {
    const crm = source('src/components/admin/AdminCRM.tsx');
    const messages = source('src/components/admin/AdminMessages.tsx');
    const crmExport = source('src/app/api/admin/leads/export/route.ts');
    const messageExport = source('src/app/api/admin/messages/export/route.ts');
    const messageBulk = source('src/app/api/admin/messages/bulk/route.ts');
    const permissions = source('src/lib/admin-permissions.ts');

    expect(crm).toContain("fetch('/api/admin/leads/export?'");
    expect(messages).toContain("fetch('/api/admin/messages/export'");
    expect(messages).toContain("fetch('/api/admin/messages/bulk'");
    expect(messages).toContain('Select all visible messages');
    expect(crmExport).toContain("'admin.crm_exported'");
    expect(messageExport).toContain("'admin.messages_exported'");
    expect(messageBulk).toContain('.max(100)');
    expect(messageBulk).toContain("'admin.messages_bulk_updated'");
    expect(permissions).toContain("pathname.startsWith('/api/admin/messages')");
  });

  test('shows read-only super-admin backup readiness without claiming restore success', () => {
    const route = source('src/app/api/admin/operations/backup-status/route.ts');
    const dashboard = source('src/components/admin/AdminDashboard.tsx');

    expect(route).toContain('getSuperAdminContext(request)');
    expect(route).toContain("LIGHTWORLD_BACKUP_DIR");
    expect(route).toContain("restoreVerification");
    expect(route).toContain("status: 'not_verified'");
    expect(dashboard).toContain('Recovery readiness');
    expect(dashboard).toContain("adminRole === 'super_admin'");
    expect(dashboard).toContain('successful restore rehearsal has not been verified');
  });

  test('implements administrator TOTP MFA end to end', () => {
    const schema = source('prisma/schema.prisma');
    const auth = source('src/app/api/admin/auth/route.ts');
    const security = source('src/app/api/admin/security/totp/route.ts');
    const login = source('src/components/admin/AdminLogin.tsx');
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(schema).toContain('totpEnabled');
    expect(schema).toContain('totpRecoveryCodes');
    expect(auth).toContain('requiresTotp: true');
    expect(auth).toContain('verifyTotpCode');
    expect(auth).toContain('verifyRecoveryCode');
    expect(security).toContain("action: z.literal('confirm')");
    expect(security).toContain("action: z.literal('disable')");
    expect(security).toContain('authVersion: { increment: 1 }');
    expect(login).toContain('Two-factor authentication');
    expect(login).toContain('Verify & Sign In');
    expect(layout).toContain('AdminSecurityDialog');
  });

  test('invalidates administrator sessions on sensitive governance changes', () => {
    const route = source('src/app/api/admin/governance/[id]/route.ts');
    const governance = source('src/components/admin/AdminGovernance.tsx');

    expect(route).toContain('revokeSessions: z.boolean().optional()');
    expect(route).toContain("parsed.data.revokeSessions === true");
    expect(route).toContain("'admin.sessions_revoked'");
    expect(route).toContain('parsed.data.active !== undefined');
    expect(governance).toContain('Revoke sessions');
    expect(governance).toContain('Force this administrator to sign in again');
  });

  test('surfaces executive client exceptions on the main dashboard', () => {
    const dashboard = source('src/components/admin/AdminDashboard.tsx');

    expect(dashboard).toContain("hasAdminPermission(adminRole, adminPermissions, 'finance.manage')");
    expect(dashboard).toContain("fetch('/api/admin/clients/portfolio-intelligence'");
    expect(dashboard).toContain('Executive exceptions');
    expect(dashboard).toContain('Accounts needing intervention');
    expect(dashboard).toContain('Overdue invoices');
    expect(dashboard).toContain('Renewals due in 30 days');
    expect(dashboard).toContain('Operational risk');
    expect(dashboard).toContain("sessionStorage.setItem('lw-finance-section', section)");
    expect(dashboard).toContain("sessionStorage.setItem('lw-client-organization-id', organizationId)");
  });

  test('enforces automated collection reminder intervals per invoice', () => {
    const sms = source('src/lib/sms.ts');

    expect(sms).toContain('recentInvoiceReminder');
    expect(sms).toContain("invoiceId: invoice.id");
    expect(sms).toContain("type: 'sms_reminder_scheduled'");
    expect(sms).toContain('createdAt: { gte: duplicateCutoff }');
    expect(sms).toContain('duplicateMessage || recentInvoiceReminder');
  });

  test('shows project expiry and renewal terms in the client portal', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('Project commercial schedule');
    expect(portal).toContain('project.expiryDate');
    expect(portal).toContain('project.nextRenewalDate');
    expect(portal).toContain('project.renewalCycle');
    expect(portal).toContain('project.renewalAmount');
    expect(portal).toContain('project.renewalCurrency');
    expect(portal).toContain('Auto-renew records the intended renewal workflow');
  });

  test('notifies the configured team mailbox after persisting a public contact lead', () => {
    const contact = source('src/app/api/contact/route.ts');

    expect(contact).toContain('CONTACT_NOTIFICATION_EMAIL');
    expect(contact).toContain('sendTransactionalMail');
    expect(contact).toContain('Contact lead notification failed');
    expect(contact).toContain('notificationSent: notification.sent');
    expect(contact).toContain('await tx.contactMessage.create');
    expect(contact).toContain('await tx.lead.create');
  });

  test('adds permission-scoped business activity to the main dashboard', () => {
    const activity = source('src/app/api/admin/activity/route.ts');
    const dashboard = source('src/components/admin/AdminDashboard.tsx');

    expect(activity).toContain("hasAdminPermission(admin.role, admin.permissions, 'finance.manage')");
    expect(activity).toContain("hasAdminPermission(admin.role, admin.permissions, 'clients.manage')");
    expect(activity).toContain('db.clientPayment.findMany');
    expect(activity).toContain('db.clientInvoice.findMany');
    expect(activity).toContain('db.financeCollectionActivity.findMany');
    expect(activity).toContain('db.clientSupportTicket.findMany');
    expect(dashboard).toContain("fetch('/api/admin/activity'");
    expect(dashboard).toContain("sessionStorage.setItem('lw-support-ticket-id', activity.targetId)");
    expect(dashboard).toContain("activity.type === 'collection' ? 'collections' : 'customers'");
  });

  test('includes Hubtel automation readiness in authenticated operational health', () => {
    const health = source('src/app/api/admin/health/route.ts');
    const dashboard = source('src/components/admin/AdminDashboard.tsx');

    expect(health).toContain('hubtelConfiguration');
    expect(health).toContain('AUTO_SERVICE_RENEWAL_SMS');
    expect(health).toContain('AUTO_PROJECT_RENEWAL_SMS');
    expect(health).toContain('AUTO_COLLECTION_REMINDER_SMS');
    expect(health).toContain('AUTO_RENEWAL_DRAFT_INVOICES');
    expect(health).toContain('smsAutomationEnabled');
    expect(health).toContain('dispatcherConfigured');
    expect(health).toContain('automationHealthy');
    expect(dashboard).toContain('communications: {');
    expect(dashboard).toContain("SMS {health?.communications?.smsConfigured");
  });

  test('counts only genuinely unpaid overdue supplier bills', () => {
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(notifications).toContain('overdueBillCount');
    expect(notifications).toContain('invoiceBalance(bill.total, bill.allocations).gt(0)');
    expect(notifications).toContain('past the due date with an outstanding balance');
  });

  test('suppresses stale collection alerts after invoice settlement', () => {
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(notifications).toContain('liveCollectionInvoices');
    expect(notifications).toContain('invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes).gt(0)');
    expect(notifications).toContain('invoice.collectionActivities.some');
    expect(notifications).toContain("activity.type === 'promise_to_pay'");
    expect(notifications).toContain('latestPromise?.promisedDate');
  });

  test('keeps executive priorities and operational alerts live', () => {
    const dashboard = source('src/components/admin/AdminDashboard.tsx');
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(dashboard).toContain('Management priority accounts');
    expect(dashboard).toContain('Open Customer 360');
    expect(dashboard).toContain("item.metrics.overdueInvoices");
    expect(dashboard).toContain("item.metrics.slaBreaches");
    expect(dashboard).toContain("item.metrics.overBudget");
    expect(layout).toContain('window.setInterval(refresh, 60_000)');
    expect(layout).toContain("document.addEventListener('visibilitychange', refresh)");
    expect(layout).toContain("document.visibilityState === 'visible'");
  });

  test('keeps public product cards aligned and the preloader rings continuously animated', () => {
    const products = source('src/components/pages/ProductsPage.tsx');
    const preloader = source('src/components/ui/preloader.tsx');
    const dashboard = source('src/components/admin/AdminDashboard.tsx');
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(products).toContain('grid-rows-[58px_minmax(96px,1fr)_auto]');
    expect(products).toContain("alt={product.title + ' product direction'}");
    expect(preloader).toContain('Continuous rotating border accents');
    expect(preloader).toContain("duration: 1.8, repeat: Infinity, ease: 'linear'");
    expect(preloader).toContain("duration: 2.7, repeat: Infinity, ease: 'linear'");
    expect(dashboard).toContain("WELCOME BACK, {(adminName || 'Admin').toUpperCase()}");
    expect(notifications).toContain('invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes).gt(0)');
    expect(notifications).toContain('past the due date with an outstanding balance');
  });

  test('surfaces automated renewal drafts for mandatory human finance review', () => {
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(notifications).toContain("createdBy: 'System renewal draft scheduler'");
    expect(notifications).toContain('Renewal invoice drafts awaiting review');
    expect(notifications).toContain("action: 'admin-finance-renewals'");
  });

  test('routes finance notifications directly to operational exception queues', () => {
    const notifications = source('src/app/api/admin/notifications/route.ts');
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(notifications).toContain('Project renewals due');
    expect(notifications).toContain('Client services expired');
    expect(notifications).toContain('Collection follow-ups due');
    expect(notifications).toContain('Payment promises overdue');
    expect(notifications).toContain("action: 'admin-finance-collections'");
    expect(notifications).toContain("action: 'admin-finance-renewals'");
    expect(notifications).toContain("action: 'admin-finance-suppliers'");
    expect(layout).toContain("sessionStorage.setItem('lw-finance-section', 'collections')");
    expect(layout).toContain("sessionStorage.setItem('lw-finance-section', 'renewals')");
    expect(layout).toContain("sessionStorage.setItem('lw-finance-section', 'suppliers')");
  });

  test('supports dashboard drill-downs and a real authenticated health signal', () => {
    const dashboard = source('src/components/admin/AdminDashboard.tsx');
    const messages = source('src/components/admin/AdminMessages.tsx');
    const health = source('src/app/api/admin/health/route.ts');

    expect(dashboard).toContain("sessionStorage.setItem('lw-open-message-id'");
    expect(dashboard).toContain("sessionStorage.setItem('lw-crm-status-filter'");
    expect(dashboard).toContain("fetch('/api/admin/health'");
    expect(dashboard).toContain('Analytics drill-down');
    expect(messages).toContain("sessionStorage.getItem('lw-open-message-id')");
    expect(messages).toContain('max-w-5xl');
    expect(health).toContain('getActiveAdminContext(request)');
    expect(health).toContain('await db.$queryRaw');
  });

  test('keeps blog admin contracts aligned with wrapped API responses', () => {
    const blog = source('src/components/admin/AdminBlog.tsx');
    const editor = source('src/components/admin/AdminBlogEditor.tsx');

    expect(blog).toContain('payload.data || []');
    expect(blog).toContain("params.set('published', 'true')");
    expect(blog).toContain("params.set('featured', 'true')");
    expect(editor).toContain('const post = payload.data || payload');
  });

  test('validates and atomically persists CMS settings', () => {
    const settings = source('src/app/api/settings/route.ts');

    expect(settings).toContain('settingsPayloadSchema');
    expect(settings).toContain('.record(');
    expect(settings).toContain('await db.$transaction(updates)');
  });

  test('does not expose inactive CMS detail records to anonymous callers', () => {
    for (const path of [
      'src/app/api/team/[id]/route.ts',
      'src/app/api/testimonials/[id]/route.ts',
      'src/app/api/process-steps/[id]/route.ts',
    ]) {
      const value = source(path);
      expect(value).toContain('const adminRequest = await isAdminRequest(request)');
      expect(value).toContain('active: true');
    }
  });
});
