import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  createClientSessionToken,
} from '@/lib/client-auth';
import { hashAdminPassword, verifyAdminPassword } from '@/lib/admin-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export async function POST(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rate = consumePublicRateLimit(request, 'client-password-change', 10, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many password change attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Use your current password and a new password of at least 12 characters.' },
      { status: 400 },
    );
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { success: false, error: 'Choose a new password that is different from your current password.' },
      { status: 400 },
    );
  }

  try {
    const user = await db.clientPortalUser.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        role: true,
        password: true,
        authVersion: true,
      },
    });

    if (!user || user.authVersion !== context.session.authVersion) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verified = verifyAdminPassword(user.password, parsed.data.currentPassword);
    if (!verified.valid) {
      return NextResponse.json(
        { success: false, error: 'Your current password is incorrect.' },
        { status: 400 },
      );
    }

    const changedAt = new Date();
    const result = await db.$transaction(async (tx) => {
      const changed = await tx.clientPortalUser.updateMany({
        where: {
          id: user.id,
          authVersion: context.session.authVersion,
        },
        data: {
          password: hashAdminPassword(parsed.data.newPassword),
          mustSetPassword: false,
          authVersion: { increment: 1 },
        },
      });

      if (changed.count !== 1) return null;

      await tx.clientPasswordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: changedAt },
      });

      return tx.clientPortalUser.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          organizationId: true,
          email: true,
          name: true,
          role: true,
          authVersion: true,
        },
      });
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Your session changed. Please sign in again before changing your password.' },
        { status: 409 },
      );
    }

    const token = createClientSessionToken({
      sub: result.id,
      organizationId: result.organizationId,
      email: result.email,
      name: result.name,
      role: result.role,
      authVersion: result.authVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password changed. Other client portal sessions have been signed out.',
    });
    response.cookies.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CLIENT_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error('Client password change failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to change your password right now.' },
      { status: 500 },
    );
  }
}
