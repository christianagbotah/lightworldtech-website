'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { contentText, type SiteSettings } from '@/lib/site-content';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';
import { trackEvent } from '@/lib/analytics-client';
import { companyProfile } from '@/lib/company-profile';

type SubmissionStatus = 'idle' | 'success' | 'warning' | 'error';

const GOOGLE_MAPS_OPEN_URL = companyProfile.googleMapsUrl;
const GOOGLE_MAPS_EMBED_URL =
  'https://maps.google.com/maps?q=place_id%3A' + companyProfile.googleMapsPlaceId + '&z=16&output=embed';

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

export default function ContactPage({ settings = {} }: { settings?: SiteSettings }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    timezone: '',
    service: services[0],
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [responseMessage, setResponseMessage] = useState('');
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const projectBrief = sessionStorage.getItem('lw-project-brief');
      if (!projectBrief) return;
      setForm((current) => ({
        ...current,
        subject: current.subject || 'Project brief from Lightworld Assistant',
        message: current.message || projectBrief,
      }));
    } catch {
      // Session storage is optional; the form still works without it.
    }
  }, []);

  const officeOpen = useMemo(() => {
    const now = new Date();
    const day = now.getUTCDay();
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (day >= 1 && day <= 5) {
      const [openHour, openMinute] = companyProfile.businessHours.weekdays.opens.split(':').map(Number);
      const [closeHour, closeMinute] = companyProfile.businessHours.weekdays.closes.split(':').map(Number);
      return minutes >= openHour * 60 + openMinute && minutes < closeHour * 60 + closeMinute;
    }
    if (day === 6) {
      const [openHour, openMinute] = companyProfile.businessHours.saturday.opens.split(':').map(Number);
      const [closeHour, closeMinute] = companyProfile.businessHours.saturday.closes.split(':').map(Number);
      return minutes >= openHour * 60 + openMinute && minutes < closeHour * 60 + closeMinute;
    }
    return false;
  }, []);

  useEffect(() => {
    if (submissionStatus === 'idle') return;
    const frame = window.requestAnimationFrame(() => {
      responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [submissionStatus]);

  const resetResponse = () => {
    setSubmissionStatus('idle');
    setResponseMessage('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);

    resetResponse();

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: form.subject.trim() || form.service,
          message:
            '[' + form.service + ']\n' +
            '[Country / region: ' + (form.country.trim() || 'Not provided') + ']\n' +
            '[Preferred time zone: ' + (form.timezone.trim() || 'Not provided') + ']\n\n' +
            form.message.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 429) {
          setSubmissionStatus('warning');
          setResponseMessage(
            payload?.error ||
              'We have received several submissions from this connection. Please wait a little and try again, or contact us directly.',
          );
        } else {
          setSubmissionStatus('error');
          setResponseMessage(
            payload?.error ||
              'We could not send your message right now. Your form details are still here, so you can try again or contact us directly.',
          );
        }
        return;
      }

      setSubmissionStatus('success');
      setResponseMessage(
        'Thank you. The Lightworld team has received your message and can review the brief using the contact details you provided.',
      );
      trackEvent('contact_submit', { metadata: { service: form.service.slice(0, 120) } });
      try {
        sessionStorage.removeItem('lw-project-brief');
      } catch {
        // ignore
      }
    } catch {
      setSubmissionStatus('error');
      setResponseMessage(
        'We could not reach the server to send your message. Your form details are still here, so you can try again or contact us directly.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
        <CmsHeroMedia settings={settings} settingKey="contact_hero_image" />
        <div className="relative container-main py-16 sm:py-20 lg:py-24 z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                <Sparkles className="size-3.5" />
                {contentText(settings, 'contact_hero_eyebrow', 'Start a conversation')}
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {contentText(settings, 'contact_hero_title', 'Tell us what you want to build, improve or automate.')}
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
              {contentText(settings, 'contact_hero_description', 'You do not need a finished technical specification. Share the business problem, the people involved and what a good outcome would look like. We can help shape the next step.')}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
            <div className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              {submissionStatus !== 'idle' ? (
                <div
                  ref={responseRef}
                  role={submissionStatus === 'success' ? 'status' : 'alert'}
                  aria-live="polite"
                  className="flex min-h-[480px] flex-col items-center justify-center px-2 py-10 text-center"
                >
                  <span
                    className={
                      'flex size-24 items-center justify-center rounded-full border shadow-sm ' +
                      (submissionStatus === 'success'
                        ? 'border-green-200 bg-green-50 text-green-600 shadow-green-600/10 dark:border-green-400/25 dark:bg-green-400/10 dark:text-green-300'
                        : submissionStatus === 'warning'
                          ? 'border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300'
                          : 'border-rose-200/80 bg-rose-50 text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300')
                    }
                  >
                    {submissionStatus === 'success' ? (
                      <CheckCircle2 className="size-12" strokeWidth={1.8} />
                    ) : submissionStatus === 'warning' ? (
                      <TriangleAlert className="size-12" strokeWidth={1.8} />
                    ) : (
                      <XCircle className="size-12" strokeWidth={1.8} />
                    )}
                  </span>

                  <p
                    className={
                      'mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] ' +
                      (submissionStatus === 'success'
                        ? 'text-green-600 dark:text-green-300'
                        : submissionStatus === 'warning'
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-rose-600 dark:text-rose-300')
                    }
                  >
                    {submissionStatus === 'success'
                      ? 'Message sent successfully'
                      : submissionStatus === 'warning'
                        ? 'Please try again shortly'
                        : 'Message not sent'}
                  </p>
                  <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    {submissionStatus === 'success'
                      ? 'Thank you for contacting Lightworld.'
                      : submissionStatus === 'warning'
                        ? 'Your message is still with you.'
                        : 'We could not complete the submission.'}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 dark:text-white/42">
                    {responseMessage}
                  </p>

                  <div className="mt-8 flex w-full max-w-xl flex-wrap items-center justify-center gap-3">
                    {submissionStatus === 'success' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            resetResponse();
                            setForm({ name: '', email: '', phone: '', country: '', timezone: '', service: services[0], subject: '', message: '' });
                          }}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-green-600 px-6 text-sm font-semibold text-white transition hover:bg-green-500 dark:bg-green-500 dark:text-slate-950 dark:hover:bg-green-400"
                        >
                          Send another message
                        </button>
                        <Link
                          href="/"
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-semibold transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:hover:border-amber-300/40 dark:hover:text-amber-300"
                        >
                          Back home
                        </Link>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={resetResponse}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-amber-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                        >
                          Return to form
                        </button>
                        <a
                          href={'mailto:' + contentText(settings, 'company_email', 'mail@lightworldtech.com')}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-semibold transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:hover:border-amber-300/40 dark:hover:text-amber-300"
                        >
                          Email Lightworld
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">{contentText(settings, 'contact_form_eyebrow', 'Project brief')}</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{contentText(settings, 'contact_form_title', 'A little context is enough to start.')}</h2>
                    </div>
                    <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-400 dark:border-white/[0.07] dark:text-white/25 sm:inline-flex">No obligation</span>
                  </div>

                  <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={sending}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Name
                        <input
                          required
                          name="name"
                          autoComplete="name"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="Your name"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Work email
                        <input
                          required
                          type="email"
                          name="email"
                          autoComplete="email"
                          inputMode="email"
                          value={form.email}
                          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="you@company.com"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Phone <span className="font-normal text-slate-400 dark:text-white/20">optional</span>
                        <input
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          inputMode="tel"
                          value={form.phone}
                          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="+233 ..."
                        />
                      </label>

                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        What can we help with?
                        <select
                          name="service"
                          value={form.service}
                          onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-[#0c141b] dark:text-white"
                        >
                          {services.map((service) => <option key={service}>{service}</option>)}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Country / region <span className="font-normal text-slate-400 dark:text-white/20">optional</span>
                        <input
                          name="country"
                          autoComplete="country-name"
                          value={form.country}
                          onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="e.g. Ghana, UK, USA, UAE"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                        Preferred time zone <span className="font-normal text-slate-400 dark:text-white/20">optional</span>
                        <input
                          name="timezone"
                          autoComplete="off"
                          value={form.timezone}
                          onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                          placeholder="e.g. GMT, CET, EST"
                        />
                      </label>
                    </div>

                    <label className="block space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                      Subject <span className="font-normal text-slate-400 dark:text-white/20">optional</span>
                      <input
                        name="subject"
                        autoComplete="off"
                        value={form.subject}
                        onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                        placeholder="e.g. Modernize our school management platform"
                      />
                    </label>

                    <label className="block space-y-2 text-xs font-medium text-slate-500 dark:text-white/35">
                      What is the problem or opportunity?
                      <textarea
                        required
                        name="message"
                        value={form.message}
                        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                        rows={7}
                        className="w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-white"
                        placeholder="Tell us what is happening today, who uses the system, what you want to change, and any important deadline or constraint."
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={sending}
                      aria-disabled={sending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 sm:w-auto"
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
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
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
                  href={'https://wa.me/' + companyProfile.phone.replace(/^\+/, '') + '?text=Hello%20Lightworld%20Technologies%2C%20I%20would%20like%20to%20discuss%20a%20project.'}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950"
                >
                  Open WhatsApp <ArrowRight className="size-4" />
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <a href={'tel:' + contentText(settings, 'company_phone1', '0243618186').replace(/[^+\d]/g, '')} className="rounded-[24px] border border-slate-200/70 bg-white p-5 transition hover:border-amber-300 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <Phone className="size-4 text-amber-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Phone</p>
                  <p className="mt-1 text-sm font-semibold">{contentText(settings, 'company_phone1', '0243618186')}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-white/30">{contentText(settings, 'company_phone2', '+233 (055) 538 4113')}</p>
                </a>
                <a href={'mailto:' + contentText(settings, 'company_email', 'mail@lightworldtech.com')} className="rounded-[24px] border border-slate-200/70 bg-white p-5 transition hover:border-amber-300 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <Mail className="size-4 text-amber-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Email</p>
                  <p className="mt-1 break-all text-sm font-semibold">{contentText(settings, 'company_email', 'mail@lightworldtech.com')}</p>
                </a>
                <div className="rounded-[24px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <MapPin className="size-4 text-amber-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Location</p>
                  <p className="mt-1 text-sm font-semibold">{contentText(settings, 'company_address', 'Tema, Ghana')}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <Clock className="size-4 text-amber-500" />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 dark:text-white/20">Business hours</p>
                  <p className="mt-1 text-sm font-semibold">
                    Mon–Fri · {companyProfile.businessHours.weekdays.opens}–{companyProfile.businessHours.weekdays.closes} GMT
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-white/30">
                    Sat · {companyProfile.businessHours.saturday.opens}–{companyProfile.businessHours.saturday.closes} GMT
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-amber-500/15 bg-amber-500/[0.07] p-5">
                <p className="text-sm font-semibold">Not ready for a build?</p>
                <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/34">We also help with architecture reviews, technology roadmaps, training and digital transformation planning.</p>
                <Link href="/services" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Explore advisory services <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
            <div className="grid lg:grid-cols-[.36fr_.64fr]">
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <MapPin className="size-5" />
                </span>
                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                  Visit us
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  Find Lightworld Technologies Limited on Google Maps.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-slate-500 dark:text-white/40">
                  Our verified business listing is in Tema, Ghana. Use the map for the exact pin and directions.
                </p>
                <a
                  href={GOOGLE_MAPS_OPEN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  Open in Google Maps <ArrowRight className="size-4" />
                </a>
              </div>

              <div className="min-h-[360px] border-t border-slate-200/70 bg-slate-100 dark:border-white/[0.07] dark:bg-white/[0.02] lg:min-h-[420px] lg:border-l lg:border-t-0">
                <iframe
                  title="Lightworld Technologies Limited location on Google Maps"
                  src={GOOGLE_MAPS_EMBED_URL}
                  className="h-[360px] w-full border-0 lg:h-full lg:min-h-[420px]"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
