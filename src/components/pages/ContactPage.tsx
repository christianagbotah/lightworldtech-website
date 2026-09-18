'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const services = [
  'Website / digital experience',
  'Mobile application',
  'Enterprise software / automation',
  'AI-enabled workflow',
  'Cloud / DevOps / security',
  'SEO / digital growth',
  'Training / consultancy',
  'Something else',
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: services[0],
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const officeOpen = useMemo(() => {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: form.subject.trim() || form.service,
          message: '[' + form.service + ']\n\n' + form.message.trim(),
        }),
      });

      if (!response.ok) throw new Error('Unable to send message');
      setSent(true);
      toast.success('Message received.');
    } catch {
      toast.error('Could not send your message right now.', {
        description: 'You can also reach Lightworld by email, phone or WhatsApp.',
      });
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
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Sparkles className="size-3.5" />
                Start a conversation
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Tell us what you want to build, improve or automate.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
              You do not need a finished technical specification. Share the business problem, the people involved and what a good outcome would look like. We can help shape the next step.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
            <div className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              {sent ? (
                <div className="flex min-h-[480px] flex-col items-start justify-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="size-7" />
                  </span>
                  <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">Thanks. Your message is in.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/38">
                    The Lightworld team can review the brief and respond using the contact details you provided.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSent(false);
                        setForm({ name: '', email: '', phone: '', service: services[0], subject: '', message: '' });
                      }}
                      className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-slate-950"
                    >
                      Send another message
                    </button>
                    <Link href="/" className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold dark:border-white/[0.08]">
                      Back home
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Project brief</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">A little context is enough to start.</h2>
                    </div>
                    <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-400 dark:border-white/[0.07] dark:text-white/25 sm:inline-flex">No obligation</span>
                  </div>

                  <form onSubmit={submit} className="mt-7 space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Name
                        <input
                          required
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="Your name"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Work email
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="you@company.com"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Phone <span className="font-normal text-slate-400 dark:text-white/20">optional</span>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="+233 ..."
                        />
                      </label>

                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        What can we help with?
                        <select
                          value={form.service}
                          onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.07] dark:bg-[#0c141b] dark:text-white"
                        >
                          {services.map((service) => <option key={service}>{service}</option>)}
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                      Subject <span className="font-normal text-slate-400 dark:text-white/20">optional</span>
                      <input
                        value={form.subject}
                        onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                        placeholder="e.g. Modernize our school management platform"
                      />
                    </label>

                    <label className="block space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                      What is the problem or opportunity?
                      <textarea
                        required
                        value={form.message}
                        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                        rows={7}
                        className="w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                        placeholder="Tell us what is happening today, who uses the system, what you want to change, and any important deadline or constraint."
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 sm:w-auto"
                    >
                      {sending ? 'Sending…' : 'Send project brief'}
                      {!sending && <Send className="size-4" />}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="grid gap-4">
              <div className="rounded-[30px] border border-slate-200/70 bg-slate-950 p-7 text-white dark:border-white/[0.07] dark:bg-[#081119] sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <MessageCircle className="size-5" />
                  </div>
                  <span className="inline-flex items-center gap-2 text-[10px] font-medium text-white/30">
                    <span className={'size-2 rounded-full ' + (officeOpen ? 'bg-emerald-400' : 'bg-white/25')} />
                    {officeOpen ? 'Business hours now' : 'Outside business hours'}
                  </span>
                </div>
                <h2 className="mt-7 text-3xl font-semibold tracking-[-0.04em]">Prefer a direct conversation?</h2>
                <p className="mt-3 text-sm leading-7 text-white/40">Use the channel that works best for you. Project details can still be formalized after the first conversation.</p>
                <a
                  href="https://wa.me/233243618186?text=Hello%20Lightworld%20Technologies%2C%20I%20would%20like%20to%20discuss%20a%20project."
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950"
                >
                  Open WhatsApp <ArrowRight className="size-4" />
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <a href="tel:+233243618186" className="rounded-[24px] border border-slate-200/70 bg-white p-5 transition hover:border-emerald-300 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <Phone className="size-4 text-emerald-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Phone</p>
                  <p className="mt-1 text-sm font-semibold">+233 (024) 361 8186</p>
                </a>
                <a href="mailto:mail@lightworldtech.com" className="rounded-[24px] border border-slate-200/70 bg-white p-5 transition hover:border-emerald-300 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <Mail className="size-4 text-emerald-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Email</p>
                  <p className="mt-1 break-all text-sm font-semibold">mail@lightworldtech.com</p>
                </a>
                <div className="rounded-[24px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <MapPin className="size-4 text-emerald-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Location</p>
                  <p className="mt-1 text-sm font-semibold">Accra, Ghana</p>
                </div>
                <div className="rounded-[24px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <Clock className="size-4 text-emerald-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Business hours</p>
                  <p className="mt-1 text-sm font-semibold">Mon–Fri · 8:00–17:00 GMT</p>
                </div>
              </div>

              <div className="rounded-[26px] border border-emerald-500/15 bg-emerald-500/[0.07] p-5">
                <p className="text-sm font-semibold">Not ready for a build?</p>
                <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/34">We also help with architecture reviews, technology roadmaps, training and digital transformation planning.</p>
                <Link href="/services" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Explore advisory services <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
