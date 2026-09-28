import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Award, Building2, Globe2, Mail, MapPin, Phone, Users } from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';
import MediaKitActions from '@/components/pages/MediaKitActions';
import { companyProfile, isSafePublicSourceUrl } from '@/lib/company-profile';
import { contentJson, contentText, defaultCoverage, defaultRecognition } from '@/lib/site-content';
import { getActiveTeamMembers, getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata(buildSeoConfig(settings), {
    title: 'Media Kit & Company Fact Sheet | Lightworld Technologies',
    description: 'Approved Lightworld Technologies company facts, leadership information, verified recognition, public coverage, media contacts and brand resources.',
    path: '/media-kit',
    absoluteTitle: true,
  });
}

export default async function MediaKitPage() {
  const [settings, team] = await Promise.all([
    getSiteSettings(),
    getActiveTeamMembers(),
  ]);

  const companyName = contentText(settings, 'company_name', companyProfile.name);
  const tagline = contentText(settings, 'company_tagline', companyProfile.tagline);
  const summary = contentText(settings, 'company_description', companyProfile.summary);
  const email = contentText(settings, 'newsroom_media_email', companyProfile.email);
  const phone = contentText(settings, 'company_phone1', companyProfile.phoneDisplay);
  const address = contentText(settings, 'company_address', 'Tema, Ghana');
  const recognition = contentJson(settings, 'about_recognition', defaultRecognition)
    .filter((item) => item && item.title && item.publisher && isSafePublicSourceUrl(item.href));
  const coverage = contentJson(settings, 'about_coverage', defaultCoverage)
    .filter((item) => item && item.title && item.publisher && isSafePublicSourceUrl(item.href));
  const leadership = team.length
    ? team.slice(0, 6).map((person) => ({ name: person.name, role: person.role, bio: person.bio || '' }))
    : companyProfile.leadership.map((person) => ({ name: person.name, role: person.role, bio: person.description }));
  const services = companyProfile.services;

  const copyText = [
    companyName,
    tagline,
    '',
    summary,
    '',
    'Website: lightworldtech.com',
    'Location: ' + address,
    'Phone: ' + phone,
    'Media email: ' + email,
    '',
    'Leadership:',
    ...leadership.map((person) => '- ' + person.name + ' — ' + person.role),
    '',
    'Services:',
    ...services.map((service) => '- ' + service),
    '',
    'Verified recognition:',
    ...recognition.map((item) => '- ' + String(item.year) + ' · ' + String(item.publisher) + ' · ' + String(item.title)),
  ].join('\n');

  return (
    <PublicShell settings={settings}>
      <div className="bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white print:bg-white print:text-black">
        <section className="border-b border-slate-200/70 bg-slate-950 text-white dark:border-white/[0.06] print:border-b print:border-slate-300 print:bg-white print:text-black">
          <div className="container-main py-12 sm:py-16 print:py-6">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between print:block">
              <div>
                <Link href="/newsroom" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300 print:hidden">
                  <ArrowLeft className="size-3.5" />
                  Newsroom
                </Link>
                <div className="mt-7 flex items-center gap-4 print:mt-0">
                  <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.1] bg-black/30 print:border-slate-200 print:bg-white">
                    <Image src="/logo.png" alt="Lightworld Technologies logo" width={54} height={54} priority />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300 print:text-slate-500">Approved company source</p>
                    <h1 className="mt-1 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{companyName} Media Kit</h1>
                    <p className="mt-2 text-sm text-white/50 print:text-slate-500">{tagline}</p>
                  </div>
                </div>
              </div>
              <MediaKitActions copyText={copyText} mediaEmail={email} />
            </div>
          </div>
        </section>

        <main className="container-main py-10 sm:py-14 print:py-6">
          <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] print:grid-cols-1">
            <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] print:rounded-none print:border-slate-300 print:bg-white print:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">Company overview</p>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-white/48 print:text-slate-700">{summary}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Globe2, label: 'Website', value: 'lightworldtech.com' },
                  { icon: MapPin, label: 'Location', value: address },
                  { icon: Phone, label: 'Phone', value: phone },
                  { icon: Mail, label: 'Media email', value: email },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/[0.07] print:rounded-none print:border-slate-300">
                    <item.icon className="size-4 text-amber-600" />
                    <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-slate-950 p-6 text-white dark:border-white/[0.07] print:rounded-none print:border-slate-300 print:bg-white print:text-black">
              <div className="flex items-center gap-3">
                <Users className="size-5 text-amber-300 print:text-amber-600" />
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">Executive leadership</h2>
              </div>
              <div className="mt-6 space-y-5">
                {leadership.map((person) => (
                  <div key={person.name} className="border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0 print:border-slate-200">
                    <p className="font-semibold">{person.name}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300/80 print:text-amber-700">{person.role}</p>
                    {person.bio ? <p className="mt-2 text-xs leading-6 text-white/40 print:text-slate-600">{person.bio}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] print:rounded-none print:border-slate-300 print:bg-white">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 text-amber-600" />
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Core capabilities</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2">
              {services.map((service) => (
                <div key={service} className="rounded-2xl border border-slate-200/70 p-4 text-sm font-medium dark:border-white/[0.07] print:rounded-none print:border-slate-300">
                  {service}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2 print:grid-cols-1">
            <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] print:rounded-none print:border-slate-300 print:bg-white">
              <div className="flex items-center gap-3">
                <Award className="size-5 text-amber-600" />
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">Verified recognition</h2>
              </div>
              <div className="mt-5 space-y-4">
                {recognition.map((item) => (
                  <div key={String(item.year) + String(item.title)} className="border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0 dark:border-white/[0.07]">
                    <p className="text-xs font-semibold text-amber-600">{String(item.year)} · {String(item.publisher)}</p>
                    <p className="mt-1 font-semibold">{String(item.title)}</p>
                    <a href={String(item.href)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-700 print:text-slate-500">
                      Publisher source <ArrowUpRight className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] print:rounded-none print:border-slate-300 print:bg-white">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Public coverage</h2>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/38 print:text-slate-600">Coverage links point to the publisher and are not reproduced here.</p>
              <div className="mt-5 space-y-4">
                {coverage.map((item) => (
                  <div key={String(item.publisher) + String(item.title)} className="border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0 dark:border-white/[0.07]">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{String(item.publisher)}</p>
                    <p className="mt-1 font-semibold">{String(item.title)}</p>
                    <a href={String(item.href)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-700 print:text-slate-500">
                      Read source <ArrowUpRight className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-amber-200/80 bg-amber-50 p-6 dark:border-amber-400/10 dark:bg-amber-400/[0.04] print:rounded-none print:border-slate-300 print:bg-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Media use</p>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 dark:text-white/48 print:text-slate-700">
              This page is the approved public fact sheet for Lightworld Technologies. Award references link to their publishers, and public coverage links to the original outlet. For interviews, brand-asset requests, fact verification or updated leadership information, contact {email}.
            </p>
          </section>
        </main>
      </div>
    </PublicShell>
  );
}
