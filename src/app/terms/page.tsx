import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/layout/PublicShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Website Terms',
  description: 'Website terms for lightworldtech.com, operated by Lightworld Technologies Ltd.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">Website terms</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">Terms for using the Lightworld website.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45">Last updated 18 September 2026.</p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main max-w-4xl space-y-4">
            {[
              ['Purpose of this website', 'lightworldtech.com presents information about Lightworld Technologies Ltd, its capabilities, products, public content, career opportunities and ways to contact the company. Website content is general information unless a separate written agreement says otherwise.'],
              ['Project discussions and quotations', 'Submitting a contact form, using the assistant, discussing a project or receiving an initial scope does not by itself create a contract or guarantee a particular price, delivery date or outcome. Commercial commitments are established through the applicable proposal, statement of work, contract or other written agreement.'],
              ['Website assistant', 'The Lightworld Assistant is intended to help visitors navigate public company information and prepare an initial project brief. Its project-scoping output is a starting point for discussion and may require validation by the Lightworld team.'],
              ['Intellectual property', 'Unless otherwise stated, the website’s original branding, interface, copy, graphics and software are owned by or licensed to Lightworld Technologies Ltd. You may view and use the site for its intended purpose, but you may not present Lightworld material as your own or misuse the site in a way that infringes applicable rights.'],
              ['Acceptable use', 'Do not attempt to disrupt the website, bypass access controls, misuse public forms or APIs, introduce malicious code, scrape the service in a way that harms availability, or use the site for unlawful activity. We may restrict abusive traffic to protect the service and other visitors.'],
              ['External links', 'The website may link to third-party services, publications, social platforms and award or press sources. A link does not make Lightworld responsible for a third party’s availability, security, content or privacy practices.'],
              ['Availability and changes', 'We work to keep the website accurate and available, but features may change and temporary interruption can occur. Public descriptions of services, research directions and products can also change as the company develops them.'],
              ['Liability', 'To the extent permitted by applicable law, the public website is provided for general informational and communication purposes. Project-specific warranties, responsibilities and remedies are governed by the written agreement for that engagement rather than by this public page.'],
              ['Privacy', 'Use of personal information through this website is described in our Privacy & Cookie Notice.'],
              ['Contact', 'Questions about these website terms can be sent to mail@lightworldtech.com.'],
            ].map(([title, body]) => (
              <article key={title} className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-white/42">{body}</p>
                {title === 'Privacy' && <Link href="/privacy" className="mt-4 inline-block text-sm font-semibold text-emerald-700 dark:text-emerald-300">Read the Privacy & Cookie Notice</Link>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
