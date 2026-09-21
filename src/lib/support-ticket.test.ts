import { describe, expect, test } from 'bun:test';
import { supportSla, supportSlaState } from './support-ticket';

describe('enterprise support ticket SLA', () => {
  const openedAt = new Date('2026-09-21T08:00:00.000Z');

  test('assigns priority-specific first response and resolution windows', () => {
    const high = supportSla('high', openedAt);
    const normal = supportSla('normal', openedAt);
    const low = supportSla('low', openedAt);

    expect(high.firstResponseDueAt.toISOString()).toBe('2026-09-21T10:00:00.000Z');
    expect(high.resolutionDueAt.toISOString()).toBe('2026-09-22T08:00:00.000Z');
    expect(normal.firstResponseDueAt.toISOString()).toBe('2026-09-21T16:00:00.000Z');
    expect(normal.resolutionDueAt.toISOString()).toBe('2026-09-24T08:00:00.000Z');
    expect(low.firstResponseDueAt.toISOString()).toBe('2026-09-22T08:00:00.000Z');
    expect(low.resolutionDueAt.toISOString()).toBe('2026-09-26T08:00:00.000Z');
  });

  test('flags first response and resolution breaches independently', () => {
    const state = supportSlaState(
      {
        status: 'open',
        firstResponseDueAt: new Date('2026-09-21T10:00:00.000Z'),
        resolutionDueAt: new Date('2026-09-22T08:00:00.000Z'),
        firstRespondedAt: null,
        resolvedAt: null,
      },
      new Date('2026-09-22T09:00:00.000Z'),
    );

    expect(state.firstResponseBreached).toBe(true);
    expect(state.resolutionBreached).toBe(true);
    expect(state.breached).toBe(true);
  });

  test('does not treat resolved tickets as resolution breaches', () => {
    const state = supportSlaState(
      {
        status: 'resolved',
        firstResponseDueAt: new Date('2026-09-21T10:00:00.000Z'),
        resolutionDueAt: new Date('2026-09-22T08:00:00.000Z'),
        firstRespondedAt: new Date('2026-09-21T09:00:00.000Z'),
        resolvedAt: new Date('2026-09-21T20:00:00.000Z'),
      },
      new Date('2026-09-23T09:00:00.000Z'),
    );

    expect(state.breached).toBe(false);
  });
});
