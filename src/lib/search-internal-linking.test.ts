import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serviceSearchHref } from './service-search-content';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const servicePaths = [
  '/services/web-development',
  '/services/mobile-app-development',
  '/services/software-development',
  '/services/ai-automation',
  '/services/cloud-devops',
  '/services/security-engineering',
  '/services/seo-digital-performance',
  '/services/it-training',
];

describe('search internal linking and crawl authority', () => {
  test('legacy CMS service slugs resolve to crawlable search landing pages', () => {
    expect(serviceSearchHref({ slug: 'web-development' })).toBe('/services/web-development');
    expect(serviceSearchHref({ slug: 'mobile-app-development' })).toBe('/services/mobile-app-development');
    expect(serviceSearchHref({ slug: 'software-development' })).toBe('/services/software-development');
    expect(serviceSearchHref({ slug: 'skills-development' })).toBe('/services/it-training');
    expect(serviceSearchHref({ slug: 'seo-social-media-marketing' })).toBe('/services/seo-digital-performance');
    expect(serviceSearchHref({ slug: 'hosting-domain' })).toBe('/services/cloud-devops');
  });

  test('title fallback resolves newer capability labels safely', () => {
    expect(serviceSearchHref({ title: 'Enterprise systems' })).toBe('/services/software-development');
    expect(serviceSearchHref({ title: 'AI & automation' })).toBe('/services/ai-automation');
    expect(serviceSearchHref({ title: 'Security engineering' })).toBe('/services/security-engineering');
    expect(serviceSearchHref({ title: 'Training & advisory' })).toBe('/services/it-training');
    expect(serviceSearchHref({ title: 'Unknown future service' })).toBe('/services');
  });

  test('header exposes all eight dedicated service landing pages', () => {
    const header = source('src/components/layout/Header.tsx');
    for (const path of servicePaths) expect(header).toContain(path);
    expect(header).toContain("contentText(settings, 'header_services_link', '/services')");
  });

  test('footer and CMS defaults distribute sitewide service authority', () => {
    const footer = source('src/components/layout/Footer.tsx');
    const content = source('src/lib/site-content.ts');

    for (const path of servicePaths) {
      expect(footer + content).toContain(path);
    }
    expect(footer).toContain('/services/web-development');
    expect(footer).toContain('/services/it-training');
  });

  test('homepage and command palette resolve service records to landing pages', () => {
    const home = source('src/components/pages/HomePage.tsx');
    const palette = source('src/components/ui/command-palette.tsx');
    const services = source('src/components/sections/ServicesSection.tsx');

    expect(home).toContain('href={item.href}');
    expect(home).toContain("href: serviceSearchHref({");
    expect(home).toContain('href="/services/it-training"');
    expect(palette).toContain('href: serviceSearchHref({ slug: service.slug, title: service.title })');
    expect(services).toContain('href={serviceSearchHref({ slug: service.slug, title: service.title })}');
  });
});
