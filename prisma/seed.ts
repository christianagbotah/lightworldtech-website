import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const db = new PrismaClient();

function hashSeedPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return ['scrypt', salt.toString('base64url'), hash.toString('base64url')].join('$');
}

async function seed() {
  console.log('🌱 Seeding database...');

  // ===== SITE SETTINGS =====
  const settings = [
    // General
    { key: 'company_name', value: 'Lightworld Technologies Ltd', type: 'text', group: 'general' },
    { key: 'company_tagline', value: 'The World of Possibilities', type: 'text', group: 'general' },
    { key: 'company_description', value: 'We are a leading IT solutions company providing cutting-edge software development, web development, mobile app development, and digital marketing services to businesses across Africa and beyond.', type: 'richText', group: 'general' },
    { key: 'company_address', value: 'Tema, Ghana', type: 'text', group: 'contact' },
    { key: 'company_phone1', value: '+233 (024) 361 8186', type: 'text', group: 'contact' },
    { key: 'company_phone2', value: '+233 (055) 467 2081', type: 'text', group: 'contact' },
    { key: 'company_email', value: 'mail@lightworldtech.com', type: 'text', group: 'contact' },
    { key: 'social_facebook', value: '', type: 'text', group: 'social' },
    { key: 'social_twitter', value: '', type: 'text', group: 'social' },
    { key: 'social_linkedin', value: '', type: 'text', group: 'social' },
    { key: 'social_instagram', value: '', type: 'text', group: 'social' },

    // Hero Section
    { key: 'hero_title', value: 'Experience the REAL Lightworld', type: 'text', group: 'hero' },
    { key: 'hero_subtitle', value: 'Our Computers + Our DYNAMIC minds put your business ahead of your Competitors', type: 'text', group: 'hero' },
    { key: 'hero_badge1', value: '2024 Business Excellence Award Winner', type: 'text', group: 'hero' },
    { key: 'hero_badge2', value: '2021 MEA Awards Winner', type: 'text', group: 'hero' },
    { key: 'hero_cta_text', value: 'Get Started', type: 'text', group: 'hero' },
    { key: 'hero_cta_link', value: '/contact', type: 'text', group: 'hero' },
    { key: 'hero_cta2_text', value: 'Our Services', type: 'text', group: 'hero' },
    { key: 'hero_cta2_link', value: '/services', type: 'text', group: 'hero' },

    // Stats
    { key: 'stat_projects', value: '100+', type: 'text', group: 'general' },
    { key: 'stat_clients', value: '100+', type: 'text', group: 'general' },
    { key: 'stat_years', value: '8+', type: 'text', group: 'general' },
    { key: 'stat_satisfaction', value: '100%', type: 'text', group: 'general' },

    // About
    { key: 'about_title', value: 'About Lightworld Technologies', type: 'text', group: 'about' },
    { key: 'about_subtitle', value: 'Empowering Businesses Through Technology', type: 'text', group: 'about' },
    { key: 'about_description', value: 'Lightworld Technologies Ltd is a dynamic and innovative IT solutions company based in Ghana. With a team of talented and skilled professionals, we are committed to delivering world-class technology solutions that transform businesses and drive growth.\n\nWe specialize in web development, mobile app development, software development, digital marketing, and IT training. Our mission is to bridge the technology gap and empower businesses with cutting-edge solutions that give them a competitive edge in the digital landscape.\n\nSince our establishment, we have served over 100 clients across various industries including education, healthcare, e-commerce, real estate, hospitality, and more. Our commitment to excellence and innovation has earned us recognition including the 2024 Business Excellence Award and the 2021 MEA Award.', type: 'richText', group: 'about' },
    { key: 'about_mission', value: 'To provide innovative, reliable, and cost-effective IT solutions that empower businesses and individuals to achieve their full potential in the digital age.', type: 'text', group: 'about' },
    { key: 'about_vision', value: 'To be the leading technology solutions provider in Africa, recognized globally for excellence, innovation, and transformative impact on businesses and communities.', type: 'text', group: 'about' },
    { key: 'about_values', value: '["Innovation","Excellence","Integrity","Client Satisfaction","Continuous Learning","Teamwork"]', type: 'json', group: 'about' },

    // SEO
    { key: 'seo_title', value: 'Lightworld Technologies Ltd – The World of Possibilities', type: 'text', group: 'seo' },
    { key: 'seo_description', value: 'We develop and design websites, Mobile Apps, School Management Software and other CRMs, Computer Science Training, Beads and Crafts Design Training, etc', type: 'text', group: 'seo' },
    { key: 'seo_keywords', value: 'web development, mobile app development, IT training, SEO, digital marketing, Ghana, Lightworld Technologies', type: 'text', group: 'seo' },
  ];

  for (const s of settings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ Site settings seeded');

  // ===== NAVIGATION =====
  const navItems = [
    { label: 'Home', href: '/', order: 0 },
    { label: 'About Us', href: '/about', order: 1 },
    { label: 'Services', href: '/services', order: 2 },
    { label: 'Blog', href: '/blog', order: 3 },
    { label: 'Contact', href: '/contact', order: 4 },
  ];

  for (const nav of navItems) {
    await db.navItem.upsert({
      where: { id: `nav-${nav.label.toLowerCase().replace(/\s+/g, '-')}` },
      update: { label: nav.label, href: nav.href, order: nav.order },
      create: { id: `nav-${nav.label.toLowerCase().replace(/\s+/g, '-')}`, ...nav },
    });
  }
  console.log('✅ Navigation seeded');

  // ===== SERVICES =====
  const services = [
    {
      id: 'svc-web-development',
      title: 'Web Development',
      slug: 'web-development',
      description: "We don't just develop websites, we make it a world-class standard. Coming to you and your clients with responsive websites that give the best user interface with great web applications for effective interactions. Our websites are built with the latest technologies ensuring speed, security, and scalability.",
      icon: 'Globe',
      image: '',
      features: JSON.stringify([
        'Custom responsive website design',
        'E-commerce solutions (WooCommerce)',
        'Content Management Systems',
        'Progressive Web Apps (PWA)',
        'Website maintenance & support',
        'UI/UX Design & Prototyping',
        'API Integration & Development',
        'Performance optimization & SEO',
      ]),
      order: 0,
    },
    {
      id: 'svc-mobile-app',
      title: 'Mobile App Development',
      slug: 'mobile-app-development',
      description: 'The world has evolved over-time and the way of approaching daily problems have also evolved over-time. Always sitting in front of your desktop or laptop cannot make you cope with the current standard. We take your business and other solutions to the mobile world, trust us.',
      icon: 'Smartphone',
      image: '',
      features: JSON.stringify([
        'iOS & Android app development',
        'Cross-platform development (React Native)',
        'App prototyping & wireframing',
        'App store optimization',
        'Push notifications & analytics',
        'API integration & backend services',
      ]),
      order: 1,
    },
    {
      id: 'svc-skills-dev',
      title: 'Skills Development',
      slug: 'skills-development',
      description: "Our training centres are well structured to equip you with competitive well sought-after skills in IT and Fashion industries respectively. Enroll in any of them and get those skills at your fingertips today. Idea generation and development for a greater future.",
      icon: 'GraduationCap',
      image: '',
      features: JSON.stringify([
        'Computer Science Training',
        'Software Development Bootcamps',
        'UI/UX Design Training',
        'Digital Marketing Courses',
        'Beads & Crafts Design Training',
        'Corporate IT Training Programs',
      ]),
      order: 2,
    },
    {
      id: 'svc-seo',
      title: 'SEO & Social Media Marketing',
      slug: 'seo-social-media-marketing',
      description: "It is not enough being on the internet with your business. There is a need for people all over the world to know who you are and what you have to offer them. Choosing us will make your brand name reach anyone who is looking for you, even those who are not. Get connected.",
      icon: 'TrendingUp',
      image: '',
      features: JSON.stringify([
        'Search Engine Optimization (SEO)',
        'Social Media Management',
        'Google Ads & PPC campaigns',
        'Content Marketing Strategy',
        'Email Marketing',
        'Brand Strategy & Identity',
        'Analytics & Reporting',
      ]),
      order: 3,
    },
    {
      id: 'svc-software-dev',
      title: 'Software Development',
      slug: 'software-development',
      description: 'We develop custom software solutions tailored to your specific business needs. From school management systems to CRMs and enterprise applications, our team delivers robust, scalable software that streamlines your operations.',
      icon: 'Code',
      image: '',
      features: JSON.stringify([
        'School Management Software',
        'Customer Relationship Management (CRM)',
        'Enterprise Resource Planning (ERP)',
        'Inventory Management Systems',
        'Booking & Reservation Systems',
        'Custom business automation',
      ]),
      order: 4,
    },
    {
      id: 'svc-hosting',
      title: 'Hosting & Domain',
      slug: 'hosting-domain',
      description: 'We provide reliable web hosting and domain registration services to ensure your online presence is always available. Our hosting packages come with SSL certificates, daily backups, and 99.9% uptime guarantee.',
      icon: 'Server',
      image: '',
      features: JSON.stringify([
        'Shared & VPS Hosting',
        'Domain Registration',
        'SSL Certificates',
        'Email Hosting',
        'Daily Backups',
        '24/7 Technical Support',
      ]),
      order: 5,
    },
  ];

  for (const s of services) {
    await db.service.upsert({
      where: { id: s.id },
      update: { title: s.title, description: s.description, features: s.features },
      create: s,
    });
  }
  console.log('✅ Services seeded');

  // ===== PROCESS STEPS =====
  const processSteps = [
    { id: 'proc-1', title: 'Initial Planning', description: 'The first order of business is to sit down with your team and create a detailed set of design and technical specifications. These specifications serve as a road-map for the rest of the web design process.', icon: 'ClipboardList', order: 0 },
    { id: 'proc-2', title: 'Wireframing', description: 'Wireframes are your first chance to visualize your website. While they\'re not nearly as detailed as the final site will be, they give us a visual representation of the site\'s overall layout.', icon: 'Layout', order: 1 },
    { id: 'proc-3', title: 'Mockups', description: 'Once all site wireframes are completed and approved, we\'ll proceed with site mockups. These add color and a bit more detail to the initial wireframes, giving us a stronger visual representation of the final product.', icon: 'Palette', order: 2 },
    { id: 'proc-4', title: 'Copy & Graphics', description: 'Our team will proceed to develop the graphical interface that represents the client on the web and the mechanisms through which the end user will navigate and interact with the site.', icon: 'PenTool', order: 3 },
    { id: 'proc-5', title: 'Development', description: 'At this stage, we will kick off the technical side of the web design process. This will include setting up your Content Management System, creating your custom theme and page designs, and setting up your website\'s analytics.', icon: 'Code', order: 4 },
    { id: 'proc-6', title: 'Testing', description: 'Once our writers, designers, and developers have finished their work, our team will get to work, testing your site\'s performance and reliability across all browsers and mobile devices.', icon: 'TestTube', order: 5 },
    { id: 'proc-7', title: 'Training & Documentation', description: 'We will work with you to ensure that your team fully understands how to use the content management system and are comfortable utilizing the system to its fullest capacity.', icon: 'BookOpen', order: 6 },
    { id: 'proc-8', title: 'Deployment & Optimization', description: 'Once we\'re sure that your site is ready to be released to the public, we will deploy it on your public domain and continue to optimize for peak performance.', icon: 'Rocket', order: 7 },
  ];

  for (const p of processSteps) {
    await db.processStep.upsert({
      where: { id: p.id },
      update: { title: p.title, description: p.description, active: false },
      create: p,
    });
  }
  console.log('✅ Process steps seeded');

  // ===== TEAM MEMBERS =====
  // Only confirmed Lightworld leadership is activated publicly.
  const teamMembers = [
    {
      id: 'leadership-christian-agbotah',
      name: 'Christian Agbotah',
      role: 'CEO & Director',
      bio: 'Leads the company and its technology direction, product vision, engineering standards and long-term growth.',
      image: '',
      email: '',
      linkedin: '',
      twitter: '',
      order: 0,
      active: true,
    },
    {
      id: 'leadership-rober-yaw-essuon',
      name: 'Rober Yaw Essuon',
      role: 'Managing Director',
      bio: 'Leads management and business execution, helping translate company strategy into coordinated delivery and operations.',
      image: '',
      email: '',
      linkedin: '',
      twitter: '',
      order: 1,
      active: true,
    },
  ];

  for (const t of teamMembers) {
    await db.teamMember.upsert({
      where: { id: t.id },
      update: { name: t.name, role: t.role, bio: t.bio, order: t.order, active: true },
      create: t,
    });
  }
  console.log('✅ Confirmed leadership seeded');

  // ===== TESTIMONIALS =====
  const testimonials = [
    { id: 'test-1', name: 'Rev. Samuel Owusu', company: 'Grace Tabernacle Church', role: 'Senior Pastor', content: 'Lightworld Technologies transformed our online presence completely. Our church website now allows members to access sermons, make donations, and stay connected. The team was professional and delivered beyond our expectations.', image: '', rating: 5, order: 0, active: false },
    { id: 'test-2', name: 'Beatrice Ofori', company: 'EduPrime Academy', role: 'Director', content: 'The school management system they built for us has streamlined our operations significantly. From student enrollment to grade management, everything is now automated and efficient. Highly recommended!', image: '', rating: 5, order: 1, active: false },
    { id: 'test-3', name: 'Kwabena Danso', company: 'FreshBite Restaurant', role: 'Owner', content: 'Our e-commerce food ordering system is amazing! Customers can now browse our menu, place orders, and pay online. Our revenue has increased by 40% since launching the new platform.', image: '', rating: 5, order: 2, active: false },
    { id: 'test-4', name: 'Ama Boateng', company: 'Premier Hotels', role: 'General Manager', content: 'The booking system developed by Lightworld Technologies has made our operations seamless. Guests can book rooms, check amenities, and make payments online. Excellent service and support!', image: '', rating: 5, order: 3, active: false },
  ];

  for (const t of testimonials) {
    await db.testimonial.upsert({
      where: { id: t.id },
      update: { name: t.name, content: t.content, active: false },
      create: t,
    });
  }
  console.log('✅ Testimonials seeded');

  // ===== BLOG CATEGORIES =====
  const categories = [
    { id: 'cat-1', name: 'Technology', slug: 'technology', description: 'Latest trends and insights in technology' },
    { id: 'cat-2', name: 'Web Development', slug: 'web-development', description: 'Tips and guides for web development' },
    { id: 'cat-3', name: 'Business', slug: 'business', description: 'Business growth and digital transformation' },
    { id: 'cat-4', name: 'Design', slug: 'design', description: 'UI/UX design best practices' },
    { id: 'cat-5', name: 'Mobile Apps', slug: 'mobile-apps', description: 'Mobile app development insights' },
  ];

  for (const c of categories) {
    await db.blogCategory.upsert({
      where: { id: c.id },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }
  console.log('✅ Blog categories seeded');

  // ===== BLOG POSTS =====
  const blogPosts = [
    {
      id: 'post-1',
      title: 'What Production-Ready Business Software Should Include',
      slug: 'production-ready-business-software-checklist',
      excerpt: 'A practical checklist for moving beyond a working demo to software a real business can operate, support, secure, and improve.',
      content: `## Production-ready is more than “it works”

A business application can look complete while still missing the things that make it dependable in daily operations. Production readiness is about what happens when real users, real data, permissions, failures, and change enter the picture.

### Start with clear user roles

Different users should see and do only what their responsibilities require. Good access control makes the system easier to use and reduces avoidable risk.

A useful starting point is to define:

- who can create, review, approve, and close work
- which records are restricted by team, department, branch, or client
- which actions require a second approval
- what administrators can configure without changing code

### Make important actions traceable

When a system affects money, inventory, assets, students, customers, or staff, the business should be able to understand what changed and why.

That usually means keeping reliable timestamps, actors, status history, approvals, and audit records for sensitive operations.

### Design for failure and recovery

Production software should assume that networks fail, users retry actions, integrations time out, and servers occasionally need to be restored.

Important safeguards can include:

- idempotent operations for critical submissions
- backups with a tested restore procedure
- useful error messages and retry paths
- monitoring for failed jobs and integrations
- controlled deployment and rollback procedures

### Treat security as part of the architecture

Authentication is only one layer. Production systems also need authorization, safe secrets management, input validation, secure session handling, dependency maintenance, and clear administrative boundaries.

### Keep the operating team in mind

Documentation, support workflows, configuration screens, logs, and handover material are part of the product. They reduce dependence on individual developers and help the business keep moving.

## The practical test

A useful question is not simply “Can the application perform the happy path?”

Ask instead: **Can the organization safely operate this system every day, understand what happened when something goes wrong, and continue improving it without rebuilding everything?**

That is the standard we use when shaping production systems at Lightworld Technologies.`,
      coverImage: '/images/portfolio/erp-system.png',
      author: 'Lightworld Technologies',
      published: true,
      featured: true,
      readTime: 6,
      categoryId: 'cat-1',
    },
    {
      id: 'post-2',
      title: 'Mobile-First Does Not Mean Mobile-Only',
      slug: 'mobile-first-digital-products-africa',
      excerpt: 'How to design digital products for mobile-heavy usage without making desktop, tablet, accessibility, and operational workflows an afterthought.',
      content: `## Start with the device people actually have

For many services, the phone is the first and most frequent digital touchpoint. That should influence navigation, form design, content density, performance, and how much typing a task requires.

But mobile-first should not become mobile-only.

### Different jobs need different surfaces

A customer may register on a phone while an accountant reviews the same transaction on a desktop. A technician may update a work order in the field while a supervisor analyses performance on a larger screen.

The product should preserve the same underlying workflow while adapting the interface to the job.

### Design for interruption

Mobile users are frequently interrupted. Forms should preserve progress where practical, actions should provide clear feedback, and long workflows should be broken into understandable steps.

### Connectivity is a product decision

Where connectivity can be unreliable, teams should decide deliberately which actions can be cached, retried, queued, or completed offline. Not every product needs full offline support, but every product should have a considered failure experience.

### Keep touch targets and content priorities clear

Small screens punish clutter. Prioritize the information needed for the current decision, use comfortable touch targets, and avoid shrinking desktop layouts until they technically fit.

### Desktop still matters

Administration, reporting, bulk data work, configuration, and complex comparison often benefit from larger screens. Responsive design should take advantage of that space rather than stretching a mobile card across a wide monitor.

## One product, multiple working contexts

The strongest mobile-first systems are not separate “mobile” and “desktop” products. They are one coherent service that respects the context of each device and user role.`,
      coverImage: '/images/hero-slide-4.png',
      author: 'Lightworld Technologies',
      published: true,
      featured: false,
      readTime: 5,
      categoryId: 'cat-5',
    },
    {
      id: 'post-3',
      title: 'When Custom Software Makes More Sense Than Another Spreadsheet',
      slug: 'when-to-build-custom-business-software',
      excerpt: 'A practical way to decide when spreadsheets and disconnected tools have become an operational constraint rather than a convenience.',
      content: `## Spreadsheets are excellent tools—until they become the system

A spreadsheet is often the fastest way to start a process. It is flexible, familiar, and easy to change. The problem begins when a growing operation depends on many copies, manual approvals, private formulas, and people remembering what to do next.

### Warning signs that the workflow has outgrown the tool

Custom software becomes worth considering when several of these are true:

- multiple people edit the same operational data
- approvals are handled through calls or chat messages
- teams cannot easily tell which record is current
- the same information is typed into several systems
- access should differ by role or department
- audit history matters
- reporting takes hours of manual consolidation
- missed reminders or handovers create real cost

### Do not automate a broken process blindly

Before building software, map the workflow. Identify the real decisions, handoffs, exceptions, and information people need. Sometimes the best first improvement is to simplify the process rather than digitize every existing step.

### Build around outcomes

A useful custom system should reduce friction, improve visibility, make accountability clearer, and create reliable data for future decisions.

It should also integrate where appropriate. Replacing every existing tool is rarely necessary.

### Start with the highest-value slice

Large transformation projects become easier to control when they begin with one meaningful vertical workflow and expand after users validate it.

## The decision is operational, not fashionable

The reason to build custom software is not that custom software sounds more advanced. It is that the current way of working is creating enough cost, risk, delay, or lost visibility that a purpose-built system has a clear job to do.`,
      coverImage: '/images/services-showcase.png',
      author: 'Lightworld Technologies',
      published: true,
      featured: false,
      readTime: 6,
      categoryId: 'cat-3',
    },
    {
      id: 'post-4',
      title: 'A Practical Starting Point for AI Automation in Business',
      slug: 'practical-ai-automation-business',
      excerpt: 'Start AI adoption with a bounded workflow, clear human controls, and measurable value instead of adding an assistant to every screen.',
      content: `## Start with a workflow, not with “AI”

The most useful AI projects usually begin with a repetitive information problem: people spend too much time finding, summarizing, classifying, drafting, or checking something.

That gives the technology a specific job.

### Choose a bounded first use case

Good early candidates have:

- information that can be accessed legitimately
- a clear input and expected output
- a human who can verify important results
- enough repetition for saved time to matter
- a failure mode the business can tolerate and manage

### Keep people in control where consequences matter

AI can assist with recommendations, drafts, summaries, and prioritization while humans retain approval for consequential actions.

The interface should make it obvious what the system generated, what source material informed it when available, and what the user is expected to review.

### Measure usefulness, not novelty

Useful measures might include time saved, response consistency, reduction in repetitive work, or faster access to internal knowledge.

If a workflow is not becoming meaningfully better, adding more AI features is unlikely to fix the underlying problem.

### Protect business information

Access controls, data retention, provider terms, sensitive information, and auditability should be considered before connecting an AI feature to internal data.

### Design the fallback

Users need a clear path when the model is uncertain, unavailable, or wrong. Good AI UX includes graceful failure rather than pretending confidence.

## Build trust through useful constraints

AI automation is strongest when it has a clearly defined role inside a well-designed process. Start narrow, measure the value, keep human controls visible, and expand only when the workflow earns that expansion.`,
      coverImage: '/images/hero-slide-2.png',
      author: 'Lightworld Technologies',
      published: true,
      featured: true,
      readTime: 5,
      categoryId: 'cat-1',
    },
  ];

  for (const p of blogPosts) {
    await db.blogPost.upsert({
      where: { id: p.id },
      update: { title: p.title, slug: p.slug, excerpt: p.excerpt, content: p.content, coverImage: p.coverImage, author: p.author, readTime: p.readTime, categoryId: p.categoryId, published: p.published, featured: p.featured },
      create: p,
    });
  }
  console.log('✅ Blog posts seeded');

  // ===== PORTFOLIO PROJECTS =====
  const portfolioProjects = [
    { id: 'port-1', title: 'Grace Tabernacle Church Website', description: 'Complete church website with live streaming integration, sermon archive, donation system, and member portal.', image: '', url: '', category: 'Church', technologies: JSON.stringify(['Next.js', 'Node.js', 'PostgreSQL', 'Stripe']), featured: true, order: 0, active: false },
    { id: 'port-2', title: 'EduPrime School Management System', description: 'Comprehensive school management system for a K-12 institution with student records, grade management, and parent communication.', image: '', url: '', category: 'Education', technologies: JSON.stringify(['React', 'Python', 'MySQL']), featured: true, order: 1, active: false },
    { id: 'port-3', title: 'FreshBite Food Ordering Platform', description: 'E-commerce food ordering and delivery platform with real-time order tracking and payment integration.', image: '', url: '', category: 'E-Commerce', technologies: JSON.stringify(['Next.js', 'Node.js', 'MongoDB', 'Paystack']), featured: true, order: 2, active: false },
    { id: 'port-4', title: 'Premier Hotels Booking System', description: 'Hotel booking and management system with room availability calendar, online payments, and guest management.', image: '', url: '', category: 'Hospitality', technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL']), featured: false, order: 3, active: false },
    { id: 'port-5', title: 'SecureGuard Security Management', description: 'Security company management system with guard scheduling, incident reporting, and client portal.', image: '', url: '', category: 'Security', technologies: JSON.stringify(['React', 'Node.js', 'MongoDB']), featured: false, order: 4, active: false },
    { id: 'port-6', title: 'MediCare Health Portal', description: 'Healthcare portal for patient record management, appointment scheduling, and telemedicine integration.', image: '', url: '', category: 'Healthcare', technologies: JSON.stringify(['Next.js', 'Python', 'PostgreSQL']), featured: true, order: 5, active: false },
  ];

  for (const p of portfolioProjects) {
    await db.portfolioProject.upsert({
      where: { id: p.id },
      update: { title: p.title, description: p.description },
      create: p,
    });
  }
  console.log('✅ Portfolio projects seeded');

  // ===== FAQ =====
  const faqs = [
    { id: 'faq-1', question: 'How long does it take to build a website?', answer: 'The timeline for building a website depends on its complexity. A basic website typically takes 2-4 weeks, while more complex projects with custom features can take 6-12 weeks. We provide a detailed timeline during the initial planning phase.', order: 0 },
    { id: 'faq-2', question: 'Do you provide website maintenance and support?', answer: 'Yes, we offer ongoing website maintenance and support packages. This includes regular updates, security monitoring, backup management, content updates, and technical support to ensure your website runs smoothly.', order: 1 },
    { id: 'faq-3', question: 'What technologies do you use for web development?', answer: 'We use the latest and most reliable technologies including Next.js, React, Node.js, TypeScript, and various databases depending on the project requirements. We choose the best technology stack for each specific project.', order: 2 },
    { id: 'faq-4', question: 'Can you help with existing website redesign?', answer: 'Absolutely! We specialize in website redesign and modernization. Whether your current site is outdated, slow, or not mobile-friendly, we can transform it into a modern, high-performing website that meets current standards.', order: 3 },
    { id: 'faq-5', question: 'Do you offer payment plans for projects?', answer: 'Yes, we understand that different projects have different budgets. We offer flexible payment plans and can discuss terms that work for both parties. Typically, we work with a 50% upfront deposit and the remaining balance upon completion.', order: 4 },
    { id: 'faq-6', question: 'Do you provide training on how to manage the website?', answer: 'Yes, we provide comprehensive training and documentation for all our clients. This ensures that your team can confidently manage content, update pages, and handle basic maintenance tasks using the Content Management System.', order: 5 },
  ];

  for (const f of faqs) {
    await db.fAQ.upsert({
      where: { id: f.id },
      update: { question: f.question, answer: f.answer },
      create: f,
    });
  }
  console.log('✅ FAQs seeded');

  // ===== ADMIN ACCOUNT =====
  const adminSeedPassword =
    process.env.ADMIN_SEED_PASSWORD ||
    (process.env.NODE_ENV !== 'production' ? 'admin123' : undefined);

  if (!adminSeedPassword) {
    throw new Error('ADMIN_SEED_PASSWORD is required when seeding in production');
  }

  await db.admin.upsert({
    where: { email: 'admin@lightworldtech.com' },
    update: {},
    create: {
      email: 'admin@lightworldtech.com',
      password: hashSeedPassword(adminSeedPassword),
      name: 'System Admin',
      role: 'admin',
    },
  });
  console.log('✅ Admin account seeded');

  console.log('\n🎉 Database seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
