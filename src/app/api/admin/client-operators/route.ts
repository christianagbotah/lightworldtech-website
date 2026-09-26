import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission, normalizeAdminPermissions } from '@/lib/admin-permissions';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const admins = await db.admin.findMany({
    where: { active: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      lastLogin: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: admins
      .filter((admin) =>
        admin.role === 'super_admin' ||
        normalizeAdminPermissions(admin.permissions).includes('clients.manage'),
      )
      .map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      })),
  });
}
