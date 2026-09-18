import 'server-only';

import { db } from '@/lib/db';
import { companyProfile } from '@/lib/company-profile';
import { contentJson, contentText, defaultRecognition } from '@/lib/site-content';
import { isLeadershipIntent } from '@/lib/assistant-intents';

export type ProjectScopeState = {
  mode: 'project-scope';
  step: 'service' | 'goal' | 'users' | 'timeline' | 'done';
  answers: {
    service?: string;
    goal?: string;
    users?: string;
    timeline?: string;
  };
};

export type ConciergeResponse = {
  reply: string;
  suggestions?: string[];
  state?: ProjectScopeState | null;
  intent?: 'company' | 'services' | 'leadership' | 'portfolio' | 'insights' | 'recognition' | 'contact' | 'project-scope';
  cta?: { label: string; href: string };
  projectBrief?: string;
};

type Knowledge = Awaited<ReturnType<typeof loadKnowledge>>;

async function loadKnowledge() {
  const [settingsRows, services, team, portfolio, posts] = await Promise.all([
    db.siteSetting.findMany({ select: { key: true, value: true } }),
    db.service.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { title: true, description: true, slug: true, features: true },
    }),
    db.teamMember.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { name: true, role: true, bio: true },
    }),
    db.portfolioProject.findMany({
      where: { active: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      take: 6,
      select: { title: true, description: true, category: true, url: true },
    }),
    db.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, slug: true, excerpt: true },
    }),
  ]);

  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const recognition = contentJson(settings, 'about_recognition', defaultRecognition);

  return {
    settings,
    services,
    team,
    portfolio,
    posts,
    recognition,
  };
}

