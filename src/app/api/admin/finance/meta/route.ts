import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [organizations, vendors, taxProfile] = await Promise.all([
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
          select: {
            id: true,
            name: true,
            status: true,
            health: true,
            nextRenewalDate: true,
            expiryDate: true,
            renewalCycle: true,
            renewalCurrency: true,
            renewalAmount: true,
            autoRenew: true,
            renewalNoticeDays: true,
          },
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
    db.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      organizations: organizations.map((organization) => ({
        ...organization,
        projects: organization.projects.map((project) => ({
          ...project,
          renewalAmount: project.renewalAmount.toFixed(2),
        })),
        services: organization.services.map((service) => ({
          ...service,
          recurringAmount: service.recurringAmount.toFixed(2),
        })),
      })),
      vendors,
      taxProfile: taxProfile ? {
        id: taxProfile.id,
        countryCode: taxProfile.countryCode,
        enabled: taxProfile.enabled,
        vatRegistrationNumber: taxProfile.vatRegistrationNumber,
        vatRate: taxProfile.vatRate.toFixed(2),
        nhilRate: taxProfile.nhilRate.toFixed(2),
        getfundRate: taxProfile.getfundRate.toFixed(2),
        effectiveFrom: taxProfile.effectiveFrom,
        updatedBy: taxProfile.updatedBy,
        canManage: actor.role === 'super_admin',
        effectiveRate: taxProfile.vatRate.plus(taxProfile.nhilRate).plus(taxProfile.getfundRate).toFixed(2),
      } : null,
    },
  });
}
