import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public security disclosure', () => {
  test('publishes a standards-oriented security.txt endpoint', () => {
    const route = source('src/app/.well-known/security.txt/route.ts');

    expect(route).toContain('Contact: mailto:mail@lightworldtech.com');
    expect(route).toContain('Canonical: https://lightworldtech.com/.well-known/security.txt');
    expect(route).toContain('Policy: https://lightworldtech.com/security');
    expect(route).toContain('Preferred-Languages: en');
    expect(route).toContain('Expires: ');
    expect(route).toContain("Content-Type': 'text/plain; charset=utf-8'");
  });

  test('keeps disclosure claims scoped and discoverable', () => {
    const page = source('src/app/security/page.tsx');
    const trust = source('src/app/trust/page.tsx');
    const footer = source('src/components/layout/Footer.tsx');
    const sitemap = source('src/app/sitemap.ts');

    expect(page).toContain('This page is a reporting policy, not a bug-bounty promise or certification claim.');
    expect(page).toContain('Do not send passwords, private keys, access tokens');
    expect(page).toContain('We do not promise a reward or fixed response deadline on this page.');
    expect(trust).toContain('href="/security"');
    expect(trust).toContain('Vulnerability disclosure');
    expect(footer).toContain('href="/security"');
    expect(footer).toContain('>Security</Link>');
    expect(sitemap).toContain("base + '/security'");
  });
});
