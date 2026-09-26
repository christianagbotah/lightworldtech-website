import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  agreementAttachmentDirectory,
  isSafeAgreementAttachmentStorageName,
} from '@/lib/agreement-attachment';

export const runtime = 'nodejs';

async function authorizedAdmin(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) return null;
  return actor;
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await authorizedAdmin(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const attachment = await db.clientAgreementAttachment.findUnique({
    where: { id },
    include: { agreement: { select: { id: true, organizationId: true, title: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ success: false, error: 'Agreement attachment not found' }, { status: 404 });
  }
  if (!isSafeAgreementAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Attachment storage reference is invalid' }, { status: 500 });
  }

  try {
    const bytes = await readFile(join(agreementAttachmentDirectory(), attachment.storageName));
    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_agreement_attachment_downloaded',
      entity: 'ClientAgreement',
      entityId: attachment.agreement.id,
      details: {
        organizationId: attachment.agreement.organizationId,
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      },
    });

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(attachment.originalName),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Agreement attachment download failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to read agreement file' }, { status: 500 });
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await authorizedAdmin(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const attachment = await db.clientAgreementAttachment.findUnique({
    where: { id },
    include: { agreement: { select: { id: true, organizationId: true, title: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ success: false, error: 'Agreement attachment not found' }, { status: 404 });
  }
  if (!isSafeAgreementAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Attachment storage reference is invalid' }, { status: 500 });
  }

  await db.clientAgreementAttachment.delete({ where: { id } });
  await unlink(join(agreementAttachmentDirectory(), attachment.storageName)).catch(() => undefined);
  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_attachment_deleted',
    entity: 'ClientAgreement',
    entityId: attachment.agreement.id,
    details: {
      organizationId: attachment.agreement.organizationId,
      agreementTitle: attachment.agreement.title,
      attachmentId: attachment.id,
      fileName: attachment.originalName,
    },
  });

  return NextResponse.json({ success: true });
}