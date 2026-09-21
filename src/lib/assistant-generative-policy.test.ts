import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('grounded generative concierge policy', () => {
  test('is feature-gated and cannot replace deterministic routing by default', () => {
    const generative = source('src/lib/assistant-generative.ts');
    const knowledge = source('src/lib/assistant-knowledge.ts');

    expect(generative).toContain("process.env.ASSISTANT_GENERATIVE_ENABLED === 'true'");
    expect(generative).toContain("const PROVIDER_BACKOFF_MS = 60_000");
    expect(generative).toContain("const MAX_HISTORY_TURNS = 10");
    expect(generative).toContain("const MAX_REPLY_CHARS = 2200");

    const deterministicServiceRoute = knowledge.indexOf(
      "if (/service|what.*do|offer|solution|capabilit|build/.test(q))",
    );
    const generativeFallback = knowledge.indexOf('generateGroundedConciergeReply({');

    expect(deterministicServiceRoute).toBeGreaterThan(-1);
    expect(generativeFallback).toBeGreaterThan(deterministicServiceRoute);
  });

  test('grounds the model in CMS facts and explicitly blocks fabricated business claims', () => {
    const generative = source('src/lib/assistant-generative.ts');

    expect(generative).toContain('Treat the supplied CONTEXT as the source of truth');
    expect(generative).toContain('Never invent services, prices, delivery dates, awards, certifications, clients, project status');
    expect(generative).toContain('this public assistant cannot verify private live status');
    expect(generative).toContain('activeProjectBrief');
    expect(generative).toContain("thinking: { type: 'enabled' }");
    expect(generative).toContain("reasoning_effort:");
  });

  test('sends only bounded validated recent history from the browser through the assistant API', () => {
    const widgets = source('src/components/layout/FloatingWidgets.tsx');
    const route = source('src/app/api/assistant/route.ts');

    expect(widgets).toContain('history: messages.slice(-10).map');
    expect(widgets).toContain("role: msg.sender === 'bot' ? 'assistant' : 'user'");
    expect(route).toContain("role: z.enum(['user', 'assistant'])");
    expect(route).toContain('history: z.array(historyTurnSchema).max(10).optional()');
    expect(route).toContain('parsed.data.history ?? []');
  });
});
