import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('professional UX system', () => {
  test('shared controls use consistent touch-friendly sizing and rounded geometry', () => {
    const button = source('src/components/ui/button.tsx');
    const input = source('src/components/ui/input.tsx');
    const textarea = source('src/components/ui/textarea.tsx');
    const select = source('src/components/ui/select.tsx');

    expect(button).toContain('default: "h-10');
    expect(button).toContain('rounded-xl');
    expect(input).toContain('h-10 w-full min-w-0 rounded-xl');
    expect(textarea).toContain('min-h-24 w-full rounded-xl');
    expect(select).toContain('data-[size=default]:h-10');
  });

  test('dialogs and tables remain usable on constrained viewports', () => {
    const dialog = source('src/components/ui/dialog.tsx');
    const table = source('src/components/ui/table.tsx');

    expect(dialog).toContain('max-h-[calc(100dvh-2rem)]');
    expect(dialog).toContain('overflow-x-hidden overflow-y-auto rounded-2xl');
    expect(table).toContain('overflow-x-auto overscroll-x-contain');
    expect(table).toContain('px-4 py-3');
  });

  test('admin console groups navigation and supports a persistent collapsed desktop sidebar', () => {
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(layout).toContain("label: 'Website & content'");
    expect(layout).toContain("label: 'Sales & clients'");
    expect(layout).toContain("label: 'Communications'");
    expect(layout).toContain("lw-admin-sidebar-collapsed");
    expect(layout).toContain("sidebarCollapsed ? 'w-20' : 'w-64'");
    expect(layout).toContain("max-w-[1800px]");
  });

  test('client portal provides fast section navigation and uses the shared dialog surface', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain("['Overview', '#overview']");
    expect(portal).toContain("['Billing', '#billing']");
    expect(portal).toContain("['Projects', '#projects']");
    expect(portal).toContain("['Support', '#support']");
    expect(portal).toContain('<Dialog open={profileOpen}');
    expect(portal).toContain('id="support"');
  });

  test('public hero copy stays CMS-driven and the assistant uses the refined panel geometry', () => {
    const home = source('src/components/pages/HomePage.tsx');
    const widgets = source('src/components/layout/FloatingWidgets.tsx');

    expect(home).toContain('{heroEyebrow}');
    expect(home).toContain('{heroDescription}');
    expect(home).toContain('bg-amber-600');
    expect(widgets).toContain('sm:w-[400px]');
    expect(widgets).toContain('rounded-[24px]');
    expect(widgets).not.toContain('#10b981');
  });
});
