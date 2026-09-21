import { describe, expect, test } from 'bun:test';
import {
  isCompletedProjectChangeIntent,
  isCompletedProjectContactIntent,
  isCompletedProjectContextIntent,
  isCompletedProjectNextStepsIntent,
  isCompletedProjectPricingIntent,
  isCompletedProjectRestartIntent,
  isLeadershipIntent,
  isNewsroomIntent,
  isTrustIntent,
} from './assistant-intents';

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
    expect(isNewsroomIntent('Where can I find Lightworld press and media information?')).toBe(true);
    expect(isNewsroomIntent('I am a journalist looking for company information')).toBe(true);
  });

  test('does not hijack social media marketing questions', () => {
    expect(isNewsroomIntent('Do you offer social media marketing?')).toBe(false);
  });

  test('does not capture leadership questions', () => {
    expect(isNewsroomIntent('Who leads Lightworld?')).toBe(false);
  });
});


describe('assistant completed-project follow-up intent', () => {
  test('keeps post-submission questions in the project journey', () => {
    expect(isCompletedProjectNextStepsIntent('What happens after I submit?')).toBe(true);
    expect(isCompletedProjectNextStepsIntent('What are the next steps?')).toBe(true);
    expect(isCompletedProjectContactIntent('How long before I hear back?')).toBe(true);
    expect(isCompletedProjectPricingIntent('How is the estimate calculated?')).toBe(true);
    expect(isCompletedProjectChangeIntent('Can I change the brief later?')).toBe(true);
    expect(isCompletedProjectContextIntent('What about my project?')).toBe(true);
  });

  test('recognizes a deliberate new-project restart without hijacking normal service questions', () => {
    expect(isCompletedProjectRestartIntent('I want to start another project')).toBe(true);
    expect(isCompletedProjectRestartIntent('What services do you offer?')).toBe(false);
    expect(isCompletedProjectNextStepsIntent('What services do you offer?')).toBe(false);
  });
});
