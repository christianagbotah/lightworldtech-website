import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PolicyPage, { type PolicySection } from '@/components/pages/PolicyPage';

export const metadata: Metadata = {
  title: 'Cookie & Browser Storage Policy',
  description: 'How Lightworld Technologies Ltd uses cookies, local storage, session storage and consented first-party analytics.',
  alternates: { canonical: '/cookies' },
};

const sections: PolicySection[] = [
  {
    id: 'what-this-covers',
    title: 'What this policy covers',
    paragraphs: [
      'This website uses cookies and similar browser technologies such as local storage and session storage. Some storage is necessary for website features to work; optional analytics storage is used only when you allow it.',
      'The current Next.js website does not run an advertising or cross-site marketing tracker. The marketing preference is therefore kept inactive.',
    ],
  },
  {
    id: 'essential',
    title: 'Essential storage',
    paragraphs: [
      'Essential storage supports security, consent records and core website operation. It cannot be switched off through the privacy panel where it is required for a requested website function.',
    ],
    bullets: [
      'lw-cookie-consent records that a consent choice was made.',
      'lw-cookie-preferences stores the categories you selected.',
      'Administrative session cookies protect authenticated CMS access for authorized staff.',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics storage',
    paragraphs: [
      'Analytics is optional and off until you allow it. When enabled, Lightworld uses a first-party anonymous session identifier and records page views and selected engagement events so the team can understand how the website is used.',
      'The analytics implementation is designed not to store raw IP addresses, email addresses or browser fingerprints in the analytics event table. A browser Do Not Track signal is also respected by the client tracker.',
    ],
    bullets: [
      'lw-analytics-session is a random identifier stored for the browser session.',
      'lw-analytics-session-started prevents duplicate session-start events during the same session.',
    ],
  },
  {
    id: 'preferences',
    title: 'Preference and session storage',
    paragraphs: [
      'Some browser storage helps preserve choices or complete a flow you started. These items do not by themselves create a marketing profile.',
    ],
    bullets: [
      'lw-chat-history keeps assistant messages in the current browser session so the chat can remain coherent while you browse.',
      'lw-assistant-state keeps the current project-scoping step in the browser session.',
      'lw-project-brief temporarily carries a completed project brief into the Contact page until you submit it or the browser session ends.',
      'Theme or interface preferences may be stored locally so the site can remember display choices.',
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing technologies',
    paragraphs: [
      'The current Next.js site does not activate an advertising or cross-site marketing tracker. If Lightworld introduces one in the future, this policy and the consent controls should be updated before that technology is enabled for visitors who have not consented.',
    ],
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    paragraphs: [
      'On your first visit, non-essential analytics and preference categories are not enabled by default. You can allow analytics, customize your choices or continue with essential storage only.',
      'After making a choice, use the cookie-settings button at the lower edge of the site to revisit your preferences. You can also clear site data through your browser settings.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this policy when website storage or analytics practices change. The published date at the top identifies the current version.',
    ],
  },
];

export default function CookiesPage() {
  return (
    <PublicShell>
      <PolicyPage
        eyebrow="Cookies & browser storage"
        title="Your choices come first."
        intro="Lightworld uses essential browser storage to operate the site and, only with your permission, first-party analytics to understand aggregate website use."
        lastUpdated="18 September 2026"
        sections={sections}
      />
    </PublicShell>
  );
}
