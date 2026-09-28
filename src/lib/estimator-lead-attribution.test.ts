import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveLeadIntelligence } from './lead-intelligence';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('project estimator lead attribution', () => {
  test('keeps assistant and estimator handoffs distinct through Contact', () => {
    const assistant = source('src/components/layout/FloatingWidgets.tsx');
    const estimator = source('src/components/pages/ProjectEstimatorPage.tsx');
    const contact = source('src/components/pages/ContactPage.tsx');

    expect(assistant).toContain("source: 'assistant'");
    expect(estimator).toContain("source: 'estimator'");
    expect(contact).toContain("source === 'estimator'");
    expect(contact).toContain('Project brief from Lightworld Project Estimator');
    expect(contact).toContain('source: handoffSource');
  });

  test('classifies estimator-originated CRM leads separately from website and assistant leads', () => {
    const result = deriveLeadIntelligence({
      subject: 'Project brief from Lightworld Project Estimator',
      message: 'Project scope prepared with the Lightworld Project Estimator. We need an enterprise workflow platform.',
    });

    expect(result.source).toBe('estimator');
    expect(result.tags).toContain('enterprise');
  });

  test('measures estimator completion to submitted lead conversion by first-party session', () => {
    const analytics = source('src/app/api/admin/analytics/route.ts');
    const dashboard = source('src/components/admin/AdminDashboard.tsx');

    expect(analytics).toContain('estimatorCompletions');
    expect(analytics).toContain('estimatorStartedBySession');
    expect(analytics).toContain("source === 'estimator'");
    expect(analytics).toContain('estimatorLeadConversionRate');
    expect(dashboard).toContain('Estimator → Lead');
    expect(dashboard).toContain('estimatorLeadConversionRate');
  });
});
