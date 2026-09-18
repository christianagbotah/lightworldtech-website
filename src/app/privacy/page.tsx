import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PolicyPage, { type PolicySection } from '@/components/pages/PolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Lightworld Technologies Ltd collects, uses, protects and manages personal information on lightworldtech.com.',
  alternates: { canonical: '/privacy' },
};

const sections: PolicySection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    paragraphs: [
      'Lightworld Technologies Ltd is a Ghanaian technology company based in Accra. For personal information handled through this website, Lightworld Technologies Ltd is responsible for deciding why and how that information is processed.',
      'This notice describes the practices of lightworldtech.com and its public website features. Client projects and contracted services may have additional privacy terms, data-processing arrangements or notices that apply to those engagements.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    bullets: [
      'Contact and project inquiries: name, email address, optional phone number, service interest, subject and the message or project brief you submit.',
      'Newsletter subscriptions: the email address you provide and the status of your subscription.',
      'Company-assistant messages: the text you send is processed to generate a response. The public assistant does not currently create a server-side transcript history; browser session storage may keep chat history for your current session.',
      'Consented first-party analytics: an anonymous session identifier, event type, page path, referrer domain and limited event metadata. The analytics table is designed without raw IP-address, email-address or browser-fingerprint fields.',
      'Administrative security information: authorized CMS administrators have separate authentication and session information used to protect the management area.',
    ],
  },
  {
    id: 'why-we-use-data',
    title: 'Why we use information',
    bullets: [
      'To respond to inquiries, understand project needs and communicate about requested services.',
      'To deliver newsletter updates that a subscriber requested and to manage opt-out choices.',
      'To operate, secure, diagnose and improve the website and its public features.',
      'When analytics permission is granted, to understand aggregate site usage, popular pages and interactions with the assistant or contact journey.',
      'To maintain business records, prevent abuse and meet applicable legal or regulatory obligations.',
    ],
  },
  {
    id: 'analytics-and-browser-storage',
    title: 'Analytics and browser storage',
    paragraphs: [
      'Non-essential analytics do not start until you allow Analytics in the website privacy controls. The analytics tracker also respects a browser Do Not Track signal when navigator.doNotTrack is set to “1”. You can change your choices using the cookie-settings control on the website.',
      'The site uses cookies and similar browser storage for choices and session features. The Cookie Policy explains the current storage keys and how the categories work.',
    ],
  },
  {
    id: 'assistant-and-project-scoping',
    title: 'Assistant and project scoping',
    paragraphs: [
      'The Lightworld Assistant uses current Lightworld CMS content to answer company questions and can guide you through a short project-scoping flow. The answers you enter during that flow may be stored in your browser session so that a completed brief can be carried into the Contact page.',
      'Submitting the prefilled Contact form is a separate action you control. Until you submit it, the project brief is not saved as a contact inquiry in the website database.',
    ],
  },
  {
    id: 'sharing-and-service-providers',
    title: 'Sharing and service providers',
    paragraphs: [
      'We do not sell personal information. We may use hosting, infrastructure, email, security or other technology providers where necessary to operate the website and communicate with you. Those providers may process information on our behalf subject to their service terms and appropriate safeguards.',
      'Information may also be disclosed where required by law, a lawful authority, or where reasonably necessary to protect the security, rights or property of Lightworld, our users or others.',
    ],
  },
  {
    id: 'international-processing',
    title: 'International processing',
    paragraphs: [
      'Some technology or infrastructure providers may process information outside Ghana. Where this is necessary, Lightworld seeks to use appropriate contractual, organizational and technical safeguards consistent with applicable data-protection requirements.',
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep information',
    paragraphs: [
      'We keep information only for as long as it is reasonably needed for the purpose for which it was collected, for legitimate business records, security, dispute handling or applicable legal requirements. Retention can differ by record type.',
      'Newsletter subscription records remain active until you unsubscribe or we otherwise deactivate them. Browser session data normally ends with the relevant browser session or when you clear site data.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We use reasonable technical and organizational controls appropriate to the website, including access controls, protected administrative sessions, deployment safeguards and server-side security measures. No internet service can promise absolute security, so we continuously treat security as an operational responsibility.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your data-protection rights',
    paragraphs: [
      'Under Ghana’s Data Protection Act, 2012 (Act 843), individuals have rights relating to the processing of their personal data. Depending on the circumstances, these include being informed, accessing personal data, requesting correction, objecting to certain processing, withdrawing consent where processing depends on consent, and making a complaint.',
      'To exercise a right in relation to this website, contact mail@lightworldtech.com with enough information for us to identify the relevant request. You may also raise a data-protection complaint with Ghana’s Data Protection Commission.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paragraphs: [
      'This corporate website is not designed to intentionally collect personal information directly from children. Lightworld may build education products for institutional clients, but data handling within those products is governed by the relevant client engagement and product-specific arrangements rather than this public website notice.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this notice',
    paragraphs: [
      'We may update this Privacy Policy when the website, our practices or applicable requirements change. The date at the top of this page identifies the current published version.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicShell>
      <PolicyPage
        eyebrow="Privacy & data protection"
        title="Privacy should be understandable."
        intro="This policy explains what information Lightworld Technologies Ltd handles through this website, why we use it, the choices available to you, and how to contact us about your data."
        lastUpdated="18 September 2026"
        sections={sections}
      />
    </PublicShell>
  );
}
