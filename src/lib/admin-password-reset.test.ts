/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';
import {
  ADMIN_PASSWORD_RESET_TTL_MS,
  createAdminPasswordResetToken,
  hashAdminPasswordResetToken,
} from './admin-password-reset';

describe('admin password reset token security', () => {
  test('creates a random token and stores only its SHA-256 digest', () => {
    const now = Date.UTC(2026, 8, 19, 12, 0, 0);
    const reset = createAdminPasswordResetToken(now);

    expect(reset.token.length).toBeGreaterThan(30);
    expect(reset.tokenHash).not.toContain(reset.token);
    expect(reset.tokenHash).toBe(hashAdminPasswordResetToken(reset.token));
    expect(reset.expiresAt.getTime()).toBe(now + ADMIN_PASSWORD_RESET_TTL_MS);
  });

  test('generates independent reset tokens', () => {
    const first = createAdminPasswordResetToken();
    const second = createAdminPasswordResetToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});
