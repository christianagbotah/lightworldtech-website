import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PolicyPage, { type PolicySection } from '@/components/pages/PolicyPage';

export const metadata: Metadata = {
  title: 'Website Terms of Use',
  description: 'Terms governing use of lightworldtech.com and inquiries submitted to Lightworld Technologies Ltd.',
  alternates: { canonical: '/terms' },
};

const sections: PolicySection[] = [
  {
    id: 'scope',
    title: 'Scope of these terms',
    paragraphs: [
      'These terms govern use of the public Lightworld Technologies Ltd website and its general information, contact, newsletter and assistant features. By using the site, you agree to use it lawfully and consistently with these terms.',
      'Client software projects, training engagements, hosting services and other paid work are governed by the proposal, statement of work, service agreement, invoice terms or other written agreement applicable to that engagement. If those commercial terms conflict with these website terms, the specific written engagement terms take priority for that engagement.',
    ],
  },
  {
    id: 'information-not-offer',
    title: 'Website information and project inquiries',
    paragraphs: [
      'Website descriptions are general information about Lightworld’s capabilities and do not by themselves create a binding offer, quotation, service level, delivery date or warranty.',
      'Sending a contact form, assistant-generated project brief, email or other inquiry does not by itself create a client contract. A project becomes binding only when the parties agree the applicable commercial terms through an appropriate written or electronic agreement.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    bullets: [
      'Do not attempt to gain unauthorized access to the website, CMS, servers, accounts or connected systems.',
      'Do not submit malware, harmful code, automated abuse, fraudulent information or content that violates applicable law or third-party rights.',
      'Do not interfere with site availability, security controls, rate limits or normal operation.',
      'Do not use the assistant or forms to harass, impersonate, deceive or unlawfully collect information about others.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    paragraphs: [
      'Unless otherwise stated, the Lightworld name, site design, original copy, graphics, code, product concepts and other website materials are owned by or licensed to Lightworld Technologies Ltd. Viewing the site does not transfer ownership or grant a right to reproduce, sell or commercially exploit those materials.',
      'Client deliverables and third-party materials are subject to the intellectual-property terms agreed for the relevant engagement or the rights of their respective owners.',
    ],
  },
  {
    id: 'third-party-links',
    title: 'Third-party links and services',
    paragraphs: [
      'The website may link to award publishers, media organizations, social networks, messaging services or other third-party sites. Those services operate under their own terms and privacy practices. A link does not mean Lightworld controls or guarantees the third-party service.',
    ],
  },
  {
    id: 'assistant',
    title: 'Website assistant',
    paragraphs: [
      'The Lightworld Assistant is intended to help visitors navigate current company information and shape an initial project brief. It is not a substitute for a signed proposal, professional legal advice, or a final technical assessment.',
      'For a project, pricing, scope or delivery commitment, rely on the written proposal or agreement issued by Lightworld rather than a conversational assistant response.',
    ],
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    paragraphs: [
      'We aim to keep the website useful and available, but access may be interrupted for maintenance, security, infrastructure issues or circumstances outside our reasonable control. We may change, suspend or retire website features when appropriate.',
    ],
  },
  {
    id: 'disclaimers',
    title: 'Reasonable disclaimers',
    paragraphs: [
      'We take care in publishing company information, but the public website is provided on an “as available” basis and may occasionally contain errors or become outdated between updates. Nothing here limits rights or responsibilities that cannot lawfully be excluded.',
    ],
  },
  {
    id: 'liability',
    title: 'Liability',
    paragraphs: [
      'To the extent permitted by applicable law, Lightworld is not responsible for indirect or consequential loss arising solely from reliance on general website information or from third-party sites linked from this website. Any liability relating to paid services is governed primarily by the applicable client agreement.',
    ],
  },
  {
    id: 'electronic-communications',
    title: 'Electronic communications',
    paragraphs: [
      'You agree that communications relating to website inquiries may take place electronically, including by email or through digital documents. Ghana’s Electronic Transactions Act, 2008 (Act 772), as amended, provides the legal framework for electronic communications and transactions, subject to its scope and exclusions.',
    ],
  },
  {
    id: 'law',
    title: 'Governing law',
    paragraphs: [
      'These website terms are governed by the laws of the Republic of Ghana. Unless a separate written agreement provides another lawful dispute process, disputes relating specifically to these website terms are subject to the competent courts of Ghana.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    paragraphs: [
      'We may revise these terms when the website, services or applicable requirements change. The current published version applies from the last-updated date shown above.',
    ],
  },
];

export default function TermsPage() {
  return (
    <PublicShell>
      <PolicyPage
        eyebrow="Website terms"
        title="Clear terms for a useful website."
        intro="These terms explain the ground rules for using lightworldtech.com, submitting an inquiry and interacting with the Lightworld Assistant."
        lastUpdated="18 September 2026"
        sections={sections}
      />
    </PublicShell>
  );
}
