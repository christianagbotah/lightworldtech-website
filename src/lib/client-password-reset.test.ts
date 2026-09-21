import { describe, expect, test } from 'bun:test';
import {
  CLIENT_PASSWORD_RESET_TTL_MS,
  clientPasswordResetMail,
  clientPasswordResetUrl,
  createClientPasswordResetToken,
  hashClientPasswordResetToken,
} from './client-password-reset';

describe('client password reset security', () => {
  test('stores only a deterministic hash of a random raw reset token', () => {
    const reset = createClientPasswordResetToken();
    expect(reset.token.length).toBeGreaterThan(20);
    expect(reset.tokenHash).toBe(hashClientPasswordResetToken(reset.token));
    expect(reset.tokenHash).not.toContain(reset.token);
  });

  test('creates unique one-time tokens with bounded expiry', () => {
    const before = Date.now();
    const first = createClientPasswordResetToken();
    const second = createClientPasswordResetToken();
    const after = Date.now();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
    expect(first.expiresAt.getTime()).toBeGreaterThanOrEqual(before + CLIENT_PASSWORD_RESET_TTL_MS);
    expect(first.expiresAt.getTime()).toBeLessThanOrEqual(after + CLIENT_PASSWORD_RESET_TTL_MS);
  });

  test('never generates localhost reset URLs in production', () => {
    const url = clientPasswordResetUrl('token with spaces', 'https://localhost:3007', {
      configuredOrigin: 'https://localhost:3007',
      environment: 'production',
    });

    expect(url).toBe('https://lightworldtech.com/client/reset-password?token=token+with+spaces');
    expect(url).not.toContain('localhost');
  });

  test('mail copy includes the secure reset URL without exposing token hashes', () => {
    const url = 'https://lightworldtech.com/client/reset-password?token=raw-token';
    const message = clientPasswordResetMail('client@example.com', 'Client User', url);

    expect(message.to).toBe('client@example.com');
    expect(message.text).toContain(url);
    expect(message.html).toContain(url);
    expect(message.subject.toLowerCase()).toContain('reset');
  });
});
