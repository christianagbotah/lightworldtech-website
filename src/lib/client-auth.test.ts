import { describe, expect, test } from 'bun:test';
import {
  createClientSessionToken,
  verifyClientSessionToken,
} from './client-auth';
import { createAdminSessionToken } from './admin-auth';

process.env.CLIENT_SESSION_SECRET = 'client-test-secret-at-least-32-bytes-long';
process.env.ADMIN_SESSION_SECRET = 'client-test-secret-at-least-32-bytes-long';

describe('client portal session security', () => {
  test('accepts a valid client session token', () => {
    const token = createClientSessionToken({
      sub: 'client-user-1',
      organizationId: 'org-1',
      email: 'client@example.com',
      name: 'Client User',
      role: 'client_admin',
    });

    const session = verifyClientSessionToken(token);
    expect(session?.sub).toBe('client-user-1');
    expect(session?.organizationId).toBe('org-1');
    expect(session?.email).toBe('client@example.com');
  });

  test('rejects a tampered client session token', () => {
    const token = createClientSessionToken({
      sub: 'client-user-1',
      organizationId: 'org-1',
      email: 'client@example.com',
      name: 'Client User',
      role: 'client_admin',
    });
    const [payload, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
        organizationId: 'org-2',
      }),
    ).toString('base64url');

    expect(verifyClientSessionToken(tamperedPayload + '.' + signature)).toBeNull();
  });

  test('never accepts an admin token as a client token even when secrets match', () => {
    const adminToken = createAdminSessionToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
    });

    expect(verifyClientSessionToken(adminToken)).toBeNull();
  });

  test('rejects malformed tokens', () => {
    expect(verifyClientSessionToken('not-a-session-token')).toBeNull();
    expect(verifyClientSessionToken(undefined)).toBeNull();
  });
});
