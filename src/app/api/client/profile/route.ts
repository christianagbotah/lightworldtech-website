import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  createClientSessionToken,
} from '@/lib/client-auth';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function PATCH(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Enter a valid name between 2 and 120 characters.' },
      { status: 400 },
    );
  }

  try {
    const user = await db.clientPortalUser.update({
      where: { id: context.user.id },
      data: { name: parsed.data.name },
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        role: true,
        authVersion: true,
      },
    });

    const token = createClientSessionToken({
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
      authVersion: user.authVersion,
    });

    const response = NextResponse.json({
      success: true,
      data: { name: user.name, email: user.email, role: user.role },
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
    console.error('Client profile update failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to update your profile right now.' },
      { status: 500 },
    );
  }
}
