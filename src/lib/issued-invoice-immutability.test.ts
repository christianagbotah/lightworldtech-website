import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('issued invoice immutability', () => {
  test('allows draft editing but blocks customer-facing term changes after issue', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("invoice.status !== 'draft' && !voiding && customerFacingTermsMutation");
    expect(route).toContain('Issued invoice terms are immutable. Void and replace the invoice to change due dates or customer-visible notes.');
    expect(route).toContain("'admin.finance_invoice_post_issue_mutation_blocked'");
  });

  test('treats void invoices as terminal immutable records', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("invoice.status === 'void'");
    expect(route).toContain('A void invoice is terminal and immutable');
  });

  test('does not allow a void transition to alter invoice terms at the same time', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain('voiding && customerFacingTermsMutation');
    expect(route).toContain('Void requests cannot modify invoice terms');
    expect(route).toContain('prepare a replacement if corrections are required');
  });

  test('accepts voidReason only as part of a void request', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("value.voidReason !== undefined && value.status !== 'void'");
    expect(route).toContain('Void reason can only be supplied when voiding an invoice');
  });
});
