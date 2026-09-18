import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/layout/PublicShell';

export const metadata: Metadata = {
  title: 'Privacy & Cookie Notice',
  description: 'How Lightworld Technologies Ltd handles website data, contact information, newsletter subscriptions and optional first-party analytics.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: 'Information you choose to give us',
    body: [
      'When you send a project brief, contact us, join the newsletter, or apply for an opportunity, we process the information you submit so we can respond to that request and operate the relevant service.',
      'Depending on the form, this may include your name, email address, phone number, organization, project details, application information, and the content of your message.',
    ],
  },
  {
    title: 'Optional first-party analytics',
    body: [
      'If you allow Analytics in our privacy controls, Lightworld records limited first-party events so we can understand which pages are useful and how visitors move through the website.',
      'The analytics record contains a random browser-session identifier, event name, page path, referring domain and limited event metadata. The analytics database is designed not to store your raw IP address, email address, or a user-agent fingerprint.',
      'Analytics is optional. If you decline it, the public website and its essential features remain available.',
    ],
  },
  {
    title: 'Cookies and browser storage',
    body: [
      'Essential browser storage supports functions such as your privacy choice and temporary session state. Optional analytics storage is used only after Analytics is enabled.',
      'You can accept, decline, or customize optional categories from the privacy panel. You can reopen the panel later using the cookie-settings control on the website.',
      'Marketing storage is not required for the current first-party analytics feature. If advertising or third-party marketing integrations are introduced, they should remain subject to the privacy choice presented to you.',
    ],
  },
  {
    title: 'Why we process information',
    body: [
      'We use information to respond to enquiries, prepare and discuss project work, provide requested communications, operate and secure the website, understand consented website usage, improve our services, and meet applicable legal or operational obligations.',
    ],
  },
  {
    title: 'Sharing and service providers',
    body: [
      'We may use hosting, infrastructure, email, security and other operational service providers where needed to run the website and provide requested services. We do not describe analytics data as being sold to advertisers, and our first-party analytics implementation is designed to remain inside Lightworld’s website database.',
    ],
  },
  {
    title: 'Retention and security',
    body: [
      'We keep information for as long as reasonably necessary for the purpose for which it was collected, legitimate operational needs, security, dispute handling and applicable legal requirements. Retention can differ by record type.',
      'We use access controls and other technical and organizational safeguards intended to protect the information under our control. No internet service can promise absolute security.',
    ],
  },
  {
    title: 'Your choices and requests',
    body: [
      'You may contact us to ask about personal information we hold about you or to request an appropriate correction, access or deletion, subject to applicable law and records we may need to retain.',
      'For website analytics, you can change your optional privacy preferences from the cookie-settings control at any time.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">Privacy & cookies</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">Clear choices. Minimal data. Useful technology.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45">
              This notice explains how Lightworld Technologies Ltd handles information through lightworldtech.com. It was last updated on 18 September 2026.
            </p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-sm font-semibold">Lightworld Technologies Ltd</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/38">Accra, Ghana</p>
                <a href="mailto:mail@lightworldtech.com" className="mt-4 inline-block text-sm font-semibold text-emerald-700 dark:text-emerald-300">mail@lightworldtech.com</a>
                <p className="mt-6 text-xs leading-6 text-slate-400 dark:text-white/28">
                  Ghana’s Data Protection Act, 2012 (Act 843) establishes the national framework for the protection and processing of personal data. This page is a practical website notice and is not a substitute for legal advice.
                </p>
                <a href="https://dpc.gov.gh/" target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs font-semibold text-slate-600 underline underline-offset-4 dark:text-white/55">
                  Data Protection Commission
                </a>
              </div>
            </aside>

            <div className="space-y-4">
              {sections.map((section) => (
                <article key={section.title} className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">{section.title}</h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-white/42">
                    {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </article>
              ))}

              <article className="rounded-[28px] border border-emerald-500/15 bg-emerald-500/[0.07] p-6 sm:p-8">
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">Questions or privacy requests</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/42">
                  Email <a className="font-semibold text-emerald-700 dark:text-emerald-300" href="mailto:mail@lightworldtech.com">mail@lightworldtech.com</a> with enough information for us to understand your request. For general project enquiries, use the <Link href="/contact" className="font-semibold text-emerald-700 dark:text-emerald-300">Contact page</Link>.
                </p>
              </article>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
