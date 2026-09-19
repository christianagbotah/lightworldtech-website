import { describe, expect, test } from 'bun:test';
import { governanceUpdateError } from './admin-governance-policy';

describe('administrator governance lockout policy', () => {
  test('blocks self-deactivation and self-demotion', () => {
    const target = { id: 'admin-1', role: 'super_admin', active: true };

    expect(governanceUpdateError({
      actorId: 'admin-1',
      target,
      patch: { active: false },
      activeSuperAdmins: 2,
    })).toContain('deactivate your own');

    expect(governanceUpdateError({
      actorId: 'admin-1',
      target,
      patch: { role: 'admin' },
      activeSuperAdmins: 2,
    })).toContain('change your own');
  });

  test('blocks changing your own email from the same privileged session', () => {
    expect(governanceUpdateError({
      actorId: 'admin-1',
      target: { id: 'admin-1', role: 'super_admin', active: true },
      patch: { email: 'new@example.com' },
      activeSuperAdmins: 2,
    })).toContain('another super-admin');
  });

  test('protects the last active super-admin', () => {
    const target = { id: 'admin-2', role: 'super_admin', active: true };

    expect(governanceUpdateError({
      actorId: 'admin-1',
      target,
      patch: { active: false },
      activeSuperAdmins: 1,
    })).toContain('At least one active super-admin');

    expect(governanceUpdateError({
      actorId: 'admin-1',
      target,
      patch: { role: 'admin' },
      activeSuperAdmins: 1,
    })).toContain('At least one active super-admin');
  });

  test('allows safe changes when another active super-admin remains', () => {
    expect(governanceUpdateError({
      actorId: 'admin-1',
      target: { id: 'admin-2', role: 'super_admin', active: true },
      patch: { role: 'admin', active: true },
      activeSuperAdmins: 2,
    })).toBeNull();

    expect(governanceUpdateError({
      actorId: 'admin-1',
      target: { id: 'admin-3', role: 'admin', active: true },
      patch: { active: false },
      activeSuperAdmins: 1,
    })).toBeNull();
  });
});
