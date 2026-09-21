import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public appearance and quick actions', () => {
  test('loads light mode by default while preserving an explicit saved dark choice', () => {
    const layout = source('src/app/layout.tsx');

    expect(layout).toContain("localStorage.getItem('theme')==='dark'");
    expect(layout).toContain('defaultTheme="light"');
    expect(layout).not.toContain('defaultTheme="dark"');
  });

  test('collapses public floating utilities behind one accessible launcher', () => {
    const widgets = source('src/components/layout/FloatingWidgets.tsx');

    expect(widgets).toContain('const [actionsOpen, setActionsOpen] = useState(false)');
    expect(widgets).toContain("aria-label={actionsOpen ? 'Close quick actions' : 'Open quick actions'}");
    expect(widgets).toContain('aria-expanded={actionsOpen}');
    expect(widgets).toContain("window.dispatchEvent(new Event('lw-open-cookie-settings'))");
    expect(widgets).toContain('hasCookieConsent &&');
    expect(widgets).toContain('<BackToTopButton />');
    expect(widgets.split('setActionsOpen(false)').length - 1).toBeGreaterThanOrEqual(3);
    expect(widgets).toContain('flex flex-col items-end gap-2 sm:right-6 lg:bottom-6');
    expect(widgets).toContain('sm:absolute sm:bottom-0 sm:left-auto sm:right-full sm:mr-3 sm:w-max');
    expect(widgets).toContain('max-h-[calc(100dvh-11rem)]');
    expect(widgets).toContain('sm:w-[380px]');
  });

  test('reopens cookie preferences from the shared quick-action tray without a separate fixed icon', () => {
    const cookie = source('src/components/layout/CookieConsent.tsx');

    expect(cookie).toContain("window.addEventListener('lw-open-cookie-settings', handleOpenSettings)");
    expect(cookie).toContain("window.removeEventListener('lw-open-cookie-settings', handleOpenSettings)");
    expect(cookie).not.toContain('fixed bottom-6 left-6');
  });
});
