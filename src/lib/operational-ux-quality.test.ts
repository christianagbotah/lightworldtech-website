import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('operational UX quality', () => {
  test('admin workspaces expose persistent retry states instead of toast-only failures', () => {
    const files = [
      'src/components/admin/AdminCRM.tsx',
      'src/components/admin/AdminSupportDesk.tsx',
      'src/components/admin/AdminFinance.tsx',
      'src/components/admin/AdminSms.tsx',
      'src/components/admin/AdminClients.tsx',
    ];

    for (const file of files) {
      const content = source(file);
      expect(content).toContain('OperationalLoadError');
      expect(content).toContain('loadError');
    }

    const state = source('src/components/admin/OperationalLoadError.tsx');
    expect(state).toContain('role="alert"');
    expect(state).toContain('Try again');
  });

  test('SMS formatting uses proper word-boundary and whitespace regexes', () => {
    const sms = source('src/components/admin/AdminSms.tsx');

    expect(sms).toContain("replace(/\\b\\w/g");
    expect(sms).toContain("replace(/\\s+/g, ' ')");
  });

  test('support and finance interactive rows are keyboard operable', () => {
    const support = source('src/components/admin/AdminSupportDesk.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');

    for (const content of [support, finance]) {
      expect(content).toContain('role="button"');
      expect(content).toContain('tabIndex={0}');
      expect(content).toContain("event.key === 'Enter' || event.key === ' '");
    }

    expect(support).toContain('Filter support tickets by status');
    expect(support).toContain('Filter support tickets by assignee');
  });

  test('client portal preserves authenticated state when workspace data fails', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('const [portalError, setPortalError]');
    expect(portal).toContain('const loadPortal = async (): Promise<boolean>');
    expect(portal).toContain('Your session is active, but the workspace did not load.');
    expect(portal).toContain('Showing the last successfully loaded workspace data.');
    expect(portal).toContain('const retryPortal = async () =>');
  });

  test('client administration exposes retry, selection, and contact semantics', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain('Client organizations could not be loaded');
    expect(clients).toContain('aria-pressed={selected?.id === item.id}');
    expect(clients).toContain('type="tel"');
    expect(clients).toContain('autoComplete="email"');
  });
});
