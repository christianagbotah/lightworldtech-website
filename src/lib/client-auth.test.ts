import { describe, expect, test } from 'bun:test';
import {
  createClientSessionToken,
  hashClientPassword,
  verifyClientPassword,
  verifyClientSessionToken,
} from '@/lib/client-auth';

describe('client portal password security', () => {
  test('hashes client passwords with scrypt and verifies only the correct password', () => {
    const stored = hashClientPassword('correct-horse-battery-staple');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored).not.toContain('correct-horse-battery-staple');
    expect(verifyClientPassword(stored, 'correct-horse-battery-staple')).toBe(true);
    expect(verifyClientPassword(stored, 'wrong-password')).toBe(false);
  });

  test('rejects non-scrypt legacy/plain-text client passwords', () => {
    expect(verifyClientPassword('plain-text-password', 'plain-text-password')).toBe(false);
  });
});

describe('client portal session security', () => {
  test('accepts a valid signed session token', () => {
    const token = createClientSessionToken({
      sub: 'client_123',
      email: 'client@example.com',
      companyName: 'Example Ltd',
      contactName: 'Ama Client',
    });
    const session = verifyClientSessionToken(token);
    expect(session?.sub).toBe('client_123');
    expect(session?.email).toBe('client@example.com');
    expect(session?.companyName).toBe('Example Ltd');
  });

  test('rejects a tampered token', () => {
    const token = createClientSessionToken({
      sub: 'client_123',
      email: 'client@example.com',
      companyName: 'Example Ltd',
      contactName: 'Ama Client',
    });
    const [payload, signature] = token.split('.');
    const tamperedPayload = payload.slice(0, -1) + (payload.endsWith('a') ? 'b' : 'a');
    expect(verifyClientSessionToken(tamperedPayload + '.' + signature)).toBeNull();
  });

  test('rejects malformed tokens', () => {
    expect(verifyClientSessionToken('not-a-valid-token')).toBeNull();
  });
});
