import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function routeFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...routeFiles(path));
    else if (entry.name === 'route.ts') files.push(path);
  }

  return files;
}

describe('admin API authentication guards', () => {
  test('every isAdminRequest call in API routes is awaited', () => {
    const apiRoot = join(process.cwd(), 'src', 'app', 'api');
    const violations: string[] = [];

    for (const path of routeFiles(apiRoot)) {
      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (
          line.includes('isAdminRequest(request)') &&
          !line.includes('await isAdminRequest(request)')
        ) {
          violations.push(path + ':' + (index + 1) + ': ' + line.trim());
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
