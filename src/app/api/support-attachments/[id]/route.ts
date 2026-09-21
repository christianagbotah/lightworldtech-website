import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getActiveClientContext } from '@/lib/client-access';
import {
  isSafeSupportAttachmentStorageName,
  supportAttachmentDirectory,
} from '@/lib/support-attachment';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attachment = await db.clientTicketAttachment.findUnique({
    where: { id },
    include: {
      ticket: { select: { organizationId: true } },
    },
  });
  if (!attachment) return NextResponse.json({ success: false, error: 'Attachment not found' }, { status: 404 });

  const admin = await getActiveAdminContext(request);
  let authorized = Boolean(
    admin && hasAdminPermission(admin.role, admin.permissions, 'clients.manage'),
  );

  if (!authorized) {
    const client = await getActiveClientContext(request);
    authorized = Boolean(client && client.user.organizationId === attachment.ticket.organizationId);
  }

  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSafeSupportAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Attachment storage reference is invalid' }, { status: 500 });
  }

  try {
    const bytes = await readFile(join(supportAttachmentDirectory(), attachment.storageName));
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
    console.error('Support attachment download failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to read attachment' }, { status: 500 });
  }
}
