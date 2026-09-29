import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('client invoice shared billing lineage', () => {
  test('prints agreement milestone context only when the milestone is client-visible', () => {
    const route = source('src/app/api/client/invoices/[id]/document/route.ts');

    expect(route).toContain("billingMilestone: { select: { title: true, visibleToClient: true } }");
    expect(route).toContain("invoice.billingMilestone?.visibleToClient");
    expect(route).toContain("Billing context");
    expect(route).toContain("Billing milestone:");
    expect(route).toContain("Agreement:");
  });

  test('keeps internal billing context out of the document path by default', () => {
    const route = source('src/app/api/client/invoices/[id]/document/route.ts');

    expect(route).toContain("const billingContextHtml = sharedBillingContext");
    expect(route).toContain(": '';");
  });
});
