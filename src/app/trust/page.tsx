import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Eye,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';

export const metadata: Metadata = {
  title: 'Trust & Privacy',
  description: 'How Lightworld Technologies Ltd approaches website privacy, security, analytics and responsible data handling.',
  alternates: { canonical: '/trust' },
};

const controls = [
  {
    icon: UserCheck,
    title: 'Consent-aware analytics',
    text: 'First-party analytics starts only after Analytics permission and respects a browser Do Not Track signal.',
  },
  {
    icon: Database,
    title: 'Data minimization',
    text: 'The analytics event model intentionally excludes raw IP, email and browser-fingerprint fields.',
  },
  {
    icon: KeyRound,
    title: 'Protected administration',
    text: 'CMS access uses protected administrator authentication and signed server-side session controls.',
  },
  {
    icon: Eye,
    title: 'Transparent choices',
    text: 'Visitors can revisit browser-storage preferences using the privacy settings control on the website.',
  },
  {
    icon: LockKeyhole,
    title: 'Production safeguards',
    text: 'Security, access control, deployment verification, backups and recoverability are treated as operating concerns.',
  },
  {
    icon: ShieldCheck,
    title: 'Ghana privacy baseline',
    text: 'Our website privacy approach is designed around the principles and data-subject rights in Ghana’s Data Protection Act, 2012 (Act 843).',
  },
];

export default function TrustPage() {
  return (
    <PublicShell>
      <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="container-main py-16 sm:py-20 lg:py-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3.5" />
                Trust & privacy
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Trust is part of the product.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
                A polished interface is not enough. Lightworld treats privacy, access control, transparent choices and production discipline as part of the experience people rely on.
              </p>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {controls.map((item) => (
                <article key={item.title} className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                    <item.icon className="size-5" />
                  </span>
                  <h2 className="mt-7 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/40">{item.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-[32px] border border-slate-200/70 bg-slate-950 p-7 text-white dark:border-white/[0.07] sm:p-9">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Website data flow</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Designed to collect less.</h2>
                <div className="mt-7 space-y-4">
                  {[
                    'Contact data is collected when you intentionally submit an inquiry.',
                    'Newsletter email is stored when you intentionally subscribe.',
                    'Analytics events are collected only after analytics permission.',
                    'Assistant project-scope state and chat history are kept in browser session storage for continuity.',
                    'A project brief becomes a server-side contact record only after you submit the Contact form.',
                  ].map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-white/55">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200/70 bg-white p-7 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-9">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Policies</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Read the details.</h2>
                <div className="mt-7 space-y-2">
                  {[
                    ['Privacy Policy', '/privacy'],
                    ['Cookie & Browser Storage Policy', '/cookies'],
                    ['Website Terms of Use', '/terms'],
                  ].map(([label, href]) => (
                    <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-slate-200/70 px-4 py-4 text-sm font-semibold transition hover:border-emerald-300 dark:border-white/[0.07]">
                      {label}
                      <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </Link>
                  ))}
                </div>
                <p className="mt-7 text-sm leading-7 text-slate-500 dark:text-white/35">
                  For privacy or data questions, contact mail@lightworldtech.com or +233 (024) 361 8186.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
