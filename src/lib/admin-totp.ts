import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function encryptionKey(): Buffer {
  const secret =
    process.env.ADMIN_TOTP_ENCRYPTION_KEY ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (secret) return createHash('sha256').update(secret).digest();
  if (process.env.NODE_ENV !== 'production') {
    return createHash('sha256').update('lightworld-dev-totp-secret-change-before-production').digest();
  }

  throw new Error('ADMIN_TOTP_ENCRYPTION_KEY, ADMIN_SESSION_SECRET or NEXTAUTH_SECRET must be configured');
}

export function base32Encode(input: Buffer): string {
  let bits = '';
  for (const byte of input) bits += byte.toString(2).padStart(8, '0');

  let output = '';
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  if (!normalized) throw new Error('Invalid base32 secret');

  let bits = '';
  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Invalid base32 secret');
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(secret: string, nowMs = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function verifyTotpCode(secret: string, candidate: string, nowMs = Date.now()): boolean {
  const normalized = candidate.replace(/\D/g, '');
  if (normalized.length !== TOTP_DIGITS) return false;

  for (const step of [-1, 0, 1]) {
    const expected = totpCode(secret, nowMs + step * TOTP_PERIOD_SECONDS * 1000);
    const suppliedBuffer = Buffer.from(normalized);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) return true;
  }

  return false;
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptTotpSecret(payload: string): string {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = payload.split('.');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Invalid encrypted TOTP secret');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function totpProvisioningUri(secret: string, email: string): string {
  const issuer = 'Lightworld Technologies';
  const label = encodeURIComponent(issuer + ':' + email);
  return 'otpauth://totp/' + label +
    '?secret=' + encodeURIComponent(secret) +
    '&issuer=' + encodeURIComponent(issuer) +
    '&algorithm=SHA1&digits=6&period=30';
}

export function createRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    return raw.slice(0, 5) + '-' + raw.slice(5);
  });
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256')
    .update(code.trim().toUpperCase().replace(/\s/g, ''))
    .digest('base64url');
}

export function verifyRecoveryCode(
  storedHashesJson: string,
  candidate: string,
): { valid: boolean; remaining: string[] } {
  let hashes: string[] = [];
  try {
    const parsed = JSON.parse(storedHashesJson);
    if (Array.isArray(parsed)) hashes = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    hashes = [];
  }

  const candidateHash = hashRecoveryCode(candidate);
  const candidateBuffer = Buffer.from(candidateHash);

  const index = hashes.findIndex((stored) => {
    const storedBuffer = Buffer.from(stored);
    return storedBuffer.length === candidateBuffer.length && timingSafeEqual(storedBuffer, candidateBuffer);
  });

  if (index < 0) return { valid: false, remaining: hashes };
  return {
    valid: true,
    remaining: hashes.filter((_, itemIndex) => itemIndex !== index),
  };
}
