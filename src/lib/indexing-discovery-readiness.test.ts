import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const INDEXNOW_KEY = '2dd0a63b87d5b926f386af94ed58215e';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('indexing discovery readiness', () => {
  test('publishes the IndexNow ownership key at the canonical host root', () => {
    const keyFile = source('public/' + INDEXNOW_KEY + '.txt');
    expect(keyFile.trim()).toBe(INDEXNOW_KEY);
  });

  test('submission tool is canonical-host only and explicit', () => {
    const script = source('scripts/indexnow-submit.mjs');

    expect(script).toContain("const SITE_URL = 'https://lightworldtech.com'");
    expect(script).toContain("const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow'");
    expect(script).toContain("KEY_LOCATION = SITE_URL + '/' + INDEXNOW_KEY + '.txt'");
    expect(script).toContain("if (url.origin !== SITE_URL)");
    expect(script).toContain("if (!requested.length)");
    expect(script).toContain('urlList.length > 10000');
    expect(script).toContain('[200, 202].includes(response.status)');
  });

  test('package exposes the controlled IndexNow command', () => {
    const pkg = JSON.parse(source('package.json')) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['seo:indexnow']).toBe('bun scripts/indexnow-submit.mjs');
  });
});
