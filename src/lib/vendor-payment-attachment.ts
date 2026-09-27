import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { uploadStorageDirectory } from '@/lib/upload-storage';

export const MAX_VENDOR_PAYMENT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type VendorPaymentAttachmentType = {
  extension: 'jpg' | 'png' | 'webp' | 'pdf';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
};

const storageNamePattern = /^[a-f0-9]{32}\.(?:jpg|png|webp|pdf)$/;

export function detectVendorPaymentAttachment(bytes: Uint8Array): VendorPaymentAttachmentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { extension: 'png', mimeType: 'image/png' };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') {
    return { extension: 'pdf', mimeType: 'application/pdf' };
  }
  return null;
}

export function createVendorPaymentAttachmentStorageName(type: VendorPaymentAttachmentType): string {
  return randomBytes(16).toString('hex') + '.' + type.extension;
}

export function isSafeVendorPaymentAttachmentStorageName(value: string): boolean {
  return storageNamePattern.test(value);
}

export function vendorPaymentAttachmentDirectory(): string {
  return join(uploadStorageDirectory(), 'vendor-payments');
}
export function sanitizeVendorPaymentAttachmentName(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .trim()
    .slice(0, 180);
  return normalized || 'payment-proof';
}