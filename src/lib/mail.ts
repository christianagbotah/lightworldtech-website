import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import net from 'node:net';
import { spawn } from 'node:child_process';
import tls from 'node:tls';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailSendResult {
  transport: 'smtp' | 'sendmail';
}

export interface MailTransportStatus {
  mode: 'smtp' | 'sendmail';
  configured: boolean;
  host: string;
  port: number | null;
  secure: boolean;
  authConfigured: boolean;
  from: string;
  replyTo: string;
  warning: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  username: string;
  password: string;
  timeoutMs: number;
  heloName: string;
  from: string;
  replyTo: string;
}

type SmtpSocket = net.Socket | tls.TLSSocket;

interface SmtpReply {
  code: number;
  message: string;
}

interface PendingReply {
  resolve: (reply: SmtpReply) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_FROM = 'Lightworld Technologies <mail@lightworldtech.com>';
const DEFAULT_REPLY_TO = 'mail@lightworldtech.com';

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string): string {
  const cleaned = cleanHeader(value);
  if (/[^\x20-\x7E]/.test(cleaned)) {
    return '=?UTF-8?B?' + Buffer.from(cleaned, 'utf8').toString('base64') + '?=';
  }
  return cleaned;
}

function envBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

function envInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function extractAddress(value: string): string {
  const cleaned = cleanHeader(value);
  const match = cleaned.match(/<([^>]+)>/);
  const address = (match ? match[1] : cleaned).trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) {
    throw new Error('Invalid mail address');
  }
  return address;
}

function resolveMode(): 'smtp' | 'sendmail' {
  const requested = (process.env.MAIL_TRANSPORT || 'auto').trim().toLowerCase();
  if (requested === 'smtp') return 'smtp';
  if (requested === 'sendmail') return 'sendmail';
  return process.env.SMTP_HOST?.trim() ? 'smtp' : 'sendmail';
}

function smtpConfig(): SmtpConfig {
  const port = envInteger(process.env.SMTP_PORT, 587);
  const secure = envBoolean(process.env.SMTP_SECURE, port === 465);
  return {
    host: (process.env.SMTP_HOST || '').trim(),
    port,
    secure,
    requireTls: envBoolean(process.env.SMTP_REQUIRE_TLS, !secure),
    username: (process.env.SMTP_USER || process.env.SMTP_USERNAME || '').trim(),
    password: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
    timeoutMs: envInteger(process.env.SMTP_TIMEOUT_MS, 12_000),
    heloName: cleanHeader(process.env.SMTP_HELO || 'lightworldtech.com'),
    from: cleanHeader(process.env.MAIL_FROM || DEFAULT_FROM),
    replyTo: cleanHeader(process.env.MAIL_REPLY_TO || DEFAULT_REPLY_TO),
  };
}

export function getMailTransportStatus(): MailTransportStatus {
  const mode = resolveMode();
  const config = smtpConfig();
  const hasUser = Boolean(config.username);
  const hasPass = Boolean(config.password);
  const configured =
    mode === 'sendmail'
      ? true
      : Boolean(config.host) && hasUser === hasPass;

  let warning = '';
  if (mode === 'sendmail') {
    warning =
      'Local sendmail is active. Delivery depends on the VPS being allowed to make outbound SMTP connections; an authenticated relay on port 587 or 465 is recommended for production.';
  } else if (!config.host) {
    warning = 'SMTP transport is selected but SMTP_HOST is not configured.';
  } else if (hasUser !== hasPass) {
    warning = 'SMTP authentication is incomplete. Configure both SMTP_USER and SMTP_PASS, or neither for a trusted relay.';
  }

  return {
    mode,
    configured,
    host: mode === 'smtp' ? config.host : 'local sendmail',
    port: mode === 'smtp' ? config.port : null,
    secure: mode === 'smtp' ? config.secure : false,
    authConfigured: mode === 'smtp' && hasUser && hasPass,
    from: config.from,
    replyTo: config.replyTo,
    warning,
  };
}

function buildMessageId(from: string): string {
  const address = extractAddress(from);
  const domain = address.split('@')[1] || 'lightworldtech.com';
  return '<' + Date.now().toString(36) + '.' + randomBytes(8).toString('hex') + '@' + domain + '>';
}

export function buildMimeMessage(message: MailMessage, config = smtpConfig()): string {
  const to = cleanHeader(message.to);
  const subject = encodeHeader(message.subject);
  const boundary = 'lw_' + randomBytes(12).toString('hex');

  return [
    'From: ' + config.from,
    'Reply-To: ' + config.replyTo,
    'To: ' + to,
    'Subject: ' + subject,
    'Date: ' + new Date().toUTCString(),
    'Message-ID: ' + buildMessageId(config.from),
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text,
    '',
    '--' + boundary,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    '',
    '--' + boundary + '--',
    '',
  ].join('\r\n');
}

