import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('secure invoice shared billing lineage', () => {
  test('returns billing context only when the milestone is explicitly client-visible', () => {
    const route = source('src/app/api/invoice/[token]/route.ts');

    expect(route).toContain("billingMilestone: { select: { title: true, visibleToClient: true } }");
    expect(route).toContain("invoice.billingMilestone?.visibleToClient");
    expect(route).toContain("const billingContext =");
    expect(route).toContain("billingContext,");
  });

  test('renders the safe billing context on the secure invoice page', () => {
    const page = source('src/components/invoice/PublicInvoicePage.tsx');

    expect(page).toContain("billingContext: { milestone: string; agreement: string } | null");
    expect(page).toContain("data.billingContext &&");
    expect(page).toContain("Billing context");
    expect(page).toContain("Billing milestone:");
  });
});
