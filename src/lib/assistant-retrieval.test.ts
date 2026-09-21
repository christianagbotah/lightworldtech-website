import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  findBestFaqMatch,
  findBestProcessStepMatch,
  isProcessOverviewIntent,
} from './assistant-retrieval';

const faqs = [
  {
    question: 'How long does it take to build a website?',
    answer: 'A basic website typically takes 2-4 weeks while more complex projects take longer.',
  },
  {
    question: 'Do you provide website maintenance and support?',
    answer: 'Yes, we offer ongoing maintenance, updates, security monitoring and technical support.',
  },
  {
    question: 'What technologies do you use for web development?',
    answer: 'We use Next.js, React, Node.js, TypeScript and appropriate databases.',
  },
  {
    question: 'Can you help with existing website redesign?',
    answer: 'Yes. We modernize outdated, slow or non-mobile-friendly websites.',
  },
  {
    question: 'Do you offer payment plans for projects?',
    answer: 'Yes, payment terms can be discussed for the project.',
  },
];

const processSteps = [
  { title: 'Initial Planning', description: 'We create design and technical specifications.' },
  { title: 'Development', description: 'We build the approved solution.' },
  { title: 'Testing', description: 'We test performance and reliability across browsers and devices.' },
  { title: 'Deployment & Optimization', description: 'We deploy the approved solution and optimize performance.' },
];

describe('assistant CMS retrieval', () => {
  test('matches specific FAQ questions and natural variants', () => {
    expect(findBestFaqMatch('How long does a website take?', faqs)?.question).toContain('How long');
    expect(findBestFaqMatch('Do you support websites after launch?', faqs)?.question).toContain('maintenance');
    expect(findBestFaqMatch('What tech stack do you use?', faqs)?.question).toContain('technologies');
    expect(findBestFaqMatch('Can you redesign my old site?', faqs)?.question).toContain('redesign');
    expect(findBestFaqMatch('Do you have payment plans?', faqs)?.question).toContain('payment plans');
  });

  test('does not force a vague query into an unrelated FAQ', () => {
    expect(findBestFaqMatch('website', faqs)).toBeNull();
    expect(findBestFaqMatch('tell me more', faqs)).toBeNull();
    expect(findBestFaqMatch('who is your CEO?', faqs)).toBeNull();
  });

  test('matches a specific published process step', () => {
    expect(findBestProcessStepMatch('What happens during testing?', processSteps)?.title).toBe('Testing');
    expect(findBestProcessStepMatch('deployment', processSteps)?.title).toBe('Deployment & Optimization');
  });

  test('recognizes process-overview questions', () => {
    expect(isProcessOverviewIntent('What is your development process?')).toBe(true);
    expect(isProcessOverviewIntent('Can you show me the project steps?')).toBe(true);
    expect(isProcessOverviewIntent('Who leads Lightworld?')).toBe(false);
  });
});


describe('assistant process routing precedence', () => {
  test('evaluates full-process intent before a matching individual step', () => {
    const knowledge = readFileSync(join(process.cwd(), 'src/lib/assistant-knowledge.ts'), 'utf8');
    const overview = knowledge.indexOf('if (isProcessOverviewIntent(message))');
    const individual = knowledge.indexOf('const processStepMatch = findBestProcessStepMatch(message, knowledge.processSteps)');

    expect(overview).toBeGreaterThan(-1);
    expect(individual).toBeGreaterThan(-1);
    expect(overview).toBeLessThan(individual);
  });
});
