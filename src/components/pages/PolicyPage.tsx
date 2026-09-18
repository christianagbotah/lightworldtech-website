import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';

export type PolicySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export default function PolicyPage({
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  related = true,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: PolicySection[];
  related?: boolean;
}) {
  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="container-main py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" />
              {eyebrow}
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
              {intro}
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/35">
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                Last updated {lastUpdated}
              </span>
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                Lightworld Technologies Ltd · Accra, Ghana
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-14">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[24px] border border-slate-200/70 bg-white p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/25">On this page</p>
              <nav className="mt-3 space-y-1" aria-label="Policy sections">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={'#' + section.id}
                    className="block rounded-xl px-2.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-emerald-700 dark:text-white/40 dark:hover:bg-white/[0.04] dark:hover:text-emerald-300"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {sections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-28 rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8"
              >
                <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-7 text-slate-600 dark:text-white/42 sm:text-base">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-slate-600 dark:text-white/42 sm:text-base">
                        <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}

            <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/[0.06] p-6 dark:bg-emerald-300/[0.04] sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <LockKeyhole className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">Questions about privacy, data or these terms?</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/42">
                    Contact Lightworld Technologies Ltd at{' '}
                    <a className="font-medium text-emerald-700 hover:underline dark:text-emerald-300" href="mailto:mail@lightworldtech.com">
                      mail@lightworldtech.com
                    </a>{' '}
                    or +233 (024) 361 8186.
                  </p>
                </div>
              </div>
            </div>

            {related && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Privacy', '/privacy', ShieldCheck],
                  ['Cookies', '/cookies', FileText],
                  ['Terms', '/terms', FileText],
                  ['Trust', '/trust', LockKeyhole],
                ].map(([label, href, Icon]) => {
                  const LinkIcon = Icon as typeof ShieldCheck;
                  return (
                    <Link
                      key={String(href)}
                      href={String(href)}
                      className="group flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-4 text-sm font-semibold transition hover:border-emerald-300 dark:border-white/[0.07] dark:bg-white/[0.025]"
                    >
                      <span className="flex items-center gap-2">
                        <LinkIcon className="size-4 text-emerald-500" />
                        {String(label)}
                      </span>
                      <ArrowUpRight className="size-3.5 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
