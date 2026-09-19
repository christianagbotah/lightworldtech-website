import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  ADMIN_PASSWORD_RESET_COOLDOWN_MS,
  adminPasswordResetMail,
  adminPasswordResetUrl,
  createAdminPasswordResetToken,
} from '@/lib/admin-password-reset';
import { sendTransactionalMail } from '@/lib/mail';
import { recordAdminAudit } from '@/lib/admin-governance';

const requestSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const GENERIC_MESSAGE =
  'If an active administrator uses that email, a secure password reset link has been sent.';

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }

  try {
    const admin = await db.admin.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (admin?.active) {
      const cooldownSince = new Date(Date.now() - ADMIN_PASSWORD_RESET_COOLDOWN_MS);
      const recent = await db.adminPasswordResetToken.findFirst({
        where: {
          adminId: admin.id,
          usedAt: null,
          createdAt: { gte: cooldownSince },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!recent) {
        const now = new Date();

        await db.adminPasswordResetToken.updateMany({
          where: { adminId: admin.id, usedAt: null },
          data: { usedAt: now },
        });

        const reset = createAdminPasswordResetToken();
        const record = await db.adminPasswordResetToken.create({
          data: {
            adminId: admin.id,
            tokenHash: reset.tokenHash,
            expiresAt: reset.expiresAt,
          },
        });

        const resetUrl = adminPasswordResetUrl(reset.token, request.nextUrl.origin);

        try {
          await sendTransactionalMail(adminPasswordResetMail(admin.email, resetUrl));
          await recordAdminAudit({
            admin: {
              id: admin.id,
              email: admin.email,
              name: admin.name || 'Admin',
              role: admin.role,
            },
            action: 'admin.password_reset_requested',
            entity: 'Admin',
            entityId: admin.id,
            details: { expiresAt: reset.expiresAt.toISOString() },
          });
        } catch (error) {
          await db.adminPasswordResetToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
          }).catch(() => undefined);
          console.error('Admin password reset email failed:', error);
        }
      }
    }
  } catch (error) {
    console.error('Admin password reset request failed:', error);
  }

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
