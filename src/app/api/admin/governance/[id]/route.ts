import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword } from '@/lib/admin-auth';
import {
  countActiveSuperAdmins,
  getSuperAdminContext,
  recordAdminAudit,
} from '@/lib/admin-governance';
import { governanceUpdateError } from '@/lib/admin-governance-policy';
import { ALL_ADMIN_PERMISSIONS, normalizeAdminPermissions } from '@/lib/admin-permissions';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  recoveryEmail: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  role: z.enum(['admin', 'super_admin']).optional(),
  permissions: z.array(z.enum([
    'site.manage',
    'crm.manage',
    'proposals.manage',
    'clients.manage',
    'communications.manage',
  'finance.manage',
  ])).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(12).max(200).optional(),
  revokeSessions: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one change is required');

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getSuperAdminContext(request);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid administrator update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const target = await db.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ success: false, error: 'Administrator not found' }, { status: 404 });
    }

    const activeSuperAdmins = await countActiveSuperAdmins();
    const policyError = governanceUpdateError({
      actorId: actor.id,
      target: { id: target.id, role: target.role, active: target.active },
      patch: {
        role: parsed.data.role,
        active: parsed.data.active,
        email: parsed.data.email,
      },
      activeSuperAdmins,
    });

    if (policyError) {
      return NextResponse.json({ success: false, error: policyError }, { status: 409 });
    }

    const nextRole = parsed.data.role ?? target.role;
    const nextPermissions = nextRole === 'super_admin'
      ? ALL_ADMIN_PERMISSIONS
      : normalizeAdminPermissions(parsed.data.permissions ?? target.permissions);

    if (nextRole === 'admin' && nextPermissions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assign at least one permission to an administrator' },
        { status: 400 },
      );
    }

    if (parsed.data.email && parsed.data.email !== target.email) {
      const emailOwner = await db.admin.findUnique({ where: { email: parsed.data.email } });
      if (emailOwner && emailOwner.id !== target.id) {
        return NextResponse.json(
          { success: false, error: 'Another administrator already uses this email address' },
          { status: 409 },
        );
      }
    }

    const data: {
      name?: string;
      email?: string;
      recoveryEmail?: string;
      role?: 'admin' | 'super_admin';
      permissions?: string;
      active?: boolean;
      password?: string;
      authVersion?: { increment: number };
    } = {};

    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.email !== undefined) data.email = parsed.data.email;
    if (parsed.data.recoveryEmail !== undefined) data.recoveryEmail = parsed.data.recoveryEmail;
    if (parsed.data.role !== undefined) {
      data.role = parsed.data.role;
      data.permissions = JSON.stringify(nextPermissions);
    } else if (parsed.data.permissions !== undefined) {
      data.permissions = JSON.stringify(nextPermissions);
    }
    if (parsed.data.active !== undefined) data.active = parsed.data.active;
    if (parsed.data.newPassword !== undefined) {
      data.password = hashAdminPassword(parsed.data.newPassword);
    }
    const invalidatesSessions =
      parsed.data.newPassword !== undefined ||
      parsed.data.permissions !== undefined ||
      parsed.data.role !== undefined ||
      parsed.data.email !== undefined ||
      parsed.data.active !== undefined ||
      parsed.data.revokeSessions === true;
    if (invalidatesSessions) {
      data.authVersion = { increment: 1 };
    }

    const updated = await db.admin.update({
      where: { id: target.id },
      data,
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

    const changedFields = Object.keys(parsed.data).filter((key) => !['newPassword', 'revokeSessions'].includes(key));
    if (parsed.data.newPassword !== undefined) changedFields.push('password');
    if (parsed.data.revokeSessions === true) changedFields.push('sessions');

    await recordAdminAudit({
      admin: actor,
      action: parsed.data.revokeSessions === true && changedFields.length === 1
        ? 'admin.sessions_revoked'
        : parsed.data.newPassword !== undefined && changedFields.length === 1
          ? 'admin.password_reset'
          : 'admin.updated',
      entity: 'Admin',
      entityId: target.id,
      details: {
        targetEmail: updated.email,
        changedFields,
        previousRole: target.role,
        newRole: updated.role,
        previousActive: target.active,
        newActive: updated.active,
        previousPermissions: normalizeAdminPermissions(target.permissions),
        newPermissions: normalizeAdminPermissions(updated.permissions),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        permissions: normalizeAdminPermissions(updated.permissions),
      },
    });
  } catch (error) {
    console.error('Failed to update administrator:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update administrator' },
      { status: 500 },
    );
  }
}
