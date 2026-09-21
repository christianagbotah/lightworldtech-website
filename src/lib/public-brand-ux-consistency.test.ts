import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const goldBrandSurfaces = [
  'src/components/layout/Header.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/layout/CookieConsent.tsx',
  'src/components/layout/AnnouncementBar.tsx',
  'src/components/layout/NewsletterPopup.tsx',
  'src/components/ui/page-hero.tsx',
  'src/components/ui/preloader.tsx',
  'src/components/ui/page-loader.tsx',
  'src/components/pages/HomePage.tsx',
  'src/components/pages/AboutPage.tsx',
  'src/components/pages/ServicesPage.tsx',
  'src/components/pages/PortfolioPage.tsx',
  'src/components/pages/TeamPage.tsx',
  'src/components/pages/CareersPage.tsx',
  'src/components/pages/ProductsPage.tsx',
  'src/components/pages/BlogPage.tsx',
  'src/components/pages/BlogDetailPage.tsx',
  'src/components/sections/HeroSection.tsx',
  'src/components/sections/AboutSection.tsx',
  'src/components/sections/CTASection.tsx',
  'src/components/sections/ServicesSection.tsx',
  'src/components/sections/ProcessSection.tsx',
  'src/components/sections/PortfolioSection.tsx',
  'src/components/sections/FAQSection.tsx',
  'src/components/sections/IndustriesSection.tsx',
  'src/components/sections/TestimonialsSection.tsx',
  'src/components/sections/VideoTestimonialsSection.tsx',
  'src/components/sections/PricingSection.tsx',
  'src/components/sections/StatsCounterSection.tsx',
  'src/components/sections/ClientLogoCarousel.tsx',
  'src/components/ui/services-comparison.tsx',
  'src/components/ui/quote-calculator.tsx',
  'src/components/ui/quotation-form.tsx',
];

describe('public brand and UX consistency', () => {
  test('ordinary public brand surfaces do not use the retired emerald palette', () => {
    for (const path of goldBrandSurfaces) {
      expect(source(path)).not.toContain('emerald-');
    }
  });

  test('contact page keeps green only for WhatsApp and live business-hours state', () => {
    const contact = source('src/components/pages/ContactPage.tsx');
    const emeraldUses = contact.match(/emerald-/g) || [];

    expect(emeraldUses).toHaveLength(2);
    expect(contact).toContain("officeOpen ? 'bg-emerald-400'");
    expect(contact).toContain('bg-emerald-400 px-5 text-sm font-semibold text-slate-950');
    expect(contact).not.toContain('focus:border-emerald');
    expect(contact).not.toContain('hover:bg-emerald-600');
  });

  test('floating widgets reserve emerald styling for the WhatsApp popup only', () => {
    const widgets = source('src/components/layout/FloatingWidgets.tsx');
    const emeraldUses = widgets.match(/emerald-/g) || [];

    expect(emeraldUses).toHaveLength(1);
    expect(widgets).toContain('bg-[#25D366]');
    expect(widgets).toContain('text-xs text-emerald-600');
  });

  test('header and footer primary conversion actions use the gold interaction system', () => {
    const header = source('src/components/layout/Header.tsx');
    const footer = source('src/components/layout/Footer.tsx');

    expect(header).toContain('dark:bg-amber-400');
    expect(header).toContain('bg-amber-400 text-sm font-semibold');
    expect(footer).toContain('bg-amber-400 text-slate-950');
    expect(footer).toContain('focus:ring-2 focus:ring-amber-300/15');
  });
});
