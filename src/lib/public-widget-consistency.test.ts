import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public search and contact consistency', () => {
  test('command palette searches current published APIs instead of stale demo content', () => {
    const command = source('src/components/ui/command-palette.tsx');

    expect(command).toContain('/api/services?active=true');
    expect(command).toContain('/api/blog?published=true&limit=20');
    expect(command).toContain('/api/portfolio?active=true');
    expect(command).toContain('/api/faqs?active=true');
    expect(command).toContain('header_primary_links');
    expect(command).toContain('header_company_menu');

    expect(command).not.toContain('Grace Tabernacle Church Website');
    expect(command).not.toContain('FreshBite Food Ordering Platform');
    expect(command).not.toContain('Top 10 Web Development Trends to Watch in 2025');
  });

  test('floating contact data is managed and assistant CTAs are normalized', () => {
    const widgets = source('src/components/layout/FloatingWidgets.tsx');

    expect(widgets).toContain("contentText(settings, 'company_whatsapp'");
    expect(widgets).toContain('normalizeWhatsappNumber(companyWhatsapp)');
    expect(widgets).toContain("safeNavigationHref(msg.cta.href, '/contact')");
    expect(widgets).not.toContain("const whatsappNumber = '233243618186'");
  });

  test('managed outbound links reject executable URL schemes before rendering', () => {
    const portfolio = source('src/components/pages/PortfolioPage.tsx');
    const footer = source('src/components/layout/Footer.tsx');

    expect(portfolio).toContain("safeNavigationHref(String(item.url), '')");
    expect(footer).toContain("safeNavigationHref(settings.social_linkedin || '', '')");
  });
});
