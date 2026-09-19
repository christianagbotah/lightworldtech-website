import { createHash, randomBytes } from 'node:crypto';

export const CLIENT_INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createClientInvite(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashClientInviteToken(token),
    expiresAt: new Date(Date.now() + CLIENT_INVITE_MAX_AGE_MS),
  };
}

export function hashClientInviteToken(token: string): string {
  return createHash('sha256').update('lightworld-client-invite:' + token).digest('hex');
}


const PRODUCTION_CLIENT_PORTAL_ORIGIN = 'https://lightworldtech.com';

function normalizeActivationOrigin(candidate: string | undefined, production: boolean): string | null {
  if (!candidate) return null;

  try {
    const url = new URL(candidate.trim());
    if (!['https:', 'http:'].includes(url.protocol)) return null;

    const hostname = url.hostname.toLowerCase();
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost');

    if (production && (url.protocol !== 'https:' || isLocal)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveClientActivationOrigin(options: {
  requestOrigin?: string;
  configuredOrigin?: string;
  environment?: string;
} = {}): string {
  const production = (options.environment ?? process.env.NODE_ENV) === 'production';
  const configured =
    options.configuredOrigin ??
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;

  const candidates = production
    ? [configured, PRODUCTION_CLIENT_PORTAL_ORIGIN]
    : [configured, options.requestOrigin, 'http://localhost:3000'];

  for (const candidate of candidates) {
    const origin = normalizeActivationOrigin(candidate, production);
    if (origin) return origin;
  }

  return production ? PRODUCTION_CLIENT_PORTAL_ORIGIN : 'http://localhost:3000';
}

export function clientActivationUrl(
  token: string,
  requestOrigin?: string,
  options: { configuredOrigin?: string; environment?: string } = {},
): string {
  const url = new URL(
    '/client/activate',
    resolveClientActivationOrigin({
      requestOrigin,
      configuredOrigin: options.configuredOrigin,
      environment: options.environment,
    }),
  );
  url.searchParams.set('token', token);
  return url.toString();
}
