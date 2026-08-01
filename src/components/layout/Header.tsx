'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Phone, Mail, Globe, Smartphone, Code, TrendingUp, GraduationCap, Cloud, ChevronDown, X, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const serviceDropdown: { label: string; desc: string; icon: LucideIcon }[] = [
  { label: 'Web Development', desc: 'Modern, responsive websites', icon: Globe },
  { label: 'Mobile App Development', desc: 'iOS & Android apps', icon: Smartphone },
  { label: 'Software Development', desc: 'Custom enterprise solutions', icon: Code },
  { label: 'SEO & Digital Marketing', desc: 'Grow your online presence', icon: TrendingUp },
  { label: 'IT Training', desc: 'Skills development programs', icon: GraduationCap },
  { label: 'Web Hosting', desc: 'Reliable hosting solutions', icon: Cloud },
];

const navLinks = [
  { label: 'Home', page: 'home' as const },
  { label: 'About', page: 'about' as const },
  { label: 'Services', page: 'services' as const },
  { label: 'Portfolio', page: 'portfolio' as const },
  { label: 'Blog', page: 'blog' as const },
  { label: 'Careers', page: 'careers' as const },
  { label: 'Products', page: 'products' as const },
  { label: 'Contact', page: 'contact' as const },
];

export default function Header() {
  const { currentPage, navigate, mobileMenuOpen, setMobileMenuOpen } = useAppStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMobileMenuChange = (open: boolean) => {
    setMobileMenuOpen(open);
    if (!open) setMobileServicesOpen(false);
  };

  const handleNav = (page: 'home' | 'about' | 'services' | 'portfolio' | 'blog' | 'careers' | 'products' | 'contact') => {
    navigate(page);
    setMobileMenuOpen(false);
  };

  const isHomePage = currentPage === 'home';

  return (
    <>
      {/* ═══ Floating Pill Nav ═══ */}
      <header
        className={cn(
          'fixed top-2.5 lg:top-3.5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.25rem)] lg:w-auto lg:max-w-3xl transition-all duration-500',
        )}
      >
        <nav
          className={cn(
            'flex items-center justify-between px-2.5 lg:px-3 py-2 rounded-full transition-all duration-500 backdrop-blur-xl',
            // Home page: always dark floating
            isHomePage
              ? 'bg-[#0a0f1a]/85 border border-white/[0.08]'
              : 'dark:bg-slate-950/80 bg-white/80 dark:border-white/[0.06] border-slate-200/50',
            // Scrolled on inner pages
            scrolled && !isHomePage && 'dark:bg-slate-950/90 border-white/[0.1] shadow-2xl dark:shadow-black/20',
            scrolled && !isHomePage && 'bg-white/90 border-slate-200/60 shadow-2xl shadow-slate-200/50',
          )}
        >
          {/* Logo */}
          <button onClick={() => handleNav('home')} className="flex items-center gap-2 shrink-0 pr-1.5">
            <div className="size-8 lg:size-9 rounded-full flex items-center justify-center shadow-sm overflow-hidden transition-transform hover:scale-110" style={{ background: 'var(--logo-circle-bg, #0f172a)', border: '2px solid rgba(251, 191, 36, 0.3)' }}>
              <Image src="/logo.png" alt="Lightworld Technologies" width={28} height={28} className="object-contain" priority />
            </div>
            <span className={cn(
              'text-sm lg:text-base font-bold transition-colors hidden sm:block',
              isHomePage ? 'text-white/90' : 'text-slate-800 dark:text-white/90',
            )}>
              Lightworld
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              if (link.page === 'services') {
                return (
                  <div key={link.page} className="relative group">
                    <button
                      onClick={() => handleNav('services')}
                      className={cn(
                        'px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-[15px] lg:text-base font-medium transition-all flex items-center gap-1',
                        currentPage === link.page
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : isHomePage
                            ? 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
                            : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.05]',
                      )}
                    >
                      {link.label}
                      <ChevronDown className="size-3 opacity-50 transition-transform group-hover:rotate-180" />
                    </button>

                    {/* Mega Menu */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[440px] p-3 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 -translate-y-2 group-hover:translate-y-1.5 pt-5 z-50"
                      style={{
                        background: 'var(--nav-menu-bg, rgba(15, 23, 42, 0.95))',
                        backdropFilter: 'blur(20px)',
                        border: isHomePage ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                        <div className="w-2 h-2 rotate-45 translate-x-[16px] -translate-y-[2px]" style={{ background: 'var(--nav-menu-bg, rgba(15, 23, 42, 0.95))', borderRight: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {serviceDropdown.map((service) => (
                          <button
                            key={service.label}
                            onClick={() => handleNav('services')}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                          >
                            <div className="size-8 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <service.icon className="size-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white/75">{service.label}</p>
                              <p className="text-xs text-white/30 mt-0.5">{service.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={link.page}
                  onClick={() => handleNav(link.page)}
                  className={cn(
                    'px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-[15px] lg:text-base font-medium transition-all',
                    currentPage === link.page
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : isHomePage
                        ? 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
                        : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.05]',
                  )}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => handleNav('contact')}
              size="sm"
              className={cn(
                'hidden sm:inline-flex rounded-full text-[15px] lg:text-base font-semibold px-4 lg:px-5 h-8 lg:h-10 shadow-md transition-all',
                'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20 hover:shadow-emerald-500/40',
              )}
            >
              Get a Quote
            </Button>

            {/* Mobile Hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={handleMobileMenuChange}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden size-8 rounded-full">
                  {mobileMenuOpen ? <X className="size-4 text-white" /> : <Menu className={cn('size-4', isHomePage ? 'text-white/70' : 'text-slate-600 dark:text-white/70')} />}
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 bg-[#0a0f1a] border-white/[0.06]">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex flex-col h-full">
                  {/* Mobile header */}
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                    <div className="size-8 rounded-full flex items-center justify-center overflow-hidden" style={{ background: '#0f172a', border: '2px solid rgba(251, 191, 36, 0.3)' }}>
                      <Image src="/logo.png" alt="Lightworld" width={26} height={26} className="object-contain" />
                    </div>
                    <span className="font-bold text-white/90 text-sm">Lightworld Technologies</span>
                  </div>

                  {/* Mobile nav links */}
                  <div className="flex-1 overflow-y-auto py-2 px-1">
                    <AnimatePresence initial={false}>
                      {navLinks.map((link, index) => (
                        <motion.button
                          key={link.page}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.04 }}
                          onClick={() => handleNav(link.page)}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm font-medium transition-all rounded-lg mx-1',
                            currentPage === link.page
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                          )}
                        >
                          {link.label}
                        </motion.button>
                      ))}
                    </AnimatePresence>

                    {/* Mobile services sub-links */}
                    <div className="px-3 mt-1">
                      <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-semibold px-1 mb-2">Services</p>
                      <div className="space-y-0.5">
                        {serviceDropdown.map((service) => (
                          <button
                            key={service.label}
                            onClick={() => handleNav('services')}
                            className="w-full flex items-center gap-2.5 py-2 px-2 text-left text-xs text-white/35 hover:text-emerald-400 hover:bg-white/[0.03] rounded-lg transition-colors"
                          >
                            <service.icon className="size-3.5 shrink-0" />
                            <div>
                              <p className="font-medium text-white/55">{service.label}</p>
                              <p className="text-[10px] text-white/20">{service.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mobile footer */}
                  <div className="p-4 border-t border-white/[0.06] space-y-3">
                    <Button
                      onClick={() => handleNav('contact')}
                      className="w-full rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-400 h-10"
                    >
                      Get a Quote
                    </Button>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-white/25">
                      <span className="flex items-center gap-1.5"><Phone className="size-3 text-emerald-500/50" /> +233 (024) 361 8186</span>
                      <span className="flex items-center gap-1.5"><Mail className="size-3 text-emerald-500/50" /> mail@lightworldtech.com</span>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* ═══ Spacer for non-home pages ═══ */}
      {!isHomePage && <div className="h-14 lg:h-16" />}
    </>
  );
}
