import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('corporate gold and client recovery surface', () => {
  test('public website is scoped to the corporate gold palette', () => {
    const shell = source('src/components/layout/PublicShell.tsx');
    const css = source('src/app/globals.css');

    expect(shell).toContain('lw-corporate-brand');
    expect(css).toContain('.lw-corporate-brand');
    expect(css).toContain('--color-emerald-500: var(--color-amber-500)');
    expect(css).toContain('--primary: oklch(0.666 0.179 58.318)');
    expect(css).toContain('from-amber-700 to-amber-400');

    for (const legacyGreen of [
      '0.765 0.177 163.223',
      '0.596 0.145 163.225',
      '0.696 0.17 162.48',
      '0.979 0.021 166.113',
      '0.508 0.118 165.612',
    ]) {
      expect(css).not.toContain(legacyGreen);
    }

    expect(css).toContain('background-color: oklch(0.828 0.189 84.429 / 30%)');
    expect(css).toContain('scrollbar-color: oklch(0.666 0.179 58.318 / 25%) transparent');
  });

  test('client sign-in exposes a real password reset request flow', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');
    expect(portal).toContain('Forgot password?');
    expect(portal).toContain('/api/client/password-reset/request');
    expect(portal).toContain('Send reset link');
    expect(portal).toContain('bg-amber-400');
    expect(portal).toContain("return 'bg-emerald-100 text-emerald-700");
  });

  test('reset confirmation invalidates prior sessions and invitation links', () => {
    const confirm = source('src/app/api/client/password-reset/confirm/route.ts');
    const access = source('src/lib/client-access.ts');
    const auth = source('src/app/api/client/auth/route.ts');

    expect(confirm).toContain('authVersion: { increment: 1 }');
    expect(confirm).toContain("inviteTokenHash: ''");
    expect(confirm).toContain('inviteExpiresAt: null');
    expect(access).toContain('user.authVersion !== session.authVersion');
    expect(auth).toContain('user.authVersion !== session.authVersion');
  });

  test('client reset page enforces a 12-character password', () => {
    const page = source('src/components/client/ClientResetPasswordPage.tsx');
    expect(page).toContain("password.length < 12");
    expect(page).toContain('minLength={12}');
    expect(page).toContain('/api/client/password-reset/confirm');
  });
});
