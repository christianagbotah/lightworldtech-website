import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('verified award authority', () => {
  test('company profile uses exact publisher award titles', () => {
    const profile = source('src/lib/company-profile.ts');

    expect(profile).toContain('Web Development Agency of the Year 2026 - Accra');
    expect(profile).toContain('Best Full-Service Web & App Design Company 2024 - Accra');
    expect(profile).toContain('Best SEO & Social Media Marketing Agency - Ghana');
    expect(profile).toContain('https://meamarkets.digital/winners/lightworld-technologies-limited-2/');
    expect(profile).toContain('https://www.acquisition-international.com/winners/lightworld-technologies-limited/');
    expect(profile).toContain('https://meamarkets.digital/winners/lightworld-technologies-limited/');
  });

  test('CMS defaults publish the same verified recognition facts', () => {
    const content = source('src/lib/site-content.ts');

    expect(content).toContain('Web Development Agency of the Year 2026 - Accra');
    expect(content).toContain('Best Full-Service Web & App Design Company 2024 - Accra');
    expect(content).toContain('Best SEO & Social Media Marketing Agency - Ghana');
    expect(content).toContain('MEA Markets named Lightworld Technologies Limited');
    expect(content).toContain('Acquisition International named Lightworld Technologies Limited');
  });

  test('migration seeds recognition only when the CMS field is absent', () => {
    const migration = source('prisma/migrations/20260922164500_verified_award_authority/migration.sql');

    expect(migration).toContain("'about_recognition'");
    expect(migration).toContain('WHERE NOT EXISTS');
    expect(migration).toContain('Web Development Agency of the Year 2026 - Accra');
    expect(migration).toContain('Best Full-Service Web & App Design Company 2024 - Accra');
    expect(migration).toContain('Best SEO & Social Media Marketing Agency - Ghana');
    expect(migration).not.toContain('UPDATE "SiteSetting"');
  });

  test('organization schema derives awards from the verified company profile', () => {
    const schema = source('src/components/ui/json-ld.tsx');

    expect(schema).toContain('award: companyProfile.recognition.map');
    expect(schema).toContain('item.year');
    expect(schema).toContain('item.title');
    expect(schema).toContain('item.publisher');
  });

  test('assistant recognition answer uses specific sourced titles', () => {
    const profile = source('src/lib/company-profile.ts');

    expect(profile).toContain('Verified publisher pages recognize Lightworld Technologies Limited');
    expect(profile).toContain('The Newsroom and About pages link directly to the publisher sources.');
  });
});
