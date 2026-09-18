'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Mail,
  PackageSearch,
  School,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';

const productDirections = [
  {
    icon: Workflow,
    title: 'Operations platforms',
    stage: 'Product family',
    text: 'Modular systems for assets, maintenance, inventory, people, approvals and operational reporting.',
    features: ['Role-aware workflows', 'Auditability', 'Dashboards', 'Mobile operations'],
  },
  {
    icon: School,
    title: 'Education platforms',
    stage: 'Product family',
    text: 'School administration, learning, assessment, billing and communication experiences designed around the institution.',
    features: ['Administration', 'Assessment', 'Billing', 'Parent & staff journeys'],
  },
  {
    icon: BrainCircuit,
    title: 'AI-assisted products',
    stage: 'R&D',
    text: 'Focused intelligent experiences that help teams search knowledge, interpret information and automate repetitive work.',
    features: ['Assistants', 'Knowledge', 'Automation', 'Human controls'],
  },
  {
    icon: BarChart3,
    title: 'Business intelligence',
    stage: 'R&D',
    text: 'Operational dashboards and reporting products that bring data from separate workflows into one decision surface.',
    features: ['KPIs', 'Alerts', 'Reporting', 'Integrations'],
  },
  {
    icon: GraduationCap,
    title: 'Learning & skills',
    stage: 'R&D',
    text: 'Digital learning and capability-building experiences for companies, institutions and individual learners.',
    features: ['Courses', 'Progress', 'Assessment', 'Certificates'],
  },
  {
    icon: Layers3,
    title: 'Reusable industry modules',
    stage: 'Platform',
    text: 'Reusable product building blocks that shorten delivery time while keeping room for industry-specific workflows.',
    features: ['Modular', 'Configurable', 'API-first', 'Multi-tenant ready'],
  },
];

export default function ProductsPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [sending, setSending] = useState(false);

  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to subscribe');
      setSubscribed(true);
      setEmail('');
      toast.success('Product updates enabled.', {
        description: payload?.emailSent
          ? 'A confirmation email is on its way.'
          : 'Subscription saved. Confirmation email may be delayed.',
      });
    } catch {
      toast.error('Could not subscribe right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="container-main py-16 sm:py-20 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                <PackageSearch className="size-3.5" />
                Product lab
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Custom engineering today. Reusable products tomorrow.</h1>
            </div>
            <div>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
                Our product direction grows from patterns we repeatedly see in real operations. Instead of publishing speculative launch dates, this page shows the product families and platform ideas we are actively exploring and shaping.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {productDirections.map((product, index) => (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="group flex min-h-[320px] flex-col rounded-[28px] border border-slate-200/70 bg-white p-6 transition hover:-translate-y-0.5 hover:border-emerald-300/50 dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300">
                    <product.icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-white/[0.07] dark:text-white/25">{product.stage}</span>
                </div>
                <div className="mt-auto pt-9">
                  <h2 className="text-xl font-semibold tracking-tight">{product.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/36">{product.text}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {product.features.map((feature) => (
                      <span key={feature} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:bg-white/[0.04] dark:text-white/28">{feature}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 grid overflow-hidden rounded-[34px] bg-slate-950 text-white dark:bg-[#081119] lg:grid-cols-[1fr_.8fr]">
            <div className="relative p-7 sm:p-9 lg:p-11">
              <div className="absolute -left-16 -top-16 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Bell className="size-5" />
                </div>
                <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Product updates</p>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Follow what graduates from the lab.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/40">We will share public launches, early-access opportunities and useful product notes when they are ready.</p>
              </div>
            </div>
            <div className="border-t border-white/[0.07] bg-white/[0.03] p-7 sm:p-9 lg:flex lg:items-center lg:border-l lg:border-t-0">
              {subscribed ? (
                <div className="flex items-center gap-3 text-emerald-300">
                  <CheckCircle2 className="size-5" />
                  <div>
                    <p className="text-sm font-semibold">You are on the product list.</p>
                    <p className="mt-1 text-xs text-white/30">We will keep the updates useful.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={subscribe} className="w-full">
                  <label htmlFor="product-email" className="text-xs font-medium text-white/55">Email for product updates</label>
                  <div className="mt-3 flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                      <input
                        id="product-email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                        className="h-11 w-full rounded-full border border-white/[0.09] bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-emerald-300/35"
                      />
                    </div>
                    <button disabled={sending} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 disabled:opacity-50">
                      Subscribe <ArrowRight className="size-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-5 rounded-[26px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <div>
              <p className="text-sm font-semibold">Need a tailored system instead?</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/30">Our product lab does not replace custom engineering. It makes it stronger.</p>
            </div>
            <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Talk to us <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
