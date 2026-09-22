-- Refresh only known legacy service records so the public Services page reflects
-- Lightworld's current software/IT positioning. Conditions protect later CMS edits.

UPDATE "Service"
SET
  "title" = 'Web Development',
  "description" = 'Lightworld designs and engineers responsive websites, customer portals, web applications and digital platforms with strong UX, performance, accessibility, security and search foundations.',
  "features" = '["Responsive website design","Customer and partner portals","Web applications and SaaS interfaces","E-commerce experiences","Content management systems","API and payment integrations","Performance and technical SEO","Maintenance and modernization"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'svc-web-development'
  AND "slug" = 'web-development'
  AND "description" LIKE 'We don''t just develop websites%';

UPDATE "Service"
SET
  "title" = 'Mobile App Development',
  "description" = 'Lightworld builds iOS, Android and cross-platform mobile applications designed for customers, field teams and real operating conditions, with dependable APIs, authentication and release support.',
  "features" = '["iOS and Android experiences","Cross-platform React Native applications","Mobile UX and prototyping","Authentication and role-aware workflows","Offline-aware patterns","Push notifications","Backend and API integration","Release and post-launch support"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'svc-mobile-app'
  AND "slug" = 'mobile-app-development'
  AND "description" LIKE 'The world has evolved over-time%';

UPDATE "Service"
SET
  "title" = 'IT Training & Consultancy',
  "description" = 'Practical software and IT training, corporate technology enablement, architecture advisory and digital-transformation support for learners, teams and organizations.',
  "features" = '["Software development training","Web and application development training","Corporate IT training","Technical mentoring and workshops","Architecture advisory","Digital transformation planning","Technology assessments","Team capability development"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'svc-skills-dev'
  AND "slug" = 'skills-development'
  AND "title" = 'Skills Development';

UPDATE "Service"
SET
  "title" = 'SEO & Digital Growth',
  "description" = 'Technical SEO, search architecture, structured data, performance, analytics and conversion-focused digital improvements that help people discover and act on what your business offers.',
  "features" = '["Technical SEO","Search-focused information architecture","Structured data and entity signals","Website performance optimization","Analytics and measurement","Search landing-page architecture","Content foundations","Conversion journey improvements"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'svc-seo'
  AND "slug" = 'seo-social-media-marketing'
  AND "title" = 'SEO & Social Media Marketing';

UPDATE "Service"
SET
  "title" = 'Software Development',
  "description" = 'Custom business software for organizations that need secure, role-aware workflows across operations, approvals, customers, inventory, assets, reporting and integrations.',
  "features" = '["ERP and operational platforms","Enterprise asset and maintenance systems","CRM and service workflows","School and institutional systems","Inventory and logistics workflows","Approval automation","Management reporting","API integration and modernization"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'svc-software-dev'
  AND "slug" = 'software-development'
  AND "description" LIKE 'We develop custom software solutions%';

UPDATE "Service"
SET
  "title" = 'Cloud Hosting & Infrastructure',
  "description" = 'Production hosting and infrastructure support covering VPS and cloud environments, domains, SSL, email, migrations, backups, monitoring and repeatable deployment practices.',
  "features" = '["VPS and cloud hosting","Domain and DNS management","SSL certificates","Business email hosting","Server and application migrations","Backups and recovery foundations","Monitoring and health checks","Deployment and reliability support"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'svc-hosting'
  AND "slug" = 'hosting-domain'
  AND "description" LIKE 'We provide reliable web hosting%';
