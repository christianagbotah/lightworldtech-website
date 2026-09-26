import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('client self-service profile and security', () => {
  test('profile updates require an active client context and renew the signed session', () => {
    const route = source('src/app/api/client/profile/route.ts');

    expect(route).toContain('getActiveClientContext(request)');
    expect(route).toContain("z.string().trim().min(2).max(120)");
    expect(route).toContain('createClientSessionToken');
    expect(route).toContain('CLIENT_SESSION_COOKIE');
    expect(route).toContain("sameSite: 'lax'");
  });

  test('password change verifies the current secret and invalidates other sessions', () => {
    const route = source('src/app/api/client/security/password/route.ts');

    expect(route).toContain('verifyAdminPassword(user.password, parsed.data.currentPassword)');
    expect(route).toContain("newPassword: z.string().min(12).max(200)");
    expect(route).toContain('authVersion: { increment: 1 }');
    expect(route).toContain('clientPasswordResetToken.updateMany');
    expect(route).toContain('createClientSessionToken');
  });

  test('clients can prefill a reviewed project renewal request from the project card', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('Request project renewal');
    expect(portal).toContain('prepareProjectRenewalRequest');
    expect(portal).toContain("'Project renewal request · ' + project.name");
    expect(portal).toContain("category: 'project_change'");
    expect(portal).toContain("projectId: project.id");
    expect(portal).toContain("document.getElementById('support')");
    expect(portal).toContain('Please confirm the applicable scope, commercial terms, invoice and effective renewal date');
  });

  test('clients can request reviewed service renewals and plan changes', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');
    const ticketApi = source('src/app/api/client/tickets/route.ts');

    expect(portal).toContain('Request renewal / change');
    expect(portal).toContain('Request a service change');
    expect(portal).toContain("category: 'project_change'");
    expect(portal).toContain("fetch('/api/client/tickets'");
    expect(portal).toContain('This request is for review only');
    expect(portal).toContain('service.project?.id || null');
    expect(ticketApi).toContain('notifySupportDesk');
    expect(ticketApi).toContain('supportSla');
  });

  test('client portal exposes responsive profile and password controls', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('Profile & security');
    expect(portal).toContain('/api/client/profile');
    expect(portal).toContain('/api/client/security/password');
    expect(portal).toContain('minLength={12}');
    expect(portal).toContain('Email is managed by Lightworld');
  });
});
