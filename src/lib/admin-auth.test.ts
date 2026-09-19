/// <reference types="bun-types" />
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  createAdminSessionToken,
  hashAdminPassword,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from './admin-auth';

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = 'lightworld-admin-auth-test-secret-at-least-32-bytes';
});

describe('admin password security', () => {
  test('hashes passwords with scrypt and verifies the correct password', () => {
    const password = 'A-strong-admin-password';
    const stored = hashAdminPassword(password);

    expect(stored).not.toBe(password);
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyAdminPassword(stored, password)).toEqual({
      valid: true,
      needsUpgrade: false,
    });
    expect(verifyAdminPassword(stored, password + '-wrong').valid).toBe(false);
  });

  test('marks legacy plain-text credentials for one-time upgrade', () => {
    expect(verifyAdminPassword('legacy-password', 'legacy-password')).toEqual({
      valid: true,
      needsUpgrade: true,
    });
    expect(verifyAdminPassword('legacy-password', 'wrong-password').valid).toBe(false);
  });
});

describe('admin session security', () => {
  test('accepts a valid signed session token', () => {
    const token = createAdminSessionToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
      authVersion: 0,
    });

    const session = verifyAdminSessionToken(token);
    expect(session?.sub).toBe('admin-1');
    expect(session?.email).toBe('admin@example.com');
    expect(session?.role).toBe('admin');
    expect(session?.authVersion).toBe(0);
  });

  test('rejects a tampered session token', () => {
    const token = createAdminSessionToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
      authVersion: 0,
    });

    const [payload, sig] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    decoded.role = 'super-admin';
    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');

    expect(verifyAdminSessionToken(tamperedPayload + '.' + sig)).toBeNull();
  });

  test('rejects a malformed session token', () => {
    expect(verifyAdminSessionToken('not-a-session')).toBeNull();
  });
});
