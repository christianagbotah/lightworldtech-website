import { describe, expect, test } from 'bun:test';

import {
  createInvoiceAccessToken,
  hashInvoiceAccessToken,
  invoiceAccessUrl,
} from './invoice-access-link';

describe('secure invoice access links', () => {
  test('creates opaque tokens and persists only deterministic hashes', () => {
    const access = createInvoiceAccessToken(30);
    expect(access.token.length).toBeGreaterThan(30);
    expect(access.tokenHash).toBe(hashInvoiceAccessToken(access.token));
    expect(access.tokenHash).not.toContain(access.token);
    expect(access.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('production invoice URLs never use localhost', () => {
    const previous = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    const url = invoiceAccessUrl('opaque-token', 'http://localhost:3007');
    expect(url).toBe('https://lightworldtech.com/invoice/opaque-token');
    Object.defineProperty(process.env, 'NODE_ENV', { value: previous, configurable: true });
  });
});
