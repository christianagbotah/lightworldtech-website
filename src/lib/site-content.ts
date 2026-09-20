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


export const defaultPrivacySections = [
  {
    title: 'Information you choose to give us',
    body: "When you send a project brief, contact us, join the newsletter, or apply for an opportunity, we process the information you submit so we can respond to that request and operate the relevant service.\n\nDepending on the form, this may include your name, email address, phone number, organization, project details, application information, and the content of your message.",
  },
  {
    title: 'Optional first-party analytics',
    body: "If you allow Analytics in our privacy controls, Lightworld records limited first-party events so we can understand which pages are useful and how visitors move through the website.\n\nThe analytics record contains a random browser-session identifier, event name, page path, referring domain and limited event metadata. The analytics database is designed not to store your raw IP address, email address, or a user-agent fingerprint.\n\nAnalytics is optional. If you decline it, the public website and its essential features remain available.",
  },
  {
    title: 'Cookies and browser storage',
    body: "Essential browser storage supports functions such as your privacy choice and temporary session state. Optional analytics storage is used only after Analytics is enabled.\n\nYou can accept, decline, or customize optional categories from the privacy panel. You can reopen the panel later using the cookie-settings control on the website.\n\nMarketing storage is not required for the current first-party analytics feature. If advertising or third-party marketing integrations are introduced, they should remain subject to the privacy choice presented to you.",
  },
  {
    title: 'Why we process information',
    body: "We use information to respond to enquiries, prepare and discuss project work, provide requested communications, operate and secure the website, understand consented website usage, improve our services, and meet applicable legal or operational obligations.",
  },
  {
    title: 'Sharing and service providers',
    body: "We may use hosting, infrastructure, email, security and other operational service providers where needed to run the website and provide requested services. We do not describe analytics data as being sold to advertisers, and our first-party analytics implementation is designed to remain inside Lightworld’s website database.",
  },
  {
    title: 'Retention and security',
    body: "We keep information for as long as reasonably necessary for the purpose for which it was collected, legitimate operational needs, security, dispute handling and applicable legal requirements. Retention can differ by record type.\n\nWe use access controls and other technical and organizational safeguards intended to protect the information under our control. No internet service can promise absolute security.",
  },
  {
    title: 'Your choices and requests',
    body: "You may contact us to ask about personal information we hold about you or to request an appropriate correction, access or deletion, subject to applicable law and records we may need to retain.\n\nFor website analytics, you can change your optional privacy preferences from the cookie-settings control at any time.",
  },
];

