import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { buildContactReplyMail } from '@/lib/contact-reply-mail';
import { sanitizeMailError, sendTransactionalMail } from '@/lib/mail';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id, replyId } = await params;
  const stored = await db.contactMessageReply.findFirst({
    where: {
      id: replyId,
      contactMessageId: id,
    },
    include: {
      contactMessage: {
        select: {
          id: true,
          name: true,
          email: true,
          message: true,
          createdAt: true,
        },
      },
    },
  });
  if (!stored) {
    return NextResponse.json({ success: false, error: 'Failed reply not found' }, { status: 404 });
  }
  if (stored.status !== 'failed') {
    return NextResponse.json(
      { success: false, error: 'Only failed replies can be retried' },
      { status: 409 },
    );
  }

  const claimed = await db.contactMessageReply.updateMany({
    where: { id: stored.id, status: 'failed' },
    data: { status: 'sending', error: '' },
  });
  if (claimed.count !== 1) {
    return NextResponse.json(
      { success: false, error: 'This reply is already being retried or was sent by another request' },
      { status: 409 },
    );
  }

  try {
    const { text, html } = buildContactReplyMail({
      customerName: stored.contactMessage.name,
      body: stored.body,
      originalMessage: stored.contactMessage.message,
      originalCreatedAt: stored.contactMessage.createdAt,
    });

    const result = await sendTransactionalMail({
      to: stored.recipient || stored.contactMessage.email,
      subject: stored.subject,
      text,
      html,
    });
    const sentAt = new Date();

    await db.$transaction([
      db.contactMessageReply.update({
        where: { id: stored.id },
        data: {
          status: 'sent',
          transport: result.transport,
          error: '',
          sentAt,
        },
      }),
      db.contactMessage.update({
        where: { id: stored.contactMessage.id },
        data: { read: true },
      }),
      db.lead.updateMany({
        where: { contactMessageId: stored.contactMessage.id },
        data: { lastContactedAt: sentAt },
      }),
    ]);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.message_reply_retried',
      entity: 'ContactMessage',
      entityId: stored.contactMessage.id,
      details: {
        replyId: stored.id,
        recipient: stored.recipient,
        subject: stored.subject,
        transport: result.transport,
      },
    });

    const saved = await db.contactMessageReply.findUnique({
      where: { id: stored.id },
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

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    const safeError = sanitizeMailError(error);

    await db.contactMessageReply.update({
      where: { id: stored.id },
      data: {
        status: 'failed',
        error: safeError,
      },
    }).catch(() => null);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.message_reply_retry_failed',
      entity: 'ContactMessage',
      entityId: stored.contactMessage.id,
      details: {
        replyId: stored.id,
        recipient: stored.recipient,
        subject: stored.subject,
        error: safeError,
      },
    });

    console.error('Customer reply retry failed:', safeError);
    return NextResponse.json({
      success: false,
      error: 'Reply could not be delivered. It remains available for another retry.',
      details: safeError,
    }, {
      status: 503,
      headers: { 'Retry-After': '30' },
    });
  }
}
