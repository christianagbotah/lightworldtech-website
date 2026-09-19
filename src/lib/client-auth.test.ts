import { describe, expect, test } from 'bun:test';
import {
  createClientSessionToken,
  hashClientPassword,
  verifyClientPassword,
  verifyClientSessionToken,
} from './client-auth';
import { createAdminSessionToken } from './admin-auth';

describe('client password security', () => {
  test('hashes client passwords with scrypt and verifies only the correct password', () => {
    const stored = hashClientPassword('SecureTemporaryPassword!123');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyClientPassword(stored, 'SecureTemporaryPassword!123')).toBe(true);
    expect(verifyClientPassword(stored, 'WrongPassword!123')).toBe(false);
  });

  test('rejects non-scrypt client credentials', () => {
    expect(verifyClientPassword('plain-text-is-not-supported', 'plain-text-is-not-supported')).toBe(false);
  });
});

describe('client session isolation', () => {
  test('accepts a valid client session token', () => {
    const token = createClientSessionToken({
      sub: 'client-1',
      email: 'client@example.com',
      name: 'Client',
      organization: 'Example Ltd',
      ver: 1,
    });
    const session = verifyClientSessionToken(token);
    expect(session?.sub).toBe('client-1');
    expect(session?.aud).toBe('client');
    expect(session?.ver).toBe(1);
  });

  test('rejects a tampered client session token', () => {
    const token = createClientSessionToken({
      sub: 'client-1',
      email: 'client@example.com',
      name: 'Client',
      organization: 'Example Ltd',
      ver: 1,
    });
    expect(verifyClientSessionToken(token + 'tampered')).toBeNull();
  });

  test('rejects an admin token even when the deployment shares a signing secret', () => {
    const adminToken = createAdminSessionToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
    });
    expect(verifyClientSessionToken(adminToken)).toBeNull();
  });
});