function list(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(' and ');
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

function projectSummary(state: ProjectScopeState): string {
  const { service, goal, users, timeline } = state.answers;
  return [
    'Project type: ' + (service || 'To be confirmed'),
    'Primary outcome: ' + (goal || 'To be confirmed'),
    'Primary users: ' + (users || 'To be confirmed'),
    'Timeline: ' + (timeline || 'To be confirmed'),
  ].join('\n');
}

function continueProjectScope(message: string, state: ProjectScopeState, knowledge: Knowledge): ConciergeResponse {
  const clean = message.trim();
  const answers = { ...state.answers };

  if (state.step === 'service') {
    answers.service = clean;
    return {
      intent: 'project-scope',
      reply: 'What business outcome matters most for this project? For example: launch a new service, replace manual work, improve customer experience, integrate systems, or modernize an existing platform.',
      suggestions: ['Replace manual work', 'Launch a new digital product', 'Modernize an existing system', 'Improve customer experience'],
      state: { mode: 'project-scope', step: 'goal', answers },
    };
  }

  if (state.step === 'goal') {
    answers.goal = clean;
    return {
      intent: 'project-scope',
      reply: 'Who will use it most? Tell me the main user group or teams involved.',
      suggestions: ['Customers', 'Internal staff', 'Field teams', 'Students / parents / staff'],
      state: { mode: 'project-scope', step: 'users', answers },
    };
  }

  if (state.step === 'users') {
    answers.users = clean;
    return {
      intent: 'project-scope',
      reply: 'What timeline are you working toward? A rough answer is enough.',
      suggestions: ['As soon as practical', 'Within 1–3 months', 'Within 3–6 months', 'No fixed deadline yet'],
      state: { mode: 'project-scope', step: 'timeline', answers },
    };
  }

  if (state.step === 'timeline') {
    answers.timeline = clean;
    const completed: ProjectScopeState = { mode: 'project-scope', step: 'done', answers };
    const brief = projectSummary(completed);
    const serviceTitles = knowledge.services.map((service) => service.title);
    const selectedService =
      serviceTitles.find((title) => title.toLowerCase() === (answers.service || '').toLowerCase()) ||
      answers.service ||
      'the appropriate Lightworld delivery team';

    return {
      intent: 'project-scope',
      reply:
        'That is enough for a useful first brief. Based on what you shared, Lightworld can start by validating the scope around ' +
        selectedService +
        ', then turn it into a delivery approach and estimate. I have prepared the brief for the Contact page.',
      state: completed,
      projectBrief: brief,
      cta: { label: 'Open prefilled project brief', href: '/contact' },
      suggestions: ['What happens after I submit?', 'What services does Lightworld offer?'],
    };
  }

  return {
    intent: 'project-scope',
    reply: 'Your project brief is ready. You can open the Contact page to send it to the Lightworld team.',
    state,
    projectBrief: projectSummary(state),
    cta: { label: 'Open project brief', href: '/contact' },
  };
}

export async function answerConcierge(
  message: string,
  state?: ProjectScopeState | null,
): Promise<ConciergeResponse> {
  const knowledge = await loadKnowledge();
  const q = message.trim().toLowerCase();

  if (state?.mode === 'project-scope' && state.step !== 'done') {
    return continueProjectScope(message, state, knowledge);
  }

  const companyName = contentText(knowledge.settings, 'company_name', companyProfile.name);
  const companyEmail = contentText(knowledge.settings, 'company_email', companyProfile.email);
  const companyPhone = contentText(knowledge.settings, 'company_phone1', companyProfile.phoneDisplay);
  const companyAddress = contentText(knowledge.settings, 'company_address', 'Accra, Ghana');

  if (/start.*project|project.*start|quote|estimate|hire|build.*for (me|us)|need.*(website|app|software|system|platform)/.test(q)) {
    const serviceTitles = knowledge.services.map((service) => service.title);
    return {
      intent: 'project-scope',
      reply: 'I can help shape a useful project brief before you contact the team. What kind of project are you considering?',
      suggestions: serviceTitles.slice(0, 6),
      state: { mode: 'project-scope', step: 'service', answers: {} },
    };
  }

  if (/(who|what).*(ceo|chief executive)|\bceo\b|christian agbotah|founder/.test(q)) {
    const ceo = knowledge.team.find((person) => /ceo|chief executive/i.test(person.role)) ||
      knowledge.team.find((person) => /christian agbotah/i.test(person.name));
    if (ceo) {
      return {
        intent: 'leadership',
        reply: ceo.name + ' is ' + ceo.role + ' of ' + companyName + '. ' + (ceo.bio || ''),
        cta: { label: 'View leadership', href: '/team' },
      };
    }
  }

  if (isLeadershipIntent(q)) {
    const leaders = knowledge.team.slice(0, 6).map((person) => person.name + ' — ' + person.role);
    return {
      intent: 'leadership',
      reply: leaders.length
        ? companyName + ' leadership currently listed in the CMS: ' + list(leaders) + '.'
        : companyProfile.leadership.map((person) => person.name + ' — ' + person.role).join('; ') + '.',
      cta: { label: 'View leadership', href: '/team' },
    };
  }

  if (/service|what.*do|offer|solution|capabilit|build/.test(q)) {
    const serviceNames = knowledge.services.map((service) => service.title);
    return {
      intent: 'services',
      reply: serviceNames.length
        ? companyName + ' currently offers ' + list(serviceNames.slice(0, 8)) + '.'
        : 'Lightworld provides software, mobile, web, AI, cloud, security, training and technology advisory services.',
      suggestions: ['Start a project', 'Show me your work', 'Tell me about AI & automation'],
      cta: { label: 'Explore services', href: '/services' },
    };
  }

  if (/portfolio|case stud|work|project.*done|client work|examples/.test(q)) {
    const examples = knowledge.portfolio
      .slice(0, 4)
      .map((item) => item.title + (item.category ? ' (' + item.category + ')' : ''));
    return {
      intent: 'portfolio',
      reply: examples.length
        ? 'Current published work includes ' + list(examples) + '.'
        : 'The Portfolio page shows the solution patterns and projects currently published by Lightworld.',
      cta: { label: 'View portfolio', href: '/portfolio' },
    };
  }

  if (/blog|insight|article|latest.*post|read/.test(q)) {
    const articles = knowledge.posts.slice(0, 3).map((post) => post.title);
    return {
      intent: 'insights',
      reply: articles.length
        ? 'Recent Lightworld insights include ' + list(articles) + '.'
        : 'Lightworld publishes practical notes on product design, engineering, AI and digital operations.',
      cta: { label: 'Read insights', href: '/blog' },
    };
  }

  if (/award|recognition|honou?r|winner/.test(q)) {
    const awards = knowledge.recognition
      .slice(0, 6)
      .map((item) => String(item.year || '') + ' ' + String(item.title || ''))
      .filter(Boolean);
    return {
      intent: 'recognition',
      reply: awards.length
        ? 'Published recognition currently listed by Lightworld includes ' + list(awards) + '. The About page links to the source pages.'
        : 'The About page contains Lightworld’s verified recognition and source links.',
      cta: { label: 'View recognition', href: '/about#recognition' },
    };
  }

  if (/email|phone|contact|reach|whatsapp|where|location|based/.test(q)) {
    return {
      intent: 'contact',
      reply: 'You can reach ' + companyName + ' at ' + companyEmail + ' or ' + companyPhone + '. Location: ' + companyAddress + '.',
      cta: { label: 'Open contact page', href: '/contact' },
    };
  }

  if (/school|education|student|learning/.test(q)) {
    const educationServices = knowledge.services.filter((service) =>
      /school|education|training|learning/i.test(service.title + ' ' + service.description),
    );
    return {
      intent: 'services',
      reply: educationServices.length
        ? 'For education-related work, relevant current capabilities include ' + list(educationServices.map((item) => item.title)) + '.'
        : 'Lightworld works on education technology, school systems, assessment, billing, communication and digital learning experiences.',
      cta: { label: 'Discuss an education project', href: '/contact' },
    };
  }

  return {
    intent: 'company',
    reply:
      companyName +
      ' is a Ghanaian technology company. I can help with current services, leadership, portfolio work, recognition, recent insights, contact details, or I can guide you through a project brief.',
    suggestions: ['What services do you offer?', 'Who leads Lightworld?', 'Show me your work', 'Start a project'],
  };
}
