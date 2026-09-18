'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Award,
  Building2,
  BrainCircuit,
  Briefcase,
  ChevronDown,
  Cloud,
  Code2,
  GraduationCap,
  Home,
  LayoutGrid,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { contentJson, contentText, type SiteSettings } from '@/lib/site-content';

const defaultPrimaryNav = [
  { label: 'Work', href: '/portfolio' },
  { label: 'Products', href: '/products' },
  { label: 'Insights', href: '/blog' },
];

const companyMenu = [
  { icon: Building2, title: 'About Lightworld', desc: 'Company, direction and how we work', href: '/about' },
  { icon: Users, title: 'Leadership', desc: 'Meet the people leading Lightworld', href: '/team' },
  { icon: Award, title: 'Recognition & press', desc: 'Awards and verified media coverage', href: '/about#recognition' },
  { icon: Briefcase, title: 'Careers', desc: 'Talent network and opportunities', href: '/careers' },
  { icon: MessageSquare, title: 'Contact', desc: 'Start a project or conversation', href: '/contact' },
];

const serviceMenu = [
  { icon: Code2, title: 'Web & product engineering', desc: 'Websites, portals, SaaS and platforms' },
  { icon: Smartphone, title: 'Mobile apps', desc: 'Native-feeling iOS and Android experiences' },
  { icon: Workflow, title: 'Enterprise systems', desc: 'ERP, EAM, workflow and operational software' },
  { icon: BrainCircuit, title: 'AI & automation', desc: 'Assistive AI and intelligent workflows' },
  { icon: Cloud, title: 'Cloud & DevOps', desc: 'Deployment, reliability and infrastructure' },
  { icon: ShieldCheck, title: 'Security engineering', desc: 'Secure architecture and application hardening' },
  { icon: Search, title: 'SEO & digital growth', desc: 'Search-ready architecture and analytics' },
  { icon: GraduationCap, title: 'Training & advisory', desc: 'IT skills, consulting and transformation' },
];

const mobileDock = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: LayoutGrid, label: 'Services', href: '/services' },
  { icon: Briefcase, label: 'Work', href: '/portfolio' },
  { icon: MessageSquare, label: 'Contact', href: '/contact' },
];

