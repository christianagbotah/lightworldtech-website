import { describe, expect, test } from 'bun:test';
import {
  createClientSessionToken,
  verifyClientSessionToken,
} from './client-auth';
import { createAdminSessionToken } from './admin-auth';
import {
  CLIENT_INVITE_MAX_AGE_MS,
  clientActivationUrl,
  createClientInvite,
  hashClientInviteToken,
  resolveClientActivationOrigin,
} from './client-invite';

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
      authVersion: 0,
    });

    expect(verifyClientSessionToken(adminToken)).toBeNull();
  });

  test('rejects malformed tokens', () => {
    expect(verifyClientSessionToken('not-a-session-token')).toBeNull();
    expect(verifyClientSessionToken(undefined)).toBeNull();
  });
});


describe('client activation token security', () => {
  test('stores only a deterministic hash of a random raw activation token', () => {
    const invite = createClientInvite();
    expect(invite.token.length).toBeGreaterThan(20);
    expect(invite.tokenHash).toBe(hashClientInviteToken(invite.token));
    expect(invite.tokenHash).not.toContain(invite.token);
  });

  test('generates unique activation tokens with bounded expiry', () => {
    const before = Date.now();
    const first = createClientInvite();
    const second = createClientInvite();
    const after = Date.now();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
    expect(first.expiresAt.getTime()).toBeGreaterThanOrEqual(before + CLIENT_INVITE_MAX_AGE_MS);
    expect(first.expiresAt.getTime()).toBeLessThanOrEqual(after + CLIENT_INVITE_MAX_AGE_MS);
  });
});


describe('client activation URL safety', () => {
  test('never exposes localhost when resolving a production activation origin', () => {
    expect(
      resolveClientActivationOrigin({
        configuredOrigin: 'https://localhost:3007',
        requestOrigin: 'https://localhost:3007',
        environment: 'production',
      }),
    ).toBe('https://lightworldtech.com');
  });

  test('uses the configured public production origin when it is safe', () => {
    expect(
      resolveClientActivationOrigin({
        configuredOrigin: 'https://lightworldtech.com',
        requestOrigin: 'https://localhost:3007',
        environment: 'production',
      }),
    ).toBe('https://lightworldtech.com');
  });

  test('encodes activation tokens and never trusts the proxied localhost origin in production', () => {
    const previousSiteUrl = process.env.SITE_URL;
    const previousPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const previousNodeEnv = process.env.NODE_ENV;

    try {
      process.env.SITE_URL = 'https://localhost:3007';
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NODE_ENV = 'production';

      const url = clientActivationUrl('token with spaces', 'https://localhost:3007');
      expect(url).toBe('https://lightworldtech.com/client/activate?token=token+with+spaces');
      expect(url).not.toContain('localhost');
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;

      if (previousPublicSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previousPublicSiteUrl;

      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
