import 'server-only';

import { db } from '@/lib/db';
import { companyProfile } from '@/lib/company-profile';
import { contentJson, contentText, defaultRecognition } from '@/lib/site-content';
import {
  generateGroundedConciergeReply,
  type AssistantHistoryTurn,
} from '@/lib/assistant-generative';
import {
  findBestFaqMatch,
  findBestProcessStepMatch,
  isProcessOverviewIntent,
} from '@/lib/assistant-retrieval';
import {
  isCompletedProjectChangeIntent,
  isCompletedProjectContactIntent,
  isCompletedProjectContextIntent,
  isCompletedProjectNextStepsIntent,
  isCompletedProjectPricingIntent,
  isCompletedProjectPreparationIntent,
  isCompletedProjectRestartIntent,
  isCompletedProjectStatusIntent,
  isLeadershipIntent,
  isNewsroomIntent,
  isTrustIntent,
} from '@/lib/assistant-intents';

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
  intent?: 'company' | 'services' | 'leadership' | 'portfolio' | 'insights' | 'recognition' | 'contact' | 'trust' | 'newsroom' | 'project-scope' | 'grounded-ai' | 'faq' | 'process';
  cta?: { label: string; href: string };
  projectBrief?: string;
};

type Knowledge = Awaited<ReturnType<typeof loadKnowledge>>;

