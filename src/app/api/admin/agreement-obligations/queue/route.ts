import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission, normalizeAdminPermissions } from '@/lib/admin-permissions';

const scopes = new Set(['all', 'mine', 'unassigned', 'overdue', 'due_30', 'owner']);

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const requestedScope = request.nextUrl.searchParams.get('scope') || 'mine';
  const scope = scopes.has(requestedScope) ? requestedScope : 'mine';
  const ownerId = request.nextUrl.searchParams.get('owner') || '';
  const now = new Date();
  const horizon30 = new Date(now.getTime() + 30 * 86_400_000);
  const openWhere: Prisma.ClientAgreementObligationWhereInput = {
    status: { notIn: ['completed', 'waived'] },
    agreement: { status: { notIn: ['terminated', 'superseded'] } },
  };

  const scopedWhere: Prisma.ClientAgreementObligationWhereInput = {
    ...openWhere,
    ...(scope === 'mine' ? { ownerAdminId: actor.id } : {}),
    ...(scope === 'unassigned' ? { ownerAdminId: null } : {}),
    ...(scope === 'overdue' ? { dueDate: { lt: now } } : {}),
    ...(scope === 'due_30' ? { dueDate: { gte: now, lte: horizon30 } } : {}),
    ...(scope === 'owner' ? { ownerAdminId: ownerId || actor.id } : {}),
  };

  const [items, total, mine, unassigned, overdue, due30, admins, groupedTotal, groupedOverdue, groupedDue30] = await Promise.all([
    db.clientAgreementObligation.findMany({
      where: scopedWhere,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 300,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        owner: true,
        ownerAdminId: true,
        dueDate: true,
        notes: true,
        updatedAt: true,
        ownerAdmin: { select: { id: true, name: true, email: true } },
        agreement: {
          select: {
            id: true,
            title: true,
            referenceNumber: true,
            organization: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.clientAgreementObligation.count({ where: openWhere }),
    db.clientAgreementObligation.count({ where: { ...openWhere, ownerAdminId: actor.id } }),
    db.clientAgreementObligation.count({ where: { ...openWhere, ownerAdminId: null } }),
    db.clientAgreementObligation.count({ where: { ...openWhere, dueDate: { lt: now } } }),
    db.clientAgreementObligation.count({ where: { ...openWhere, dueDate: { gte: now, lte: horizon30 } } }),
    db.admin.findMany({
      where: { active: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true, role: true, permissions: true },
    }),
    db.clientAgreementObligation.groupBy({ by: ['ownerAdminId'], where: openWhere, _count: { _all: true } }),
    db.clientAgreementObligation.groupBy({ by: ['ownerAdminId'], where: { ...openWhere, dueDate: { lt: now } }, _count: { _all: true } }),
    db.clientAgreementObligation.groupBy({ by: ['ownerAdminId'], where: { ...openWhere, dueDate: { gte: now, lte: horizon30 } }, _count: { _all: true } }),
  ]);

  const eligibleAdmins = admins.filter((admin) =>
    admin.role === 'super_admin' ||
    normalizeAdminPermissions(admin.permissions).includes('clients.manage'),
  );
  const totals = new Map(groupedTotal.map((row) => [row.ownerAdminId || '', row._count._all]));
  const overdueTotals = new Map(groupedOverdue.map((row) => [row.ownerAdminId || '', row._count._all]));
  const due30Totals = new Map(groupedDue30.map((row) => [row.ownerAdminId || '', row._count._all]));
  const team = eligibleAdmins
    .map((admin) => ({
      id: admin.id,
      name: admin.name || admin.email,
      email: admin.email,
      total: totals.get(admin.id) || 0,
      overdue: overdueTotals.get(admin.id) || 0,
      due30: due30Totals.get(admin.id) || 0,
    }))
    .sort((a, b) => b.overdue - a.overdue || b.total - a.total || a.name.localeCompare(b.name));

  return NextResponse.json({
    success: true,
    scope,
    ownerId: scope === 'owner' ? (ownerId || actor.id) : '',
    actor: { id: actor.id, name: actor.name, email: actor.email },
    summary: { total, mine, unassigned, overdue, due30 },
    team,
    data: items,
  });
}
