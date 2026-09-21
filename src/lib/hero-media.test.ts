import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('CMS hero media', () => {
  test('Page Content supports Media Library-backed image fields', () => {
    const schema = source('src/lib/site-content.ts');
    const admin = source('src/components/admin/AdminPages.tsx');

    expect(schema).toContain("'email' | 'image'");
    expect(admin).toContain("field.type === 'image'");
    expect(admin).toContain('AdminMediaField');
  });

  test('core marketing groups expose optional hero image settings', () => {
    const schema = source('src/lib/site-content.ts');
    for (const key of [
      'home_hero_image',
      'about_hero_image',
      'services_hero_image',
      'products_hero_image',
      'portfolio_hero_image',
      'team_hero_image',
      'careers_hero_image',
      'contact_hero_image',
      'blog_hero_image',
    ]) {
      expect(schema).toContain(key);
    }
  });

  test('hero media is optional and preserves text readability', () => {
    const media = source('src/components/pages/CmsHeroMedia.tsx');

    expect(media).toContain("contentText(settings, settingKey, '').trim()");
    expect(media).toContain("if (!src) return null");
    expect(media).toContain('object-cover');
    expect(media).toContain('bg-gradient-to-r');
    expect(media).toContain('pointer-events-none');
  });

  test('all core marketing heroes render the shared media layer', () => {
    const pages = [
      ['src/components/pages/HomePage.tsx', 'home_hero_image'],
      ['src/components/pages/AboutPage.tsx', 'about_hero_image'],
      ['src/components/pages/ServicesPage.tsx', 'services_hero_image'],
      ['src/components/pages/ProductsPage.tsx', 'products_hero_image'],
      ['src/components/pages/PortfolioPage.tsx', 'portfolio_hero_image'],
      ['src/components/pages/TeamPage.tsx', 'team_hero_image'],
      ['src/components/pages/CareersPage.tsx', 'careers_hero_image'],
      ['src/components/pages/ContactPage.tsx', 'contact_hero_image'],
      ['src/components/pages/BlogPage.tsx', 'blog_hero_image'],
    ] as const;

    for (const [path, key] of pages) {
      const page = source(path);
      expect(page).toContain("CmsHeroMedia");
      expect(page).toContain('settingKey="' + key + '"');
      expect(page).toContain('z-10');
    }
  });
});
