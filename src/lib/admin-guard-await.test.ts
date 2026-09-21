import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;
const PUBLIC_ADMIN_MUTATION_ROUTES = new Set([
  'auth/route.ts',
  'password-reset/request/route.ts',
  'password-reset/confirm/route.ts',
]);
const PUBLIC_CLIENT_MUTATION_ROUTES = new Set([
  'activate/route.ts',
  'auth/route.ts',
  'password-reset/request/route.ts',
  'password-reset/confirm/route.ts',
]);

function routeFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...routeFiles(path));
    else if (entry.name === 'route.ts') files.push(path);
  }
  return files;
}

function exportedHandlerBody(source: string, method: string): string | null {
  const marker = 'export async function ' + method;
  const start = source.indexOf(marker);
  if (start < 0) return null;

  const paramsOpen = source.indexOf('(', start);
  if (paramsOpen < 0) return null;

  let paramsDepth = 0;
  let quote: string | null = null;
  let escaped = false;
  let paramsClose = -1;

  for (let index = paramsOpen; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') paramsDepth += 1;
    else if (char === ')') {
      paramsDepth -= 1;
      if (paramsDepth === 0) {
        paramsClose = index;
        break;
      }
    }
  }

  if (paramsClose < 0) return null;
  const open = source.indexOf('{', paramsClose);
  if (open < 0) return null;

  let depth = 0;
  quote = null;
  escaped = false;

  for (let index = open; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }

  return null;
}

function assignedGuardVariable(body: string, expression: string): string | null {
  const escaped = expression.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
  const match = body.match(
    new RegExp('(?:const|let)\\s+([a-zA-Z_$][\\w$]*)\\s*=\\s*' + escaped),
  );
  return match?.[1] ?? null;
}

function explicitlyRejectsMissing(body: string, variable: string | null): boolean {
  if (!variable) return false;
  const escaped = variable.replace(/[$]/g, '\\$&');

  // Accept either `if (!actor)` or the stricter fail-closed shape
  // `if (!actor || !hasRequiredPermission(...))`. Do not accept `&&`,
  // because a missing actor could then bypass the rejection branch.
  return new RegExp(
    'if\\s*\\(\\s*!\\s*' + escaped + '(?:\\s*\\)|\\s*\\|\\|)',
  ).test(body);
}

function hasRecognizedAdminGuard(body: string): boolean {
  if (body.includes('await isAdminRequest(request)')) return true;

  const activeAdmin = assignedGuardVariable(body, 'await getActiveAdminContext(request)');
  if (explicitlyRejectsMissing(body, activeAdmin)) return true;

  const superAdmin = assignedGuardVariable(body, 'await getSuperAdminContext(request)');
  return explicitlyRejectsMissing(body, superAdmin);
}

function hasActiveClientGuard(body: string): boolean {
  const context = assignedGuardVariable(body, 'await getActiveClientContext(request)');
  return explicitlyRejectsMissing(body, context);
}

describe('API authorization guardrails', () => {
  test('every async isAdminRequest call is awaited', () => {
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

  test('every admin mutation handler has an explicit authorization guard', () => {
    const adminRoot = join(process.cwd(), 'src', 'app', 'api', 'admin');
    const violations: string[] = [];

    for (const path of routeFiles(adminRoot)) {
      const relativePath = relative(adminRoot, path).replaceAll('\\', '/');
      if (PUBLIC_ADMIN_MUTATION_ROUTES.has(relativePath)) continue;

      const source = readFileSync(path, 'utf8');
      for (const method of MUTATION_METHODS) {
        const body = exportedHandlerBody(source, method);
        if (body !== null && !hasRecognizedAdminGuard(body)) {
          violations.push(relativePath + ' ' + method);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test('protected admin APIs do not rely on cookie-only sessions', () => {
    const adminRoot = join(process.cwd(), 'src', 'app', 'api', 'admin');
    const violations: string[] = [];

    for (const path of routeFiles(adminRoot)) {
      const relativePath = relative(adminRoot, path).replaceAll('\\', '/');
      if (PUBLIC_ADMIN_MUTATION_ROUTES.has(relativePath)) continue;

      const source = readFileSync(path, 'utf8');
      if (source.includes('getAdminSession(request)')) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });

  test('every authenticated client mutation uses active tenant context', () => {
    const clientRoot = join(process.cwd(), 'src', 'app', 'api', 'client');
    const violations: string[] = [];

    for (const path of routeFiles(clientRoot)) {
      const relativePath = relative(clientRoot, path).replaceAll('\\', '/');
      if (PUBLIC_CLIENT_MUTATION_ROUTES.has(relativePath)) continue;

      const source = readFileSync(path, 'utf8');
      for (const method of MUTATION_METHODS) {
        const body = exportedHandlerBody(source, method);
        if (body !== null && !hasActiveClientGuard(body)) {
          violations.push(relativePath + ' ' + method);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
