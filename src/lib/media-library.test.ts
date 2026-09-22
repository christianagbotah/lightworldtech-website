import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('CMS media library', () => {
  test('lists only safe persistent image files and reports storage usage', () => {
    const route = source('src/app/api/admin/media/route.ts');

    expect(route).toContain("readdir(directory, { withFileTypes: true })");
    expect(route).toContain('isSafeImageUploadFilename(entry.name)');
    expect(route).toContain('imageUploadContentType(entry.name)');
    expect(route).toContain('totalBytes');
  });

  test('refuses to delete images that are still referenced by managed content', () => {
    const route = source('src/app/api/admin/media/route.ts');

    expect(route).toContain('db.service.count');
    expect(route).toContain('db.blogPost.count');
    expect(route).toContain('db.siteSetting.count');
    expect(route).toContain('db.clientDocument.count');
    expect(route).toContain('status: 409');
    expect(route).toContain("await unlink(join(uploadStorageDirectory(), filename))");
  });

  test('admin UI supports upload reuse search and safe deletion', () => {
    const page = source('src/components/admin/AdminMedia.tsx');

    expect(page).toContain("fetch('/api/admin/media'");
    expect(page).toContain("fetch('/api/upload'");
    expect(page).toContain('navigator.clipboard.writeText(item.url)');
    expect(page).toContain('ConfirmActionDialog');
    expect(page).toContain('Delete this image?');
    expect(page).not.toContain('window.confirm(');
    expect(page).toContain('Media storage used');
  });

  test('media library is permission-scoped and routable from admin navigation', () => {
    const permissions = source('src/lib/admin-permissions.ts');
    const layout = source('src/components/admin/AdminLayout.tsx');
    const page = source('src/app/admin/page.tsx');
    const store = source('src/lib/store.ts');

    expect(permissions).toContain("pathname.startsWith('/api/admin/media')");
    expect(layout).toContain("id: 'media'");
    expect(page).toContain("case 'media':");
    expect(store).toContain("'admin-media'");
  });
});
