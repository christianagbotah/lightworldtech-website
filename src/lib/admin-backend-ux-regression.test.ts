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
  });

  test('keeps the wide CRM board inside its own horizontal scroller', () => {
    const crm = source('src/components/admin/AdminCRM.tsx');

    expect(crm).toContain('max-w-full overflow-x-auto');
    expect(crm).toContain('min-w-[1960px]');
    expect(crm).toContain('max-w-[min(96vw,1440px)]');
    expect(crm).toContain('Original customer enquiry');
    expect(crm).toContain('max-h-[48vh] overflow-y-auto');
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
    expect(notifications).toContain("'open-client-tickets'");
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

  test('keeps customer email replies inside the Lightworld admin portal', () => {
    const schema = source('prisma/schema.prisma');
    const replies = source('src/app/api/admin/messages/[id]/replies/route.ts');
    const messages = source('src/components/admin/AdminMessages.tsx');
    const crm = source('src/components/admin/AdminCRM.tsx');
    const proposals = source('src/components/admin/AdminProposals.tsx');

    expect(schema).toContain('model ContactMessageReply');
    expect(schema).toContain('replies ContactMessageReply[]');
    expect(replies).toContain('sendTransactionalMail');
    expect(replies).toContain("'admin.message_replied'");
    expect(replies).toContain("'admin.message_reply_failed'");
    expect(replies).toContain('lastContactedAt: sentAt');
    expect(replies).toContain("status: 'sending'");
    expect(replies).toContain("status: 'sent'");
    expect(replies).toContain("status: 'failed'");
    expect(messages).toContain('Reply internally');
    expect(messages).toContain('Internal correspondence history');
    expect(messages).toContain("fetch('/api/admin/messages/'");
    expect(messages).toContain("sessionStorage.getItem('lw-reply-message-id')");
    expect(messages).not.toContain("href={'mailto:' + viewing.email}");
    expect(crm).toContain("sessionStorage.setItem('lw-reply-message-id'");
    expect(crm).not.toContain("href={'mailto:' + selected.contactMessage.email}");
    expect(proposals).toContain("sessionStorage.setItem('lw-reply-message-id'");
    expect(proposals).not.toContain("href={'mailto:' + selected.lead.contactMessage.email}");
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
    expect(messages).toContain('Select all loaded messages');
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
