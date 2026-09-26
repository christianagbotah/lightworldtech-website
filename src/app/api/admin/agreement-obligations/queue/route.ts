import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const scopes = new Set(['all', 'mine', 'unassigned', 'overdue', 'due_30']);

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const requestedScope = request.nextUrl.searchParams.get('scope') || 'mine';
  const scope = scopes.has(requestedScope) ? requestedScope : 'mine';
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
  };

  const [items, total, mine, unassigned, overdue, due30] = await Promise.all([
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
  ]);

  return NextResponse.json({
    success: true,
    scope,
    actor: { id: actor.id, name: actor.name, email: actor.email },
    summary: { total, mine, unassigned, overdue, due30 },
    data: items,
  });
}
