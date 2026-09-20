import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export type SupportedImageUpload = {
  extension: 'jpg' | 'png' | 'gif' | 'webp';
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
};

const filenamePattern = /^[a-f0-9]{32}\.(?:jpg|png|gif|webp)$/;

export function detectImageUpload(bytes: Uint8Array): SupportedImageUpload | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: 'png', mimeType: 'image/png' };
  }

  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === 'GIF87a' || signature === 'GIF89a') {
      return { extension: 'gif', mimeType: 'image/gif' };
    }
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  return null;
}

export function createImageUploadFilename(type: SupportedImageUpload): string {
  return randomBytes(16).toString('hex') + '.' + type.extension;
}

export function isSafeImageUploadFilename(filename: string): boolean {
  return filenamePattern.test(filename);
}

export function imageUploadContentType(filename: string): SupportedImageUpload['mimeType'] | null {
  if (!isSafeImageUploadFilename(filename)) return null;
  if (filename.endsWith('.jpg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.gif')) return 'image/gif';
  if (filename.endsWith('.webp')) return 'image/webp';
  return null;
}

export function uploadStorageDirectory(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) return resolve(configured);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('UPLOAD_DIR must be configured in production');
  }

  return resolve(process.cwd(), 'public', 'uploads');
}
