import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  ADMIN_SESSION_COOKIE,
  hashAdminPassword,
  verifyAdminPassword,
} from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import {
  createRecoveryCodes,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  hashRecoveryCode,
  totpProvisioningUri,
  verifyRecoveryCode,
  verifyTotpCode,
} from '@/lib/admin-totp';

const codeSchema = z.string().trim().min(6).max(32);
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('begin') }),
  z.object({ action: z.literal('confirm'), code: codeSchema }),
  z.object({ action: z.literal('regenerateRecovery'), code: codeSchema }),
  z.object({
    action: z.literal('disable'),
    code: codeSchema,
    password: z.string().min(1).max(256),
  }),
]);

function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

function recoveryCount(value: string): number {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').length : 0;
  } catch {
    return 0;
  }
}

function verifySecondFactor(secretPayload: string, recoveryPayload: string, code: string) {
  const secret = decryptTotpSecret(secretPayload);
  if (verifyTotpCode(secret, code)) {
    return { valid: true, recoveryUsed: false };
  }
  const recovery = verifyRecoveryCode(recoveryPayload, code);
  return { valid: recovery.valid, recoveryUsed: recovery.valid };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const admin = await db.admin.findUnique({
    where: { id: actor.id },
    select: {
      totpEnabled: true,
      totpSecret: true,
      totpRecoveryCodes: true,
      recoveryEmail: true,
      lastLogin: true,
    },
  });

  if (!admin) return NextResponse.json({ success: false, error: 'Administrator not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: {
      enabled: admin.totpEnabled,
      enrollmentPending: Boolean(admin.totpSecret && !admin.totpEnabled),
      recoveryCodesRemaining: recoveryCount(admin.totpRecoveryCodes),
      recoveryEmail: admin.recoveryEmail,
      lastLogin: admin.lastLogin,
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid security request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = await db.admin.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      totpEnabled: true,
      totpSecret: true,
      totpRecoveryCodes: true,
    },
  });

  if (!admin) return NextResponse.json({ success: false, error: 'Administrator not found' }, { status: 404 });

  try {
    if (parsed.data.action === 'begin') {
      if (admin.totpEnabled) {
        return NextResponse.json(
          { success: false, error: 'Two-factor authentication is already enabled' },
          { status: 409 },
        );
      }

      const secret = generateTotpSecret();
      await db.admin.update({
        where: { id: admin.id },
        data: {
          totpSecret: encryptTotpSecret(secret),
          totpRecoveryCodes: '[]',
        },
      });

      await recordAdminAudit({
        admin: actor,
        action: 'admin.mfa_enrollment_started',
        entity: 'Admin',
        entityId: admin.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          secret,
          uri: totpProvisioningUri(secret, admin.email),
        },
      });
    }

    if (parsed.data.action === 'confirm') {
      if (admin.totpEnabled) {
        return NextResponse.json(
          { success: false, error: 'Two-factor authentication is already enabled' },
          { status: 409 },
        );
      }
      if (!admin.totpSecret) {
        return NextResponse.json(
          { success: false, error: 'Start two-factor enrollment first' },
          { status: 409 },
        );
      }

      const secret = decryptTotpSecret(admin.totpSecret);
      if (!verifyTotpCode(secret, parsed.data.code)) {
        return NextResponse.json(
          { success: false, error: 'Invalid authenticator code' },
          { status: 400 },
        );
      }

      const recoveryCodes = createRecoveryCodes();
      await db.admin.update({
        where: { id: admin.id },
        data: {
          totpEnabled: true,
          totpRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
          authVersion: { increment: 1 },
        },
      });

      await recordAdminAudit({
        admin: actor,
        action: 'admin.mfa_enabled',
        entity: 'Admin',
        entityId: admin.id,
        details: { recoveryCodeCount: recoveryCodes.length },
      });

      return clearAdminCookie(NextResponse.json({
        success: true,
        data: {
          enabled: true,
          recoveryCodes,
          requiresReauth: true,
        },
      }));
    }

    if (parsed.data.action === 'regenerateRecovery') {
      if (!admin.totpEnabled || !admin.totpSecret) {
        return NextResponse.json(
          { success: false, error: 'Two-factor authentication is not enabled' },
          { status: 409 },
        );
      }

      const secondFactor = verifySecondFactor(
        admin.totpSecret,
        admin.totpRecoveryCodes,
        parsed.data.code,
      );
      if (!secondFactor.valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid authenticator or recovery code' },
          { status: 400 },
        );
      }

      const recoveryCodes = createRecoveryCodes();
      await db.admin.update({
        where: { id: admin.id },
        data: {
          totpRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
          authVersion: { increment: 1 },
        },
      });

      await recordAdminAudit({
        admin: actor,
        action: 'admin.mfa_recovery_regenerated',
        entity: 'Admin',
        entityId: admin.id,
        details: { recoveryCodeCount: recoveryCodes.length },
      });

      return clearAdminCookie(NextResponse.json({
        success: true,
        data: {
          recoveryCodes,
          requiresReauth: true,
        },
      }));
    }

    const passwordCheck = verifyAdminPassword(admin.password, parsed.data.password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 },
      );
    }
    if (!admin.totpEnabled || !admin.totpSecret) {
      return NextResponse.json(
        { success: false, error: 'Two-factor authentication is not enabled' },
        { status: 409 },
      );
    }

    const secondFactor = verifySecondFactor(
      admin.totpSecret,
      admin.totpRecoveryCodes,
      parsed.data.code,
    );
    if (!secondFactor.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid authenticator or recovery code' },
        { status: 400 },
      );
    }

    await db.admin.update({
      where: { id: admin.id },
      data: {
        ...(passwordCheck.needsUpgrade ? { password: hashAdminPassword(parsed.data.password) } : {}),
        totpEnabled: false,
        totpSecret: '',
        totpRecoveryCodes: '[]',
        authVersion: { increment: 1 },
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.mfa_disabled',
      entity: 'Admin',
      entityId: admin.id,
    });

    return clearAdminCookie(NextResponse.json({
      success: true,
      data: {
        enabled: false,
        requiresReauth: true,
      },
    }));
  } catch (error) {
    console.error('Administrator MFA operation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to update two-factor authentication' },
      { status: 500 },
    );
  }
}
