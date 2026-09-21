import { beforeEach, describe, expect, test } from 'bun:test';
import {
  createRecoveryCodes,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  hashRecoveryCode,
  totpCode,
  verifyRecoveryCode,
  verifyTotpCode,
} from './admin-totp';

describe('administrator TOTP MFA', () => {
  beforeEach(() => {
    process.env.ADMIN_TOTP_ENCRYPTION_KEY = 'ci-test-totp-encryption-key-that-is-long-enough';
  });

  test('matches the RFC 6238 SHA1 vector truncated to six digits', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    expect(totpCode(secret, 59_000)).toBe('287082');
    expect(verifyTotpCode(secret, '287082', 59_000)).toBe(true);
    expect(verifyTotpCode(secret, '287082', 89_000)).toBe(true);
    expect(verifyTotpCode(secret, '287082', 119_000)).toBe(false);
  });

  test('generates and encrypts a base32 secret without storing plaintext', () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(encrypted).toStartWith('v1.');
    expect(encrypted).not.toContain(secret);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });

  test('creates unique one-time recovery codes and consumes a matching hash', () => {
    const codes = createRecoveryCodes(10);
    const hashes = codes.map(hashRecoveryCode);

    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
    expect(hashes[0]).not.toBe(codes[0]);

    const result = verifyRecoveryCode(JSON.stringify(hashes), codes[0]);
    expect(result.valid).toBe(true);
    expect(result.remaining).toHaveLength(9);
    expect(verifyRecoveryCode(JSON.stringify(result.remaining), codes[0]).valid).toBe(false);
  });
});
