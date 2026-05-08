import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // ===== SITE SETTINGS =====
  const settings = [
    // General
    { key: 'company_name', value: 'Lightworld Technologies Limited', type: 'text', group: 'general' },
    { key: 'company_tagline', value: 'The World of Possibilities', type: 'text', group: 'general' },
    { key: 'company_description', value: 'We are a leading IT solutions company providing cutting-edge software development, web development, mobile app development, and digital marketing services to businesses across Africa and beyond.', type: 'richText', group: 'general' },
    { key: 'company_address', value: 'Accra, Ghana', type: 'text', group: 'contact' },
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
    { key: 'about_description', value: 'Lightworld Technologies Limited is a dynamic and innovative IT solutions company based in Ghana. With a team of talented and skilled professionals, we are committed to delivering world-class technology solutions that transform businesses and drive growth.\n\nWe specialize in web development, mobile app development, software development, digital marketing, and IT training. Our mission is to bridge the technology gap and empower businesses with cutting-edge solutions that give them a competitive edge in the digital landscape.\n\nSince our establishment, we have served over 100 clients across various industries including education, healthcare, e-commerce, real estate, hospitality, and more. Our commitment to excellence and innovation has earned us recognition including the 2024 Business Excellence Award and the 2021 MEA Award.', type: 'richText', group: 'about' },
    { key: 'about_mission', value: 'To provide innovative, reliable, and cost-effective IT solutions that empower businesses and individuals to achieve their full potential in the digital age.', type: 'text', group: 'about' },
    { key: 'about_vision', value: 'To be the leading technology solutions provider in Africa, recognized globally for excellence, innovation, and transformative impact on businesses and communities.', type: 'text', group: 'about' },
    { key: 'about_values', value: '["Innovation","Excellence","Integrity","Client Satisfaction","Continuous Learning","Teamwork"]', type: 'json', group: 'about' },

    // SEO
    { key: 'seo_title', value: 'Lightworld Technologies Limited – The World of Possibilities', type: 'text', group: 'seo' },
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
      update: { title: p.title, description: p.description },
      create: p,
    });
  }
  console.log('✅ Process steps seeded');

  // ===== TEAM MEMBERS =====
  const teamMembers = [
    { id: 'team-1', name: 'Emmanuel Osei', role: 'Founder & CEO', bio: 'Visionary leader with over 10 years of experience in IT solutions and business development. Passionate about leveraging technology to transform businesses across Africa.', image: '', email: '', linkedin: '', twitter: '', order: 0 },
    { id: 'team-2', name: 'Kwame Asante', role: 'Lead Developer', bio: 'Full-stack developer with expertise in modern web technologies. Leads our development team in delivering robust and scalable solutions for our clients.', image: '', email: '', linkedin: '', twitter: '', order: 1 },
    { id: 'team-3', name: 'Abena Mensah', role: 'UI/UX Designer', bio: 'Creative designer with a keen eye for detail. Specializes in creating intuitive and visually stunning user interfaces that enhance user experience.', image: '', email: '', linkedin: '', twitter: '', order: 2 },
    { id: 'team-4', name: 'Kofi Amponsah', role: 'Digital Marketing Manager', bio: 'Digital marketing expert with a track record of driving growth through SEO, social media, and content marketing strategies.', image: '', email: '', linkedin: '', twitter: '', order: 3 },
  ];

  for (const t of teamMembers) {
    await db.teamMember.upsert({
      where: { id: t.id },
      update: { name: t.name, role: t.role, bio: t.bio },
      create: t,
    });
  }
  console.log('✅ Team members seeded');

  // ===== TESTIMONIALS =====
  const testimonials = [
    { id: 'test-1', name: 'Rev. Samuel Owusu', company: 'Grace Tabernacle Church', role: 'Senior Pastor', content: 'Lightworld Technologies transformed our online presence completely. Our church website now allows members to access sermons, make donations, and stay connected. The team was professional and delivered beyond our expectations.', image: '', rating: 5, order: 0 },
    { id: 'test-2', name: 'Beatrice Ofori', company: 'EduPrime Academy', role: 'Director', content: 'The school management system they built for us has streamlined our operations significantly. From student enrollment to grade management, everything is now automated and efficient. Highly recommended!', image: '', rating: 5, order: 1 },
    { id: 'test-3', name: 'Kwabena Danso', company: 'FreshBite Restaurant', role: 'Owner', content: 'Our e-commerce food ordering system is amazing! Customers can now browse our menu, place orders, and pay online. Our revenue has increased by 40% since launching the new platform.', image: '', rating: 5, order: 2 },
    { id: 'test-4', name: 'Ama Boateng', company: 'Premier Hotels', role: 'General Manager', content: 'The booking system developed by Lightworld Technologies has made our operations seamless. Guests can book rooms, check amenities, and make payments online. Excellent service and support!', image: '', rating: 5, order: 3 },
  ];

  for (const t of testimonials) {
    await db.testimonial.upsert({
      where: { id: t.id },
      update: { name: t.name, content: t.content },
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
      title: 'Why Every Business Needs a Professional Website in 2025',
      slug: 'why-every-business-needs-professional-website-2025',
      excerpt: 'In today\'s digital age, having a professional website is no longer a luxury but a necessity for businesses of all sizes. Discover why your business needs a strong online presence.',
      content: `## Why Every Business Needs a Professional Website in 2025

In today's fast-paced digital world, your website is often the first impression potential customers have of your business. A professional, well-designed website can be the difference between winning a new customer and losing them to a competitor.

### First Impressions Matter

Studies show that it takes users only **50 milliseconds** to form an opinion about your website. That means you have less than a second to make a positive impression. A professional website with a clean design, fast loading times, and intuitive navigation immediately builds trust and credibility.

### 24/7 Accessibility

Unlike a physical store, your website is accessible 24/7, allowing customers to learn about your products and services, make purchases, or contact you at any time. This around-the-clock availability can significantly increase your revenue potential.

### Improved Customer Engagement

A professional website provides multiple touchpoints for customer engagement:

- **Contact forms** for inquiries
- **Live chat** for immediate support
- **Blog posts** for sharing expertise
- **Social media integration** for community building

### SEO Benefits

Search engine optimization (SEO) is crucial for being found online. A professionally built website is optimized for search engines from the ground up, helping you rank higher in Google search results and attract more organic traffic.

### Competitive Advantage

Your competitors likely already have professional websites. If you don't, you're handing them potential customers on a silver platter. A professional website levels the playing field and can even give you an edge.

### Conclusion

Investing in a professional website is one of the smartest business decisions you can make in 2025. It's not just about having an online presence – it's about creating a powerful marketing tool that works for you around the clock.

Contact Lightworld Technologies today to get started with your professional website project.`,
      coverImage: '',
      author: 'Lightworld Technologies',
      published: true,
      featured: true,
      readTime: 5,
      categoryId: 'cat-3',
    },
    {
      id: 'post-2',
      title: 'The Complete Guide to Mobile App Development for Your Business',
      slug: 'complete-guide-mobile-app-development-business',
      excerpt: 'Learn everything you need to know about developing a mobile app for your business, from planning to launch and beyond.',
      content: `## The Complete Guide to Mobile App Development

Mobile apps have become an essential tool for businesses looking to engage customers and streamline operations. With over 6.8 billion smartphone users worldwide, the opportunity is immense.

### Why Your Business Needs a Mobile App

1. **Direct Marketing Channel** - Push notifications allow you to communicate directly with customers
2. **Customer Loyalty** - Apps create a more personal connection with your brand
3. **Brand Recognition** - Increased visibility through app store presence
4. **Revenue Growth** - In-app purchases and mobile commerce

### Planning Your App

Before development begins, consider:

- What problem does your app solve?
- Who is your target audience?
- What features are essential vs. nice-to-have?
- What is your budget and timeline?

### Choosing the Right Technology

- **Native Development** (iOS/Android) for best performance
- **Cross-Platform** (React Native/Flutter) for cost efficiency
- **Progressive Web Apps** for broad accessibility

### The Development Process

At Lightworld Technologies, we follow a structured approach:

1. **Discovery & Planning** - Understanding your needs
2. **UI/UX Design** - Creating intuitive interfaces
3. **Development** - Building robust applications
4. **Testing** - Ensuring quality and reliability
5. **Launch** - Deploying to app stores
6. **Maintenance** - Ongoing support and updates

Ready to build your mobile app? Contact us today!`,
      coverImage: '',
      author: 'Lightworld Technologies',
      published: true,
      featured: true,
      readTime: 7,
      categoryId: 'cat-5',
    },
    {
      id: 'post-3',
      title: 'Top 10 Web Development Trends to Watch in 2025',
      slug: 'top-10-web-development-trends-2025',
      excerpt: 'Stay ahead of the curve with these essential web development trends that are shaping the future of the internet.',
      content: `## Top 10 Web Development Trends in 2025

The web development landscape is constantly evolving. Here are the top trends you should watch:

### 1. AI-Powered Development
AI tools are revolutionizing how we build websites, from code generation to automated testing.

### 2. Progressive Web Apps (PWAs)
PWAs combine the best of web and mobile apps, offering offline functionality and push notifications.

### 3. Server-Side Rendering (SSR)
Frameworks like Next.js are making SSR the standard for better SEO and performance.

### 4. Motion UI
Interactive animations and micro-interactions enhance user engagement.

### 5. Voice Search Optimization
With the rise of voice assistants, optimizing for voice search is essential.

### 6. WebAssembly
Near-native performance for web applications using Wasm.

### 7. Dark Mode
User preference for dark mode continues to grow across platforms.

### 8. API-First Development
Building with APIs first ensures flexibility and scalability.

### 9. Cybersecurity Focus
Security-first development practices are becoming mandatory.

### 10. Edge Computing
Reducing latency by processing data closer to users.

Stay updated with the latest trends by following our blog!`,
      coverImage: '',
      author: 'Lightworld Technologies',
      published: true,
      featured: false,
      readTime: 6,
      categoryId: 'cat-2',
    },
    {
      id: 'post-4',
      title: 'How School Management Software Transforms Education in Ghana',
      slug: 'school-management-software-transforms-education-ghana',
      excerpt: 'Discover how digital school management systems are revolutionizing education administration in Ghana and across Africa.',
      content: `## How School Management Software Transforms Education

Education institutions in Ghana are embracing digital transformation through comprehensive school management software.

### Challenges in Traditional Education Management

- Manual record-keeping is time-consuming and error-prone
- Communication between teachers, parents, and administration is often delayed
- Tracking student performance and attendance is difficult
- Financial management lacks transparency

### How School Management Software Helps

**Student Information Management**
- Centralized student records
- Automated enrollment processes
- Digital report card generation

**Academic Management**
- Lesson planning tools
- Grade book automation
- Performance analytics and reporting

**Communication**
- Parent-teacher messaging
- School announcements and notifications
- Event management

**Financial Management**
- Fee tracking and invoicing
- Payment processing integration
- Financial reporting

### Lightworld Technologies Education Solutions

We specialize in developing school management systems tailored to the unique needs of educational institutions in Ghana. Our solutions include:

- Creche/Primary/JHS management modules
- SHS/Vocational school systems
- University and professional training setups

Contact us to learn more about our education solutions.`,
      coverImage: '',
      author: 'Lightworld Technologies',
      published: true,
      featured: true,
      readTime: 8,
      categoryId: 'cat-1',
    },
    {
      id: 'post-5',
      title: 'UI/UX Design Principles Every Business Owner Should Know',
      slug: 'ui-ux-design-principles-business-owners',
      excerpt: 'Understanding basic UI/UX design principles can help you make better decisions about your website and app projects.',
      content: `## UI/UX Design Principles for Business Owners

Good design is good business. Understanding these principles will help you create better digital products.

### 1. Simplicity is Key
The best designs are simple and intuitive. Avoid cluttering your interface with unnecessary elements.

### 2. Consistency Matters
Maintain consistent colors, fonts, and layouts throughout your digital presence.

### 3. Mobile-First Design
With most users accessing the web via mobile devices, design for mobile first, then scale up.

### 4. Accessibility
Ensure your designs are usable by people with disabilities. This isn't just good practice - it's the law in many jurisdictions.

### 5. Visual Hierarchy
Guide users' attention to the most important elements through size, color, and positioning.

### 6. Loading Speed
Users expect fast-loading websites. Optimize images, use caching, and minimize code.

### 7. Clear Calls-to-Action
Every page should have a clear next step for the user.

### 8. Feedback
Provide visual and interactive feedback for user actions.

### Why Partner with Lightworld Technologies

Our design team combines aesthetics with functionality to create digital experiences that drive results.`,
      coverImage: '',
      author: 'Lightworld Technologies',
      published: true,
      featured: false,
      readTime: 5,
      categoryId: 'cat-4',
    },
    {
      id: 'post-6',
      title: 'SEO Strategies to Grow Your Business Online in Ghana',
      slug: 'seo-strategies-grow-business-online-ghana',
      excerpt: 'Learn effective SEO strategies specifically tailored for businesses operating in Ghana and the West African market.',
      content: `## SEO Strategies for Ghanaian Businesses

Search Engine Optimization is crucial for businesses looking to grow their online presence in Ghana.

### Local SEO Essentials

- **Google My Business** - Claim and optimize your listing
- **Local Keywords** - Target location-specific search terms
- **Local Citations** - Ensure your business info is consistent across directories

### On-Page Optimization

- Keyword research and implementation
- Meta tags and descriptions
- Header tag optimization
- Image optimization with alt tags
- Internal linking strategy

### Content Marketing

- Create valuable, locally relevant content
- Start a blog addressing local pain points
- Use Ghana-specific case studies and examples
- Leverage local events and news

### Technical SEO

- Mobile responsiveness
- Page speed optimization
- SSL certificates
- Schema markup
- XML sitemaps

### Why SEO Matters for Ghanaian Businesses

With increasing internet penetration and digital adoption in Ghana, businesses that invest in SEO gain a significant competitive advantage.

At Lightworld Technologies, we offer comprehensive SEO services tailored to the Ghanaian market. Contact us to boost your online visibility!`,
      coverImage: '',
      author: 'Lightworld Technologies',
      published: true,
      featured: false,
      readTime: 6,
      categoryId: 'cat-3',
    },
  ];

  for (const p of blogPosts) {
    await db.blogPost.upsert({
      where: { id: p.id },
      update: { title: p.title, slug: p.slug, content: p.content, published: p.published, featured: p.featured },
      create: p,
    });
  }
  console.log('✅ Blog posts seeded');

  // ===== PORTFOLIO PROJECTS =====
  const portfolioProjects = [
    { id: 'port-1', title: 'Grace Tabernacle Church Website', description: 'Complete church website with live streaming integration, sermon archive, donation system, and member portal.', image: '', url: '', category: 'Church', technologies: JSON.stringify(['Next.js', 'Node.js', 'PostgreSQL', 'Stripe']), featured: true, order: 0 },
    { id: 'port-2', title: 'EduPrime School Management System', description: 'Comprehensive school management system for a K-12 institution with student records, grade management, and parent communication.', image: '', url: '', category: 'Education', technologies: JSON.stringify(['React', 'Python', 'MySQL']), featured: true, order: 1 },
    { id: 'port-3', title: 'FreshBite Food Ordering Platform', description: 'E-commerce food ordering and delivery platform with real-time order tracking and payment integration.', image: '', url: '', category: 'E-Commerce', technologies: JSON.stringify(['Next.js', 'Node.js', 'MongoDB', 'Paystack']), featured: true, order: 2 },
    { id: 'port-4', title: 'Premier Hotels Booking System', description: 'Hotel booking and management system with room availability calendar, online payments, and guest management.', image: '', url: '', category: 'Hospitality', technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL']), featured: false, order: 3 },
    { id: 'port-5', title: 'SecureGuard Security Management', description: 'Security company management system with guard scheduling, incident reporting, and client portal.', image: '', url: '', category: 'Security', technologies: JSON.stringify(['React', 'Node.js', 'MongoDB']), featured: false, order: 4 },
    { id: 'port-6', title: 'MediCare Health Portal', description: 'Healthcare portal for patient record management, appointment scheduling, and telemedicine integration.', image: '', url: '', category: 'Healthcare', technologies: JSON.stringify(['Next.js', 'Python', 'PostgreSQL']), featured: true, order: 5 },
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
  await db.admin.upsert({
    where: { email: 'admin@lightworldtech.com' },
    update: {},
    create: {
      email: 'admin@lightworldtech.com',
      password: 'admin123', // In production, this should be hashed
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
