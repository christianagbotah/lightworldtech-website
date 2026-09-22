import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import nextConfig from '../../next.config';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe('newsletter runtime reliability', () => {
  test('newsletter mail failures use an application status instead of gateway 502', () => {
    const route = source('src/app/api/admin/newsletter/route.ts');

    expect(route).toContain('status: 503');
    expect(route).toContain("'Retry-After': '30'");
    expect(route).not.toContain('{ status: 502 }');
  });

  test('newsletter admin tolerates non-JSON upstream error pages', () => {
    const admin = source('src/components/admin/AdminNewsletter.tsx');

    expect(admin).toContain('readNewsletterApiPayload');
    expect(admin).toContain('const raw = await response.text()');
    expect(admin).toContain('The website gateway returned');
    expect(admin).not.toContain("const payload = await response.json();");
  });

  test('production CSP explicitly permits the Cloudflare analytics beacon origin', async () => {
    const rules = (await nextConfig.headers?.()) as HeaderRule[];
    const publicRule = rules.find((entry) => entry.source === '/:path*');
    const csp = publicRule?.headers.find((header) => header.key === 'Content-Security-Policy')?.value || '';

    expect(csp).toContain('https://static.cloudflareinsights.com');
  });

  test('shared dialogs preserve real descriptions and explicitly silence only undescribed dialogs', () => {
    const dialog = source('src/components/ui/dialog.tsx');

    expect(dialog).toContain('containsDialogDescription');
    expect(dialog).toContain("child.type === DialogDescription");
    expect(dialog).toContain("'aria-describedby': undefined");
  });
});
