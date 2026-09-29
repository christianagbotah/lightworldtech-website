import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('client statement billing lineage', () => {
  test('includes shared milestone and agreement context without exposing internal milestones', () => {
    const statement = source('src/lib/customer-statement.ts');

    expect(statement).toContain("billingMilestone: { select: { title: true, visibleToClient: true } }");
    expect(statement).toContain("if (!invoice.billingMilestone?.visibleToClient) return base;");
    expect(statement).toContain("' · Agreement: ' + invoice.agreement.title");
    expect(statement).toContain("' · Billing milestone: ' + invoice.billingMilestone.title");
  });

  test('preserves normal service/project descriptions when no shared milestone exists', () => {
    const statement = source('src/lib/customer-statement.ts');

    expect(statement).toContain("invoice.service.name");
    expect(statement).toContain("invoice.project?.name || 'General account invoice'");
  });
});
