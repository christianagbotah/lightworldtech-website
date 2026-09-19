import { afterEach, describe, expect, test } from 'bun:test';
import { buildMimeMessage } from './mail';
import { buildNewsletterCampaignMessage } from './newsletter-campaign';
import {
  createNewsletterUnsubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from './newsletter-unsubscribe';

const originalSecret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
  else process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = originalSecret;

  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe('newsletter campaign safety', () => {
  test('signed unsubscribe tokens reject tampering', () => {
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = 'test-newsletter-secret-at-least-32-bytes';
    const token = createNewsletterUnsubscribeToken('subscriber-123');

    expect(verifyNewsletterUnsubscribeToken(token)).toBe('subscriber-123');

    const [payload, signature] = token.split('.');
    const tampered = Buffer.from('subscriber-999', 'utf8').toString('base64url') + '.' + signature;
    expect(verifyNewsletterUnsubscribeToken(tampered)).toBeNull();
    expect(verifyNewsletterUnsubscribeToken(payload + '.' + signature.slice(0, -1) + 'x')).toBeNull();
  });

  test('live campaign escapes HTML and includes standards-based unsubscribe headers', () => {
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = 'test-newsletter-secret-at-least-32-bytes';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lightworldtech.com';

    const message = buildNewsletterCampaignMessage(
      {
        title: '<script>alert("title")</script>',
        subject: 'Corporate update',
        preheader: 'Latest <news>',
        body: 'Hello <img src=x onerror=alert(1)>\n\nSecond paragraph',
        ctaLabel: 'Read <more>',
        ctaUrl: 'https://lightworldtech.com/services',
      },
      { id: 'subscriber-123', email: 'subscriber@example.com' },
    );

    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<img src=x');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(message.listUnsubscribeUrl).toContain('/api/newsletter/unsubscribe?token=');
    expect(message.listUnsubscribePost).toBe(true);

    const mime = buildMimeMessage(message);
    expect(mime).toContain('List-Unsubscribe: <https://lightworldtech.com/api/newsletter/unsubscribe?token=');
    expect(mime).toContain('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
  });

  test('campaign test email cannot unsubscribe a real subscriber', () => {
    const message = buildNewsletterCampaignMessage(
      {
        title: 'Test campaign',
        subject: 'Test subject',
        preheader: '',
        body: 'Preview body',
        ctaLabel: '',
        ctaUrl: '',
      },
      { id: 'campaign-test', email: 'admin@example.com' },
      { test: true },
    );

    expect(message.listUnsubscribeUrl).toBeUndefined();
    expect(message.listUnsubscribePost).toBeUndefined();
    expect(message.html).toContain('Campaign test message');
    expect(message.text).toContain('Test message');
  });
});
