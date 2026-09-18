import { describe, expect, test } from 'bun:test';
import { isLeadershipIntent } from './assistant-intents';

describe('assistant leadership intent', () => {
  test('matches the production quick-reply wording', () => {
    expect(isLeadershipIntent('Who leads Lightworld Technologies?')).toBe(true);
  });

  test('matches executive leadership variants', () => {
    expect(isLeadershipIntent('Who is the managing director?')).toBe(true);
    expect(isLeadershipIntent('Show me the leadership team')).toBe(true);
  });

  test('does not treat a service question as leadership intent', () => {
    expect(isLeadershipIntent('What services does Lightworld offer?')).toBe(false);
  });
});
