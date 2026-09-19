import { createHash, randomBytes } from 'node:crypto';
import type { MailMessage } from '@/lib/mail';

export const ADMIN_PASSWORD_RESET_TTL_MS = 30 * 60_000;
export const ADMIN_PASSWORD_RESET_COOLDOWN_MS = 5 * 60_000;

export function hashAdminPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createAdminPasswordResetToken(now = Date.now()): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashAdminPasswordResetToken(token),
    expiresAt: new Date(now + ADMIN_PASSWORD_RESET_TTL_MS),
  };
}

export function adminPasswordResetUrl(token: string, requestOrigin?: string): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://lightworldtech.com' : requestOrigin) ||
    'http://localhost:3000';

  const url = new URL('/admin/reset-password', configured);
  url.searchParams.set('token', token);
  return url.toString();
}

export function adminPasswordResetMail(email: string, resetUrl: string): MailMessage {
  return {
    to: email,
    subject: 'Reset your Lightworld Technologies CMS password',
    text:
      'A password reset was requested for your Lightworld Technologies CMS administrator account.\n\n' +
      'Use this one-time link within 30 minutes:\n' +
      resetUrl +
      '\n\nIf you did not request this reset, you can ignore this message. Your current password remains unchanged.\n\n' +
      'Lightworld Technologies Ltd',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:28px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#d97706;font-weight:700">Lightworld Technologies</p>' +
      '<h1 style="font-size:26px;line-height:1.15;margin:12px 0">Reset your CMS password</h1>' +
      '<p>A password reset was requested for your administrator account.</p>' +
      '<p><a href="' + resetUrl + '" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Reset password</a></p>' +
      '<p style="font-size:13px;color:#64748b">This one-time link expires in 30 minutes. If you did not request it, ignore this email; your current password will remain unchanged.</p>' +
      '</div></div>',
  };
}
