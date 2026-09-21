import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('admin backend and responsive UX regression coverage', () => {
  test('keeps the fixed-sidebar admin shell inside the viewport', () => {
    const layout = source('src/components/admin/AdminLayout.tsx');

    expect(layout).toContain('w-full overflow-x-hidden');
    expect(layout).toContain('lg:w-[calc(100%-16rem)]');
    expect(layout).toContain('min-w-0 max-w-full flex-1 overflow-x-hidden');
  });

  test('keeps the wide CRM board inside its own horizontal scroller', () => {
    const crm = source('src/components/admin/AdminCRM.tsx');

    expect(crm).toContain('max-w-full overflow-x-auto');
    expect(crm).toContain('min-w-[1960px]');
    expect(crm).toContain('w-[calc(100vw-2rem)] max-w-4xl overflow-x-hidden');
  });

  test('uses canonical validated CMS endpoints from admin screens', () => {
    const files = [
      ['src/components/admin/AdminServices.tsx', '/api/services'],
      ['src/components/admin/AdminTeam.tsx', '/api/team'],
      ['src/components/admin/AdminPortfolio.tsx', '/api/portfolio'],
      ['src/components/admin/AdminTestimonials.tsx', '/api/testimonials'],
      ['src/components/admin/AdminFAQs.tsx', '/api/faqs'],
    ] as const;

    for (const [path, endpoint] of files) {
      const value = source(path);
      expect(value).toContain(endpoint);
      expect(value).not.toContain(endpoint.replace('/api/', '/api/admin/'));
    }
  });

  test('validates and atomically persists CMS settings', () => {
    const settings = source('src/app/api/settings/route.ts');

    expect(settings).toContain('settingsPayloadSchema');
    expect(settings).toContain('z.record(');
    expect(settings).toContain('await db.$transaction(updates)');
  });

  test('does not expose inactive CMS detail records to anonymous callers', () => {
    for (const path of [
      'src/app/api/team/[id]/route.ts',
      'src/app/api/testimonials/[id]/route.ts',
      'src/app/api/process-steps/[id]/route.ts',
    ]) {
      const value = source(path);
      expect(value).toContain('const adminRequest = await isAdminRequest(request)');
      expect(value).toContain('active: true');
    }
  });
});
