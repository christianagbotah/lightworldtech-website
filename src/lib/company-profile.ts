export const companyProfile = {
  name: 'Lightworld Technologies Ltd',
  shortName: 'Lightworld Technologies Ltd',
  country: 'Ghana',
  website: 'https://lightworldtech.com',
  email: 'mail@lightworldtech.com',
  phoneDisplay: '+233 (024) 361 8186',
  phone: '+233243618186',
  tagline: 'The world of possibilities',
  summary:
    'Lightworld Technologies Ltd is a Ghanaian technology company building software, web and mobile products, enterprise systems, AI-enabled workflows, cloud and infrastructure solutions, training, and technology advisory services.',
  leadership: [
    {
      name: 'Christian Agbotah',
      initials: 'CA',
      role: 'CEO & Director',
      description:
        'Leads the company and its technology direction, product vision, engineering standards and long-term growth.',
    },
    {
      name: 'Rober Yaw Essuon',
      initials: 'RE',
      role: 'Managing Director',
      description:
        'Leads management and business execution, helping translate company strategy into coordinated delivery and operations.',
    },
  ],
  services: [
    'Web and product engineering',
    'Mobile app development',
    'Enterprise software and workflow automation',
    'AI-enabled workflows and assistants',
    'Cloud, DevOps and reliability',
    'Security engineering',
    'SEO and digital performance',
    'IT training and technology consultancy',
  ],
  recognition: [
    {
      year: '2026',
      publisher: 'MEA Markets',
      title: 'African Excellence Awards',
      description: 'Lightworld Technologies Ltd — 2026 Winner: African Excellence Awards.',
      href: 'https://meamarkets.digital/winners/lightworld-technologies-limited-2/',
    },
    {
      year: '2024',
      publisher: 'Acquisition International',
      title: 'Business Excellence Awards',
      description: 'Lightworld Technologies Ltd — 2024 Winner: Business Excellence Awards.',
      href: 'https://www.acquisition-international.com/winners/lightworld-technologies-limited/',
    },
    {
      year: '2021',
      publisher: 'MEA Markets',
      title: 'MEA Business Awards',
      description: 'Lightworld Technologies Ltd — 2021 Winner: MEA Business Awards.',
      href: 'https://meamarkets.digital/winners/lightworld-technologies-limited/',
    },
  ],
  coverage: [
    {
      publisher: 'GhanaWeb',
      title: 'Lightworld Technologies Limited introduces school management application',
      href: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Lightworld-Technologies-Limited-introduces-school-management-application-734612',
    },
  ],
} as const;

export type LeadershipMember = (typeof companyProfile.leadership)[number];

export function answerCompanyQuestion(message: string): string {
  const q = message.trim().toLowerCase();

  if (!q) {
    return 'Ask me about Lightworld Technologies Ltd, our leadership, services, recognition, training, or how to start a project.';
  }

  if (/(who|what).*(ceo|chief executive)|\bceo\b|christian agbotah|founder/.test(q)) {
    return 'Christian Agbotah is the CEO and a Director of Lightworld Technologies Ltd. He leads the company and its technology direction, product vision, engineering standards and long-term growth.';
  }

  if (/managing director|\bmd\b|rober yaw essuon|who.*director/.test(q)) {
    return 'Rober Yaw Essuon is the Managing Director of Lightworld Technologies Ltd. Christian Agbotah is the CEO & Director.';
  }

  if (/leadership|leaders|management|team|executive/.test(q)) {
    return 'Lightworld Technologies Ltd is led by Christian Agbotah, CEO & Director, and Rober Yaw Essuon, Managing Director. You can view the leadership profile on our Team page.';
  }

  if (/award|recognition|honou?r|winner/.test(q)) {
    return 'Public award directories list Lightworld Technologies Ltd among winners of the 2026 African Excellence Awards, the 2024 Business Excellence Awards, and the 2021 MEA Business Awards. The About page links to the official winner pages.';
  }

  if (/ghanaweb|news|press|media|coverage/.test(q)) {
    return 'GhanaWeb published coverage titled “Lightworld Technologies Limited introduces school management application.” You can find the verified coverage link on our About page.';
  }

  if (/service|what.*do|offer|solution|build/.test(q)) {
    return 'Lightworld builds websites and web products, mobile apps, enterprise software, workflow automation, AI-enabled experiences, cloud and DevOps foundations, security solutions, SEO and digital performance, plus IT training and technology consultancy.';
  }

  if (/school|education|student|learning/.test(q)) {
    return 'Lightworld works on education technology, including school administration and management systems, assessment, billing, communication and digital learning experiences.';
  }

  if (/training|academy|course|learn/.test(q)) {
    return 'Lightworld provides practical IT training and corporate technology enablement, alongside architecture and digital-transformation advisory.';
  }

  if (/email|phone|contact|reach|whatsapp/.test(q)) {
    return 'You can reach Lightworld Technologies Ltd at mail@lightworldtech.com or +233 (024) 361 8186. You can also use the Contact page to send a project brief.';
  }

  if (/quote|price|cost|project|hire|consult/.test(q)) {
    return 'Tell us what you want to build, improve or automate through the Contact page. Lightworld can help shape the scope and recommend the right delivery approach before pricing the work.';
  }

  if (/where|location|based|country|ghana/.test(q)) {
    return 'Lightworld Technologies Ltd is a Ghanaian technology company serving organizations with software, digital products, infrastructure, training and advisory services.';
  }

  return 'Lightworld Technologies Ltd is a Ghanaian technology company building software, apps, websites, enterprise systems, AI-enabled workflows, cloud infrastructure, training and advisory services. You can ask me about our leadership, services, awards, press coverage, training, or starting a project.';
}
