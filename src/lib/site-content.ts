export type SiteSettings = Record<string, string>;

export type CmsSimpleField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'email';
  defaultValue: string;
  help?: string;
};

export type CmsStringListField = {
  key: string;
  label: string;
  type: 'stringList';
  defaultValue: string[];
  help?: string;
};

export type CmsObjectListField = {
  key: string;
  label: string;
  type: 'objectList';
  defaultValue: Record<string, string>[];
  fields: Array<{ key: string; label: string; type?: 'text' | 'textarea' | 'url' }>;
  help?: string;
};

export type CmsField = CmsSimpleField | CmsStringListField | CmsObjectListField;

export type CmsGroup = {
  id: string;
  title: string;
  description: string;
  fields: CmsField[];
};

export function contentText(settings: SiteSettings | undefined, key: string, fallback: string): string {
  const value = settings?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function contentJson<T>(settings: SiteSettings | undefined, key: string, fallback: T): T {
  const value = settings?.[key];
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const defaultRecognition = [
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
];

export const defaultCoverage = [
  {
    publisher: 'GhanaWeb',
    title: 'Lightworld Technologies Limited introduces school management application',
    href: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Lightworld-Technologies-Limited-introduces-school-management-application-734612',
  },
];

export const cmsGroups: CmsGroup[] = [
  {
    id: 'global',
    title: 'Global & Navigation',
    description: 'Company identity, contact details and shared navigation/footer content.',
    fields: [
      { key: 'company_name', label: 'Company name', type: 'text', defaultValue: 'Lightworld Technologies Ltd' },
      { key: 'company_tagline', label: 'Tagline', type: 'text', defaultValue: 'The world of possibilities' },
      { key: 'company_description', label: 'Company description', type: 'textarea', defaultValue: 'A Ghanaian technology company building software, digital products, enterprise systems, AI-enabled workflows, cloud solutions, training and advisory services.' },
      { key: 'company_email', label: 'Primary email', type: 'email', defaultValue: 'mail@lightworldtech.com' },
      { key: 'company_phone1', label: 'Primary phone', type: 'text', defaultValue: '+233 (024) 361 8186' },
      { key: 'company_phone2', label: 'Secondary phone', type: 'text', defaultValue: '' },
      { key: 'company_address', label: 'Address / location', type: 'text', defaultValue: 'Accra, Ghana' },
      {
        key: 'header_primary_links',
        label: 'Header primary links',
        type: 'objectList',
        defaultValue: [
          { label: 'Work', href: '/portfolio' },
          { label: 'Products', href: '/products' },
          { label: 'Insights', href: '/blog' },
        ],
        fields: [
          { key: 'label', label: 'Label' },
          { key: 'href', label: 'Link', type: 'url' },
        ],
      },
      {
        key: 'footer_build_links',
        label: 'Footer — Build links',
        type: 'objectList',
        defaultValue: [
          { label: 'Web & product engineering', href: '/services' },
          { label: 'Mobile applications', href: '/services' },
          { label: 'Enterprise systems', href: '/services' },
          { label: 'AI & automation', href: '/services' },
          { label: 'Cloud & DevOps', href: '/services' },
        ],
        fields: [
          { key: 'label', label: 'Label' },
          { key: 'href', label: 'Link', type: 'url' },
        ],
      },
      {
        key: 'footer_explore_links',
        label: 'Footer — Explore links',
        type: 'objectList',
        defaultValue: [
          { label: 'Portfolio', href: '/portfolio' },
          { label: 'Products', href: '/products' },
          { label: 'Insights', href: '/blog' },
          { label: 'About', href: '/about' },
          { label: 'Leadership', href: '/team' },
          { label: 'Recognition & Press', href: '/about#recognition' },
          { label: 'Careers', href: '/careers' },
        ],
        fields: [
          { key: 'label', label: 'Label' },
          { key: 'href', label: 'Link', type: 'url' },
        ],
      },
    ],
  },
  {
    id: 'home',
    title: 'Homepage',
    description: 'Hero, positioning and section headings on the homepage. Services and portfolio items are managed in their dedicated CMS modules.',
    fields: [
      { key: 'home_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Ghana-built. Global-ready.' },
      { key: 'home_title', label: 'Hero title', type: 'textarea', defaultValue: 'Technology people want to use.' },
      { key: 'home_description', label: 'Hero description', type: 'textarea', defaultValue: 'We design and engineer websites, mobile apps, enterprise software, AI-enabled workflows and cloud systems that make real work simpler.' },
      { key: 'home_primary_cta_text', label: 'Primary CTA text', type: 'text', defaultValue: 'Start a project' },
      { key: 'home_primary_cta_link', label: 'Primary CTA link', type: 'url', defaultValue: '/contact' },
      { key: 'home_secondary_cta_text', label: 'Secondary CTA text', type: 'text', defaultValue: 'Explore our work' },
      { key: 'home_secondary_cta_link', label: 'Secondary CTA link', type: 'url', defaultValue: '/portfolio' },
      { key: 'home_signals', label: 'Hero trust signals', type: 'stringList', defaultValue: ['Mobile-first by default', 'SEO-ready architecture', 'Production-minded engineering', 'Built in Ghana. Ready for anywhere.'] },
      { key: 'home_capabilities_title', label: 'Capabilities heading', type: 'text', defaultValue: 'One technology partner. Many ways to move the business forward.' },
      { key: 'home_capabilities_description', label: 'Capabilities description', type: 'textarea', defaultValue: 'From customer-facing products to internal operations, we combine design, engineering and infrastructure around the outcome the business needs.' },
      { key: 'home_industries', label: 'Industries', type: 'stringList', defaultValue: ['Education', 'Manufacturing', 'Logistics', 'Retail', 'Professional services', 'Startups'] },
      { key: 'home_process_title', label: 'Delivery process heading', type: 'text', defaultValue: 'A delivery model built for useful outcomes.' },
      { key: 'home_process_description', label: 'Delivery process description', type: 'textarea', defaultValue: 'Discovery, design, engineering, launch and continuous improvement stay connected from the first conversation.' },
    ],
  },
  {
    id: 'about',
    title: 'About & Recognition',
    description: 'Company narrative, principles, awards and public coverage.',
    fields: [
      { key: 'about_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'About Lightworld' },
      { key: 'about_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'We build technology as infrastructure for growth.' },
      { key: 'about_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'Lightworld Technologies Ltd is a Ghanaian technology company focused on useful digital products: software, apps, websites, intelligent workflows, infrastructure, training and advisory.' },
      { key: 'about_location_line', label: 'Location line', type: 'text', defaultValue: 'Accra, Ghana · built with a global outlook' },
      { key: 'about_pov_eyebrow', label: 'Point-of-view eyebrow', type: 'text', defaultValue: 'Our point of view' },
      { key: 'about_pov_title', label: 'Point-of-view title', type: 'text', defaultValue: 'Digital transformation should feel practical.' },
      { key: 'about_pov_paragraphs', label: 'Point-of-view paragraphs', type: 'stringList', defaultValue: [
        'Too many technology projects start with a tool and then search for a problem. We work the other way around: understand the people, the workflow, the operational constraints and the value the business needs to create.',
        'Sometimes the answer is a focused website. Sometimes it is a mobile experience, an enterprise platform, an integration layer, an AI-assisted workflow or a training programme. The goal is not to make the solution look complicated. The goal is to make the underlying complexity manageable.',
        'That is why our work spans strategy, experience design, engineering, infrastructure and enablement. We want clients to have one accountable technology partner that can stay useful as the problem evolves.',
      ] },
      {
        key: 'about_principles',
        label: 'Operating principles',
        type: 'objectList',
        defaultValue: [
          { title: 'Start with the real problem', text: 'We care about the business outcome and the people doing the work before we choose a framework, platform or feature list.' },
          { title: 'Design the whole system', text: 'A good interface, the workflow behind it, data, infrastructure and operations should reinforce one another.' },
          { title: 'Build for production', text: 'Security, access control, recoverability, performance and deployment are design concerns—not a last-week checklist.' },
          { title: 'Leave teams stronger', text: 'Documentation, training and thoughtful handover matter because useful technology has to keep working after launch day.' },
        ],
        fields: [
          { key: 'title', label: 'Title' },
          { key: 'text', label: 'Description', type: 'textarea' },
        ],
      },
      {
        key: 'about_recognition',
        label: 'Awards / recognition',
        type: 'objectList',
        defaultValue: defaultRecognition,
        fields: [
          { key: 'year', label: 'Year' },
          { key: 'publisher', label: 'Publisher' },
          { key: 'title', label: 'Award title' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'href', label: 'Source URL', type: 'url' },
        ],
      },
      {
        key: 'about_coverage',
        label: 'Press coverage',
        type: 'objectList',
        defaultValue: defaultCoverage,
        fields: [
          { key: 'publisher', label: 'Publisher' },
          { key: 'title', label: 'Headline' },
          { key: 'href', label: 'Source URL', type: 'url' },
        ],
      },
    ],
  },
  {
    id: 'services',
    title: 'Services Page',
    description: 'Page-level copy. Individual services are managed from the Services module.',
    fields: [
      { key: 'services_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Capabilities' },
      { key: 'services_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Technology capabilities that connect strategy to execution.' },
      { key: 'services_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'Choose a focused engagement or combine capabilities into one delivery team across product, enterprise software, AI, infrastructure, security, growth and training.' },
      { key: 'services_cta_title', label: 'Closing CTA title', type: 'text', defaultValue: 'Not sure which service fits?' },
      { key: 'services_cta_description', label: 'Closing CTA description', type: 'textarea', defaultValue: 'Describe the business problem and we can help shape the right technical approach.' },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Product Lab positioning and product direction cards.',
    fields: [
      { key: 'products_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Product lab' },
      { key: 'products_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Custom engineering today. Reusable products tomorrow.' },
      { key: 'products_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'Our product direction grows from patterns we repeatedly see in real operations. Instead of publishing speculative launch dates, this page shows the product families and platform ideas we are actively exploring and shaping.' },
      {
        key: 'products_directions',
        label: 'Product directions',
        type: 'objectList',
        defaultValue: [
          { title: 'Operations platforms', stage: 'Product family', text: 'Modular systems for assets, maintenance, inventory, people, approvals and operational reporting.', features: 'Role-aware workflows, Auditability, Dashboards, Mobile operations' },
          { title: 'Education platforms', stage: 'Product family', text: 'School administration, learning, assessment, billing and communication experiences designed around the institution.', features: 'Administration, Assessment, Billing, Parent & staff journeys' },
          { title: 'AI-assisted products', stage: 'R&D', text: 'Focused intelligent experiences that help teams search knowledge, interpret information and automate repetitive work.', features: 'Assistants, Knowledge, Automation, Human controls' },
          { title: 'Business intelligence', stage: 'R&D', text: 'Operational dashboards and reporting products that bring data from separate workflows into one decision surface.', features: 'KPIs, Alerts, Reporting, Integrations' },
          { title: 'Learning & skills', stage: 'R&D', text: 'Digital learning and capability-building experiences for companies, institutions and individual learners.', features: 'Courses, Progress, Assessment, Certificates' },
          { title: 'Reusable industry modules', stage: 'Platform', text: 'Reusable product building blocks that shorten delivery time while keeping room for industry-specific workflows.', features: 'Modular, Configurable, API-first, Multi-tenant ready' },
        ],
        fields: [
          { key: 'title', label: 'Title' },
          { key: 'stage', label: 'Stage' },
          { key: 'text', label: 'Description', type: 'textarea' },
          { key: 'features', label: 'Features (comma-separated)', type: 'textarea' },
        ],
      },
      { key: 'products_updates_title', label: 'Updates heading', type: 'text', defaultValue: 'Follow what graduates from the lab.' },
      { key: 'products_updates_description', label: 'Updates description', type: 'textarea', defaultValue: 'We will share public launches, early-access opportunities and useful product notes when they are ready.' },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    description: 'Portfolio page-level copy. Projects are managed in the Portfolio module.',
    fields: [
      { key: 'portfolio_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Work & solution patterns' },
      { key: 'portfolio_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Technology should look good. More importantly, it should work.' },
      { key: 'portfolio_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'A selection of work published by the Lightworld team across web, mobile and business systems.' },
      { key: 'portfolio_cta_title', label: 'Closing CTA title', type: 'text', defaultValue: 'Have a harder problem than these?' },
      { key: 'portfolio_cta_description', label: 'Closing CTA description', type: 'textarea', defaultValue: 'Good. The most useful work usually starts where a template stops being enough.' },
    ],
  },
  {
    id: 'team',
    title: 'Leadership',
    description: 'Page-level leadership copy. People are managed in Team Members.',
    fields: [
      { key: 'team_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Leadership' },
      { key: 'team_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'People accountable for where Lightworld is going.' },
      { key: 'team_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'Lightworld combines company leadership with a hands-on understanding of technology, operations and delivery. These are the confirmed executive leaders of Lightworld Technologies Ltd.' },
      { key: 'team_model_eyebrow', label: 'Leadership model eyebrow', type: 'text', defaultValue: 'Leadership model' },
      { key: 'team_model_title', label: 'Leadership model title', type: 'text', defaultValue: 'Strategy stays close to delivery.' },
    ],
  },
  {
    id: 'careers',
    title: 'Careers',
    description: 'Talent network, disciplines and expectations.',
    fields: [
      { key: 'careers_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Careers & talent network' },
      { key: 'careers_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Come build technology that has to work in the real world.' },
      { key: 'careers_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'We are building a multidisciplinary technology company in Ghana. Open roles change with project needs, so we do not publish stale vacancies or salary promises as if they were current.' },
      { key: 'careers_location', label: 'Location / work style', type: 'text', defaultValue: 'Accra, Ghana · role-dependent remote collaboration' },
      {
        key: 'careers_disciplines',
        label: 'Talent disciplines',
        type: 'objectList',
        defaultValue: [
          { title: 'Engineering', text: 'Frontend, backend, mobile, platform and integration work.' },
          { title: 'Product & design', text: 'Research, UX, interface design, content and design systems.' },
          { title: 'AI & data', text: 'Applied AI, automation, analytics and knowledge experiences.' },
          { title: 'Cloud & security', text: 'Infrastructure, DevOps, reliability and application security.' },
          { title: 'Training', text: 'Technical instruction, curriculum and corporate enablement.' },
          { title: 'Client delivery', text: 'Discovery, project leadership, implementation and support.' },
        ],
        fields: [
          { key: 'title', label: 'Discipline' },
          { key: 'text', label: 'Description', type: 'textarea' },
        ],
      },
      { key: 'careers_expectations', label: 'What we value', type: 'stringList', defaultValue: [
        'Care about the user and the operational detail, not only the technology.',
        'Communicate clearly when something is uncertain, risky or needs a decision.',
        'Be willing to learn outside a narrow job title when the product requires it.',
        'Treat security, quality and maintainability as part of the work.',
        'Share knowledge so the whole team improves.',
      ] },
      { key: 'careers_email', label: 'Careers email', type: 'email', defaultValue: 'mail@lightworldtech.com' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    description: 'Contact-page hero and project brief introduction.',
    fields: [
      { key: 'contact_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Start a conversation' },
      { key: 'contact_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Tell us what you want to build, improve or automate.' },
      { key: 'contact_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'You do not need a finished technical specification. Share the business problem, the people involved and what a good outcome would look like. We can help shape the next step.' },
      { key: 'contact_form_eyebrow', label: 'Form eyebrow', type: 'text', defaultValue: 'Project brief' },
      { key: 'contact_form_title', label: 'Form title', type: 'text', defaultValue: 'A little context is enough to start.' },
    ],
  },
  {
    id: 'seo',
    title: 'Page SEO',
    description: 'Search title and description for each flagship page.',
    fields: [
      { key: 'seo_home_title', label: 'Home title', type: 'text', defaultValue: 'Lightworld Technologies Ltd | Software, Apps, AI & Digital Solutions' },
      { key: 'seo_home_description', label: 'Home description', type: 'textarea', defaultValue: 'Lightworld Technologies Ltd builds modern websites, mobile apps, enterprise software, AI-enabled workflows and cloud solutions, with IT training and technology consultancy from Ghana.' },
      { key: 'seo_about_title', label: 'About title', type: 'text', defaultValue: 'About' },
      { key: 'seo_about_description', label: 'About description', type: 'textarea', defaultValue: 'Learn about Lightworld Technologies Ltd, a Ghanaian technology company building useful digital products, enterprise software and modern IT solutions.' },
      { key: 'seo_services_title', label: 'Services title', type: 'text', defaultValue: 'Software, App, Web & IT Services' },
      { key: 'seo_services_description', label: 'Services description', type: 'textarea', defaultValue: 'Explore web development, mobile apps, enterprise software, AI automation, cloud and DevOps, security engineering, SEO, IT training and consultancy from Lightworld Technologies Ltd.' },
      { key: 'seo_products_title', label: 'Products title', type: 'text', defaultValue: 'Digital Products' },
      { key: 'seo_products_description', label: 'Products description', type: 'textarea', defaultValue: 'Discover digital products and platforms being developed by Lightworld Technologies Ltd for teams, businesses and institutions.' },
      { key: 'seo_portfolio_title', label: 'Portfolio title', type: 'text', defaultValue: 'Portfolio & Digital Work' },
      { key: 'seo_portfolio_description', label: 'Portfolio description', type: 'textarea', defaultValue: 'Explore the kinds of web, mobile, enterprise and digital product experiences Lightworld Technologies Ltd designs and engineers.' },
      { key: 'seo_team_title', label: 'Leadership title', type: 'text', defaultValue: 'Leadership Team' },
      { key: 'seo_team_description', label: 'Leadership description', type: 'textarea', defaultValue: 'Meet the executive leadership of Lightworld Technologies Ltd.' },
      { key: 'seo_careers_title', label: 'Careers title', type: 'text', defaultValue: 'Careers' },
      { key: 'seo_careers_description', label: 'Careers description', type: 'textarea', defaultValue: 'Explore career opportunities and ways to build ambitious technology products with Lightworld Technologies Ltd in Ghana.' },
      { key: 'seo_contact_title', label: 'Contact title', type: 'text', defaultValue: 'Contact & Start a Project' },
      { key: 'seo_contact_description', label: 'Contact description', type: 'textarea', defaultValue: 'Talk to Lightworld Technologies Ltd about a website, mobile app, enterprise system, AI workflow, IT training, cloud project or technology consultancy.' },
    ],
  },
];
