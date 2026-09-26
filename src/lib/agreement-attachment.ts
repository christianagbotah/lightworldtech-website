import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { uploadStorageDirectory } from '@/lib/upload-storage';

export const MAX_AGREEMENT_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const storageNamePattern = /^[a-f0-9]{32}\.pdf$/;

export function detectAgreementAttachment(bytes: Uint8Array) {
  if (
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
  ) {
    return { extension: 'pdf' as const, mimeType: 'application/pdf' as const };
  }
  return null;
}

export function createAgreementAttachmentStorageName(): string {
  return randomBytes(16).toString('hex') + '.pdf';
}

export function isSafeAgreementAttachmentStorageName(value: string): boolean {
  return storageNamePattern.test(value);
}

export function agreementAttachmentDirectory(): string {
  return join(uploadStorageDirectory(), 'agreements');
}

export function sanitizeAgreementAttachmentName(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .trim()
    .slice(0, 180);
  return normalized || 'agreement.pdf';
}