import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('consent UI and CMS consistency', () => {
  test('consent UI uses managed legal copy and current analytics-only choices', () => {
    const consent = source('src/components/layout/CookieConsent.tsx');

    expect(consent).toContain("contentText(settings, 'cookie_consent_title'");
    expect(consent).toContain("contentText(settings, 'cookie_analytics_description'");
    expect(consent).toContain('acceptedCurrentCookiePreferences');
    expect(consent).not.toContain("key: 'marketing'");
    expect(consent).not.toContain("key: 'preferences'");
  });

  test('public shell passes managed settings into the consent surface', () => {
    const shell = source('src/components/layout/PublicShell.tsx');
    expect(shell).toContain('<CookieConsent settings={resolvedSettings} />');
  });

  test('analytics reads the normalized consent model', () => {
    const analytics = source('src/lib/analytics-client.ts');
    expect(analytics).toContain("import { parseCookiePreferences } from '@/lib/cookie-consent'");
    expect(analytics).toContain('parseCookiePreferences(localStorage.getItem(CONSENT_KEY))');
  });

  test('legal CMS exposes the consent copy controls', () => {
    const siteContent = source('src/lib/site-content.ts');
    for (const key of [
      'cookie_consent_title',
      'cookie_consent_description',
      'cookie_privacy_link_label',
      'cookie_customize_label',
      'cookie_decline_label',
      'cookie_accept_label',
      'cookie_analytics_description',
    ]) {
      expect(siteContent).toContain("key: '" + key + "'");
    }
  });
});
