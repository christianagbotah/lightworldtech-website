import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('enterprise admin visual system', () => {
  test('shared page header defines one hierarchy for operational workspaces', () => {
    const header = source('src/components/admin/AdminPageHeader.tsx');

    expect(header).toContain("xl:flex-row xl:items-end xl:justify-between");
    expect(header).toContain("tracking-[-0.03em]");
    expect(header).toContain("text-amber-600");
  });

  test('high-frequency admin pages use the shared header', () => {
    for (const path of [
      'src/components/admin/AdminCRM.tsx',
      'src/components/admin/AdminSupportDesk.tsx',
      'src/components/admin/AdminFinance.tsx',
      'src/components/admin/AdminClients.tsx',
      'src/components/admin/AdminMessages.tsx',
    ]) {
      const page = source(path);
      expect(page).toContain("AdminPageHeader");
    }
  });

  test('dashboard keeps corporate gold primary while preserving semantic health states', () => {
    const dashboard = source('src/components/admin/AdminDashboard.tsx');

    expect(dashboard).toContain("adminPermissions, adminName");
    expect(dashboard).toContain("from-slate-950 via-amber-900 to-amber-600");
    expect(dashboard).toContain("WELCOME BACK, {(adminName || 'Admin').toUpperCase()}");
    expect(dashboard).not.toContain("bg-sky-100");
    expect(dashboard).not.toContain("bg-violet-100");
    expect(dashboard).toContain("health?.status === 'healthy' ? 'bg-emerald-300'");
  });

  test('client administration uses consistent metric cards and native select focus treatment', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain("flex items-center justify-between gap-4 p-5");
    expect(clients).toContain("rounded-xl border border-input");
    expect(clients).toContain("focus:ring-2 focus:ring-amber-500/15");
  });
});
