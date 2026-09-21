import 'server-only';

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getClientSession, type ClientSession } from '@/lib/client-auth';

export async function getActiveClientContext(request: NextRequest): Promise<{
  session: ClientSession;
  user: { id: string; organizationId: string; email: string; name: string; role: string };
  organization: { id: string; name: string; status: string };
} | null> {
  const session = getClientSession(request);
  if (!session) return null;

  const user = await db.clientPortalUser.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      organizationId: true,
      email: true,
      name: true,
      role: true,
      active: true,
      mustSetPassword: true,
      authVersion: true,
      organization: { select: { id: true, name: true, status: true } },
    },
  });

  if (
    !user ||
    !user.active ||
    user.mustSetPassword ||
    user.organizationId !== session.organizationId ||
    user.email !== session.email ||
    user.authVersion !== session.authVersion ||
    user.organization.status !== 'active'
  ) {
    return null;
  }

  return {
    session,
    user: {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    organization: user.organization,
  };
}
