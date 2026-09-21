import { createHash, randomBytes } from 'node:crypto';
import type { MailMessage } from '@/lib/mail';
import { resolveClientActivationOrigin } from '@/lib/client-invite';

export const CLIENT_PASSWORD_RESET_TTL_MS = 30 * 60_000;
export const CLIENT_PASSWORD_RESET_COOLDOWN_MS = 5 * 60_000;

export function hashClientPasswordResetToken(token: string): string {
  return createHash('sha256')
    .update('lightworld-client-password-reset:' + token)
    .digest('hex');
}

export function createClientPasswordResetToken(now = Date.now()): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashClientPasswordResetToken(token),
    expiresAt: new Date(now + CLIENT_PASSWORD_RESET_TTL_MS),
  };
}

export function clientPasswordResetUrl(
  token: string,
  requestOrigin?: string,
  options: { configuredOrigin?: string; environment?: string } = {},
): string {
  const url = new URL(
    '/client/reset-password',
    resolveClientActivationOrigin({
      requestOrigin,
      configuredOrigin: options.configuredOrigin,
      environment: options.environment,
    }),
  );
  url.searchParams.set('token', token);
  return url.toString();
}

export function clientPasswordResetMail(
  email: string,
  name: string,
  resetUrl: string,
): MailMessage {
  const greeting = name.trim() ? 'Hello ' + name.trim() + ',' : 'Hello,';

  return {
    to: email,
    subject: 'Reset your Lightworld client portal password',
    text:
      greeting +
      '\n\nA password reset was requested for your Lightworld Technologies client portal account.\n\n' +
      'Use this one-time link within 30 minutes:\n' +
      resetUrl +
      '\n\nCompleting the reset signs out older portal sessions. If you did not request this reset, you can ignore this message and your current password will remain unchanged.\n\n' +
      'Lightworld Technologies Ltd',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:28px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#d97706;font-weight:700">Lightworld Technologies</p>' +
      '<h1 style="font-size:26px;line-height:1.15;margin:12px 0">Reset your client portal password</h1>' +
      '<p>' + greeting.replace(',', '') + ',</p>' +
      '<p>A password reset was requested for your secure Lightworld client portal account.</p>' +
      '<p><a href="' + resetUrl + '" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Reset password</a></p>' +
      '<p style="font-size:13px;color:#64748b">This one-time link expires in 30 minutes. Completing the reset signs out older portal sessions. If you did not request it, ignore this email and your current password will remain unchanged.</p>' +
      '</div></div>',
  };
}
