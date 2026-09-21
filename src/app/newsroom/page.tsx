import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Building2,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Quote,
  Users,
} from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';
import CmsHeroMedia from '@/components/pages/CmsHeroMedia';
import {
  contentJson,
  contentText,
  defaultCoverage,
  defaultRecognition,
} from '@/lib/site-content';
import {
  getActiveTeamMembers,
  getLatestPublishedPosts,
  getSiteSettings,
} from '@/lib/site-content-server';
import { companyProfile } from '@/lib/company-profile';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_newsroom_title', 'Newsroom & Media Center');
  const description = contentText(
    settings,
    'seo_newsroom_description',
    'Verified company facts, recognition, press coverage, leadership information and public updates from Lightworld Technologies Ltd.',
  );
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/newsroom',
  });
}

export default async function NewsroomPage() {
  const [settings, team, posts] = await Promise.all([
    getSiteSettings(),
    getActiveTeamMembers(),
    getLatestPublishedPosts(3),
  ]);

  const recognition = contentJson(settings, 'about_recognition', defaultRecognition);
  const coverage = contentJson(settings, 'about_coverage', defaultCoverage);
  const companyName = contentText(settings, 'company_name', companyProfile.name);
  const tagline = contentText(settings, 'company_tagline', companyProfile.tagline);
  const email = contentText(settings, 'newsroom_media_email', companyProfile.email);
  const phone = contentText(settings, 'company_phone1', companyProfile.phoneDisplay);
  const location = contentText(settings, 'company_address', 'Tema, Ghana');
  const leadership = team.length
    ? team.slice(0, 4).map((person) => ({ name: person.name, role: person.role }))
    : companyProfile.leadership.map((person) => ({ name: person.name, role: person.role }));

  return (
    <PublicShell>
      <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
        <section className="lw-hero-grid relative border-b border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
          <CmsHeroMedia settings={settings} settingKey="newsroom_hero_image" />
          <div className="relative container-main py-16 sm:py-20 lg:py-24 z-10">
            <div className="grid gap-10 lg:grid-cols-[1.12fr_.88fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  <Newspaper className="size-3.5" />
                  {contentText(settings, 'newsroom_hero_eyebrow', 'Newsroom & Media')}
                </div>
                <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                  {contentText(settings, 'newsroom_hero_title', 'Verified company facts, recognition and public updates.')}
                </h1>
              </div>
              <p className="max-w-xl text-base leading-8 text-slate-600 dark:text-white/45 sm:text-lg">
                {contentText(
                  settings,
                  'newsroom_hero_description',
                  'A single source for Lightworld Technologies Ltd company information, verified award links, public coverage, leadership facts and recent published insights.',
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-[32px] border border-slate-200/70 bg-slate-950 p-7 text-white dark:border-white/[0.07] dark:bg-[#081119] sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                {contentText(settings, 'newsroom_fact_title', 'Company fact sheet')}
              </p>
              <div className="mt-7 flex items-center gap-4">
                <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-white/[0.12] bg-black/30">
                  <Image src="/logo.png" alt="Lightworld Technologies logo" width={54} height={54} />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">{companyName}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-300/70">{tagline}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[
                  { icon: MapPin, label: 'Location', value: location },
                  { icon: Phone, label: 'Phone', value: phone },
                  { icon: Mail, label: 'Email', value: email },
                  { icon: Building2, label: 'Website', value: 'lightworldtech.com' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <item.icon className="size-4 text-emerald-300" />
                    <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-white/70">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 border-t border-white/[0.07] pt-6">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/30">
                  <Users className="size-3.5" /> Executive leadership
                </p>
                <div className="mt-4 space-y-3">
                  {leadership.map((person) => (
                    <div key={person.name} className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-white/80">{person.name}</span>
                      <span className="text-xs text-white/35">{person.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="recognition" className="rounded-[32px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <Award className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                    Source-linked
                  </p>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em]">
                    {contentText(settings, 'newsroom_recognition_title', 'Verified recognition')}
                  </h2>
                </div>
              </div>

              <div className="mt-7 space-y-3">
                {recognition.map((item) => (
                  <a
                    key={String(item.year) + String(item.title)}
                    href={String(item.href || '#')}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-5 rounded-2xl border border-slate-200/70 p-4 transition hover:border-amber-300 hover:bg-amber-50/40 dark:border-white/[0.07] dark:hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-xs font-semibold text-amber-600">{String(item.year)} · {String(item.publisher)}</p>
                      <h3 className="mt-1 text-lg font-semibold">{String(item.title)}</h3>
                      {item.description && <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/34">{String(item.description)}</p>}
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-slate-300 transition group-hover:text-amber-600" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white dark:border-white/[0.06] dark:bg-[#081119]">
          <div className="container-main section-padding">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <Quote className="size-8 text-emerald-500" />
                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Independent source</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
                  {contentText(settings, 'newsroom_coverage_title', 'Public coverage')}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/38">
                  Coverage listed here links to the publisher rather than reproducing or overstating the article.
                </p>
              </div>
              <div className="space-y-3">
                {coverage.map((item) => (
                  <a
                    key={String(item.publisher) + String(item.title)}
                    href={String(item.href || '#')}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-5 rounded-[24px] border border-slate-200/70 bg-[#f7f9f8] p-5 transition hover:border-emerald-300 dark:border-white/[0.07] dark:bg-white/[0.025]"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">{String(item.publisher)}</p>
                      <h3 className="mt-2 text-lg font-semibold leading-7">{String(item.title)}</h3>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-emerald-600" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Published insights</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                  {contentText(settings, 'newsroom_updates_title', 'Latest from Lightworld')}
                </h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                All insights <ArrowRight className="size-4" />
              </Link>
            </div>

            {posts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.slug} href={'/blog/' + post.slug} className="group rounded-[28px] border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg dark:border-white/[0.07] dark:bg-white/[0.025]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {post.createdAt.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </p>
                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{post.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-white/34">{post.excerpt}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Read update <ArrowRight className="size-3.5" /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-white/[0.09] dark:text-white/35">
                Published company insights will appear here as they are released.
              </div>
            )}
          </div>
        </section>

        <section className="pb-20 sm:pb-24">
          <div className="container-main">
            <div className="grid gap-7 rounded-[32px] border border-slate-200/70 bg-slate-950 p-7 text-white dark:border-white/[0.07] dark:bg-[#081119] sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  {contentText(settings, 'newsroom_media_title', 'Media enquiries & brand resources')}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Need an approved company source?</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
                  {contentText(
                    settings,
                    'newsroom_media_description',
                    'For interviews, company background, leadership information, award-source verification or approved brand assets, contact the Lightworld team.',
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={'mailto:' + email + '?subject=Media%20enquiry'} className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950">
                  <Mail className="size-4" /> {email}
                </a>
                <a href="/logo.png" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.1] px-5 text-sm font-semibold text-white/70">
                  View logo <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
