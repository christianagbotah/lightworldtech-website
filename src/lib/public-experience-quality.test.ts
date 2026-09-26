import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public experience quality', () => {
  test('filters malformed public authority links before rendering recognition or coverage', () => {
    const profile = source('src/lib/company-profile.ts');
    const home = source('src/components/pages/HomePage.tsx');
    const newsroom = source('src/app/newsroom/page.tsx');

    expect(profile).toContain('export function isSafePublicSourceUrl');
    expect(profile).toContain("url.protocol === 'https:'");
    expect(home).toContain('isSafePublicSourceUrl(item.href)');
    expect(newsroom).toContain('isSafePublicSourceUrl(item.href)');
    expect(newsroom).not.toContain("href={String(item.href || '#')}");
  });

  test('global motion preferences are respected by Framer Motion and CSS', () => {
    const layout = source('src/app/layout.tsx');
    const provider = source('src/components/providers/MotionPreferenceProvider.tsx');
    const css = source('src/app/globals.css');

    expect(layout).toContain('MotionPreferenceProvider');
    expect(provider).toContain('reducedMotion="user"');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation: none !important');
  });

  test('public CMS background refreshes tolerate malformed gateway responses', () => {
    const pages = [
      'src/components/pages/BlogPage.tsx',
      'src/components/pages/ServicesPage.tsx',
      'src/components/pages/PortfolioPage.tsx',
      'src/components/pages/HomePage.tsx',
      'src/components/ui/command-palette.tsx',
    ];
    for (const path of pages) {
      const value = source(path);
      expect(value).toContain('readJsonSafely');
      expect(value).not.toContain('response.ok ? response.json()');
      expect(value).not.toContain('return response.json();');
    }
  });

  test('public and client submissions tolerate empty or malformed JSON responses', () => {
    const helper = source('src/lib/http-response.ts');
    const footer = source('src/components/layout/Footer.tsx');
    const products = source('src/components/pages/ProductsPage.tsx');
    const quotation = source('src/components/ui/quotation-form.tsx');
    const testimonials = source('src/components/sections/TestimonialsSection.tsx');
    const activate = source('src/components/client/ClientActivatePage.tsx');
    const reset = source('src/components/client/ClientResetPasswordPage.tsx');
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(helper).toContain('readJsonSafely');
    expect(helper).toContain('requireJson');
    expect(footer).toContain("requireJson<any>(response, 'Subscription request failed')");
    expect(products).toContain("requireJson<any>(response, 'Unable to subscribe')");
    expect(quotation).toContain('readJsonSafely<any>(response)');
    expect(testimonials).toContain('readJsonSafely<any>(response)');
    expect(activate).toContain('readJsonSafely<any>(response)');
    expect(reset).toContain('readJsonSafely<any>(response)');
    expect(portal).toContain('response.json().catch(() => null)');
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
    expect(loading).toContain('animate-[spin_1.35s_linear_infinite]');
    expect(loading).toContain('animate-[spin_2.1s_linear_infinite_reverse]');
    expect(loading).toContain('motion-reduce:animate-none');
    expect(layout).toContain('<Suspense fallback={null}>');
    expect(layout).toContain('<SeoStructuredData />');
    expect(layout).not.toContain('export default async function RootLayout');
    expect(seoIsland).toContain('await getSeoConfig()');
    expect(globalPage).toContain('initial={false} animate={{ opacity: 1, y: 0 }}');
    expect(home).toContain('initial={false}');
    expect(pageHero).toContain('initial={false}');
    expect(globalPage).not.toContain('initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}');
  });

  test('keeps consistent form label spacing without doubling explicit field gaps', () => {
    const label = source('src/components/ui/label.tsx');
    const globals = source('src/app/globals.css');
    const taxWorkspace = source('src/components/admin/FinanceTaxWorkspace.tsx');

    expect(label).toContain('text-sm leading-5 font-medium');
    expect(label).not.toContain('text-sm leading-none font-medium');
    expect(globals).toContain(':where(div, section, fieldset):not([class*="gap-"]):not([class*="space-y-"])');
    expect(globals).toContain('> [data-slot="label"]:not(.sr-only)');
    expect(globals).toContain('+ :is([data-slot="input"], [data-slot="textarea"], [data-slot="select-trigger"])');
    expect(globals).toContain('input:not([type="checkbox"]):not([type="radio"])');
    expect(globals).toContain('margin-top: 0.375rem');
    expect(taxWorkspace).toContain('<div><Label>VAT registration number</Label><Input');
  });

  test('carries structured AI project scope into the public contact form', () => {
    const floating = source('src/components/layout/FloatingWidgets.tsx');
    const contact = source('src/components/pages/ContactPage.tsx');

    expect(floating).toContain("PROJECT_BRIEF_DATA_KEY = 'lw-project-brief-data'");
    expect(floating).toContain('projectScope?: ProjectScopeHandoff');
    expect(floating).toContain('nextState.step === \'done\'');
    expect(floating).toContain('JSON.stringify(msg.projectScope)');
    expect(contact).toContain("sessionStorage.getItem('lw-project-brief-data')");
    expect(contact).toContain('mapAssistantService');
    expect(contact).toContain('mapAssistantTimeline');
    expect(contact).toContain("'Mobile application'");
    expect(contact).toContain("'Enterprise software / automation'");
    expect(contact).toContain("'AI-enabled workflow'");
    expect(contact).toContain("'1 – 3 months'");
    expect(contact).toContain("sessionStorage.removeItem('lw-project-brief-data')");
  });

  test('product cards use consistent visual and title alignment', () => {
    const products = source('src/components/pages/ProductsPage.tsx');

    expect(products).toContain("import Image from 'next/image'");
    expect(products.match(/image: '\/images\//g)?.length).toBeGreaterThanOrEqual(6);
    expect(products).toContain('aspect-[16/9]');
    expect(products).toContain('grid-rows-[58px_minmax(96px,1fr)_auto]');
    expect(products).toContain('line-clamp-2 text-xl font-semibold');
    expect(products).toContain('group-hover:scale-[1.035]');
    expect(products).not.toContain('mt-auto pt-9');
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
