import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cmsGroups,
  contentJson,
  contentText,
  defaultPrivacySections,
  defaultTermsSections,
} from './site-content';

function fieldKeys(): string[] {
  return cmsGroups.flatMap((group) => group.fields.map((field) => field.key));
}

describe('full-site CMS registry', () => {
  test('keeps CMS setting keys unique', () => {
    const keys = fieldKeys();
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('exposes Insights, Privacy and Terms content controls', () => {
    const keys = new Set(fieldKeys());

    for (const key of [
      'blog_hero_eyebrow',
      'blog_hero_title',
      'blog_hero_description',
      'blog_search_placeholder',
      'blog_empty_title',
      'blog_empty_description',
      'privacy_title',
      'privacy_sections',
      'privacy_last_updated',
      'terms_title',
      'terms_sections',
      'terms_last_updated',
      'seo_blog_title',
      'seo_blog_description',
      'seo_blog_social_title',
      'seo_privacy_title',
      'seo_privacy_description',
      'seo_terms_title',
      'seo_terms_description',
    ]) {
      expect(keys.has(key)).toBe(true);
    }
  });

  test('retains usable default legal content', () => {
    expect(defaultPrivacySections.length).toBeGreaterThan(3);
    expect(defaultTermsSections.length).toBeGreaterThan(3);
    expect(defaultPrivacySections.every((section) => section.title && section.body)).toBe(true);
    expect(defaultTermsSections.every((section) => section.title && section.body)).toBe(true);
  });

  test('falls back safely for missing and invalid CMS values', () => {
    expect(contentText({}, 'missing', 'Fallback')).toBe('Fallback');
    expect(contentText({ key: '  ' }, 'key', 'Fallback')).toBe('Fallback');
    expect(contentJson({ key: 'not-json' }, 'key', ['fallback'])).toEqual(['fallback']);
  });

  test('caches public site settings and invalidates them after CMS writes', () => {
    const server = readFileSync(join(process.cwd(), 'src/lib/site-content-server.ts'), 'utf8');
    const bulkRoute = readFileSync(join(process.cwd(), 'src/app/api/settings/route.ts'), 'utf8');
    const singleRoute = readFileSync(join(process.cwd(), 'src/app/api/settings/[key]/route.ts'), 'utf8');

    expect(server).toContain('unstable_cache');
    expect(server).toContain("tags: ['site-settings']");
    expect(server).toContain('revalidate: 300');
    expect(bulkRoute).toContain("revalidateTag('site-settings', 'max')");
    expect(singleRoute).toContain("revalidateTag('site-settings', 'max')");
  });

  test('wires the Services closing CTA description to its declared CMS field', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/components/pages/ServicesPage.tsx'),
      'utf8',
    );
    expect(page).toContain("contentText(settings, 'services_cta_description'");
  });
});