class SmtpReplyReader {
  private buffer = '';
  private currentCode: number | null = null;
  private currentLines: string[] = [];
  private replies: SmtpReply[] = [];
  private pending: PendingReply[] = [];
  private failed: Error | null = null;

  private readonly onData = (chunk: string | Buffer) => {
    this.buffer += chunk.toString();
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line) continue;
      const match = line.match(/^(\d{3})([ -])(.*)$/);

      if (!match) {
        if (this.currentCode !== null) this.currentLines.push(line);
        continue;
      }

      const code = Number(match[1]);
      if (this.currentCode === null) this.currentCode = code;
      this.currentLines.push(line);

      if (match[2] === ' ' && code === this.currentCode) {
        const reply = {
          code,
          message: this.currentLines.join('\n'),
        };
        this.currentCode = null;
        this.currentLines = [];
        this.emit(reply);
      }
    }
  };

  private readonly onError = (error: Error) => {
    this.fail(error);
  };

  private readonly onClose = () => {
    if (!this.failed) this.fail(new Error('SMTP connection closed'));
  };

  constructor(private readonly socket: SmtpSocket) {
    this.socket.setEncoding('utf8');
    this.socket.on('data', this.onData);
    this.socket.on('error', this.onError);
    this.socket.on('close', this.onClose);
  }

  read(timeoutMs: number): Promise<SmtpReply> {
    if (this.failed) return Promise.reject(this.failed);
    const queued = this.replies.shift();
    if (queued) return Promise.resolve(queued);

    return new Promise<SmtpReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.pending.findIndex((item) => item.resolve === resolve);
        if (index >= 0) this.pending.splice(index, 1);
        reject(new Error('SMTP response timed out'));
      }, timeoutMs);

      this.pending.push({ resolve, reject, timer });
    });
  }

  dispose() {
    this.socket.off('data', this.onData);
    this.socket.off('error', this.onError);
    this.socket.off('close', this.onClose);
  }

  private emit(reply: SmtpReply) {
    const pending = this.pending.shift();
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(reply);
      return;
    }
    this.replies.push(reply);
  }

  private fail(error: Error) {
    this.failed = error;
    for (const pending of this.pending.splice(0)) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }
}

function assertReply(reply: SmtpReply, expected: number[], action: string) {
  if (!expected.includes(reply.code)) {
    throw new Error(action + ' failed with SMTP ' + reply.code + ': ' + reply.message);
  }
}

async function writeSocket(socket: SmtpSocket, value: string) {
  if (!socket.write(value, 'utf8')) {
    await once(socket, 'drain');
  }
}

async function command(
  socket: SmtpSocket,
  reader: SmtpReplyReader,
  value: string,
  expected: number[],
  timeoutMs: number,
) {
  await writeSocket(socket, value + '\r\n');
  const reply = await reader.read(timeoutMs);
  assertReply(reply, expected, value.split(' ')[0]);
  return reply;
}

async function waitForSocket(
  socket: SmtpSocket,
  eventName: 'connect' | 'secureConnect',
  timeoutMs: number,
) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onReady);
      socket.off('error', onError);
    };

    socket.once(eventName, onReady);
    socket.once('error', onError);
  });
}

function normalizeData(payload: string): string {
  const normalized = payload.replace(/\r?\n/g, '\r\n').replace(/(^|\r\n)\./g, '$1..');
  return normalized.replace(/\r\n$/, '') + '\r\n.\r\n';
}

