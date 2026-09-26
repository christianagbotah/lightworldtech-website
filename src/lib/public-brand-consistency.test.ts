import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const publicBrandSurfaces = [
  'src/components/layout/Header.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/ui/page-hero.tsx',
  'src/components/layout/BackToTop.tsx',
  'src/components/layout/CookieConsent.tsx',
  'src/components/layout/AnnouncementBar.tsx',
  'src/components/layout/NewsletterPopup.tsx',
  'src/components/sections/ClientLogoCarousel.tsx',
  'src/components/ui/preloader.tsx',
  'src/components/ui/page-loader.tsx',
  'src/components/ui/back-to-top.tsx',
  'src/components/pages/HomePage.tsx',
  'src/components/pages/AboutPage.tsx',
  'src/components/pages/ServicesPage.tsx',
  'src/components/pages/ProductsPage.tsx',
  'src/components/pages/PortfolioPage.tsx',
  'src/components/pages/BlogPage.tsx',
  'src/components/pages/BlogDetailPage.tsx',
  'src/components/pages/CareersPage.tsx',
  'src/components/pages/TeamPage.tsx',
  'src/components/sections/AboutSection.tsx',
  'src/components/sections/ServicesSection.tsx',
  'src/components/sections/ProcessSection.tsx',
  'src/components/sections/FAQSection.tsx',
  'src/components/sections/TechStackSection.tsx',
  'src/components/sections/VideoTestimonialsSection.tsx',
  'src/components/sections/TestimonialsSection.tsx',
  'src/components/sections/IndustriesSection.tsx',
  'src/components/sections/StatsCounterSection.tsx',
  'src/components/sections/PricingSection.tsx',
  'src/components/ui/services-comparison.tsx',
  'src/components/ui/quotation-form.tsx',
  'src/components/ui/quote-calculator.tsx',
];

describe('public corporate brand consistency', () => {
  test('critical public surfaces do not use legacy green primary CTA styling', () => {
    for (const path of publicBrandSurfaces) {
      const content = source(path);
      expect(content).not.toContain('bg-emerald-600 hover:bg-emerald-700');
      expect(content).not.toContain('text-emerald-600 dark:text-emerald-400');
    }
  });

  test('header, footer and shared page hero use amber as the interaction accent', () => {
    const header = source('src/components/layout/Header.tsx');
    const footer = source('src/components/layout/Footer.tsx');
    const pageHero = source('src/components/ui/page-hero.tsx');

    expect(header).toContain('bg-amber-400');
    expect(header).toContain('text-amber-300');
    expect(footer).toContain('hover:text-amber-300');
    expect(footer).toContain('focus:border-amber-300/45');
    expect(pageHero).toContain('text-amber-300');
    expect(pageHero).toContain('border-amber-500/20');
  });

  test('contact keeps semantic WhatsApp and office-open green while form controls use gold', () => {
    const contact = source('src/components/pages/ContactPage.tsx');

    expect(contact).toContain('bg-emerald-400');
    expect(contact).toContain("officeOpen ? 'bg-emerald-400'");
    expect(contact).toContain('focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10');
    expect(contact).toContain('hover:bg-amber-600');
  });

  test('floating widgets preserve WhatsApp green but use gold for assistant actions', () => {
    const widgets = source('src/components/layout/FloatingWidgets.tsx');

    expect(widgets).toContain('bg-[#25D366]');
    expect(widgets).toContain('bg-amber-600');
    expect(widgets).toContain('hover:bg-amber-600 hover:border-amber-500');
  });
  test('supports safe installable PWA behavior without caching secure workspaces', () => {
    const manifest = source('src/app/manifest.ts');
    const layout = source('src/app/layout.tsx');
    const registrar = source('src/components/providers/PwaRegistrar.tsx');
    const worker = source('public/sw.js');
    const offline = source('src/app/offline/page.tsx');

    expect(manifest).toContain("display: 'standalone'");
    expect(manifest).toContain("scope: '/'");
    expect(manifest).toContain("categories: ['business', 'productivity', 'technology']");
    expect(layout).toContain('<PwaRegistrar />');
    expect(registrar).toContain("navigator.serviceWorker");
    expect(registrar).toContain("register('/sw.js', { scope: '/' })");
    expect(worker).toContain("'/api/'");
    expect(worker).toContain("'/admin'");
    expect(worker).toContain("'/client'");
    expect(worker).toContain("'/invoice'");
    expect(worker).toContain("request.mode !== 'navigate'");
    expect(worker).toContain("fetch(request).catch");
    expect(offline).toContain('Secure admin, client, invoice and payment areas are intentionally never served from offline cache.');
  });

});
