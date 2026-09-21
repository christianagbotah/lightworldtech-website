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
    expect(crm).toContain('max-w-[min(96vw,1440px)]');
    expect(crm).toContain('Original customer enquiry');
    expect(crm).toContain('max-h-[48vh] overflow-y-auto');
  });

  test('keeps the client portal workspace inside the viewport', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('w-full overflow-x-hidden');
    expect(portal).toContain('lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]');
    expect(portal).toContain('lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]');
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

  test('supports dashboard drill-downs and a real authenticated health signal', () => {
    const dashboard = source('src/components/admin/AdminDashboard.tsx');
    const messages = source('src/components/admin/AdminMessages.tsx');
    const health = source('src/app/api/admin/health/route.ts');

    expect(dashboard).toContain("sessionStorage.setItem('lw-open-message-id'");
    expect(dashboard).toContain("sessionStorage.setItem('lw-crm-status-filter'");
    expect(dashboard).toContain("fetch('/api/admin/health'");
    expect(dashboard).toContain('Analytics drill-down');
    expect(messages).toContain("sessionStorage.getItem('lw-open-message-id')");
    expect(messages).toContain('max-w-5xl');
    expect(health).toContain('getActiveAdminContext(request)');
    expect(health).toContain('await db.$queryRaw');
  });

  test('keeps blog admin contracts aligned with wrapped API responses', () => {
    const blog = source('src/components/admin/AdminBlog.tsx');
    const editor = source('src/components/admin/AdminBlogEditor.tsx');

    expect(blog).toContain('payload.data || []');
    expect(blog).toContain("params.set('published', 'true')");
    expect(blog).toContain("params.set('featured', 'true')");
    expect(editor).toContain('const post = payload.data || payload');
  });

  test('validates and atomically persists CMS settings', () => {
    const settings = source('src/app/api/settings/route.ts');

    expect(settings).toContain('settingsPayloadSchema');
    expect(settings).toContain('.record(');
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
