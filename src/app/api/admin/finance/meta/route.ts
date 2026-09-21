import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [organizations, vendors] = await Promise.all([
    db.clientOrganization.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        primaryContactName: true,
        primaryEmail: true,
        projects: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, status: true },
        },
        services: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            planName: true,
            status: true,
            currency: true,
            recurringAmount: true,
          },
        },
      },
    }),
    db.financeVendor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      organizations: organizations.map((organization) => ({
        ...organization,
        services: organization.services.map((service) => ({
          ...service,
          recurringAmount: service.recurringAmount.toFixed(2),
        })),
      })),
      vendors,
    },
  });
}
