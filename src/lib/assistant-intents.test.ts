import { describe, expect, test } from 'bun:test';
import { isLeadershipIntent, isNewsroomIntent, isTrustIntent } from './assistant-intents';

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

describe('assistant trust intent', () => {
  test('routes security and responsible-AI questions to Trust Center', () => {
    expect(isTrustIntent('What security practices do you use?')).toBe(true);
    expect(isTrustIntent('Tell me about responsible AI')).toBe(true);
    expect(isTrustIntent('How do you protect data?')).toBe(true);
  });

  test('does not capture a generic service question', () => {
    expect(isTrustIntent('Can you build an ERP for us?')).toBe(false);
  });
});

describe('assistant newsroom intent', () => {
  test('routes press and media questions to Newsroom', () => {
    expect(isNewsroomIntent('Where is your newsroom?')).toBe(true);
    expect(isNewsroomIntent('I need your press contact and company fact sheet')).toBe(true);
  });

  test('does not capture leadership questions', () => {
    expect(isNewsroomIntent('Who leads Lightworld?')).toBe(false);
  });
});
