export type LeadIntelligence = {
  source: 'website' | 'assistant';
  summary: string;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
};

const tagRules: Array<[string, RegExp]> = [
  ['website', /\bwebsite|web app|web portal|landing page|e-?commerce\b/i],
  ['mobile', /\bmobile|android|ios|react native|flutter|app\b/i],
  ['enterprise', /\berp|enterprise|workflow|operations|inventory|asset|maintenance|hr|crm|pos|school management\b/i],
  ['ai', /\bai\b|artificial intelligence|assistant|automation|machine learning|chatbot/i],
  ['cloud', /cloud|devops|hosting|deployment|server|infrastructure|aws|azure|gcp/i],
  ['security', /security|cyber|vulnerability|penetration|access control/i],
  ['seo', /seo|search engine|social media|digital marketing|growth/i],
  ['training', /training|course|academy|learn|skills|workshop/i],
  ['education', /school|education|student|teacher|parent|assessment|learning/i],
  ['manufacturing', /manufactur|factory|plant|maintenance|production|oee|machine/i],
  ['logistics', /logistics|fleet|truck|delivery|warehouse|transport/i],
];

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function deriveLeadIntelligence(input: {
  subject?: string;
  message: string;
}): LeadIntelligence {
  const subject = cleanText(input.subject || '');
  const message = cleanText(input.message);
  const haystack = (subject + ' ' + message).trim();

  const tags = tagRules
    .filter(([, matcher]) => matcher.test(haystack))
    .map(([tag]) => tag)
    .slice(0, 6);

  if (tags.length === 0) tags.push('general');

  const source: LeadIntelligence['source'] =
    /project brief from lightworld assistant|\[assistant\]|lightworld assistant/i.test(haystack)
      ? 'assistant'
      : 'website';

  const priority: LeadIntelligence['priority'] =
    /urgent|asap|immediately|emergency|this week|deadline/i.test(haystack)
      ? 'high'
      : /research|exploring|someday|no fixed deadline/i.test(haystack)
        ? 'low'
        : 'normal';

  const summaryBase = subject
    ? subject + ': ' + message
    : message;

  const summary = cleanText(summaryBase).slice(0, 280);

  return { source, summary, tags, priority };
}
