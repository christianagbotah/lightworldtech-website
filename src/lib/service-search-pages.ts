export type ServiceSearchPage = {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  paragraphs: string[];
  deliverables: string[];
  outcomes: string[];
  idealFor: string[];
  related: string[];
};

export const serviceSearchPages: ServiceSearchPage[] = [
  {
    slug: 'web-development',
    eyebrow: 'Web development',
    title: 'Web development for fast, credible digital experiences.',
    metaTitle: 'Web Development Company in Ghana | Lightworld Technologies',
    metaDescription: 'Lightworld Technologies builds responsive websites, portals, web applications and e-commerce experiences for businesses and institutions in Ghana.',
    summary: 'We design and engineer websites and web products that load quickly, communicate clearly and remain maintainable as your organization grows.',
    paragraphs: [
      'A strong website has to do more than look current. It should help customers understand what you offer, make important actions easy, perform well on real devices and give search engines a clear picture of your business.',
      'Lightworld combines UX, modern frontend engineering, APIs, content systems, performance work and production deployment so a website can grow into a useful business platform instead of becoming another redesign project a year later.',
    ],
    deliverables: ['Corporate and institutional websites', 'Customer and partner portals', 'Web applications and SaaS interfaces', 'E-commerce experiences', 'CMS and content workflows', 'API and payment integrations', 'Performance and technical SEO foundations', 'Ongoing maintenance and modernization'],
    outcomes: ['Faster customer journeys', 'A stronger search-ready foundation', 'Responsive experiences across devices', 'A maintainable platform for future features'],
    idealFor: ['Organizations replacing an outdated website', 'Businesses that need a portal or web application', 'Teams combining content, transactions and integrations', 'Brands that need better speed, usability and discoverability'],
    related: ['software-development', 'seo-digital-growth', 'cloud-devops'],
  },
  {
    slug: 'mobile-app-development',
    eyebrow: 'Mobile applications',
    title: 'Mobile apps designed around real users and real operating conditions.',
    metaTitle: 'Mobile App Development in Ghana | Lightworld Technologies',
    metaDescription: 'Build iOS, Android and cross-platform mobile applications with Lightworld Technologies in Ghana, from product design and APIs to deployment and support.',
    summary: 'We build mobile experiences for customers, field teams and operators who need focused workflows, dependable integrations and a product that feels natural on a phone.',
    paragraphs: [
      'Mobile projects work best when the product is designed for short sessions, interruptions, smaller screens and the connectivity conditions people actually experience. That affects navigation, authentication, data entry, notifications and recovery from failed network requests.',
      'We connect the mobile experience to the wider product architecture—APIs, permissions, back-office workflows, analytics and deployment—so the app is not an isolated interface that becomes difficult to operate.',
    ],
    deliverables: ['iOS and Android application experiences', 'Cross-platform React Native products', 'Mobile UX and prototyping', 'Authentication and role-aware workflows', 'Offline-aware and retry-friendly patterns', 'Push notifications and device integrations', 'Backend and API integration', 'Release and post-launch support'],
    outcomes: ['Better mobile adoption', 'Less friction for field and customer workflows', 'A consistent experience across mobile and backend systems', 'A product foundation that can evolve after launch'],
    idealFor: ['Customer-facing mobile products', 'Field operations and service teams', 'Organizations extending an existing web platform to mobile', 'New products that need mobile and backend architecture together'],
    related: ['software-development', 'cloud-devops', 'ai-automation'],
  },
  {
    slug: 'software-development',
    eyebrow: 'Custom software',
    title: 'Custom software for operations that have outgrown disconnected tools.',
    metaTitle: 'Software Development Company in Ghana | Lightworld Technologies',
    metaDescription: 'Custom software development in Ghana for ERP, EAM, CRM, school systems, inventory, workflow automation and business operations from Lightworld Technologies.',
    summary: 'We turn business processes into secure, role-aware software that connects people, approvals, records, reporting and the systems your organization already uses.',
    paragraphs: [
      'Custom software makes sense when spreadsheets, chat messages and separate applications can no longer provide one reliable view of the work. The goal is not to automate everything blindly; it is to make responsibilities, data and important decisions easier to manage.',
      'Lightworld approaches business software as an operating system for the workflow. We define permissions, lifecycle states, auditability, integrations, reporting, recovery and deployment alongside the visible screens so the system can support daily production use.',
    ],
    deliverables: ['ERP and operational platforms', 'Enterprise asset and maintenance systems', 'CRM and service-management workflows', 'School and institutional management systems', 'Inventory, logistics and procurement workflows', 'Approval and document automation', 'Dashboards and management reporting', 'API integrations and modernization of existing systems'],
    outcomes: ['One reliable operational workflow', 'Reduced duplicate data entry', 'Clearer accountability and audit history', 'Better visibility for managers and teams'],
    idealFor: ['Growing organizations with spreadsheet-heavy operations', 'Teams replacing disconnected legacy tools', 'Businesses with multi-role approval workflows', 'Institutions needing purpose-built operational software'],
    related: ['ai-automation', 'cloud-devops', 'cybersecurity'],
  },
  {
    slug: 'ai-automation',
    eyebrow: 'AI & automation',
    title: 'AI automation that improves work without hiding the controls that matter.',
    metaTitle: 'AI Automation & AI Solutions in Ghana | Lightworld Technologies',
    metaDescription: 'Lightworld Technologies builds practical AI assistants, knowledge workflows, document automation and AI-enabled business software for organizations in Ghana.',
    summary: 'We integrate AI where it can reduce repetitive work, improve access to information or assist decisions while keeping human ownership, permissions and traceability clear.',
    paragraphs: [
      'Useful AI starts with a workflow, not a chatbot. We identify the information people need, the repetitive steps consuming time, the decisions that still require human accountability and the data boundaries the system must respect.',
      'From there, AI can become part of a larger product: retrieving approved knowledge, drafting structured work, summarizing records, classifying documents or helping users complete tasks. The surrounding application still needs reliable authorization, audit trails and fallbacks when a model is uncertain or unavailable.',
    ],
    deliverables: ['Grounded AI assistants', 'Knowledge search and retrieval experiences', 'Document extraction and summarization workflows', 'AI-assisted operational interfaces', 'Human-in-the-loop automation', 'Model and API integration', 'Evaluation and guardrail design', 'AI features inside existing web or enterprise systems'],
    outcomes: ['Faster access to useful information', 'Less repetitive knowledge work', 'More consistent execution', 'AI assistance with visible human accountability'],
    idealFor: ['Teams handling repetitive document or knowledge tasks', 'Products adding an AI capability to an existing workflow', 'Organizations building internal knowledge assistants', 'Businesses exploring AI with clear governance requirements'],
    related: ['software-development', 'cloud-devops', 'cybersecurity'],
  },
  {
    slug: 'cloud-devops',
    eyebrow: 'Cloud & DevOps',
    title: 'Production infrastructure built for repeatable releases and recovery.',
    metaTitle: 'Cloud, DevOps & Hosting Services in Ghana | Lightworld Technologies',
    metaDescription: 'Cloud architecture, VPS hosting, CI/CD, migrations, backups, monitoring and production reliability services from Lightworld Technologies in Ghana.',
    summary: 'We help teams move applications into production with clearer deployment, backup, monitoring and recovery practices instead of relying on fragile manual server changes.',
    paragraphs: [
      'Infrastructure becomes a business problem when releases are risky, environments drift apart, backups are untested or nobody can confidently explain how to recover a service after failure.',
      'Lightworld works across application and infrastructure boundaries: deployment pipelines, VPS and cloud environments, containers, databases, observability, backups, security controls and release procedures. The objective is a production setup the operating team can understand and repeat.',
    ],
    deliverables: ['Cloud and VPS architecture', 'CI/CD pipelines', 'Server and application migrations', 'Containerized deployments', 'Database deployment workflows', 'Monitoring and operational health checks', 'Backup and recovery foundations', 'Performance and reliability improvements'],
    outcomes: ['Safer production releases', 'Clearer rollback and recovery paths', 'Reduced manual deployment risk', 'Infrastructure that can grow with the application'],
    idealFor: ['Applications moving from development to production', 'Teams replacing manual deployment processes', 'Businesses migrating hosting or VPS environments', 'Existing systems that need better reliability and recovery'],
    related: ['cybersecurity', 'software-development', 'web-development'],
  },
  {
    slug: 'cybersecurity',
    eyebrow: 'Security engineering',
    title: 'Application security designed into the product and its operations.',
    metaTitle: 'Cybersecurity & Application Security Ghana | Lightworld Technologies',
    metaDescription: 'Application security, access control, RBAC, audit trails, secure deployment and software hardening services from Lightworld Technologies in Ghana.',
    summary: 'We strengthen the parts of software security that directly affect how applications are built, accessed, deployed and operated.',
    paragraphs: [
      'Security is strongest when it is part of the architecture rather than a checklist added before launch. Authentication, authorization, tenant boundaries, secrets, audit history, validation and deployment controls all shape the risk of a production system.',
      'Our work focuses on practical application and delivery security: reducing unnecessary access, making sensitive actions traceable, hardening exposed interfaces and ensuring deployment practices do not undermine the controls inside the product.',
    ],
    deliverables: ['Authentication and authorization architecture', 'Role-based access control design', 'Application hardening reviews', 'Audit and sensitive-action logging', 'Secure session and secrets practices', 'API and input validation controls', 'CI/CD and release safeguards', 'Security-focused modernization'],
    outcomes: ['Reduced application attack surface', 'Clearer access boundaries', 'Traceable sensitive actions', 'More dependable production controls'],
    idealFor: ['Business systems handling sensitive operational data', 'Multi-role or multi-tenant applications', 'Teams preparing software for production', 'Existing products that need security hardening'],
    related: ['cloud-devops', 'software-development', 'ai-automation'],
  },
  {
    slug: 'seo-digital-growth',
    eyebrow: 'SEO & digital growth',
    title: 'Search visibility built on strong technical and content foundations.',
    metaTitle: 'SEO Services in Ghana | Lightworld Technologies',
    metaDescription: 'Technical SEO, search architecture, performance, structured data, analytics and conversion-focused website improvements from Lightworld Technologies in Ghana.',
    summary: 'We improve how search engines understand a business and how visitors move from discovery to a meaningful action on the website.',
    paragraphs: [
      'Search visibility is not created by repeating keywords. It depends on crawlable architecture, canonical URLs, useful pages for distinct search intent, consistent business identity, fast experiences, structured data, internal links and credible information that other sources can corroborate.',
      'Lightworld combines technical SEO with product and engineering work, which is especially useful when ranking problems come from the website architecture itself rather than just from missing content.',
    ],
    deliverables: ['Technical SEO audits and implementation', 'Search-focused information architecture', 'Canonical, sitemap and crawlability improvements', 'Structured data and entity signals', 'Page performance improvements', 'Search landing-page architecture', 'Analytics and conversion measurement', 'Content and internal-linking foundations'],
    outcomes: ['Clearer search-engine understanding', 'More indexable high-intent pages', 'Better website performance and usability', 'Stronger paths from search visit to enquiry'],
    idealFor: ['Businesses with a weak or ambiguous Google footprint', 'Websites consolidating multiple services or locations', 'Organizations rebuilding an outdated site', 'Teams that need technical SEO implemented—not just reported'],
    related: ['web-development', 'software-development', 'it-training-consultancy'],
  },
  {
    slug: 'it-training-consultancy',
    eyebrow: 'IT training & consultancy',
    title: 'Practical IT training and technology advisory for teams and learners.',
    metaTitle: 'IT Training Institute & Technology Consultancy Ghana | Lightworld',
    metaDescription: 'Practical software development training, corporate IT training, technology advisory and digital transformation support from Lightworld Technologies in Ghana.',
    summary: 'We help individuals and organizations build practical technology capability while making better decisions about software, architecture and digital transformation.',
    paragraphs: [
      'Training is most useful when learners can connect concepts to real work. Our technology training focuses on practical skills, guided exercises and the engineering habits needed to move from understanding a topic to applying it.',
      'For organizations, consultancy can complement training by helping leadership and technical teams evaluate systems, shape architecture, plan modernization or create a clearer roadmap before committing to a large implementation.',
    ],
    deliverables: ['Software development training', 'Web and application development training', 'Corporate IT enablement', 'Technical mentoring and workshops', 'Architecture and technology advisory', 'Digital transformation planning', 'System and workflow assessments', 'Team capability development'],
    outcomes: ['Stronger practical technology skills', 'Better-informed technical decisions', 'Clearer modernization roadmaps', 'More capable internal teams'],
    idealFor: ['Learners building practical software skills', 'Companies training internal teams', 'Organizations planning a new technology initiative', 'Leadership teams needing independent technical guidance'],
    related: ['software-development', 'ai-automation', 'cloud-devops'],
  },
];

export const serviceSearchPageMap = new Map(serviceSearchPages.map((page) => [page.slug, page]));

export function getServiceSearchPage(slug: string): ServiceSearchPage | undefined {
  return serviceSearchPageMap.get(slug);
}
