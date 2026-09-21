'use client';

import { FormEvent, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  Twitter,
} from 'lucide-react';
import { toast } from 'sonner';
import { contentJson, contentText, type SiteSettings } from '@/lib/site-content';
import { trackEvent } from '@/lib/analytics-client';
import { normalizeNavigationLinks, safeNavigationHref } from '@/lib/navigation-content';

const defaultBuildLinks = [
  { label: 'Web & product engineering', href: '/services' },
  { label: 'Mobile applications', href: '/services' },
  { label: 'Enterprise systems', href: '/services' },
  { label: 'AI & automation', href: '/services' },
  { label: 'Cloud & DevOps', href: '/services' },
];

const defaultExploreLinks = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Products', href: '/products' },
  { label: 'Insights', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Leadership', href: '/team' },
  { label: 'Trust Center', href: '/trust' },
  { label: 'Newsroom & Media', href: '/newsroom' },
  { label: 'Careers', href: '/careers' },
];


function FooterNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith('/')) {
    return <Link href={href} className={className}>{children}</Link>;
  }

  return <a href={href} className={className} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>;
}

export default function Footer({ settings = {} }: { settings?: SiteSettings }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const companyName = contentText(settings, 'company_name', 'Lightworld Technologies Ltd');
  const tagline = contentText(settings, 'company_tagline', 'The world of possibilities');
  const description = contentText(
    settings,
    'company_description',
    'Apps, websites, enterprise systems, AI-enabled workflows, cloud infrastructure, training and technology advisory—from Accra to wherever the work needs to go.',
  );
  const companyEmail = contentText(settings, 'company_email', 'mail@lightworldtech.com');
  const phone = contentText(settings, 'company_phone1', '+233 (024) 361 8186');
  const address = contentText(settings, 'company_address', 'Tema, Ghana');
  const buildLinks = normalizeNavigationLinks(
    contentJson<unknown>(settings, 'footer_build_links', defaultBuildLinks),
    defaultBuildLinks,
  );
  const exploreLinks = normalizeNavigationLinks(
    contentJson<unknown>(settings, 'footer_explore_links', defaultExploreLinks),
    defaultExploreLinks,
  );
  const connectLinks = normalizeNavigationLinks(
    contentJson<unknown>(settings, 'footer_connect_links', [
      { label: 'Start a project', href: '/contact' },
      { label: 'Join the team', href: '/careers' },
      { label: 'Client Portal', href: '/client' },
      { label: 'Email us', href: 'mailto:' + companyEmail },
    ]),
    [
      { label: 'Start a project', href: '/contact' },
      { label: 'Join the team', href: '/careers' },
      { label: 'Client Portal', href: '/client' },
      { label: 'Email us', href: 'mailto:' + companyEmail },
    ],
  );
  const footerHeadline = contentText(settings, 'footer_headline', 'We turn ambitious business ideas into technology people can actually use.');
  const footerNewsletterTitle = contentText(settings, 'footer_newsletter_title', 'Useful technology, not inbox noise.');
  const footerNewsletterDescription = contentText(settings, 'footer_newsletter_description', 'Occasional notes on product design, software engineering, digital operations and what we are building.');
  const footerCtaText = contentText(settings, 'footer_cta_text', 'Let’s talk');
  const footerCtaLink = safeNavigationHref(contentText(settings, 'footer_cta_link', '/contact'), '/contact');

  const socials = [
    { icon: Linkedin, label: 'LinkedIn', href: safeNavigationHref(settings.social_linkedin || '', '') },
    { icon: Facebook, label: 'Facebook', href: safeNavigationHref(settings.social_facebook || '', '') },
    { icon: Instagram, label: 'Instagram', href: safeNavigationHref(settings.social_instagram || '', '') },
    { icon: Twitter, label: 'X', href: safeNavigationHref(settings.social_twitter || '', '') },
  ].filter((item) => item.href);

  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Subscription request failed');
      setEmail('');
      trackEvent('newsletter_subscribe');
      toast.success('You’re on the list.', {
        description: payload?.emailSent
          ? 'Check your inbox for a confirmation from Lightworld Technologies.'
          : 'Subscription saved. Email confirmation may be delayed.',
      });
    } catch {
      toast.error('Could not subscribe right now.', {
        description: 'Please try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-[#04090d] pb-24 text-white lg:pb-0">
      <div className="lw-dot-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
      <div className="pointer-events-none absolute -right-24 top-10 size-80 rounded-full bg-amber-400/10 blur-[120px]" />

      <div className="container-main relative py-14 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_.8fr] lg:gap-20">
          <div className="max-w-2xl">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-amber-300/30 bg-slate-950">
                <Image src="/logo.png" alt="" width={38} height={38} />
              </span>
              <span>
                <span className="block text-base font-bold tracking-[-0.02em]">{companyName}</span>
                <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-amber-300/70">{tagline}</span>
              </span>
            </Link>

            <h2 className="mt-7 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              {footerHeadline}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/38 sm:text-base">{description}</p>

            <div className="mt-7 flex flex-wrap gap-2">
              <a
                href={'mailto:' + companyEmail}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/55 transition hover:border-amber-300/25 hover:text-amber-300"
              >
                <Mail className="size-3.5" />
                {companyEmail}
              </a>
              <a
                href={'tel:' + phone.replace(/[^+\d]/g, '')}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/55 transition hover:border-amber-300/25 hover:text-amber-300"
              >
                <Phone className="size-3.5" />
                {phone}
              </a>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/55">
                <MapPin className="size-3.5" />
                {address}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {[
              { title: 'Build', links: buildLinks },
              { title: 'Explore', links: exploreLinks },
            ].map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/22">{group.title}</p>
                <ul className="mt-4 space-y-3">
                  {group.links.map((item) => (
                    <li key={item.label + item.href}>
                      <FooterNavLink href={item.href} className="text-sm text-white/45 transition hover:text-amber-300">
                        {item.label}
                      </FooterNavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/22">Connect</p>
              <ul className="mt-4 space-y-3">
                {connectLinks.map((item) => (
                  <li key={item.label + item.href}>
                    <FooterNavLink href={item.href} className="text-sm text-white/45 transition hover:text-amber-300">
                      {item.label}
                    </FooterNavLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-6 rounded-[28px] border border-white/[0.07] bg-white/[0.03] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-white/85">{footerNewsletterTitle}</p>
            <p className="mt-1 text-xs leading-5 text-white/32">{footerNewsletterDescription}</p>
          </div>
          <form onSubmit={subscribe} className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <div className="relative min-w-0 flex-1 sm:w-72">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/25" />
              <input
                id="footer-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-full border border-white/[0.09] bg-black/20 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-300/45"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
              aria-label="Subscribe"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-white/24">
            <span>© {new Date().getFullYear()} {companyName}</span>
            <Link href="/privacy" className="transition hover:text-white/55">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white/55">Terms</Link>
          </div>

          <div className="flex items-center gap-2">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white/35 transition hover:-translate-y-0.5 hover:border-amber-300/25 hover:text-amber-300"
              >
                <social.icon className="size-3.5" />
              </a>
            ))}
            <FooterNavLink
              href={footerCtaLink}
              className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              {footerCtaText} <ArrowRight className="size-3.5" />
            </FooterNavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
