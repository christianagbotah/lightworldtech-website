export function escapeContactReplyHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function htmlParagraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((part) => '<p style="margin:0 0 16px">' + escapeContactReplyHtml(part).replace(/\n/g, '<br>') + '</p>')
    .join('');
}

export function buildContactReplyMail(input: {
  customerName: string;
  body: string;
  originalMessage: string;
  originalCreatedAt: Date;
}) {
  const greetingName = input.customerName.trim() || 'there';
  const text =
    'Hello ' + greetingName + ',\n\n' +
    input.body +
    '\n\nRegards,\nLightworld Technologies Ltd\n' +
    'https://lightworldtech.com';

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
    '<div style="padding:32px;border:1px solid #e2e8f0;border-radius:24px">' +
    '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b7791f;font-weight:700;margin:0 0 18px">Lightworld Technologies</p>' +
    '<p style="margin:0 0 16px">Hello ' + escapeContactReplyHtml(greetingName) + ',</p>' +
    htmlParagraphs(input.body) +
    '<p style="margin:24px 0 0">Regards,<br><strong>Lightworld Technologies Ltd</strong><br>' +
    '<a href="https://lightworldtech.com" style="color:#a16207">lightworldtech.com</a></p>' +
    '<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0">' +
    '<div style="font-size:12px;color:#64748b">' +
    '<p style="margin:0 0 8px"><strong>Original enquiry</strong> · ' +
    escapeContactReplyHtml(input.originalCreatedAt.toUTCString()) + '</p>' +
    '<p style="margin:0;white-space:pre-wrap">' + escapeContactReplyHtml(input.originalMessage) + '</p>' +
    '</div></div></div>';

  return { text, html };
}
