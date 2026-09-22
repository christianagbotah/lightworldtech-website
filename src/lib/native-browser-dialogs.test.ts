import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function productionSources(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...productionSources(path));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    files.push(path);
  }

  return files;
}

describe('modern browser feedback dialogs', () => {
  test('production source does not use browser-native alert, confirm or prompt dialogs', () => {
    const nativeDialog = /\b(?:(?:window|globalThis)\.)?(?:alert|confirm|prompt)\s*\(/g;
    const violations: string[] = [];

    for (const path of productionSources(join(process.cwd(), 'src'))) {
      const content = readFileSync(path, 'utf8');
      if (nativeDialog.test(content)) violations.push(path);
      nativeDialog.lastIndex = 0;
    }

    expect(violations).toEqual([]);
  });

  test('shared confirmation experience uses accessible modern AlertDialog primitives', () => {
    const confirm = readFileSync(
      join(process.cwd(), 'src/components/ui/ConfirmActionDialog.tsx'),
      'utf8',
    );

    expect(confirm).toContain('AlertDialogTitle');
    expect(confirm).toContain('AlertDialogDescription');
    expect(confirm).toContain('AlertDialogCancel');
    expect(confirm).toContain('AlertDialogAction');
    expect(confirm).toContain('working');
    expect(confirm).toContain('tone="');
  });
});
