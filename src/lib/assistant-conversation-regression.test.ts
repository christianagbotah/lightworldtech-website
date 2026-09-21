import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('assistant project conversation regression', () => {
  test('completed project context is resolved before generic company/service routing', () => {
    const knowledge = source('src/lib/assistant-knowledge.ts');

    const completedRoute = knowledge.indexOf("state?.mode === 'project-scope' && state.step === 'done'");
    const genericServiceRoute = knowledge.indexOf("if (/service|what.*do|offer|solution|capabilit|build/.test(q))");

    expect(completedRoute).toBeGreaterThan(-1);
    expect(genericServiceRoute).toBeGreaterThan(-1);
    expect(completedRoute).toBeLessThan(genericServiceRoute);
    expect(knowledge).toContain('answerCompletedProjectFollowUp');
    expect(knowledge).toContain('After you submit the project brief');
    expect(knowledge).toContain("cta: { label: 'Open Client Portal', href: '/client' }");
  });

  test('customer project state survives unrelated assistant answers', () => {
    const widgets = source('src/components/layout/FloatingWidgets.tsx');

    expect(widgets).toContain("Object.prototype.hasOwnProperty.call(payload, 'state')");
    expect(widgets).not.toContain(
      "const nextState = payload?.state ? (payload.state as ProjectScopeState) : null",
    );
  });
});
