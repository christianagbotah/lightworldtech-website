import { describe, expect, test } from 'bun:test';
import {
  createImageUploadFilename,
  detectImageUpload,
  imageUploadContentType,
  isSafeImageUploadFilename,
} from './upload-storage';

describe('persistent image upload safety', () => {
  test('detects supported image signatures from content bytes', () => {
    expect(detectImageUpload(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
      extension: 'jpg',
      mimeType: 'image/jpeg',
    });

    expect(
      detectImageUpload(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toEqual({ extension: 'png', mimeType: 'image/png' });

    expect(detectImageUpload(new TextEncoder().encode('GIF89a'))).toEqual({
      extension: 'gif',
      mimeType: 'image/gif',
    });

    expect(detectImageUpload(new TextEncoder().encode('RIFFxxxxWEBP'))).toEqual({
      extension: 'webp',
      mimeType: 'image/webp',
    });
  });

  test('rejects non-image bytes even when they could have an image filename', () => {
    expect(detectImageUpload(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageUpload(new TextEncoder().encode('%PDF-1.7'))).toBeNull();
  });

  test('creates unguessable filenames constrained to supported extensions', () => {
    const first = createImageUploadFilename({ extension: 'png', mimeType: 'image/png' });
    const second = createImageUploadFilename({ extension: 'png', mimeType: 'image/png' });

    expect(first).not.toBe(second);
    expect(isSafeImageUploadFilename(first)).toBe(true);
    expect(imageUploadContentType(first)).toBe('image/png');
  });

  test('rejects traversal, arbitrary names, and executable extensions', () => {
    expect(isSafeImageUploadFilename('../secret.png')).toBe(false);
    expect(isSafeImageUploadFilename('avatar.png')).toBe(false);
    expect(isSafeImageUploadFilename('0123456789abcdef0123456789abcdef.php')).toBe(false);
    expect(imageUploadContentType('0123456789abcdef0123456789abcdef.svg')).toBeNull();
  });
});
