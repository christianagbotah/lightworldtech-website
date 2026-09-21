import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import {
  MAX_SUPPORT_ATTACHMENT_BYTES,
  createSupportAttachmentStorageName,
  detectSupportAttachment,
  sanitizeSupportAttachmentName,
  supportAttachmentDirectory,
} from '@/lib/support-attachment';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ticket = await db.clientSupportTicket.findUnique({
    where: { id },
    select: { id: true, ticketNumber: true },
  });
  if (!ticket) return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });

  let storagePath = '';
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'An attachment is required' }, { status: 400 });
    }
    if (file.size <= 0) return NextResponse.json({ success: false, error: 'The attachment is empty' }, { status: 400 });
    if (file.size > MAX_SUPPORT_ATTACHMENT_BYTES) {
      return NextResponse.json({ success: false, error: 'Attachment too large. Max 10MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectSupportAttachment(bytes);
    if (!detected) {
      return NextResponse.json(
        { success: false, error: 'Unsupported attachment. Use JPG, PNG, WebP or PDF.' },
        { status: 415 },
      );
    }
    if (file.type && file.type !== detected.mimeType) {
      return NextResponse.json(
        { success: false, error: 'Attachment content does not match its declared type.' },
        { status: 415 },
      );
    }

    const directory = supportAttachmentDirectory();
    await mkdir(directory, { recursive: true, mode: 0o750 });
    const storageName = createSupportAttachmentStorageName(detected);
    storagePath = join(directory, storageName);
    await writeFile(storagePath, bytes, { flag: 'wx', mode: 0o640 });

    const attachment = await db.$transaction(async (tx) => {
      const created = await tx.clientTicketAttachment.create({
        data: {
          ticketId: ticket.id,
          originalName: sanitizeSupportAttachmentName(file.name),
          storageName,
          mimeType: detected.mimeType,
          sizeBytes: bytes.byteLength,
          uploadedByType: 'admin',
          uploadedByName: actor.name || actor.email,
        },
      });
      await tx.clientTicketEvent.create({
        data: {
          ticketId: ticket.id,
          type: 'attachment_added',
          actorType: 'admin',
          actorName: actor.name || actor.email,
          details: JSON.stringify({ attachmentId: created.id, fileName: created.originalName }),
        },
      });
      await tx.clientSupportTicket.update({
        where: { id: ticket.id },
        data: {
          lastActivityAt: new Date(),
          unreadByClient: true,
        },
      });
      return created;
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.support_ticket_attachment_added',
      entity: 'ClientSupportTicket',
      entityId: ticket.id,
      details: { ticketNumber: ticket.ticketNumber, attachmentId: attachment.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedByType: attachment.uploadedByType,
        uploadedByName: attachment.uploadedByName,
        createdAt: attachment.createdAt,
        downloadUrl: '/api/support-attachments/' + attachment.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (storagePath) await unlink(storagePath).catch(() => undefined);
    console.error('Admin support attachment upload failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to upload attachment' }, { status: 500 });
  }
}
