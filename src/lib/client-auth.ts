import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import type { NextRequest } from 'next/server';

export const CLIENT_SESSION_COOKIE = 'lw_client_session';
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 12;

export type ClientSession = {
  sub: string;
  email: string;
  companyName: string;
  contactName: string;
  exp: number;
};

function sessionSecret(): string {
  const value =
    process.env.CLIENT_PORTAL_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (value) return value;
  if (process.env.NODE_ENV !== 'production') {
    return 'lightworld-dev-client-session-secret-change-before-production';
  }

  throw new Error(
    'CLIENT_PORTAL_SESSION_SECRET, ADMIN_SESSION_SECRET or NEXTAUTH_SECRET must be configured in production',
  );
}

function signature(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createClientSessionToken(
  input: Omit<ClientSession, 'exp'>,
): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...input,
      exp: Math.floor(Date.now() / 1000) + CLIENT_SESSION_MAX_AGE,
    } satisfies ClientSession),
  ).toString('base64url');

  return payload + '.' + signature(payload);
}

export function verifyClientSessionToken(
  token: string | undefined,
): ClientSession | null {
  if (!token) return null;

  try {
    const [payload, suppliedSignature] = token.split('.');
    if (!payload || !suppliedSignature) return null;

    const expectedSignature = signature(payload);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as ClientSession;

    if (
      !parsed.sub ||
      !parsed.email ||
      !parsed.companyName ||
      !parsed.contactName ||
      !parsed.exp
    ) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getClientSession(request: NextRequest): ClientSession | null {
  return verifyClientSessionToken(
    request.cookies.get(CLIENT_SESSION_COOKIE)?.value,
  );
}

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export function hashClientPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return [HASH_PREFIX, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export function verifyClientPassword(
  storedPassword: string,
  candidatePassword: string,
): boolean {
  if (!storedPassword.startsWith(HASH_PREFIX + '$')) return false;

  try {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) return false;

    const salt = Buffer.from(parts[1], 'base64url');
    const storedHash = Buffer.from(parts[2], 'base64url');
    const candidateHash = scryptSync(candidatePassword, salt, storedHash.length);

    return (
      storedHash.length === candidateHash.length &&
      timingSafeEqual(storedHash, candidateHash)
    );
  } catch {
    return false;
  }
}
