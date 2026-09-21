import { describe, expect, test } from 'bun:test';
import nextConfig from '../../next.config';

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

async function configuredHeaders(): Promise<HeaderRule[]> {
  const headers = nextConfig.headers;
  if (!headers) return [];
  return (await headers()) as HeaderRule[];
}

function headerValue(rule: HeaderRule | undefined, key: string): string | undefined {
  return rule?.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
}

describe('private API cache-control policy', () => {
  test('marks authenticated admin, client, and upload APIs private and no-store', async () => {
    const rules = await configuredHeaders();

    for (const source of ['/api/admin/:path*', '/api/client/:path*', '/api/upload']) {
      const rule = rules.find((entry) => entry.source === source);
      expect(rule).toBeDefined();
      expect(headerValue(rule, 'Cache-Control')).toBe(
        'private, no-store, no-cache, must-revalidate, max-age=0',
      );
      expect(headerValue(rule, 'Pragma')).toBe('no-cache');
      expect(headerValue(rule, 'Expires')).toBe('0');
    }
  });

  test('keeps the admin page shell private and no-store', async () => {
    const rules = await configuredHeaders();
    const admin = rules.find((entry) => entry.source === '/admin/:path*');

    expect(headerValue(admin, 'Cache-Control')).toContain('no-store');
  });

  test('continues to apply baseline security headers to authenticated API rules', async () => {
    const rules = await configuredHeaders();
    const adminApi = rules.find((entry) => entry.source === '/api/admin/:path*');

    expect(headerValue(adminApi, 'X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue(adminApi, 'Content-Security-Policy')).toContain("default-src 'self'");
    expect(headerValue(adminApi, 'Content-Security-Policy')).toContain(
      "frame-src 'self' https://www.google.com https://maps.google.com",
    );
  });
});