async function loadKnowledge() {
  const [settingsRows, services, team, portfolio, posts, faqs, processSteps] = await Promise.all([
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
    db.fAQ.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      select: { question: true, answer: true },
    }),
    db.processStep.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      select: { title: true, description: true },
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
    faqs,
    processSteps,
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
      suggestions: [
        'What happens after I submit?',
        'How is pricing estimated?',
        'Can I change the brief later?',
        'Who will contact me?',
      ],
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

function answerCompletedProjectFollowUp(
  message: string,
  state: ProjectScopeState,
  companyName: string,
  companyEmail: string,
  companyPhone: string,
): ConciergeResponse | null {
  const brief = projectSummary(state);
  const common = {
    intent: 'project-scope' as const,
    state,
    projectBrief: brief,
    cta: { label: 'Open project brief', href: '/contact' },
  };

  if (isCompletedProjectNextStepsIntent(message)) {
    return {
      ...common,
      reply:
        'After you submit the project brief, it moves into human review by the ' +
        companyName +
        ' team. They will review the project type, goals, users and timeline you provided, then contact you if anything needs clarification. The next conversation is used to confirm scope, delivery approach and the estimate or proposal before implementation begins.',
      suggestions: ['How is pricing estimated?', 'Who will contact me?', 'Can I change the brief later?', 'What should I prepare for the first discussion?'],
    };
  }

  if (isCompletedProjectPricingIntent(message)) {
    return {
      ...common,
      reply:
        'Pricing is not guessed from the chat alone. The team reviews the scope you submitted — including the solution type, required features or integrations, complexity, target users, delivery timeline and ongoing support needs — and then prepares the appropriate estimate or proposal. Your current brief gives them the starting context.',
      suggestions: ['What happens after I submit?', 'Can I add a budget?', 'Can I change the brief later?'],
    };
  }

  if (isCompletedProjectContactIntent(message)) {
    return {
      ...common,
      reply:
        'A member of the ' +
        companyName +
        ' team will follow up using the contact details you submit with the brief. Response time can vary with the request and workload, so if the matter is urgent you can also reach the team directly at ' +
        companyEmail +
        ' or ' +
        companyPhone +
        '.',
      suggestions: ['What happens after I submit?', 'How is pricing estimated?', 'Can I change the brief later?'],
    };
  }

  if (isCompletedProjectPreparationIntent(message)) {
    return {
      ...common,
      reply:
        'For the first project discussion, it helps to have any existing documents, screenshots, workflows, brand materials, integrations, examples you like, known constraints and decision-makers available. You do not need everything perfectly prepared — the brief you already created gives the team a structured starting point, and missing details can be clarified during discovery.',
      suggestions: ['What happens after I submit?', 'How is pricing estimated?', 'Can I change the brief later?', 'Who will contact me?'],
    };
  }

  if (isCompletedProjectStatusIntent(message)) {
    return {
      ...common,
      reply:
        'I can keep the brief context in this chat, but this public assistant cannot see a live project or proposal status. If you have already submitted the brief, use the Client Portal when you have access to it, or contact the ' +
        companyName +
        ' team at ' +
        companyEmail +
        ' or ' +
        companyPhone +
        ' for a verified update.',
      suggestions: ['Open the Client Portal', 'What happens after I submit?', 'Who will contact me?'],
      cta: { label: 'Open Client Portal', href: '/client' },
    };
  }

  if (isCompletedProjectChangeIntent(message)) {
    return {
      ...common,
      reply:
        'Yes. Before submitting, you can edit the prefilled Contact form and add any missing detail. If you have already submitted it, send the correction or additional requirement to the team and reference the same project so it can be reviewed together with your original brief.',
      suggestions: ['Open my project brief', 'What happens after I submit?', 'How is pricing estimated?'],
    };
  }

  if (isCompletedProjectContextIntent(message)) {
    return {
      ...common,
      reply:
        'I still have the context of this project brief in this chat. I can explain the next steps, pricing approach, how to change the brief, or how the team will follow up — without making you restart the project journey.',
      suggestions: ['What happens after I submit?', 'How is pricing estimated?', 'Can I change the brief later?', 'Who will contact me?'],
    };
  }

  return null;
}

export async function answerConcierge(
  message: string,
  state?: ProjectScopeState | null,
  history: AssistantHistoryTurn[] = [],
): Promise<ConciergeResponse> {
  const knowledge = await loadKnowledge();
  const q = message.trim().toLowerCase();

  if (state?.mode === 'project-scope' && state.step !== 'done') {
    return continueProjectScope(message, state, knowledge);
  }

  const companyName = contentText(knowledge.settings, 'company_name', companyProfile.name);
  const companyDescription = contentText(
    knowledge.settings,
    'company_description',
    'A Ghanaian technology company building software, digital products, enterprise systems, AI-enabled workflows, cloud solutions, training and advisory services.',
  );
  const companyEmail = contentText(knowledge.settings, 'company_email', companyProfile.email);
  const companyPhone = contentText(knowledge.settings, 'company_phone1', companyProfile.phoneDisplay);
  const companyAddress = contentText(knowledge.settings, 'company_address', 'Tema, Ghana');

  if (state?.mode === 'project-scope' && state.step === 'done') {
    if (isCompletedProjectRestartIntent(message)) {
      const serviceTitles = knowledge.services.map((service) => service.title);
      return {
        intent: 'project-scope',
        reply: 'Absolutely. Let’s create a fresh brief for the new project. What kind of project are you considering?',
        suggestions: serviceTitles.slice(0, 6),
        state: { mode: 'project-scope', step: 'service', answers: {} },
      };
    }

    const followUp = answerCompletedProjectFollowUp(message, state, companyName, companyEmail, companyPhone);
    if (followUp) return followUp;
  }

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

  if (isTrustIntent(q)) {
    return {
      intent: 'trust',
      reply:
        'Lightworld’s Trust Center explains current practices around authenticated administration, hashed admin passwords, consent-aware first-party analytics, rate-limited public endpoints, candidate-tested releases, database backups before schema-changing releases, and human-accountable AI. It does not claim third-party certification unless a verified certification is explicitly published.',
      suggestions: ['How do you handle privacy?', 'What does responsible AI mean?', 'How do I report a security concern?'],
      cta: { label: 'Open Trust Center', href: '/trust' },
    };
  }

  if (isNewsroomIntent(q)) {
    return {
      intent: 'newsroom',
      reply:
        'The Lightworld Newsroom & Media Center brings together verified company facts, source-linked recognition and press coverage, executive leadership information, recent published insights, and media contact details.',
      suggestions: ['Show me your awards', 'Who leads Lightworld?', 'How can media contact you?'],
      cta: { label: 'Open Newsroom', href: '/newsroom' },
    };
  }

  if (!state && isCompletedProjectNextStepsIntent(message)) {
    return {
      intent: 'process',
      reply:
        'After you submit a project brief, the Lightworld team reviews the project type, goals, users and timeline you provided. They will contact you if anything needs clarification, then the next discussion is used to confirm scope, delivery approach and the estimate or proposal before implementation begins.',
      suggestions: ['Start a project', 'How is pricing estimated?', 'Who will contact me?'],
      cta: { label: 'Start a project brief', href: '/contact' },
    };
  }

  const faqMatch = findBestFaqMatch(message, knowledge.faqs);
  if (faqMatch) {
    return {
      intent: 'faq',
      reply: faqMatch.answer,
      suggestions: ['Start a project', 'What is your delivery process?', 'How can I contact Lightworld?'],
      cta: { label: 'Explore services', href: '/services' },
    };
  }

  if (isProcessOverviewIntent(message)) {
    const processTitles = knowledge.processSteps.map((step) => step.title);
    return {
      intent: 'process',
      reply: processTitles.length
        ? 'Our currently published website delivery process moves through ' +
          processTitles.join(' → ') +
          '. The exact sequence can be adapted after the team reviews your project scope.'
        : 'Lightworld confirms the delivery steps during project planning so the process fits the scope, users and timeline.',
      suggestions: ['What happens during testing?', 'Start a project'],
      cta: { label: 'View services', href: '/services' },
    };
  }

  const processStepMatch = findBestProcessStepMatch(message, knowledge.processSteps);
  if (processStepMatch) {
    return {
      intent: 'process',
      reply: processStepMatch.title + ': ' + processStepMatch.description,
      suggestions: ['Show me the full process', 'Start a project'],
      cta: { label: 'View services', href: '/services' },
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
        ? 'Published recognition currently listed by Lightworld includes ' + list(awards) + '. The Newsroom links to the source pages.'
        : 'The About page contains Lightworld’s verified recognition and source links.',
      cta: { label: 'View recognition', href: '/newsroom#recognition' },
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

  const generatedReply = await generateGroundedConciergeReply({
    message,
    history,
    context: {
      company: {
        name: companyName,
        description: companyDescription,
        email: companyEmail,
        phone: companyPhone,
        address: companyAddress,
      },
      services: knowledge.services.map((service) => ({
        title: service.title,
        description: service.description,
        features: service.features,
      })),
      leadership: knowledge.team.map((person) => ({
        name: person.name,
        role: person.role,
        bio: person.bio,
      })),
      portfolio: knowledge.portfolio.map((item) => ({
        title: item.title,
        description: item.description,
        category: item.category,
      })),
      insights: knowledge.posts.map((post) => ({
        title: post.title,
        excerpt: post.excerpt,
      })),
      faqs: knowledge.faqs,
      processSteps: knowledge.processSteps,
      recognition: knowledge.recognition.map((item) => ({
        year: item.year,
        title: item.title,
        publisher: item.publisher,
      })),
      activeProjectBrief:
        state?.mode === 'project-scope' ? projectSummary(state) : undefined,
    },
  });

  if (generatedReply) {
    return {
      intent: 'grounded-ai',
      reply: generatedReply,
      suggestions:
        state?.mode === 'project-scope' && state.step === 'done'
          ? ['What happens after I submit?', 'How is pricing estimated?', 'Open my project brief']
          : ['Start a project', 'What services do you offer?', 'Show me your work'],
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
