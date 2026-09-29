import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const accountType = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']);

const schema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9._-]+$/).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  type: accountType.optional(),
  subtype: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  active: z.boolean().optional(),
  allowPosting: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid account update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const current = await db.financeAccount.findUnique({
    where: { id },
    include: { _count: { select: { journalLines: true } } },
  });
  if (!current) {
    return NextResponse.json({ success: false, error: 'Ledger account not found' }, { status: 404 });
  }

  const requestedCode = parsed.data.code?.toUpperCase();
  const codeChanged = requestedCode !== undefined && requestedCode !== current.code;
  const typeChanged = parsed.data.type !== undefined && parsed.data.type !== current.type;
  const activeChanged = parsed.data.active !== undefined && parsed.data.active !== current.active;
  const postingChanged = parsed.data.allowPosting !== undefined && parsed.data.allowPosting !== current.allowPosting;
  const controlledStructuralChange = codeChanged || typeChanged || activeChanged || postingChanged;

  if (current._count.journalLines > 0 && (codeChanged || typeChanged)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Account code and type are immutable after journal history exists. Create a new account and stop future posting to the old account instead.',
      },
      { status: 409 },
    );
  }

  if (
    controlledStructuralChange &&
    !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  ) {
    return NextResponse.json(
      { success: false, error: 'Finance approval permission is required for structural ledger account changes' },
      { status: 403 },
    );
  }

  if (current.systemKey) {
    const structuralChange =
      (parsed.data.code !== undefined && parsed.data.code.toUpperCase() !== current.code) ||
      (parsed.data.type !== undefined && parsed.data.type !== current.type) ||
      parsed.data.active === false ||
      parsed.data.allowPosting === false;

    if (structuralChange) {
      return NextResponse.json(
        { success: false, error: 'System ledger accounts cannot be repurposed or disabled' },
        { status: 409 },
      );
    }
  }

  const code = requestedCode;
  if (code && code !== current.code) {
    const duplicate = await db.financeAccount.findUnique({ where: { code }, select: { id: true } });
    if (duplicate) {
      return NextResponse.json({ success: false, error: 'Account code already exists' }, { status: 409 });
    }
  }

  const account = await db.financeAccount.update({
    where: { id },
    data: {
      ...(code !== undefined ? { code } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.subtype !== undefined ? { subtype: parsed.data.subtype } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.allowPosting !== undefined ? { allowPosting: parsed.data.allowPosting } : {}),
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_account_updated',
    entity: 'FinanceAccount',
    entityId: account.id,
    details: {
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      allowPosting: account.allowPosting,
      journalLineCount: current._count.journalLines,
      structuralChange: controlledStructuralChange,
      previousCode: current.code,
      previousType: current.type,
      previousActive: current.active,
      previousAllowPosting: current.allowPosting,
    },
  });

  return NextResponse.json({ success: true, data: account });
}
