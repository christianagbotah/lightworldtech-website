export type ServiceSearchLanding = {
  slug: string;
  cmsSlugs: string[];
  eyebrow: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  deliverables: string[];
  outcomes: string[];
  idealFor: string[];
};

export const serviceSearchLandings: ServiceSearchLanding[] = [
  {
    slug: 'web-development',
    cmsSlugs: ['web-development'],
    eyebrow: 'Web & product engineering',
    title: 'Web development for Ghanaian businesses and ambitious teams',
    seoTitle: 'Web Development Company in Ghana | Lightworld Technologies',
    description: 'Professional website and web application development in Ghana from Lightworld Technologies: corporate websites, portals, e-commerce, SaaS products, APIs and responsive digital experiences.',
    intro: 'Lightworld designs and engineers fast, responsive web experiences that can start as a focused company website and grow into a customer portal, commerce platform or serious business application. We combine product thinking, UX, engineering, technical SEO and production deployment so the finished system is useful beyond launch day.',
    deliverables: ['Corporate and brand websites', 'Customer and partner portals', 'Web applications and SaaS platforms', 'E-commerce experiences', 'API and third-party integrations', 'Responsive UI/UX and design systems', 'Performance and technical SEO foundations', 'Deployment, monitoring and support'],
    outcomes: ['A credible, discoverable digital presence', 'Faster customer journeys across mobile and desktop', 'A maintainable foundation that can grow with the business'],
    idealFor: ['Organizations replacing an outdated or difficult-to-manage website', 'Teams launching a new digital service or customer portal', 'Businesses that need web workflows connected to real operational data'],
  },
  {
    slug: 'mobile-app-development',
    cmsSlugs: ['mobile-app-development'],
    eyebrow: 'Mobile applications',
    title: 'Mobile app development for iOS, Android and field operations',
    seoTitle: 'Mobile App Development in Ghana | Lightworld Technologies',
    description: 'Mobile app development in Ghana for iOS, Android and cross-platform products, including offline workflows, authentication, notifications, backend APIs and production release support.',
    intro: 'We build mobile products around the way people actually use phones: short sessions, interrupted connectivity, smaller screens and tasks that need to work away from a desk. The result is one coherent product experience across mobile, web and backend systems rather than an isolated app.',
    deliverables: ['iOS and Android applications', 'Cross-platform React Native products', 'Offline-first and low-connectivity workflows', 'Secure mobile authentication', 'Push notifications and activity updates', 'Backend APIs and data synchronization', 'App analytics and operational telemetry', 'Release and store-readiness support'],
    outcomes: ['Better adoption for customers and field teams', 'Reliable workflows when connectivity is inconsistent', 'A mobile experience connected to the wider business system'],
    idealFor: ['Businesses moving a customer journey onto mobile', 'Field teams that need to work away from reliable internet', 'Products that need mobile, web and backend experiences to share one workflow'],
  },
  {
    slug: 'software-development',
    cmsSlugs: ['software-development'],
    eyebrow: 'Enterprise software',
    title: 'Custom software development for real business operations',
    seoTitle: 'Software Development Company in Ghana | Lightworld Technologies',
    description: 'Custom software development in Ghana for ERP, EAM, school management, inventory, CRM, workflow automation, portals and enterprise operations.',
    intro: 'Lightworld builds custom software when spreadsheets, disconnected tools and manual approvals have become operational constraints. We model the real roles, decisions, data and exceptions in a process, then engineer a system that gives teams clearer accountability and management better visibility.',
    deliverables: ['ERP and operational platforms', 'Enterprise asset and maintenance systems', 'Inventory, depot and logistics workflows', 'School and institutional management systems', 'CRM and customer operations', 'Role-based internal portals', 'Approval and workflow automation', 'Reporting, audit history and integrations'],
    outcomes: ['Less repetitive manual work', 'Clear ownership and traceable operational actions', 'Reliable data for reporting and management decisions'],
    idealFor: ['Organizations outgrowing spreadsheets and chat-based approvals', 'Teams with multiple roles that need controlled access to shared workflows', 'Businesses that need several operational processes connected in one system'],
  },
  {
    slug: 'ai-automation',
    cmsSlugs: [],
    eyebrow: 'AI & automation',
    title: 'AI automation that improves a defined business workflow',
    seoTitle: 'AI Automation & AI Solutions in Ghana | Lightworld Technologies',
    description: 'Practical AI automation and AI solution development in Ghana: assistants, knowledge search, document workflows, summarization and human-controlled intelligent automation.',
    intro: 'Useful AI starts with a specific job, not with adding a chatbot everywhere. Lightworld designs AI-enabled workflows for finding, summarizing, drafting, classifying and acting on information while keeping human review visible where consequences matter. We focus on measurable workflow improvement, source grounding and graceful failure.',
    deliverables: ['AI assistants and copilots', 'Knowledge retrieval and enterprise search', 'Document classification and summarization', 'Contextual drafting and workflow support', 'Human-in-the-loop automation', 'AI feature integration into existing software', 'Guardrails, observability and fallback paths', 'Evaluation and iterative improvement'],
    outcomes: ['Faster repetitive knowledge work', 'More consistent access to business information', 'AI assistance with clear controls and accountability'],
    idealFor: ['Teams repeatedly searching, summarizing or drafting from business information', 'Existing applications that need a focused AI capability', 'Organizations that want to introduce AI without surrendering important decisions to automation'],
  },
  {
    slug: 'cloud-devops',
    cmsSlugs: [],
    eyebrow: 'Cloud & DevOps',
    title: 'Cloud, DevOps and production reliability services',
    seoTitle: 'Cloud & DevOps Services in Ghana | Lightworld Technologies',
    description: 'Cloud and DevOps services in Ghana covering production architecture, CI/CD, VPS and cloud migration, monitoring, backups, deployment safety, performance and reliability.',
    intro: 'Production software needs more than a server and a deployment command. We help teams build repeatable release processes, observable infrastructure and recovery paths so applications can be changed safely and operated with confidence.',
    deliverables: ['Cloud and VPS architecture', 'CI/CD and release pipelines', 'Server and application migrations', 'Containerized deployment patterns', 'Monitoring and operational health checks', 'Backup and restore workflows', 'Performance and capacity tuning', 'Rollback and release-safety controls'],
    outcomes: ['Safer, repeatable releases', 'Better visibility into production health', 'Lower recovery risk when something goes wrong'],
    idealFor: ['Teams moving from shared hosting to managed infrastructure', 'Applications that need reliable CI/CD and rollback', 'Businesses operating software that has become critical to daily work'],
  },
  {
    slug: 'security-engineering',
    cmsSlugs: [],
    eyebrow: 'Security engineering',
    title: 'Application security built into the product and delivery process',
    seoTitle: 'Application Security & Cybersecurity Services Ghana | Lightworld Technologies',
    description: 'Application security and cybersecurity engineering in Ghana covering authentication, authorization, RBAC, audit trails, secure deployment, hardening and production security reviews.',
    intro: 'Security is most effective when it is designed into identity, permissions, data flows and release processes instead of added after development. Lightworld helps teams reduce avoidable risk while keeping controls understandable for the people who operate the system.',
    deliverables: ['Authentication and secure session design', 'Role-based access control and authorization', 'Application and API hardening', 'Audit trails for sensitive actions', 'Secrets and environment handling', 'Dependency and release security checks', 'Production security reviews', 'Backup, recovery and operational safeguards'],
    outcomes: ['Reduced exposure to avoidable application risk', 'Clearer permission boundaries and traceable actions', 'Security controls that fit normal operations'],
    idealFor: ['Business systems handling sensitive operational or customer data', 'Applications with multiple roles, approvals or administrative privileges', 'Teams preparing software for production or strengthening an existing system'],
  },
  {
    slug: 'seo-digital-performance',
    cmsSlugs: ['seo-social-media-marketing'],
    eyebrow: 'SEO & digital performance',
    title: 'Technical SEO and digital performance for sustainable discovery',
    seoTitle: 'SEO & Digital Performance Services in Ghana | Lightworld Technologies',
    description: 'SEO services in Ghana covering technical SEO, site architecture, local search foundations, performance, analytics, conversion journeys and content discoverability.',
    intro: 'Search visibility begins with a site that search engines can crawl, understand and trust. We combine technical SEO, information architecture, page performance, entity consistency and useful content foundations so discovery work supports the customer journey instead of becoming a collection of disconnected keywords.',
    deliverables: ['Technical SEO audits and remediation', 'Search-friendly information architecture', 'Canonical, sitemap and crawl controls', 'Structured data and entity signals', 'Local search and business-profile alignment', 'Core page performance improvements', 'Analytics and conversion measurement', 'Content and internal-linking foundations'],
    outcomes: ['Clearer search-engine understanding of the business', 'Better crawlability and discoverability', 'Search traffic connected to useful customer journeys'],
    idealFor: ['Businesses whose official site is hard to find for their own brand', 'Websites competing for local or service-based searches', 'Teams that need technical SEO tied to product performance and conversion'],
  },
  {
    slug: 'it-training',
    cmsSlugs: ['skills-development'],
    eyebrow: 'IT training & consultancy',
    title: 'Practical IT training and technology consultancy in Ghana',
    seoTitle: 'IT Training Institute & Technology Consulting Ghana | Lightworld Technologies',
    description: 'Practical IT training and technology consultancy in Ghana covering software development, digital skills, corporate training, architecture guidance and technology transformation.',
    intro: 'Lightworld helps individuals and organizations build practical technology capability, not just complete a syllabus. Training and advisory work connects technical concepts to real projects, operating decisions and the tools teams need to use confidently after the engagement.',
    deliverables: ['Software development training', 'Web and application development skills', 'Corporate IT training programs', 'Technology assessments and advisory', 'Architecture and solution planning', 'Digital transformation roadmaps', 'Team enablement and handover', 'Project-based technical mentoring'],
    outcomes: ['Stronger internal technology capability', 'Clearer technical decisions and roadmaps', 'Skills connected to practical delivery'],
    idealFor: ['Individuals building practical software and IT skills', 'Organizations upskilling internal teams', 'Decision-makers who need independent technical guidance before or during a technology project'],
  },
];

