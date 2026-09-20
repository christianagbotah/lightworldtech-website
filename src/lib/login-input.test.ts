import { describe, expect, test } from 'bun:test';
import { adminLoginSchema, clientLoginSchema } from './login-input';

describe('login input validation', () => {
  test('normalizes email addresses consistently', () => {
    expect(adminLoginSchema.parse({
      email: ' ADMIN@Example.COM ',
      password: 'valid-password',
    }).email).toBe('admin@example.com');

    expect(clientLoginSchema.parse({
      email: ' CLIENT@Example.COM ',
      password: 'valid-password',
    }).email).toBe('client@example.com');
  });

  test('rejects malformed email addresses', () => {
    expect(adminLoginSchema.safeParse({
      email: 'not-an-email',
      password: 'password',
    }).success).toBe(false);
  });

  test('rejects empty and oversized passwords before password hashing', () => {
    expect(adminLoginSchema.safeParse({
      email: 'admin@example.com',
      password: '',
    }).success).toBe(false);

    expect(adminLoginSchema.safeParse({
      email: 'admin@example.com',
      password: 'x'.repeat(257),
    }).success).toBe(false);
  });

  test('accepts the configured maximum password length', () => {
    expect(clientLoginSchema.safeParse({
      email: 'client@example.com',
      password: 'x'.repeat(256),
    }).success).toBe(true);
  });
});
