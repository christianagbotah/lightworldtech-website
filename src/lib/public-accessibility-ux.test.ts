import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public accessibility and mobile UX', () => {
  test('contact form exposes autofill-friendly field semantics and busy state', () => {
    const contact = source('src/components/pages/ContactPage.tsx');

    expect(contact).toContain('aria-busy={sending}');
    expect(contact).toContain('name="name"');
    expect(contact).toContain('autoComplete="name"');
    expect(contact).toContain('name="email"');
    expect(contact).toContain('autoComplete="email"');
    expect(contact).toContain('inputMode="email"');
    expect(contact).toContain('name="phone"');
    expect(contact).toContain('autoComplete="tel"');
    expect(contact).toContain('name="message"');
    expect(contact).toContain('lw-public-form-field');

    const styles = source('src/app/globals.css');
    expect(styles).toContain('.lw-public-form-field > :is(input, select, textarea)');
    expect(styles).toContain('margin-top: 0.5rem');
  });

  test('newsletter forms expose email semantics and keyboard focus feedback', () => {
    const popup = source('src/components/layout/NewsletterPopup.tsx');
    const footer = source('src/components/layout/Footer.tsx');

    expect(popup).toContain('aria-busy={loading}');
    expect(popup).toContain('aria-label="Email address"');
    expect(popup).toContain('autoComplete="email"');
    expect(footer).toContain('aria-busy={submitting}');
    expect(footer).toContain('focus:ring-2 focus:ring-amber-300/15');
  });

  test('cookie customization exposes expanded state and named switches', () => {
    const cookies = source('src/components/layout/CookieConsent.tsx');

    expect(cookies).toContain('aria-expanded={showCustomize}');
    expect(cookies).toContain('aria-controls="cookie-preferences-panel"');
    expect(cookies).toContain('id="cookie-preferences-panel"');
    expect(cookies).toContain('aria-label={cat.name}');
  });

  test('mobile navigation exposes visible keyboard focus treatment', () => {
    const header = source('src/components/layout/Header.tsx');

    expect(header).toContain('focus-visible:ring-2 focus-visible:ring-amber-400/60');
    expect(header).toContain('focus-visible:ring-2 focus-visible:ring-amber-300/70');
    expect(header).toContain("aria-current={active(item.href) ? 'page' : undefined}");
  });
});
