import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import {
  sanitizeMailError,
  sendTransactionalMail,
} from '@/lib/mail';
import { buildContactReplyMail } from '@/lib/contact-reply-mail';

const replySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
});

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
    const { text, html } = buildContactReplyMail({
      customerName: message.name,
      body: parsed.data.body,
      originalMessage: message.message,
      originalCreatedAt: message.createdAt,
    });

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
