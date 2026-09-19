export type AdminGovernanceTarget = {
  id: string;
  role: string;
  active: boolean;
};

export type AdminGovernancePatch = {
  role?: 'admin' | 'super_admin';
  active?: boolean;
  email?: string;
};

export function governanceUpdateError(input: {
  actorId: string;
  target: AdminGovernanceTarget;
  patch: AdminGovernancePatch;
  activeSuperAdmins: number;
}): string | null {
  const { actorId, target, patch, activeSuperAdmins } = input;
  const self = actorId === target.id;
  const nextRole = patch.role ?? (target.role === 'super_admin' ? 'super_admin' : 'admin');
  const nextActive = patch.active ?? target.active;

  if (self && patch.active === false) {
    return 'You cannot deactivate your own administrator account.';
  }

  if (self && patch.role && patch.role !== target.role) {
    return 'You cannot change your own administrator role.';
  }

  if (self && patch.email !== undefined) {
    return 'Sign in with another super-admin account to change your own email address.';
  }

  const removesActiveSuperAdmin =
    target.role === 'super_admin' &&
    target.active &&
    (nextRole !== 'super_admin' || !nextActive);

  if (removesActiveSuperAdmin && activeSuperAdmins <= 1) {
    return 'At least one active super-admin must remain.';
  }

  return null;
}
