export type IndustrySolution = {
  slug: string;
  name: string;
  shortLabel: string;
  headline: string;
  description: string;
  context: string;
  challenges: string[];
  priorities: string[];
  capabilities: Array<{
    title: string;
    text: string;
    href: string;
  }>;
};

export const industrySolutions: IndustrySolution[] = [
  {
    slug: 'education',
    name: 'Education Technology',
    shortLabel: 'Education',
    headline: 'Digital systems that connect school operations, learning and communication.',
    description: 'Lightworld can design education platforms around administration, billing, assessment, communication, digital learning and the day-to-day realities of schools and training organizations.',
    context: 'Education systems often sit between administrators, teachers, learners, parents and finance teams. The useful product is the one that keeps those roles connected without making routine work harder.',
    challenges: [
      'Fragmented student, billing, attendance and academic records',
      'Slow communication between schools, staff, learners and parents',
      'Manual assessment, reporting and approval workflows',
      'Mobile and connectivity constraints for day-to-day users',
    ],
    priorities: [
      'Role-aware school administration',
      'Billing, payments and account visibility',
      'Assessment, reporting and learning workflows',
      'Mobile-first communication and self-service',
      'Offline-aware or resilient operating patterns where required',
      'Secure records, permissions and auditability',
    ],
    capabilities: [
      { title: 'Enterprise software', text: 'School administration, workflow, finance and operational platforms.', href: '/services/software-development' },
      { title: 'Mobile applications', text: 'Mobile experiences for staff, learners, parents and field use.', href: '/services/mobile-app-development' },
      { title: 'AI & automation', text: 'Assistive workflows for support, content operations and repetitive administration.', href: '/services/ai-automation' },
      { title: 'Training & advisory', text: 'Technology enablement for staff and implementation teams.', href: '/services/it-training' },
    ],
  },
  {
    slug: 'manufacturing',
    name: 'Manufacturing & Industrial Operations',
    shortLabel: 'Manufacturing',
    headline: 'Operational software for assets, maintenance, production and the people keeping plants running.',
    description: 'Lightworld can build connected industrial workflows spanning maintenance, work orders, assets, spares, tools, production support, approvals, reporting and management visibility.',
    context: 'Industrial software has to work where operational discipline matters: on the shop floor, across shifts, inside stores and maintenance teams, and through the approval chain that keeps work safe and accountable.',
    challenges: [
      'Maintenance work split across paper, spreadsheets and disconnected tools',
      'Weak visibility into asset history, downtime, spares and technician activity',
      'Shift handover and approval gaps that slow operational response',
      'Connectivity and power interruptions that affect system availability',
    ],
    priorities: [
      'Asset and equipment history',
      'Corrective and preventive maintenance workflows',
      'Materials, tools and rotating-spares control',
      'Shift operations and handover',
      'Permissions, approvals and audit trails',
      'Offline-aware workflows and resilient synchronization',
    ],
    capabilities: [
      { title: 'Enterprise systems', text: 'EAM, maintenance, production-support and operational workflow platforms.', href: '/services/software-development' },
      { title: 'Mobile applications', text: 'Field and technician experiences designed for practical on-site use.', href: '/services/mobile-app-development' },
      { title: 'AI & automation', text: 'Assistive analysis, prioritization and workflow automation with human accountability.', href: '/services/ai-automation' },
      { title: 'Cloud & DevOps', text: 'Reliable environments, deployment controls, backups and observability.', href: '/services/cloud-devops' },
    ],
  },
  {
    slug: 'logistics',
    name: 'Logistics, Fleet & Distribution',
    shortLabel: 'Logistics',
    headline: 'Connected workflows for trips, fleets, warehouses, deliveries and operational accountability.',
    description: 'Lightworld can design logistics systems that connect dispatch, trip execution, fleet records, inventory movement, proof of activity, expenses and management reporting.',
    context: 'Logistics work moves across locations, people and time. The system needs to capture what happened in the field while giving operations teams a dependable view of vehicles, jobs, stock and exceptions.',
    challenges: [
      'Trip and delivery information arriving late or incomplete',
      'Disconnected vehicle, driver, expense and proof-of-delivery records',
      'Weak coordination between dispatch, warehouse and field teams',
      'Limited visibility into exceptions, delays and operational costs',
    ],
    priorities: [
      'Trip planning and dispatch',
      'Fleet, mileage and maintenance records',
      'Waybills, proof and field evidence',
      'Warehouse and inventory movement',
      'Allowances, expenses and reconciliation',
      'Operational dashboards and exception reporting',
    ],
    capabilities: [
      { title: 'Enterprise systems', text: 'Fleet, depot, inventory, dispatch and distribution workflows.', href: '/services/software-development' },
      { title: 'Mobile applications', text: 'Driver and field-team experiences for activity capture away from the office.', href: '/services/mobile-app-development' },
      { title: 'Cloud & DevOps', text: 'APIs, integrations and infrastructure that keep distributed operations connected.', href: '/services/cloud-devops' },
      { title: 'AI & automation', text: 'Assistive exception handling, summaries and workflow routing.', href: '/services/ai-automation' },
    ],
  },
  {
    slug: 'retail-commerce',
    name: 'Retail & Commerce',
    shortLabel: 'Retail',
    headline: 'Commerce systems that connect customers, inventory, payments and internal operations.',
    description: 'Lightworld can build digital commerce experiences and the operational systems behind them—from customer-facing storefronts and portals to inventory, payments, fulfilment and reporting.',
    context: 'A polished storefront is only one part of commerce. Orders, stock, payments, customer records and fulfilment need to stay connected if the experience is going to work beyond launch day.',
    challenges: [
      'Customer experience disconnected from inventory and fulfilment',
      'Manual payment confirmation and account reconciliation',
      'Limited customer self-service and order visibility',
      'Multiple systems producing inconsistent operational data',
    ],
    priorities: [
      'Web and mobile commerce experiences',
      'Inventory and availability',
      'Payments and transaction workflows',
      'Customer accounts and self-service',
      'Order and fulfilment operations',
      'Analytics, SEO and conversion visibility',
    ],
    capabilities: [
      { title: 'Web & product engineering', text: 'Customer-facing commerce, catalog and account experiences.', href: '/services/web-development' },
      { title: 'Mobile applications', text: 'Mobile commerce and operational experiences.', href: '/services/mobile-app-development' },
      { title: 'Enterprise systems', text: 'Inventory, order, customer and finance workflows.', href: '/services/software-development' },
      { title: 'SEO & digital growth', text: 'Search foundations, analytics and conversion improvements.', href: '/services/seo-digital-performance' },
    ],
  },
  {
    slug: 'professional-services',
    name: 'Professional Services',
    shortLabel: 'Professional services',
    headline: 'A connected commercial operating system from lead to delivery, billing and support.',
    description: 'Lightworld can help service businesses connect CRM, proposals, customer onboarding, projects, documents, billing, collections, renewals and support into one accountable workflow.',
    context: 'Professional service firms often lose context as a customer moves from sales into delivery and finance. A connected system keeps the relationship, commitments and commercial history visible across teams.',
    challenges: [
      'Lead and proposal context lost during handover to delivery',
      'Projects, invoices, renewals and support tracked in separate tools',
      'Weak visibility into customer balances and next commercial actions',
      'Manual reporting that makes management decisions slower',
    ],
    priorities: [
      'CRM and opportunity management',
      'Proposal and commercial workflows',
      'Customer onboarding and project delivery',
      'Billing, collections and renewals',
      'Client portals and support',
      'Management reporting and auditability',
    ],
    capabilities: [
      { title: 'Enterprise systems', text: 'CRM, finance, project, support and customer-account workflows.', href: '/services/software-development' },
      { title: 'Web & product engineering', text: 'Client portals, corporate sites and secure self-service experiences.', href: '/services/web-development' },
      { title: 'AI & automation', text: 'Assistive summaries, drafting and workflow automation with controlled actions.', href: '/services/ai-automation' },
      { title: 'Cloud & DevOps', text: 'Reliable deployment and integration foundations for business-critical systems.', href: '/services/cloud-devops' },
    ],
  },
  {
    slug: 'startups',
    name: 'Startups & Digital Ventures',
    shortLabel: 'Startups',
    headline: 'From an uncertain idea to a production-minded digital product.',
    description: 'Lightworld can work with founders and venture teams through discovery, product design, MVP engineering, mobile and web delivery, cloud foundations, AI-enabled workflows and post-launch improvement.',
    context: 'Early-stage products need speed, but speed is most useful when the team is learning quickly without creating avoidable security, deployment and architecture problems that block the next stage.',
    challenges: [
      'Turning an idea into a buildable product scope',
      'Balancing launch speed with maintainable architecture',
      'Choosing what belongs in the first release and what should wait',
      'Establishing deployment, analytics and feedback loops early enough',
    ],
    priorities: [
      'Discovery and product definition',
      'MVP and SaaS engineering',
      'Web and mobile product design',
      'AI-enabled product workflows',
      'Cloud, deployment and observability',
      'Iteration based on real usage and business learning',
    ],
    capabilities: [
      { title: 'Web & product engineering', text: 'MVPs, SaaS platforms, portals and customer-facing products.', href: '/services/web-development' },
      { title: 'Mobile applications', text: 'Mobile-first product experiences for iOS and Android use cases.', href: '/services/mobile-app-development' },
      { title: 'AI & automation', text: 'AI-assisted product features and intelligent workflows where they create real value.', href: '/services/ai-automation' },
      { title: 'Cloud & DevOps', text: 'Production environments, release controls and infrastructure foundations.', href: '/services/cloud-devops' },
    ],
  },
];

export function industrySolutionBySlug(slug: string): IndustrySolution | undefined {
  return industrySolutions.find((industry) => industry.slug === slug);
}
