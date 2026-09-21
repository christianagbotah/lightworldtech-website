import { describe, expect, test } from 'bun:test';
import {
  createSupportAttachmentStorageName,
  detectSupportAttachment,
  isSafeSupportAttachmentStorageName,
  sanitizeSupportAttachmentName,
} from './support-attachment';

describe('private support attachment safety', () => {
  test('detects only allowed evidence formats from bytes', () => {
    expect(detectSupportAttachment(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mimeType).toBe('image/jpeg');
    expect(detectSupportAttachment(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))?.mimeType).toBe('image/png');
    expect(detectSupportAttachment(new TextEncoder().encode('RIFFxxxxWEBP'))?.mimeType).toBe('image/webp');
    expect(detectSupportAttachment(new TextEncoder().encode('%PDF-1.7'))?.mimeType).toBe('application/pdf');
    expect(detectSupportAttachment(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
  });

  test('creates unguessable constrained storage names', () => {
    const name = createSupportAttachmentStorageName({ extension: 'pdf', mimeType: 'application/pdf' });
    expect(name).toMatch(/^[a-f0-9]{32}\.pdf$/);
    expect(isSafeSupportAttachmentStorageName(name)).toBe(true);
    expect(isSafeSupportAttachmentStorageName('../ticket.pdf')).toBe(false);
  });

  test('sanitizes original filenames without trusting path input', () => {
    expect(sanitizeSupportAttachmentName('../../proof.pdf')).toBe('..-..-proof.pdf');
    expect(sanitizeSupportAttachmentName('  screenshot.png  ')).toBe('screenshot.png');
  });
});
