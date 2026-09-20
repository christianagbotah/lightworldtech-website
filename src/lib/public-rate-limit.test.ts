import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { consumePublicRateLimit } from './public-rate-limit';

describe('public rate-limit proxy identity', () => {
  test('uses proxy-overwritten X-Real-IP instead of spoofable forwarded headers', () => {
    const first = new NextRequest('https://lightworldtech.com/api/test', {
      headers: {
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.1, 203.0.113.10',
        'cf-connecting-ip': '192.0.2.1',
      },
    });
    const second = new NextRequest('https://lightworldtech.com/api/test', {
      headers: {
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.99, 203.0.113.10',
        'cf-connecting-ip': '192.0.2.99',
      },
    });

    expect(consumePublicRateLimit(first, 'proxy-real-ip-test', 1, 60_000).allowed).toBe(true);
    expect(consumePublicRateLimit(second, 'proxy-real-ip-test', 1, 60_000).allowed).toBe(false);
  });

  test('uses the right-most forwarded address when X-Real-IP is unavailable', () => {
    const first = new NextRequest('https://lightworldtech.com/api/test', {
      headers: { 'x-forwarded-for': '198.51.100.1, 203.0.113.20' },
    });
    const second = new NextRequest('https://lightworldtech.com/api/test', {
      headers: { 'x-forwarded-for': '198.51.100.99, 203.0.113.20' },
    });

    expect(consumePublicRateLimit(first, 'proxy-forwarded-test', 1, 60_000).allowed).toBe(true);
    expect(consumePublicRateLimit(second, 'proxy-forwarded-test', 1, 60_000).allowed).toBe(false);
  });
});
