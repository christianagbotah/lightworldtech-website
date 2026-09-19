import { afterEach, describe, expect, test } from 'bun:test';
import { buildMimeMessage, getMailTransportStatus } from './mail';

const originalEnv = {
  MAIL_TRANSPORT: process.env.MAIL_TRANSPORT,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('mail transport safety', () => {
  test('sanitizes recipient and subject headers to prevent header injection', () => {
    const mime = buildMimeMessage({
      to: 'person@example.com\r\nBcc: hidden@example.com',
      subject: 'Hello\r\nX-Injected: yes',
      text: 'Plain text',
      html: '<p>HTML</p>',
    });

    expect(mime).toContain('To: person@example.com Bcc: hidden@example.com');
    expect(mime).toContain('Subject: Hello X-Injected: yes');
    expect(mime).not.toContain('\r\nBcc: hidden@example.com');
    expect(mime).not.toContain('\r\nX-Injected: yes');
  });

  test('encodes non-ASCII subjects as an RFC 2047 encoded word', () => {
    const mime = buildMimeMessage({
      to: 'person@example.com',
      subject: 'Akwaaba — Lightworld',
      text: 'Plain text',
      html: '<p>HTML</p>',
    });

    expect(mime).toContain('Subject: =?UTF-8?B?');
    expect(mime).toContain('Message-ID: <');
    expect(mime).toContain('Date: ');
  });

  test('selects authenticated SMTP diagnostics without exposing credentials', () => {
    process.env.MAIL_TRANSPORT = 'smtp';
    process.env.SMTP_HOST = 'relay.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'relay-user';
    process.env.SMTP_PASS = 'super-secret-password';

    const status = getMailTransportStatus();

    expect(status.mode).toBe('smtp');
    expect(status.host).toBe('relay.example.com');
    expect(status.port).toBe(587);
    expect(status.authConfigured).toBe(true);
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain('super-secret-password');
    expect(JSON.stringify(status)).not.toContain('relay-user');
  });
});
