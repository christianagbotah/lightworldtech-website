export type AssistantFaqEntry = {
  question: string;
  answer: string;
};

export type AssistantProcessStep = {
  title: string;
  description: string;
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'can', 'could', 'do', 'does', 'for',
  'from', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our',
  'please', 'the', 'this', 'to', 'we', 'what', 'when', 'where', 'which', 'who',
  'will', 'with', 'would', 'you', 'your', 'happen', 'happens',
]);

function canonicalToken(token: string): string {
  const aliases: Record<string, string> = {
    site: 'website',
    sites: 'website',
    websites: 'website',
    webpages: 'website',
    webpage: 'website',
    tech: 'technology',
    technologies: 'technology',
    stack: 'technology',
    stacks: 'technology',
    payments: 'payment',
    plans: 'plan',
    costs: 'price',
    cost: 'price',
    pricing: 'price',
    old: 'outdated',
    updates: 'update',
    maintaining: 'maintenance',
    maintain: 'maintenance',
    redesigning: 'redesign',
  };

  return aliases[token] || token;
}

function normalizedText(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return Array.from(
    new Set(
      normalizedText(value)
        .split(' ')
        .map(canonicalToken)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
    ),
  );
}

function scoreMatch(query: string, heading: string, body: string, allowSingleHeadingToken = false): number {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return 0;

  const headingTokens = new Set(tokens(heading));
  const bodyTokens = new Set(tokens(body));
  const headingHits = queryTokens.filter((token) => headingTokens.has(token)).length;
  const bodyHits = queryTokens.filter((token) => bodyTokens.has(token)).length;

  if (queryTokens.length === 1) {
    const token = queryTokens[0];
    if (!allowSingleHeadingToken || token.length < 5 || !headingTokens.has(token)) return 0;
    return 1;
  }

  if (headingHits === 0) return 0;

  let score = (headingHits / queryTokens.length) * 0.78 + (bodyHits / queryTokens.length) * 0.22;

  const queryText = normalizedText(query);
  const headingText = normalizedText(heading);
  if (queryText.length >= 8 && (headingText.includes(queryText) || queryText.includes(headingText))) {
    score += 0.3;
  }
  if (headingHits >= 2) score += 0.15;

  return score;
}

export function findBestFaqMatch<T extends AssistantFaqEntry>(
  query: string,
  faqs: T[],
): T | null {
  let best: { item: T; score: number } | null = null;

  for (const faq of faqs) {
    const score = scoreMatch(query, faq.question, faq.answer);
    if (!best || score > best.score) best = { item: faq, score };
  }

  return best && best.score >= 0.58 ? best.item : null;
}

export function findBestProcessStepMatch<T extends AssistantProcessStep>(
  query: string,
  steps: T[],
): T | null {
  let best: { item: T; score: number } | null = null;

  for (const step of steps) {
    const score = scoreMatch(query, step.title, step.description, true);
    if (!best || score > best.score) best = { item: step, score };
  }

  return best && best.score >= 0.56 ? best.item : null;
}

export function isProcessOverviewIntent(message: string): boolean {
  const q = normalizedText(message);
  return /\b(process|workflow|steps|journey)\b/.test(q) ||
    /how (do|does) .* (work|deliver|build)/.test(q) ||
    /what (is|are) .* (process|steps)/.test(q);
}
