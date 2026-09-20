import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword } from '@/lib/admin-auth';
import { getSuperAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { ALL_ADMIN_PERMISSIONS, normalizeAdminPermissions } from '@/lib/admin-permissions';

const permissionSchema = z.enum([
  'site.manage',
  'crm.manage',
  'proposals.manage',
  'clients.manage',
  'communications.manage',
]);

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  recoveryEmail: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  role: z.enum(['admin', 'super_admin']).default('admin'),
  permissions: z.array(permissionSchema).default([]),
  password: z.string().min(12).max(200),
}).refine(
  (value) => value.role === 'super_admin' || value.permissions.length > 0,
  { message: 'Assign at least one permission to an administrator', path: ['permissions'] },
);

export async function GET(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [admins, auditLogs, activeSuperAdmins] = await Promise.all([
      db.admin.findMany({
        orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          email: true,
          recoveryEmail: true,
          name: true,
          role: true,
          permissions: true,
          active: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          adminId: true,
          adminEmail: true,
          adminName: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          createdAt: true,
        },
      }),
      db.admin.count({ where: { active: true, role: 'super_admin' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        actor,
        admins: admins.map((admin) => ({
          ...admin,
          permissions: normalizeAdminPermissions(admin.permissions),
        })),
        auditLogs,
        summary: {
          totalAdmins: admins.length,
          activeAdmins: admins.filter((item) => item.active).length,
          activeSuperAdmins,
        },
      },
    });
  } catch (error) {
    console.error('Failed to load admin governance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load administrator governance' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid administrator account', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await db.admin.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An administrator with this email already exists' },
        { status: 409 },
      );
    }

    const admin = await db.admin.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        recoveryEmail: parsed.data.recoveryEmail || parsed.data.email,
        role: parsed.data.role,
        permissions: JSON.stringify(
          parsed.data.role === 'super_admin'
            ? ALL_ADMIN_PERMISSIONS
            : normalizeAdminPermissions(parsed.data.permissions),
        ),
        password: hashAdminPassword(parsed.data.password),
        active: true,
      },
      select: {
        id: true,
        email: true,
        recoveryEmail: true,
        name: true,
        role: true,
        permissions: true,
        active: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.created',
      entity: 'Admin',
      entityId: admin.id,
      details: {
        targetEmail: admin.email,
        targetRole: admin.role,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...admin,
        permissions: normalizeAdminPermissions(admin.permissions),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create administrator:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create administrator' },
      { status: 500 },
    );
  }
}
