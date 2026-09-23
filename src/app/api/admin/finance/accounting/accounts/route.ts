import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const accountType = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']);

const createSchema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9._-]+$/),
  name: z.string().trim().min(2).max(160),
  type: accountType,
  subtype: z.string().trim().max(100).default(''),
  description: z.string().trim().max(1000).default(''),
  allowPosting: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const accounts = await db.financeAccount.findMany({
    orderBy: [{ code: 'asc' }, { name: 'asc' }],
    include: {
      parent: { select: { id: true, code: true, name: true } },
      _count: { select: { journalLines: true, children: true } },
    },
  });

  return NextResponse.json({ success: true, data: accounts });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid ledger account', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const code = parsed.data.code.toUpperCase();
  const duplicate = await db.financeAccount.findUnique({ where: { code }, select: { id: true } });
  if (duplicate) {
    return NextResponse.json({ success: false, error: 'Account code already exists' }, { status: 409 });
  }

  const account = await db.financeAccount.create({
    data: {
      code,
      name: parsed.data.name,
      type: parsed.data.type,
      subtype: parsed.data.subtype,
      description: parsed.data.description,
      allowPosting: parsed.data.allowPosting,
      active: true,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_account_created',
    entity: 'FinanceAccount',
    entityId: account.id,
    details: {
      code: account.code,
      name: account.name,
      type: account.type,
      allowPosting: account.allowPosting,
    },
  });

  return NextResponse.json({ success: true, data: account }, { status: 201 });
}
