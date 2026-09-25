import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public experience quality', () => {
  test('global motion preferences are respected by Framer Motion and CSS', () => {
    const layout = source('src/app/layout.tsx');
    const provider = source('src/components/providers/MotionPreferenceProvider.tsx');
    const css = source('src/app/globals.css');

    expect(layout).toContain('MotionPreferenceProvider');
    expect(provider).toContain('reducedMotion="user"');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation: none !important');
  });

  test('public routes show a lightweight loader and above-fold heroes do not wait for hydration to become visible', () => {
    const loading = source('src/app/loading.tsx');
    const layout = source('src/app/layout.tsx');
    const seoIsland = source('src/components/layout/SeoStructuredData.tsx');
    const globalPage = source('src/components/pages/GlobalPage.tsx');
    const home = source('src/components/pages/HomePage.tsx');
    const pageHero = source('src/components/ui/page-hero.tsx');

    expect(loading).toContain('Preparing your experience');
    expect(loading).toContain('role="status"');
    expect(loading).toContain('Lightworld Technologies');
    expect(loading).toContain('fixed inset-0');
    expect(loading).toContain('z-[120]');
    expect(layout).toContain('<Suspense fallback={null}>');
    expect(layout).toContain('<SeoStructuredData />');
    expect(layout).not.toContain('export default async function RootLayout');
    expect(seoIsland).toContain('await getSeoConfig()');
    expect(globalPage).toContain('initial={false} animate={{ opacity: 1, y: 0 }}');
    expect(home).toContain('initial={false}');
    expect(pageHero).toContain('initial={false}');
    expect(globalPage).not.toContain('initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}');
  });

  test('inner-page header clearance is painted by the hero instead of a blank spacer', () => {
    const header = source('src/components/layout/Header.tsx');
    const css = source('src/app/globals.css');
    const home = source('src/components/pages/HomePage.tsx');

    expect(header).not.toContain('h-[76px] sm:h-[88px]');
    expect(css).toContain('.lw-hero-grid:not(.lw-home-hero):first-child');
    expect(css).toContain('padding-top: 76px');
    expect(css).toContain('padding-top: 88px');
    expect(css).toContain('.lw-hero-grid > :not(.absolute)');
    expect(css).not.toContain('.lw-hero-grid > * {');
    expect(home).toContain('lw-home-hero');
    const serviceDetail = source('src/app/services/[slug]/page.tsx');
    expect(serviceDetail.indexOf('lw-hero-grid')).toBeGreaterThan(serviceDetail.indexOf('</section>'));
  });

  test('service cards are semantic links rather than mouse-only click targets', () => {
    const services = source('src/components/sections/ServicesSection.tsx');

    expect(services).toContain('href={serviceSearchHref({ slug: service.slug, title: service.title })}');
    expect(services).toContain('aria-label={`Explore ${service.title}`}');
    expect(services).not.toContain('onClick={() => navigate(\'services\')}\n                    >');
  });

  test('portfolio quick-view cards support keyboard activation and labeled close controls', () => {
    const portfolio = source('src/components/sections/PortfolioSection.tsx');

    expect(portfolio).toContain('role="button"');
    expect(portfolio).toContain('tabIndex={0}');
    expect(portfolio).toContain("event.key === 'Enter' || event.key === ' '");
    expect(portfolio).toContain('aria-label="Close project details"');
  });

  test('live data fallbacks are visible instead of silently swallowed', () => {
    const blog = source('src/components/pages/BlogPage.tsx');
    const portfolio = source('src/components/pages/PortfolioPage.tsx');

    expect(blog).toContain('refreshUnavailable');
    expect(blog).toContain('Live article refresh is temporarily unavailable');
    expect(portfolio).toContain('cmsUnavailable');
    expect(portfolio).toContain('The live portfolio feed is temporarily unavailable');
  });

  test('public filter and search controls expose state and mobile-friendly targets', () => {
    const blog = source('src/components/pages/BlogPage.tsx');
    const portfolio = source('src/components/pages/PortfolioPage.tsx');
    const faq = source('src/components/sections/FAQSection.tsx');

    expect(blog).toContain('aria-pressed={category === item}');
    expect(blog).toContain('min-h-10');
    expect(portfolio).toContain('aria-pressed={active === category}');
    expect(portfolio).toContain('size-11 shrink-0');
    expect(faq).toContain('aria-label="Search frequently asked questions"');
    expect(faq).toContain('aria-live="polite"');
  });
});
