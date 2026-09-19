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
