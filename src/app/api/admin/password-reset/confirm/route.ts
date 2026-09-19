import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword } from '@/lib/admin-auth';
import { hashAdminPasswordResetToken } from '@/lib/admin-password-reset';
import { recordAdminAudit } from '@/lib/admin-governance';

const confirmSchema = z.object({
  token: z.string().min(32).max(200),
  newPassword: z.string().min(12).max(200),
});

const INVALID_MESSAGE = 'This reset link is invalid or has expired. Request a new password reset link.';

export async function POST(request: NextRequest) {
  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: INVALID_MESSAGE }, { status: 400 });
  }

  const tokenHash = hashAdminPasswordResetToken(parsed.data.token);
  const now = new Date();

  try {
    const reset = await db.adminPasswordResetToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt <= now || !reset.admin.active) {
      return NextResponse.json({ success: false, error: INVALID_MESSAGE }, { status: 400 });
    }

    const completed = await db.$transaction(async (tx) => {
      const claim = await tx.adminPasswordResetToken.updateMany({
        where: {
          id: reset.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claim.count !== 1) return false;

      await tx.admin.update({
        where: { id: reset.adminId },
        data: {
          password: hashAdminPassword(parsed.data.newPassword),
          authVersion: { increment: 1 },
        },
      });

      await tx.adminPasswordResetToken.updateMany({
        where: {
          adminId: reset.adminId,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      return true;
    });

    if (!completed) {
      return NextResponse.json({ success: false, error: INVALID_MESSAGE }, { status: 400 });
    }

    await recordAdminAudit({
      admin: {
        id: reset.admin.id,
        email: reset.admin.email,
        name: reset.admin.name || 'Admin',
        role: reset.admin.role,
      },
      action: 'admin.password_recovered',
      entity: 'Admin',
      entityId: reset.admin.id,
      details: { sessionVersionIncremented: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Admin password reset confirmation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Password reset is temporarily unavailable.' },
      { status: 500 },
    );
  }
}
