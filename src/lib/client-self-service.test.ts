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

  test('client portal exposes responsive profile and password controls', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('Profile & security');
    expect(portal).toContain('/api/client/profile');
    expect(portal).toContain('/api/client/security/password');
    expect(portal).toContain('minLength={12}');
    expect(portal).toContain('Email is managed by Lightworld');
  });
});
