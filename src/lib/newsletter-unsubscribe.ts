import { createHmac, timingSafeEqual } from 'node:crypto';

function unsubscribeSecret(): string {
  const value =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (value) return value;
  if (process.env.NODE_ENV !== 'production') {
    return 'lightworld-dev-newsletter-unsubscribe-secret-change-before-production';
  }

  throw new Error(
    'NEWSLETTER_UNSUBSCRIBE_SECRET, ADMIN_SESSION_SECRET or NEXTAUTH_SECRET must be configured in production',
  );
}

function signature(payload: string): string {
  return createHmac('sha256', unsubscribeSecret())
    .update('newsletter-unsubscribe:' + payload)
    .digest('base64url');
}

export function createNewsletterUnsubscribeToken(subscriberId: string): string {
  const payload = Buffer.from(subscriberId, 'utf8').toString('base64url');
  return payload + '.' + signature(payload);
}

export function verifyNewsletterUnsubscribeToken(token: string | undefined): string | null {
  if (!token) return null;

  try {
    const [payload, suppliedSignature] = token.split('.');
    if (!payload || !suppliedSignature) return null;

    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(signature(payload));
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }

    const subscriberId = Buffer.from(payload, 'base64url').toString('utf8').trim();
    if (!subscriberId || subscriberId.length > 128 || /[\r\n]/.test(subscriberId)) return null;
    return subscriberId;
  } catch {
    return null;
  }
}

export function newsletterSiteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lightworldtech.com').trim();
  try {
    const url = new URL(configured);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url.origin;
  } catch {
    return 'https://lightworldtech.com';
  }
}

export function newsletterUnsubscribeUrls(subscriberId: string) {
  const token = createNewsletterUnsubscribeToken(subscriberId);
  const site = newsletterSiteUrl();
  return {
    pageUrl: site + '/newsletter/unsubscribe?token=' + encodeURIComponent(token),
    oneClickUrl: site + '/api/newsletter/unsubscribe?token=' + encodeURIComponent(token),
  };
}
