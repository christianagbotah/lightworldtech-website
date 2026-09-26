import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSuperAdminContext, recordAdminAudit } from '@/lib/admin-governance';

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function safeDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  const date = new Date(value + (endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const actorQuery = (searchParams.get('actor') || '').trim();
  const actionQuery = (searchParams.get('action') || '').trim();
  const entityQuery = (searchParams.get('entity') || '').trim();
  const from = safeDate(searchParams.get('from'));
  const to = safeDate(searchParams.get('to'), true);

  const rows = await db.adminAuditLog.findMany({
    where: {
      ...(actorQuery ? {
        OR: [
          { adminName: { contains: actorQuery, mode: 'insensitive' } },
          { adminEmail: { contains: actorQuery, mode: 'insensitive' } },
        ],
      } : {}),
      ...(actionQuery ? { action: { contains: actionQuery, mode: 'insensitive' } } : {}),
      ...(entityQuery ? { entity: { contains: entityQuery, mode: 'insensitive' } } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      adminId: true,
      adminEmail: true,
      adminName: true,
      action: true,
      entity: true,
      entityId: true,
      details: true,
      createdAt: true,
    },
  });

  const header = ['Timestamp', 'Actor name', 'Actor email', 'Action', 'Entity', 'Entity ID', 'Details', 'Audit ID'];
  const csv = [
    header.map(csvCell).join(','),
    ...rows.map((row) => [
      row.createdAt.toISOString(),
      row.adminName,
      row.adminEmail,
      row.action,
      row.entity,
      row.entityId,
      row.details,
      row.id,
    ].map(csvCell).join(',')),
  ].join('\n');

  await recordAdminAudit({
    admin: actor,
    action: 'admin.governance_audit_exported',
    entity: 'AdminAuditLog',
    entityId: '',
    details: {
      rows: rows.length,
      filters: {
        actor: actorQuery,
        action: actionQuery,
        entity: entityQuery,
        from: from?.toISOString() || null,
        to: to?.toISOString() || null,
      },
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lightworld-governance-audit-' + date + '.csv"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
