import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const ADMIN_SESSION_COOKIE = 'lw_admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

export interface AdminSession {
  sub: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

function sessionSecret(): string {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET;

  if (value) return value;
  if (process.env.NODE_ENV !== 'production') {
    return 'lightworld-dev-admin-session-secret-change-before-production';
  }

  throw new Error('ADMIN_SESSION_SECRET or NEXTAUTH_SECRET must be configured in production');
}

function signature(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createAdminSessionToken(input: Omit<AdminSession, 'exp'>): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...input,
      exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE,
    } satisfies AdminSession),
  ).toString('base64url');

  return payload + '.' + signature(payload);
}

export function verifyAdminSessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;

  try {
    const [payload, suppliedSignature] = token.split('.');
    if (!payload || !suppliedSignature) return null;

    const expectedSignature = signature(payload);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);

    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
    if (!parsed.sub || !parsed.email || !parsed.exp) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function getAdminSession(request: NextRequest): AdminSession | null {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const session = getAdminSession(request);
  if (!session) return false;

  try {
    const admin = await db.admin.findUnique({
      where: { id: session.sub },
      select: { email: true, role: true, active: true },
    });

    return Boolean(
      admin?.active &&
      admin.email === session.email &&
      admin.role === session.role
    );
  } catch (error) {
    console.error('Admin session revalidation failed:', error);
    return false;
  }
}

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return [HASH_PREFIX, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export function verifyAdminPassword(
  storedPassword: string,
  candidatePassword: string,
): { valid: boolean; needsUpgrade: boolean } {
  if (storedPassword.startsWith(HASH_PREFIX + '$')) {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };

    try {
      const salt = Buffer.from(parts[1], 'base64url');
      const storedHash = Buffer.from(parts[2], 'base64url');
      const candidateHash = scryptSync(candidatePassword, salt, storedHash.length);

      return {
        valid:
          storedHash.length === candidateHash.length &&
          timingSafeEqual(storedHash, candidateHash),
        needsUpgrade: false,
      };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  // Legacy compatibility: compare existing plain-text records in constant time.
  // A successful legacy login is immediately upgraded to scrypt by the auth route.
  const storedDigest = createHash('sha256').update(storedPassword).digest();
  const candidateDigest = createHash('sha256').update(candidatePassword).digest();

  return {
    valid: timingSafeEqual(storedDigest, candidateDigest),
    needsUpgrade: true,
  };
}
