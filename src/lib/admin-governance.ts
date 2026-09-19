import 'server-only';

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

export type ActiveAdminContext = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function getActiveAdminContext(request: NextRequest): Promise<ActiveAdminContext | null> {
  const session = getAdminSession(request);
  if (!session) return null;

  const admin = await db.admin.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      authVersion: true,
    },
  });

  if (
    !admin?.active ||
    admin.email !== session.email ||
    admin.role !== session.role ||
    admin.authVersion !== session.authVersion
  ) return null;

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name || 'Admin',
    role: admin.role,
  };
}

export async function getSuperAdminContext(request: NextRequest): Promise<ActiveAdminContext | null> {
  const admin = await getActiveAdminContext(request);
  return admin?.role === 'super_admin' ? admin : null;
}

export async function recordAdminAudit(input: {
  admin?: ActiveAdminContext | null;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        adminId: input.admin?.id || null,
        adminEmail: input.admin?.email || '',
        adminName: input.admin?.name || '',
        action: input.action,
        entity: input.entity || '',
        entityId: input.entityId || '',
        details: JSON.stringify(input.details || {}),
      },
    });
  } catch (error) {
    // Governance logging must never lock an administrator out during a schema rollout
    // or secondary audit-storage failure.
    console.error('Admin audit write failed:', error);
  }
}

export async function countActiveSuperAdmins(): Promise<number> {
  return db.admin.count({
    where: { active: true, role: 'super_admin' },
  });
}
