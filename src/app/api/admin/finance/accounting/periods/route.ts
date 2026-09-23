import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((value) => value.endDate.getTime() >= value.startDate.getTime(), {
  message: 'Period end date cannot be earlier than start date',
  path: ['endDate'],
});

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const periods = await db.financeAccountingPeriod.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: periods });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid accounting period', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const overlap = await db.financeAccountingPeriod.findFirst({
    where: {
      startDate: { lte: parsed.data.endDate },
      endDate: { gte: parsed.data.startDate },
    },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (overlap) {
    return NextResponse.json(
      {
        success: false,
        error: 'Accounting periods cannot overlap',
        conflict: {
          id: overlap.id,
          name: overlap.name,
          startDate: overlap.startDate,
          endDate: overlap.endDate,
        },
      },
      { status: 409 },
    );
  }

  const period = await db.financeAccountingPeriod.create({
    data: {
      name: parsed.data.name,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: 'open',
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_accounting_period_created',
    entity: 'FinanceAccountingPeriod',
    entityId: period.id,
    details: {
      name: period.name,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    },
  });

  return NextResponse.json({ success: true, data: period }, { status: 201 });
}
