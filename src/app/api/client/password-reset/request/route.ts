import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  CLIENT_PASSWORD_RESET_COOLDOWN_MS,
  clientPasswordResetMail,
  clientPasswordResetUrl,
  createClientPasswordResetToken,
} from '@/lib/client-password-reset';
import { sendTransactionalMail } from '@/lib/mail';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

const requestSchema = z.object({
  email: z.string().trim().max(254).email().transform((value) => value.toLowerCase()),
});

const GENERIC_MESSAGE =
  'If an active client portal account uses that email, a secure password reset link has been sent.';

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'client-password-reset-request', 6, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many password reset requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }

  try {
    const user = await db.clientPortalUser.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        organization: { select: { status: true } },
      },
    });

    if (user?.active && user.organization.status === 'active') {
      const cooldownSince = new Date(Date.now() - CLIENT_PASSWORD_RESET_COOLDOWN_MS);
      const recent = await db.clientPasswordResetToken.findFirst({
        where: {
          userId: user.id,
          usedAt: null,
          createdAt: { gte: cooldownSince },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!recent) {
        const now = new Date();

        await db.clientPasswordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: now },
        });

        const reset = createClientPasswordResetToken();
        const record = await db.clientPasswordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: reset.tokenHash,
            expiresAt: reset.expiresAt,
          },
        });

        const resetUrl = clientPasswordResetUrl(reset.token, request.nextUrl.origin);

        try {
          await sendTransactionalMail(
            clientPasswordResetMail(user.email, user.name, resetUrl),
          );
        } catch (error) {
          await db.clientPasswordResetToken
            .update({
              where: { id: record.id },
              data: { usedAt: new Date() },
            })
            .catch(() => undefined);
          console.error('Client password reset email failed:', error);
        }
      }
    }
  } catch (error) {
    console.error('Client password reset request failed:', error);
  }

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