export const defaultTermsSections = [
  {
    title: 'Purpose of this website',
    body: 'lightworldtech.com presents information about Lightworld Technologies Ltd, its capabilities, products, public content, career opportunities and ways to contact the company. Website content is general information unless a separate written agreement says otherwise.',
  },
  {
    title: 'Project discussions and quotations',
    body: 'Submitting a contact form, using the assistant, discussing a project or receiving an initial scope does not by itself create a contract or guarantee a particular price, delivery date or outcome. Commercial commitments are established through the applicable proposal, statement of work, contract or other written agreement.',
  },
  {
    title: 'Website assistant',
    body: 'The Lightworld Assistant is intended to help visitors navigate public company information and prepare an initial project brief. Its project-scoping output is a starting point for discussion and may require validation by the Lightworld team.',
  },
  {
    title: 'Intellectual property',
    body: "Unless otherwise stated, the website’s original branding, interface, copy, graphics and software are owned by or licensed to Lightworld Technologies Ltd. You may view and use the site for its intended purpose, but you may not present Lightworld material as your own or misuse the site in a way that infringes applicable rights.",
  },
  {
    title: 'Acceptable use',
    body: 'Do not attempt to disrupt the website, bypass access controls, misuse public forms or APIs, introduce malicious code, scrape the service in a way that harms availability, or use the site for unlawful activity. We may restrict abusive traffic to protect the service and other visitors.',
  },
  {
    title: 'External links',
    body: "The website may link to third-party services, publications, social platforms and award or press sources. A link does not make Lightworld responsible for a third party’s availability, security, content or privacy practices.",
  },
  {
    title: 'Availability and changes',
    body: 'We work to keep the website accurate and available, but features may change and temporary interruption can occur. Public descriptions of services, research directions and products can also change as the company develops them.',
  },
  {
    title: 'Liability',
    body: 'To the extent permitted by applicable law, the public website is provided for general informational and communication purposes. Project-specific warranties, responsibilities and remedies are governed by the written agreement for that engagement rather than by this public page.',
  },
  {
    title: 'Privacy',
    body: 'Use of personal information through this website is described in our Privacy & Cookie Notice.',
  },
  {
    title: 'Contact',
    body: 'Questions about these website terms can be sent to mail@lightworldtech.com.',
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
      { key: 'company_whatsapp', label: 'WhatsApp number', type: 'text', defaultValue: '+233 24 361 8186', help: 'Use the direct WhatsApp-enabled business number. Ghana local or +233 format is accepted.' },
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
      { key: 'header_services_label', label: 'Services menu label', type: 'text', defaultValue: 'Services' },
      { key: 'header_services_link', label: 'Services menu landing link', type: 'url', defaultValue: '/services' },
      { key: 'header_services_footer_text', label: 'Services menu footer text', type: 'text', defaultValue: 'Explore every capability' },
      { key: 'header_company_label', label: 'Company menu label', type: 'text', defaultValue: 'Company' },
      { key: 'header_company_link', label: 'Company menu landing link', type: 'url', defaultValue: '/about' },
      {
        key: 'header_service_menu',
        label: 'Header — Services menu',
        type: 'objectList',
        defaultValue: [
          { title: 'Web & product engineering', desc: 'Websites, portals, SaaS and platforms', href: '/services', icon: 'code' },
          { title: 'Mobile apps', desc: 'Native-feeling iOS and Android experiences', href: '/services', icon: 'smartphone' },
          { title: 'Enterprise systems', desc: 'ERP, EAM, workflow and operational software', href: '/services', icon: 'workflow' },
          { title: 'AI & automation', desc: 'Assistive AI and intelligent workflows', href: '/services', icon: 'brain' },
          { title: 'Cloud & DevOps', desc: 'Deployment, reliability and infrastructure', href: '/services', icon: 'cloud' },
          { title: 'Security engineering', desc: 'Secure architecture and application hardening', href: '/services', icon: 'shield' },
          { title: 'SEO & digital growth', desc: 'Search-ready architecture and analytics', href: '/services', icon: 'search' },
          { title: 'Training & advisory', desc: 'IT skills, consulting and transformation', href: '/services', icon: 'graduation' },
        ],
        fields: [
          { key: 'title', label: 'Title' },
          { key: 'desc', label: 'Description', type: 'textarea' },
          { key: 'href', label: 'Link', type: 'url' },
          { key: 'icon', label: 'Icon key' },
        ],
        help: 'Icon keys: code, smartphone, workflow, brain, cloud, shield, search, graduation, grid.',
      },
      {
        key: 'header_company_menu',
        label: 'Header — Company menu',
        type: 'objectList',
        defaultValue: [
          { title: 'About Lightworld', desc: 'Company, direction and how we work', href: '/about', icon: 'building' },
          { title: 'Leadership', desc: 'Meet the people leading Lightworld', href: '/team', icon: 'users' },
          { title: 'Trust Center', desc: 'Security, privacy and responsible AI', href: '/trust', icon: 'shield' },
          { title: 'Newsroom & media', desc: 'Verified facts, awards and public coverage', href: '/newsroom', icon: 'newspaper' },
          { title: 'Careers', desc: 'Talent network and opportunities', href: '/careers', icon: 'briefcase' },
          { title: 'Contact', desc: 'Start a project or conversation', href: '/contact', icon: 'message' },
          { title: 'Client Portal', desc: 'Secure project and support workspace', href: '/client', icon: 'key' },
        ],
        fields: [
          { key: 'title', label: 'Title' },
          { key: 'desc', label: 'Description', type: 'textarea' },
          { key: 'href', label: 'Link', type: 'url' },
          { key: 'icon', label: 'Icon key' },
        ],
        help: 'Icon keys: building, users, shield, newspaper, briefcase, message, key, grid.',
      },
      {
        key: 'header_mobile_dock_links',
        label: 'Mobile quick dock',
        type: 'objectList',
        defaultValue: [
          { title: 'Home', href: '/', icon: 'home' },
          { title: 'Services', href: '/services', icon: 'grid' },
          { title: 'Work', href: '/portfolio', icon: 'briefcase' },
          { title: 'Contact', href: '/contact', icon: 'message' },
        ],
        fields: [
          { key: 'title', label: 'Label' },
          { key: 'href', label: 'Link', type: 'url' },
          { key: 'icon', label: 'Icon key' },
        ],
        help: 'Keep this concise for mobile. Icon keys: home, grid, briefcase, message, building, users, shield, key.',
      },
      { key: 'header_cta_text', label: 'Header CTA text', type: 'text', defaultValue: 'Start a project' },
      { key: 'header_cta_link', label: 'Header CTA link', type: 'url', defaultValue: '/contact' },
      { key: 'footer_headline', label: 'Footer headline', type: 'textarea', defaultValue: 'We turn ambitious business ideas into technology people can actually use.' },
      { key: 'footer_newsletter_title', label: 'Footer newsletter title', type: 'text', defaultValue: 'Useful technology, not inbox noise.' },
      { key: 'footer_newsletter_description', label: 'Footer newsletter description', type: 'textarea', defaultValue: 'Occasional notes on product design, software engineering, digital operations and what we are building.' },
      { key: 'footer_cta_text', label: 'Footer CTA text', type: 'text', defaultValue: 'Let’s talk' },
      { key: 'footer_cta_link', label: 'Footer CTA link', type: 'url', defaultValue: '/contact' },
      {
        key: 'footer_connect_links',
        label: 'Footer — Connect links',
        type: 'objectList',
        defaultValue: [
          { label: 'Start a project', href: '/contact' },
          { label: 'Join the team', href: '/careers' },
          { label: 'Client Portal', href: '/client' },
          { label: 'Email us', href: 'mailto:mail@lightworldtech.com' },
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
          { label: 'Newsroom & Media', href: '/newsroom' },
          { label: 'Trust Center', href: '/trust' },
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
    id: 'trust',
    title: 'Trust Center',
    description: 'Public security, privacy, reliability and responsible-AI practices. Keep claims factual and avoid listing certifications unless they are independently verified.',
    fields: [
      { key: 'trust_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Trust Center' },
      { key: 'trust_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Trust is part of the product, not a badge added later.' },
      { key: 'trust_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'A practical view of how Lightworld approaches access control, privacy, reliable delivery and responsible AI across this website and our engineering process.' },
      {
        key: 'trust_practices',
        label: 'Trust practices',
        type: 'objectList',
        defaultValue: [
          { title: 'Access & application security', text: 'Administrative actions are protected by authenticated sessions, admin passwords are hashed, public endpoints are rate-limited where appropriate, and production builds are gated before release.' },
          { title: 'Privacy-conscious data handling', text: 'Optional first-party website analytics runs only after visitor consent and is designed not to store raw IP addresses, email addresses or user-agent fingerprints in analytics events.' },
          { title: 'Release & recovery discipline', text: 'Production changes are built from exact source revisions, candidate-tested before traffic moves, and database backups are taken before schema-changing releases.' },
          { title: 'Human-accountable AI', text: 'The public assistant is grounded in managed company content and verified facts. Project-scoping output is a starting point for human review, not a binding quote, contract or autonomous commercial decision.' },
        ],
        fields: [
          { key: 'title', label: 'Practice' },
          { key: 'text', label: 'Description', type: 'textarea' },
        ],
      },
      { key: 'trust_ai_principles', label: 'Responsible AI principles', type: 'stringList', defaultValue: [
        'Ground important company facts in managed or verified sources.',
        'Make uncertainty and handoff points clear instead of inventing commitments.',
        'Keep humans responsible for commercial scope, pricing and delivery decisions.',
        'Limit collected data to what the visitor has chosen to share or consented to.',
      ] },
      { key: 'trust_security_contact', label: 'Security / privacy contact', type: 'email', defaultValue: 'mail@lightworldtech.com' },
      { key: 'trust_disclaimer', label: 'Trust-center clarification', type: 'textarea', defaultValue: 'This page describes current working practices and controls; it does not claim ISO, SOC 2, PCI DSS or other third-party certification unless a verified certification is explicitly published here.' },
    ],
  },
  {
    id: 'newsroom',
    title: 'Newsroom & Media',
    description: 'Public company facts, verified recognition, press coverage and media-contact copy. Awards and coverage reuse the About & Recognition records.',
    fields: [
      { key: 'newsroom_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Newsroom & Media' },
      { key: 'newsroom_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Verified company facts, recognition and public updates.' },
      { key: 'newsroom_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'A single source for Lightworld Technologies Ltd company information, verified award links, public coverage, leadership facts and recent published insights.' },
      { key: 'newsroom_fact_title', label: 'Fact-sheet heading', type: 'text', defaultValue: 'Company fact sheet' },
      { key: 'newsroom_recognition_title', label: 'Recognition heading', type: 'text', defaultValue: 'Verified recognition' },
      { key: 'newsroom_coverage_title', label: 'Coverage heading', type: 'text', defaultValue: 'Public coverage' },
      { key: 'newsroom_updates_title', label: 'Updates heading', type: 'text', defaultValue: 'Latest from Lightworld' },
      { key: 'newsroom_media_title', label: 'Media contact heading', type: 'text', defaultValue: 'Media enquiries & brand resources' },
      { key: 'newsroom_media_description', label: 'Media contact description', type: 'textarea', defaultValue: 'For interviews, company background, leadership information, award-source verification or approved brand assets, contact the Lightworld team.' },
      { key: 'newsroom_media_email', label: 'Media contact email', type: 'email', defaultValue: 'mail@lightworldtech.com' },
    ],
  },
  {
    id: 'blog',
    title: 'Insights / Blog',
    description: 'On-page copy for the public Insights landing page. Individual articles and categories remain in the Blog module.',
    fields: [
      { key: 'blog_hero_eyebrow', label: 'Hero eyebrow', type: 'text', defaultValue: 'Insights' },
      { key: 'blog_hero_title', label: 'Hero title', type: 'textarea', defaultValue: 'Useful thinking for people building with technology.' },
      { key: 'blog_hero_description', label: 'Hero description', type: 'textarea', defaultValue: 'Notes from Lightworld on software engineering, digital operations, product design, AI, cloud, growth and the practical decisions behind modern technology.' },
      { key: 'blog_search_placeholder', label: 'Search placeholder', type: 'text', defaultValue: 'Search insights' },
      { key: 'blog_empty_title', label: 'Empty-state title', type: 'text', defaultValue: 'No published insight matches this view.' },
      { key: 'blog_empty_description', label: 'Empty-state description', type: 'textarea', defaultValue: 'Try another category or search term. New articles can be published through the Lightworld CMS.' },
    ],
  },
  {
    id: 'legal',
    title: 'Privacy & Website Terms',
    description: 'Editable public legal-page copy. Review legal changes carefully before publishing.',
    fields: [
      { key: 'privacy_eyebrow', label: 'Privacy eyebrow', type: 'text', defaultValue: 'Privacy & cookies' },
      { key: 'privacy_title', label: 'Privacy title', type: 'textarea', defaultValue: 'Clear choices. Minimal data. Useful technology.' },
      { key: 'privacy_intro', label: 'Privacy introduction', type: 'textarea', defaultValue: 'This notice explains how Lightworld Technologies Ltd handles information through lightworldtech.com.' },
      { key: 'privacy_last_updated', label: 'Privacy last-updated line', type: 'text', defaultValue: '18 September 2026' },
      { key: 'privacy_regulator_note', label: 'Privacy regulatory note', type: 'textarea', defaultValue: 'Ghana’s Data Protection Act, 2012 (Act 843) establishes the national framework for the protection and processing of personal data. This page is a practical website notice and is not a substitute for legal advice.' },
      { key: 'privacy_regulator_label', label: 'Regulator link label', type: 'text', defaultValue: 'Data Protection Commission' },
      { key: 'privacy_regulator_url', label: 'Regulator URL', type: 'url', defaultValue: 'https://dpc.gov.gh/' },
      {
        key: 'privacy_sections',
        label: 'Privacy sections',
        type: 'objectList',
        defaultValue: defaultPrivacySections,
        fields: [
          { key: 'title', label: 'Section title' },
          { key: 'body', label: 'Section body', type: 'textarea' },
        ],
        help: 'Separate paragraphs inside a section with a blank line.',
      },
      { key: 'privacy_request_title', label: 'Privacy request heading', type: 'text', defaultValue: 'Questions or privacy requests' },
      { key: 'privacy_request_text', label: 'Privacy request text', type: 'textarea', defaultValue: 'Email us with enough information for us to understand your request. For general project enquiries, use the Contact page.' },
      { key: 'cookie_consent_title', label: 'Cookie panel title', type: 'text', defaultValue: 'We value your privacy' },
      { key: 'cookie_consent_description', label: 'Cookie panel description', type: 'textarea', defaultValue: 'We use essential browser storage to operate the site. Optional analytics helps us understand consented website usage; optional categories stay off unless you choose them.' },
      { key: 'cookie_privacy_link_label', label: 'Cookie privacy-link label', type: 'text', defaultValue: 'Privacy & Cookie Notice' },
      { key: 'cookie_customize_label', label: 'Customize button label', type: 'text', defaultValue: 'Customize' },
      { key: 'cookie_decline_label', label: 'Decline button label', type: 'text', defaultValue: 'Decline optional' },
      { key: 'cookie_accept_label', label: 'Accept button label', type: 'text', defaultValue: 'Accept analytics' },
      { key: 'cookie_categories_title', label: 'Cookie categories heading', type: 'text', defaultValue: 'Cookie categories' },
      { key: 'cookie_always_on_label', label: 'Always-on badge label', type: 'text', defaultValue: 'Always on' },
      { key: 'cookie_save_label', label: 'Save preferences label', type: 'text', defaultValue: 'Save preferences' },
      { key: 'cookie_settings_label', label: 'Cookie settings control label', type: 'text', defaultValue: 'Cookie settings' },
      { key: 'cookie_essential_name', label: 'Essential category name', type: 'text', defaultValue: 'Essential' },
      { key: 'cookie_essential_description', label: 'Essential category description', type: 'textarea', defaultValue: 'Required for the website to function properly. Cannot be disabled.' },
      { key: 'cookie_analytics_name', label: 'Analytics category name', type: 'text', defaultValue: 'Analytics' },
      { key: 'cookie_analytics_description', label: 'Analytics category description', type: 'textarea', defaultValue: 'Optional first-party analytics that helps us understand which pages and journeys are useful.' },
      { key: 'terms_eyebrow', label: 'Terms eyebrow', type: 'text', defaultValue: 'Website terms' },
      { key: 'terms_title', label: 'Terms title', type: 'textarea', defaultValue: 'Terms for using the Lightworld website.' },
      { key: 'terms_last_updated', label: 'Terms last-updated line', type: 'text', defaultValue: '18 September 2026' },
      {
        key: 'terms_sections',
        label: 'Terms sections',
        type: 'objectList',
        defaultValue: defaultTermsSections,
        fields: [
          { key: 'title', label: 'Section title' },
          { key: 'body', label: 'Section body', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'seo',
    title: 'Page SEO',
    description: 'Search title and description for each flagship page.',
    fields: [
      { key: 'seo_home_title', label: 'Home title', type: 'text', defaultValue: 'Lightworld Technologies | Software, Apps, AI & Digital Solutions' },
      { key: 'seo_home_description', label: 'Home description', type: 'textarea', defaultValue: 'Lightworld Technologies Ltd builds modern websites, mobile apps, enterprise software, AI-enabled workflows and cloud solutions, with IT training and technology consultancy from Ghana.' },
      { key: 'seo_about_title', label: 'About title', type: 'text', defaultValue: 'About' },
      { key: 'seo_about_description', label: 'About description', type: 'textarea', defaultValue: 'Learn about Lightworld Technologies Ltd, a Ghanaian technology company building useful digital products, enterprise software and modern IT solutions.' },
      { key: 'seo_services_title', label: 'Services title', type: 'text', defaultValue: 'Software, App, Web & IT Services' },
      { key: 'seo_services_description', label: 'Services description', type: 'textarea', defaultValue: 'Explore web development, mobile apps, enterprise software, AI automation, cloud and DevOps, security engineering, SEO, IT training and consultancy from Lightworld Technologies.' },
      { key: 'seo_products_title', label: 'Products title', type: 'text', defaultValue: 'Digital Products' },
      { key: 'seo_products_description', label: 'Products description', type: 'textarea', defaultValue: 'Discover digital products and platforms being developed by Lightworld Technologies for teams, businesses and institutions.' },
      { key: 'seo_portfolio_title', label: 'Portfolio title', type: 'text', defaultValue: 'Portfolio & Digital Work' },
      { key: 'seo_portfolio_description', label: 'Portfolio description', type: 'textarea', defaultValue: 'Explore the kinds of web, mobile, enterprise and digital product experiences Lightworld Technologies designs and engineers.' },
      { key: 'seo_team_title', label: 'Leadership title', type: 'text', defaultValue: 'Leadership Team' },
      { key: 'seo_team_description', label: 'Leadership description', type: 'textarea', defaultValue: 'Meet the executive leadership of Lightworld Technologies Ltd.' },
      { key: 'seo_careers_title', label: 'Careers title', type: 'text', defaultValue: 'Careers' },
      { key: 'seo_careers_description', label: 'Careers description', type: 'textarea', defaultValue: 'Explore career opportunities and ways to build ambitious technology products with Lightworld Technologies in Ghana.' },
      { key: 'seo_contact_title', label: 'Contact title', type: 'text', defaultValue: 'Contact & Start a Project' },
      { key: 'seo_contact_description', label: 'Contact description', type: 'textarea', defaultValue: 'Talk to Lightworld Technologies about a website, mobile app, enterprise system, AI workflow, IT training, cloud project or technology consultancy.' },
      { key: 'seo_blog_title', label: 'Insights title', type: 'text', defaultValue: 'Technology Insights' },
      { key: 'seo_blog_description', label: 'Insights description', type: 'textarea', defaultValue: 'Practical insights from Lightworld Technologies on software, websites, mobile products, business systems, AI, cloud and digital transformation.' },
      { key: 'seo_blog_social_title', label: 'Insights social title', type: 'text', defaultValue: 'Lightworld Technologies Insights' },
      { key: 'seo_privacy_title', label: 'Privacy title', type: 'text', defaultValue: 'Privacy & Cookie Notice' },
      { key: 'seo_privacy_description', label: 'Privacy description', type: 'textarea', defaultValue: 'How Lightworld Technologies Ltd handles website data, contact information, newsletter subscriptions and optional first-party analytics.' },
      { key: 'seo_terms_title', label: 'Terms title', type: 'text', defaultValue: 'Website Terms' },
      { key: 'seo_terms_description', label: 'Terms description', type: 'textarea', defaultValue: 'Website terms for lightworldtech.com, operated by Lightworld Technologies Ltd.' },
      { key: 'seo_trust_title', label: 'Trust Center title', type: 'text', defaultValue: 'Trust Center | Security, Privacy & Responsible AI' },
      { key: 'seo_trust_description', label: 'Trust Center description', type: 'textarea', defaultValue: 'Review Lightworld Technologies Ltd security, privacy, reliable-delivery and responsible-AI practices.' },
      { key: 'seo_newsroom_title', label: 'Newsroom title', type: 'text', defaultValue: 'Newsroom & Media Center' },
      { key: 'seo_newsroom_description', label: 'Newsroom description', type: 'textarea', defaultValue: 'Verified company facts, recognition, press coverage, leadership information and public updates from Lightworld Technologies Ltd.' },
    ],
  },
];
