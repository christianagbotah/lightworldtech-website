import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cmsGroups } from './site-content';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('cookie privacy CMS surface', () => {
  test('exposes the cookie consent copy in Page Content', () => {
    const keys = new Set(cmsGroups.flatMap((group) => group.fields.map((field) => field.key)));

    for (const key of [
      'cookie_banner_title',
      'cookie_banner_description',
      'cookie_privacy_link_label',
      'cookie_customize_label',
      'cookie_decline_label',
      'cookie_accept_all_label',
      'cookie_save_preferences_label',
      'cookie_categories_title',
      'cookie_always_on_label',
      'cookie_essential_name',
      'cookie_essential_description',
      'cookie_analytics_name',
      'cookie_analytics_description',
      'cookie_marketing_name',
      'cookie_marketing_description',
      'cookie_preferences_name',
      'cookie_preferences_description',
    ]) {
      expect(keys.has(key)).toBe(true);
    }
  });

  test('renders consent copy from shared settings and keeps mobile actions wrap-safe', () => {
    const cookie = source('src/components/layout/CookieConsent.tsx');
    const shell = source('src/components/layout/PublicShell.tsx');

    expect(cookie).toContain("contentText(settings, 'cookie_banner_title'");
    expect(cookie).toContain("contentText(settings, 'cookie_analytics_description'");
    expect(cookie).toContain("contentText(settings, 'cookie_save_preferences_label'");
    expect(cookie).toContain('flex w-full flex-wrap items-center gap-2');
    expect(shell).toContain('<CookieConsent settings={resolvedSettings} />');
  });
});
