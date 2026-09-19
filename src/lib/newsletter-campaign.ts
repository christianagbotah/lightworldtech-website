import type { MailMessage } from './mail';
import { newsletterUnsubscribeUrls } from './newsletter-unsubscribe';

export interface NewsletterCampaignContent {
  title: string;
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bodyHtml(body: string): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => '<p style="margin:0 0 18px">' + escapeHtml(paragraph).replace(/\n/g, '<br>') + '</p>')
    .join('');
}

function safeCtaUrl(value: string): string {
  if (!value.trim()) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function buildNewsletterCampaignMessage(
  campaign: NewsletterCampaignContent,
  subscriber: { id: string; email: string },
  options: { test?: boolean } = {},
): MailMessage {
  const unsubscribe = options.test ? null : newsletterUnsubscribeUrls(subscriber.id);
  const ctaUrl = safeCtaUrl(campaign.ctaUrl);
  const cta =
    campaign.ctaLabel.trim() && ctaUrl
      ? '<p style="margin:28px 0"><a href="' +
        escapeHtml(ctaUrl) +
        '" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">' +
        escapeHtml(campaign.ctaLabel.trim()) +
        '</a></p>'
      : '';

  const preheader = campaign.preheader.trim()
    ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' +
      escapeHtml(campaign.preheader.trim()) +
      '</div>'
    : '';

  return {
    to: subscriber.email,
    subject: campaign.subject,
    text:
      campaign.title.trim() +
      '\n\n' +
      campaign.body.trim() +
      (campaign.ctaLabel.trim() && ctaUrl
        ? '\n\n' + campaign.ctaLabel.trim() + ': ' + ctaUrl
        : '') +
      (unsubscribe ? '\n\nUnsubscribe: ' + unsubscribe.pageUrl : '\n\nTest message — no subscription preferences were changed.') +
      '\n\nLightworld Technologies Ltd',
    html:
      '<div style="background:#f8fafc;padding:28px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.65">' +
      preheader +
      '<div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden">' +
      '<div style="padding:30px 32px 12px"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#059669;font-weight:700;margin:0">Lightworld Technologies</p>' +
      '<h1 style="font-size:30px;line-height:1.16;margin:12px 0 22px">' +
      escapeHtml(campaign.title.trim()) +
      '</h1>' +
      '<div style="font-size:15px;color:#334155">' +
      bodyHtml(campaign.body) +
      cta +
      '</div></div>' +
      '<div style="border-top:1px solid #e2e8f0;padding:20px 32px 26px;font-size:12px;color:#64748b">' +
      '<p style="margin:0 0 8px">Lightworld Technologies Ltd · Ghana</p>' +
      (unsubscribe
        ? '<p style="margin:0">You are receiving this because this address subscribed to Lightworld Technologies updates. <a href="' +
          escapeHtml(unsubscribe.pageUrl) +
          '" style="color:#475569">Unsubscribe</a>.</p>'
        : '<p style="margin:0">Campaign test message from the Lightworld Technologies admin workspace.</p>') +
      '</div></div></div>',
    ...(unsubscribe
      ? { listUnsubscribeUrl: unsubscribe.oneClickUrl, listUnsubscribePost: true }
      : {}),
  };
}
