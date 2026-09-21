import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('shared CMS media picker', () => {
  test('picker loads persistent media and can upload then select a new image', () => {
    const picker = source('src/components/admin/AdminMediaField.tsx');

    expect(picker).toContain("fetch('/api/admin/media'");
    expect(picker).toContain("fetch('/api/upload'");
    expect(picker).toContain("accept=\"image/jpeg,image/png,image/gif,image/webp\"");
    expect(picker).toContain("onChange(item.url)");
    expect(picker).toContain('Clear image');
  });

  test('core CMS image editors use the shared picker', () => {
    for (const path of [
      'src/components/admin/AdminBlogEditor.tsx',
      'src/components/admin/AdminTeam.tsx',
      'src/components/admin/AdminTestimonials.tsx',
      'src/components/admin/AdminPortfolio.tsx',
      'src/components/admin/AdminServices.tsx',
    ]) {
      expect(source(path)).toContain("AdminMediaField");
    }
  });

  test('services admin now exposes the image field already supported by the API model', () => {
    const page = source('src/components/admin/AdminServices.tsx');
    const collectionApi = source('src/app/api/services/route.ts');
    const itemApi = source('src/app/api/services/[id]/route.ts');

    expect(page).toContain('image: string;');
    expect(page).toContain("image: service.image || ''");
    expect(page).toContain('label="Service image"');
    expect(collectionApi).toContain("image: z.string().optional().default('')");
    expect(itemApi).toContain('image: z.string().optional()');
  });

  test('team no longer maintains a separate duplicate image uploader', () => {
    const team = source('src/components/admin/AdminTeam.tsx');

    expect(team).not.toContain('handleImageUpload');
    expect(team).not.toContain('uploadProgress');
    expect(team).toContain('label="Profile image"');
  });
});