const cmsServiceLandingBySlug: Record<string, string> = {
  'web-development': 'web-development',
  'mobile-app-development': 'mobile-app-development',
  'software-development': 'software-development',
  'skills-development': 'it-training',
  'seo-social-media-marketing': 'seo-digital-performance',
  'hosting-domain': 'cloud-devops',
};

export function serviceSearchHref(input: { slug?: string | null; title?: string | null }): string {
  const slug = String(input.slug || '').trim().toLowerCase();
  if (slug && cmsServiceLandingBySlug[slug]) {
    return '/services/' + cmsServiceLandingBySlug[slug];
  }
  if (slug && serviceSearchLandings.some((service) => service.slug === slug)) {
    return '/services/' + slug;
  }

  const title = String(input.title || '').trim().toLowerCase();
  if (!title) return '/services';
  if (title.includes('mobile') && title.includes('app')) return '/services/mobile-app-development';
  if (title.includes('web') && !title.includes('hosting')) return '/services/web-development';
  if (title.includes('enterprise') || title.includes('software')) return '/services/software-development';
  if (/\bai\b/.test(title) || title.includes('artificial intelligence')) return '/services/ai-automation';
  if (title.includes('cloud') || title.includes('devops') || title.includes('hosting')) return '/services/cloud-devops';
  if (title.includes('security') || title.includes('cyber')) return '/services/security-engineering';
  if (title.includes('seo') || title.includes('search')) return '/services/seo-digital-performance';
  if (title.includes('training') || title.includes('skills') || title.includes('advisory')) return '/services/it-training';
  return '/services';
}

export function getServiceSearchLanding(slug: string): ServiceSearchLanding | null {
  return serviceSearchLandings.find((service) => service.slug === slug) || null;
}
