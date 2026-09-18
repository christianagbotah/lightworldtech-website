import { spawn } from 'node:child_process';

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendTransactionalMail(message: MailMessage): Promise<void> {
  const to = cleanHeader(message.to);
  const subject = cleanHeader(message.subject);
  const boundary = 'lw_' + Date.now().toString(36);

  const payload = [
    'From: Lightworld Technologies <mail@lightworldtech.com>',
    'Reply-To: mail@lightworldtech.com',
    'To: ' + to,
    'Subject: ' + subject,
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

  await new Promise<void>((resolve, reject) => {
    const child = spawn('/usr/sbin/sendmail', ['-f', 'mail@lightworldtech.com', '-t', '-i'], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Mail transport timed out'));
    }, 10_000);

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

export function newsletterConfirmation(email: string) {
  return {
    to: email,
    subject: 'Welcome to Lightworld Technologies updates',
    text:
      'Thanks for subscribing to Lightworld Technologies updates.\n\n' +
      'We will share occasional notes on products, software engineering, digital operations, AI, training and company news.\n\n' +
      'Website: https://lightworldtech.com\n' +
      'Email: mail@lightworldtech.com\n' +
      'Phone: +233 (024) 361 8186\n\n' +
      'Lightworld Technologies Limited',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:28px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#059669;font-weight:700">Lightworld Technologies</p>' +
      '<h1 style="font-size:28px;line-height:1.15;margin:12px 0">You’re on the list.</h1>' +
      '<p>Thanks for subscribing. We’ll share occasional notes on products, software engineering, digital operations, AI, training and company news.</p>' +
      '<p><a href="https://lightworldtech.com/blog" style="color:#047857;font-weight:700">Explore Lightworld Insights →</a></p>' +
      '<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0">' +
      '<p style="font-size:13px;color:#64748b">Lightworld Technologies Limited · Ghana<br>mail@lightworldtech.com · +233 (024) 361 8186</p>' +
      '</div></div>',
  };
}
