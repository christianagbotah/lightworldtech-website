export type LeadQualificationInput = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
};

export type LeadQualification = {
  category: 'AI & Automation' | 'Enterprise Software' | 'Mobile' | 'Web' | 'Cloud & Security' | 'SEO & Growth' | 'Training & Advisory' | 'General';
  score: number;
  priority: 'normal' | 'medium' | 'high';
  summary: string;
  nextAction: string;
};

function normalize(input: LeadQualificationInput): string {
  return [input.subject, input.message].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function categoryFor(text: string): LeadQualification['category'] {
  if (/\b(ai|artificial intelligence|machine learning|chatbot|assistant|automation|automate|intelligent workflow)\b/i.test(text)) return 'AI & Automation';
  if (/\b(erp|crm|inventory|school management|management system|workflow|asset|maintenance|payroll|hrms|finance system|logistics|depot|factory|enterprise)\b/i.test(text)) return 'Enterprise Software';
  if (/\b(mobile|android|ios|iphone|react native|flutter|mobile app)\b/i.test(text)) return 'Mobile';
  if (/\b(website|web app|web portal|e-?commerce|online store|landing page|web development)\b/i.test(text)) return 'Web';
  if (/\b(cloud|devops|hosting|server|vps|security|cyber|backup|infrastructure|deployment)\b/i.test(text)) return 'Cloud & Security';
  if (/\b(seo|marketing|social media|search engine|digital growth|campaign)\b/i.test(text)) return 'SEO & Growth';
  if (/\b(training|course|academy|consultancy|consulting|advisory|architecture review|technology audit)\b/i.test(text)) return 'Training & Advisory';
  return 'General';
}

function compactSummary(input: LeadQualificationInput, text: string): string {
  const subject = (input.subject || '').trim();
  const body = text.replace(/^\[[^\]]+\]\s*/i, '').trim();
  const core = body || subject || 'Website enquiry';
  const clipped = core.length > 220 ? core.slice(0, 217).trimEnd() + '…' : core;
  return subject && !clipped.toLowerCase().startsWith(subject.toLowerCase())
    ? subject + ' — ' + clipped
    : clipped;
}

export function qualifyLead(input: LeadQualificationInput): LeadQualification {
  const text = normalize(input);
  const category = categoryFor(text);
  let score = 35;

  if (category === 'Enterprise Software' || category === 'AI & Automation') score += 20;
  else if (category !== 'General') score += 10;

  if ((input.phone || '').trim()) score += 10;
  if ((input.subject || '').trim().length >= 10) score += 5;
  if (text.length >= 180) score += 5;
  if (/\b(urgent|asap|immediately|deadline|within (one|1|two|2|three|3) months?|1[–-]3 months?)\b/i.test(text)) score += 15;
  if (/\b(company|business|school|university|factory|organization|organisation|hospital|enterprise|staff|employees|branches|department)\b/i.test(text)) score += 10;
  if (/\b(budget|proposal|quotation|quote|procurement|tender|contract)\b/i.test(text)) score += 10;

  score = Math.max(0, Math.min(100, score));

  const priority: LeadQualification['priority'] =
    score >= 75 ? 'high' : score >= 55 ? 'medium' : 'normal';

  const nextAction =
    score >= 75
      ? 'Schedule discovery call and validate decision-maker, scope, timeline and budget.'
      : score >= 55
        ? 'Review requirements and send focused discovery questions.'
        : 'Review enquiry and determine whether a discovery conversation is needed.';

  return {
    category,
    score,
    priority,
    summary: compactSummary(input, text),
    nextAction,
  };
}