export default function Header({ settings = {} }: { settings?: SiteSettings }) {
  const pathname = usePathname();
  const primaryNav = contentJson<Array<{ label: string; href: string }>>(settings, 'header_primary_links', defaultPrimaryNav);
  const companyTagline = contentText(settings, 'company_tagline', 'The world of possibilities');
  const companyEmail = contentText(settings, 'company_email', 'mail@lightworldtech.com');
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === '/';

  const active = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const companyActive = ['/about', '/team', '/careers', '/contact'].some((href) => active(href));

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-xl transition focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full border border-slate-200/75 bg-white/82 px-2.5 shadow-lg shadow-slate-950/[0.04] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#071018]/82 dark:shadow-black/20 sm:h-16 sm:px-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 rounded-full pr-2" aria-label="Lightworld Technologies home">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-300/30 bg-slate-950 sm:size-10">
              <Image src="/logo.png" alt="" width={34} height={34} className="object-contain" priority />
            </span>
            <span className="hidden min-w-0 leading-none sm:block">
              <span className="block truncate text-sm font-bold tracking-[-0.02em] text-slate-900 dark:text-white">Lightworld</span>
              <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Technologies</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
            <div className="group relative">
              <Link
                href="/services"
                className={cn(
                  'flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition',
                  active('/services')
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-white/48 dark:hover:bg-white/[0.05] dark:hover:text-white/80',
                )}
                aria-current={active('/services') ? 'page' : undefined}
              >
                Services
                <ChevronDown className="size-3.5 opacity-45 transition-transform group-hover:rotate-180" />
              </Link>

              <div className="invisible absolute left-1/2 top-full w-[680px] -translate-x-1/2 translate-y-1 pt-4 opacity-0 transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#081119]/96 dark:shadow-black/40">
                  <div className="grid grid-cols-2 gap-1">
                    {serviceMenu.map((item) => (
                      <Link
                        key={item.title}
                        href="/services"
                        className="group/item flex items-start gap-3 rounded-2xl p-3 transition hover:bg-slate-100 dark:hover:bg-white/[0.045]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-300">
                          <item.icon className="size-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800 dark:text-white/80">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-400 dark:text-white/28">{item.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/services" className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 transition hover:text-emerald-700 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-white/38 dark:hover:text-emerald-300">
                    Explore every capability
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  active(item.href)
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-white/48 dark:hover:bg-white/[0.05] dark:hover:text-white/80',
                )}
                aria-current={active(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}

            <div className="group relative">
              <Link
                href="/about"
                className={cn(
                  'flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition',
                  companyActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-white/48 dark:hover:bg-white/[0.05] dark:hover:text-white/80',
                )}
                aria-current={active('/about') ? 'page' : undefined}
              >
                Company
                <ChevronDown className="size-3.5 opacity-45 transition-transform group-hover:rotate-180" />
              </Link>

              <div className="invisible absolute right-0 top-full w-[360px] translate-y-1 pt-4 opacity-0 transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="rounded-[26px] border border-slate-200/80 bg-white/95 p-2.5 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#081119]/96 dark:shadow-black/40">
                  {companyMenu.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group/item flex items-start gap-3 rounded-2xl p-3 transition hover:bg-slate-100 dark:hover:bg-white/[0.045]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-300">
                        <item.icon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-800 dark:text-white/80">{item.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-400 dark:text-white/28">{item.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/contact"
              className="hidden h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 sm:inline-flex"
            >
              Start a project
              <ArrowUpRight className="size-3.5" />
            </Link>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-10 rounded-full lg:hidden" aria-label="Open navigation menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(92vw,390px)] border-l border-white/[0.07] bg-[#071018] p-0 text-white">
                <SheetTitle className="sr-only">Lightworld Technologies navigation</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5">
                    <span className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-amber-300/30 bg-slate-950">
                      <Image src="/logo.png" alt="" width={34} height={34} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Lightworld Technologies</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">{companyTagline}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/20">Explore</p>
                    <div className="mt-2 grid gap-1">
                      {[
                        ['Home', '/'],
                        ['Services', '/services'],
                        ['Work', '/portfolio'],
                        ['Products', '/products'],
                        ['Insights', '/blog'],
                        ['About', '/about'],
                        ['Leadership', '/team'],
                        ['Recognition & Press', '/about#recognition'],
                        ['Careers', '/careers'],
                        ['Contact', '/contact'],
                      ].map(([label, href]) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition',
                            active(href)
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : 'text-white/55 hover:bg-white/[0.04] hover:text-white/85',
                          )}
                        >
                          {label}
                          <ArrowUpRight className="size-3.5 opacity-30" />
                        </Link>
                      ))}
                    </div>

                    <p className="mt-7 px-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/20">Capabilities</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {serviceMenu.slice(0, 6).map((item) => (
                        <Link
                          key={item.title}
                          href="/services"
                          onClick={() => setMobileOpen(false)}
                          className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"
                        >
                          <item.icon className="size-4 text-emerald-300" />
                          <span className="mt-3 block text-xs font-medium text-white/65">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.07] p-4">
                    <Link
                      href="/contact"
                      onClick={() => setMobileOpen(false)}
                      className="flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 text-sm font-semibold text-slate-950"
                    >
                      Start a project
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <p className="mt-3 text-center text-[10px] text-white/25">Accra, Ghana · {companyEmail}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {!isHome && <div className="h-[76px] sm:h-[88px]" aria-hidden="true" />}

      <nav
        className="fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 rounded-[22px] border border-white/[0.08] bg-[#071018]/92 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:hidden"
        aria-label="Mobile quick navigation"
      >
        {mobileDock.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 rounded-[17px] px-2 py-2 text-[9px] font-medium transition',
              active(item.href) ? 'bg-emerald-400/12 text-emerald-300' : 'text-white/34',
            )}
            aria-current={active(item.href) ? 'page' : undefined}
          >
            <item.icon className="size-[18px]" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
