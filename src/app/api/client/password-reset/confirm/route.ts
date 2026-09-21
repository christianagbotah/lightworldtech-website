import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword } from '@/lib/admin-auth';
import { hashClientPasswordResetToken } from '@/lib/client-password-reset';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

const confirmSchema = z.object({
  token: z.string().min(32).max(200),
  newPassword: z.string().min(12).max(200),
});

const INVALID_MESSAGE =
  'This reset link is invalid or has expired. Request a new password reset link.';

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'client-password-reset-confirm', 12, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many password reset attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: INVALID_MESSAGE }, { status: 400 });
  }

  const tokenHash = hashClientPasswordResetToken(parsed.data.token);
  const now = new Date();

  try {
    const reset = await db.clientPasswordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { organization: { select: { status: true } } },
        },
      },
    });

    if (
      !reset ||
      reset.usedAt ||
      reset.expiresAt <= now ||
      !reset.user.active ||
      reset.user.organization.status !== 'active'
    ) {
      return NextResponse.json({ success: false, error: INVALID_MESSAGE }, { status: 400 });
    }

    const completed = await db.$transaction(async (tx) => {
      const claim = await tx.clientPasswordResetToken.updateMany({
        where: {
          id: reset.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claim.count !== 1) return false;

      await tx.clientPortalUser.update({
        where: { id: reset.userId },
        data: {
          password: hashAdminPassword(parsed.data.newPassword),
          mustSetPassword: false,
          inviteTokenHash: '',
          inviteExpiresAt: null,
          authVersion: { increment: 1 },
        },
      });

      await tx.clientPasswordResetToken.updateMany({
        where: {
          userId: reset.userId,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      return true;
    });

    if (!completed) {
      return NextResponse.json({ success: false, error: INVALID_MESSAGE }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now sign in to the client portal with your new password.',
    });
  } catch (error) {
    console.error('Client password reset confirmation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Password reset is temporarily unavailable.' },
      { status: 500 },
    );
  }
}
