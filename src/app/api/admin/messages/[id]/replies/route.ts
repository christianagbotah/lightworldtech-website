import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import {
  sanitizeMailError,
  sendTransactionalMail,
} from '@/lib/mail';

const replySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
});

function escapeHtml(value: string): string {
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
    .map((part) => '<p style="margin:0 0 16px">' + escapeHtml(part).replace(/\n/g, '<br>') + '</p>')
    .join('');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await db.contactMessage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    const replies = await db.contactMessageReply.findMany({
      where: { contactMessageId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        authorName: true,
        authorEmail: true,
        recipient: true,
        subject: true,
        body: true,
        status: true,
        transport: true,
        error: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: replies },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Failed to load customer reply history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load reply history' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Enter a subject and reply message', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;

  const message = await db.contactMessage.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      createdAt: true,
    },
  });

  if (!message) {
    return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
  }

  const reply = await db.contactMessageReply.create({
    data: {
      contactMessageId: message.id,
      authorAdminId: actor.id,
      authorName: actor.name,
      authorEmail: actor.email,
      recipient: message.email,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: 'sending',
    },
  });

  try {
    const greetingName = message.name.trim() || 'there';
    const text =
      'Hello ' + greetingName + ',\n\n' +
      parsed.data.body +
      '\n\nRegards,\nLightworld Technologies Ltd\n' +
      'https://lightworldtech.com';

    const html =
      '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;line-height:1.65">' +
      '<div style="padding:32px;border:1px solid #e2e8f0;border-radius:24px">' +
      '<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b7791f;font-weight:700;margin:0 0 18px">Lightworld Technologies</p>' +
      '<p style="margin:0 0 16px">Hello ' + escapeHtml(greetingName) + ',</p>' +
      htmlParagraphs(parsed.data.body) +
      '<p style="margin:24px 0 0">Regards,<br><strong>Lightworld Technologies Ltd</strong><br>' +
      '<a href="https://lightworldtech.com" style="color:#a16207">lightworldtech.com</a></p>' +
      '<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0">' +
      '<div style="font-size:12px;color:#64748b">' +
      '<p style="margin:0 0 8px"><strong>Original enquiry</strong> · ' +
      escapeHtml(new Date(message.createdAt).toUTCString()) + '</p>' +
      '<p style="margin:0;white-space:pre-wrap">' + escapeHtml(message.message) + '</p>' +
      '</div></div></div>';

    const result = await sendTransactionalMail({
      to: message.email,
      subject: parsed.data.subject,
      text,
      html,
    });

    const sentAt = new Date();

    await db.$transaction([
      db.contactMessageReply.update({
        where: { id: reply.id },
        data: {
          status: 'sent',
          transport: result.transport,
          sentAt,
          error: '',
        },
      }),
      db.contactMessage.update({
        where: { id: message.id },
        data: { read: true },
      }),
      db.lead.updateMany({
        where: { contactMessageId: message.id },
        data: { lastContactedAt: sentAt },
      }),
    ]);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.message_replied',
      entity: 'ContactMessage',
      entityId: message.id,
      details: {
        replyId: reply.id,
        recipient: message.email,
        subject: parsed.data.subject,
        transport: result.transport,
      },
    });

    const saved = await db.contactMessageReply.findUnique({
      where: { id: reply.id },
      select: {
        id: true,
        authorName: true,
        authorEmail: true,
        recipient: true,
        subject: true,
        body: true,
        status: true,
        transport: true,
        error: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    const safeError = sanitizeMailError(error);

    await db.contactMessageReply.update({
      where: { id: reply.id },
      data: {
        status: 'failed',
        error: safeError,
      },
    }).catch(() => null);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.message_reply_failed',
      entity: 'ContactMessage',
      entityId: message.id,
      details: {
        replyId: reply.id,
        recipient: message.email,
        subject: parsed.data.subject,
        error: safeError,
      },
    });

    console.error('Customer reply delivery failed:', safeError);
    return NextResponse.json(
      {
        success: false,
        error: 'Reply could not be delivered. The failed attempt was saved in the message history.',
        details: safeError,
      },
      {
        status: 503,
        headers: { 'Retry-After': '30' },
      },
    );
  }
}