async function sendViaSmtp(message: MailMessage, config: SmtpConfig): Promise<void> {
  if (!config.host) throw new Error('SMTP_HOST is required for SMTP transport');
  if (Boolean(config.username) !== Boolean(config.password)) {
    throw new Error('SMTP_USER and SMTP_PASS must either both be configured or both be empty');
  }

  let socket: SmtpSocket = config.secure
    ? tls.connect({
        host: config.host,
        port: config.port,
        servername: config.host,
        rejectUnauthorized: true,
      })
    : net.createConnection({ host: config.host, port: config.port });
  let reader = new SmtpReplyReader(socket);

  try {
    await waitForSocket(socket, config.secure ? 'secureConnect' : 'connect', config.timeoutMs);
    socket.setTimeout(config.timeoutMs, () => {
      socket.destroy(new Error('SMTP connection timed out'));
    });

    const greeting = await reader.read(config.timeoutMs);
    assertReply(greeting, [220], 'SMTP greeting');

    await command(socket, reader, 'EHLO ' + config.heloName, [250], config.timeoutMs);

    if (!config.secure && config.requireTls) {
      await command(socket, reader, 'STARTTLS', [220], config.timeoutMs);
      reader.dispose();

      const secureSocket = tls.connect({
        socket: socket as net.Socket,
        servername: config.host,
        rejectUnauthorized: true,
      });
      socket = secureSocket;
      reader = new SmtpReplyReader(socket);
      await waitForSocket(socket, 'secureConnect', config.timeoutMs);
      socket.setTimeout(config.timeoutMs, () => {
        socket.destroy(new Error('SMTP connection timed out'));
      });
      await command(socket, reader, 'EHLO ' + config.heloName, [250], config.timeoutMs);
    }

    const encrypted = socket instanceof tls.TLSSocket && socket.encrypted;
    if (config.username && !encrypted) {
      throw new Error('Refusing SMTP authentication without TLS');
    }

    if (config.username) {
      await command(socket, reader, 'AUTH LOGIN', [334], config.timeoutMs);
      await command(
        socket,
        reader,
        Buffer.from(config.username, 'utf8').toString('base64'),
        [334],
        config.timeoutMs,
      );
      await command(
        socket,
        reader,
        Buffer.from(config.password, 'utf8').toString('base64'),
        [235],
        config.timeoutMs,
      );
    }

    const fromAddress = extractAddress(config.from);
    const toAddress = extractAddress(message.to);
    await command(socket, reader, 'MAIL FROM:<' + fromAddress + '>', [250], config.timeoutMs);
    await command(socket, reader, 'RCPT TO:<' + toAddress + '>', [250, 251], config.timeoutMs);
    await command(socket, reader, 'DATA', [354], config.timeoutMs);

    await writeSocket(socket, normalizeData(buildMimeMessage(message, config)));
    const queued = await reader.read(config.timeoutMs);
    assertReply(queued, [250], 'SMTP DATA');

    try {
      await command(socket, reader, 'QUIT', [221, 250], config.timeoutMs);
    } catch {
      // Delivery was already accepted after DATA. QUIT failures should not mark the message failed.
    }
  } finally {
    reader.dispose();
    socket.setTimeout(0);
    socket.end();
  }
}

async function sendViaSendmail(message: MailMessage, config: SmtpConfig): Promise<void> {
  const payload = buildMimeMessage(message, config);
  const fromAddress = extractAddress(config.from);

  await new Promise<void>((resolve, reject) => {
    const child = spawn('/usr/sbin/sendmail', ['-f', fromAddress, '-t', '-i'], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Mail transport timed out'));
    }, config.timeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || 'Mail transport exited with code ' + String(code)));
    });

    child.stdin.end(payload);
  });
}

export async function sendTransactionalMail(message: MailMessage): Promise<MailSendResult> {
  const mode = resolveMode();
  const config = smtpConfig();

  if (mode === 'smtp') {
    await sendViaSmtp(message, config);
    return { transport: 'smtp' };
  }

  await sendViaSendmail(message, config);
  return { transport: 'sendmail' };
}

export function newsletterConfirmation(email: string): MailMessage {
  return {
    to: email,
    subject: 'Welcome to Lightworld Technologies updates',
    text:
      'Thanks for subscribing to Lightworld Technologies updates.\n\n' +
      'We will share occasional notes on products, software engineering, digital operations, AI, training and company news.\n\n' +
      'Website: https://lightworldtech.com\n' +
      'Email: mail@lightworldtech.com\n' +
      'Phone: +233 (024) 361 8186\n\n' +
      'Lightworld Technologies Ltd',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:28px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#059669;font-weight:700">Lightworld Technologies</p>' +
      '<h1 style="font-size:28px;line-height:1.15;margin:12px 0">You’re on the list.</h1>' +
      '<p>Thanks for subscribing. We’ll share occasional notes on products, software engineering, digital operations, AI, training and company news.</p>' +
      '<p><a href="https://lightworldtech.com/blog" style="color:#047857;font-weight:700">Explore Lightworld Insights →</a></p>' +
      '<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0">' +
      '<p style="font-size:13px;color:#64748b">Lightworld Technologies Ltd · Ghana<br>mail@lightworldtech.com · +233 (024) 361 8186</p>' +
      '</div></div>',
  };
}

export function mailTransportTest(email: string): MailMessage {
  return {
    to: email,
    subject: 'Lightworld Technologies mail transport test',
    text:
      'This is a mail transport test from the Lightworld Technologies website admin panel.\n\n' +
      'If you received this message, the website outbound email transport is working.',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:28px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#059669;font-weight:700">Lightworld Technologies</p>' +
      '<h1 style="font-size:26px;line-height:1.15;margin:12px 0">Mail transport test</h1>' +
      '<p>If you received this message, the website outbound email transport is working.</p>' +
      '<p style="font-size:13px;color:#64748b">Generated from the secure admin panel.</p>' +
      '</div></div>',
  };
}
