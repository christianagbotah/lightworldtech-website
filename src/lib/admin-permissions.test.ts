import { describe, expect, test } from 'bun:test';
import {
  ALL_ADMIN_PERMISSIONS,
  hasAdminPermission,
  normalizeAdminPermissions,
  requiredAdminPermissionForPath,
} from './admin-permissions';

describe('admin permissions', () => {
  test('normalizes only recognized unique permissions', () => {
    expect(
      normalizeAdminPermissions([
        'site.manage',
        'site.manage',
        'crm.manage',
        'unknown.permission',
        123,
      ]),
    ).toEqual(['site.manage', 'crm.manage']);

    expect(normalizeAdminPermissions('["clients.manage","crm.manage"]')).toEqual([
      'clients.manage',
      'crm.manage',
    ]);
    expect(normalizeAdminPermissions('not-json')).toEqual([]);
  });

  test('super admins always satisfy permission checks', () => {
    for (const permission of ALL_ADMIN_PERMISSIONS) {
      expect(hasAdminPermission('super_admin', [], permission)).toBe(true);
    }
  });

  test('ordinary admins receive only explicitly assigned permissions', () => {
    expect(hasAdminPermission('admin', ['crm.manage'], 'crm.manage')).toBe(true);
    expect(hasAdminPermission('admin', ['crm.manage'], 'site.manage')).toBe(false);
  });

  test('maps protected API areas to the correct permission', () => {
    expect(requiredAdminPermissionForPath('/api/admin/leads')).toBe('crm.manage');
    expect(requiredAdminPermissionForPath('/api/admin/messages/export')).toBe('crm.manage');
    expect(requiredAdminPermissionForPath('/api/admin/messages/bulk')).toBe('crm.manage');
    expect(requiredAdminPermissionForPath('/api/contact/abc')).toBe('crm.manage');
    expect(requiredAdminPermissionForPath('/api/admin/proposals/abc')).toBe('proposals.manage');
    expect(requiredAdminPermissionForPath('/api/admin/proposals/abc/convert-client')).toBe('clients.manage');
    expect(requiredAdminPermissionForPath('/api/admin/clients')).toBe('clients.manage');
    expect(requiredAdminPermissionForPath('/api/admin/client-tickets/abc')).toBe('clients.manage');
    expect(requiredAdminPermissionForPath('/api/admin/support-tickets')).toBe('clients.manage');
    expect(requiredAdminPermissionForPath('/api/admin/support-tickets/abc/notes')).toBe('clients.manage');
    expect(requiredAdminPermissionForPath('/api/admin/support-agents')).toBe('clients.manage');
    expect(requiredAdminPermissionForPath('/api/admin/newsletter/campaigns')).toBe('communications.manage');
    expect(requiredAdminPermissionForPath('/api/admin/sms/overview')).toBe('communications.manage');
    expect(requiredAdminPermissionForPath('/api/admin/sms/campaigns/abc/dispatch')).toBe('communications.manage');
    expect(requiredAdminPermissionForPath('/api/admin/sms/otp')).toBe('communications.manage');
    expect(requiredAdminPermissionForPath('/api/admin/finance/dashboard')).toBe('finance.manage');
    expect(requiredAdminPermissionForPath('/api/admin/finance/invoices')).toBe('finance.manage');
    expect(requiredAdminPermissionForPath('/api/admin/analytics')).toBe('site.manage');
    expect(requiredAdminPermissionForPath('/api/blog/categories')).toBe('site.manage');
    expect(requiredAdminPermissionForPath('/api/upload')).toBe('site.manage');
  });

  test('leaves shared session/governance endpoints to their own guards', () => {
    expect(requiredAdminPermissionForPath('/api/admin/auth')).toBeNull();
    expect(requiredAdminPermissionForPath('/api/admin/governance')).toBeNull();
    expect(requiredAdminPermissionForPath('/api/admin/stats')).toBeNull();
  });
});
