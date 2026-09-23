import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, getSuperAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  enabled: z.boolean(),
  vatRegistrationNumber: z.string().trim().max(120).default(''),
  vatRate: z.coerce.number().min(0).max(100),
  nhilRate: z.coerce.number().min(0).max(100),
  getfundRate: z.coerce.number().min(0).max(100),
  effectiveFrom: z.coerce.date(),
});

function serialize(profile: any) {
  return {
    ...profile,
    vatRate: profile.vatRate.toFixed(2),
    nhilRate: profile.nhilRate.toFixed(2),
    getfundRate: profile.getfundRate.toFixed(2),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const profile = await db.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
  if (!profile) {
    return NextResponse.json({ success: false, error: 'Ghana tax profile is not initialized' }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...serialize(profile),
      canManage: actor.role === 'super_admin',
      effectiveRate: profile.vatRate.plus(profile.nhilRate).plus(profile.getfundRate).toFixed(2),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) {
    return NextResponse.json(
      { success: false, error: 'Only a super admin can change the statutory tax profile' },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid tax profile', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await db.financeTaxProfile.update({
    where: { id: 'ghana-default' },
    data: {
      enabled: parsed.data.enabled,
      vatRegistrationNumber: parsed.data.vatRegistrationNumber,
      vatRate: parsed.data.vatRate,
      nhilRate: parsed.data.nhilRate,
      getfundRate: parsed.data.getfundRate,
      effectiveFrom: parsed.data.effectiveFrom,
      updatedBy: actor.name || actor.email,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_tax_profile_updated',
    entity: 'FinanceTaxProfile',
    entityId: profile.id,
    details: {
      enabled: profile.enabled,
      vatRegistrationNumberConfigured: Boolean(profile.vatRegistrationNumber),
      vatRate: profile.vatRate.toFixed(2),
      nhilRate: profile.nhilRate.toFixed(2),
      getfundRate: profile.getfundRate.toFixed(2),
      effectiveFrom: profile.effectiveFrom.toISOString(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...serialize(profile),
      canManage: true,
      effectiveRate: profile.vatRate.plus(profile.nhilRate).plus(profile.getfundRate).toFixed(2),
    },
  });
}
