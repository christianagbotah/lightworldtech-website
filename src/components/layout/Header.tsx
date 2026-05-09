'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Phone, Mail, Globe, Smartphone, Code, TrendingUp, GraduationCap, Cloud, ChevronDown, type LucideIcon } from 'lucide-react';
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset mobile services sub-menu when sheet closes
  useEffect(() => {
    if (!mobileMenuOpen) setMobileServicesOpen(false);
  }, [mobileMenuOpen]);

  const handleNav = (page: 'home' | 'about' | 'services' | 'portfolio' | 'blog' | 'careers' | 'products' | 'contact') => {
    navigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'w-full transition-all duration-300',
        scrolled
          ? 'bg-white/98 dark:bg-slate-900/98 backdrop-blur-md shadow-xl border-b border-slate-200/60 dark:border-slate-700/60'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm border-b border-slate-200/50 dark:border-slate-700/50'
      )}
    >
      {/* Top bar - smooth collapse on scroll */}
      <div className={cn(
        'transition-all duration-300 overflow-hidden',
        scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
      )}>
        <div className="container-main flex items-center justify-between py-1.5 text-xs text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="size-3 text-emerald-600 dark:text-emerald-400" />
              +233 (024) 361 8186
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="size-3 text-emerald-600 dark:text-emerald-400" />
              mail@lightworldtech.com
            </span>
          </div>
          <span className="hidden sm:block font-medium text-emerald-600 dark:text-emerald-400">
            Trusted by 100+ Businesses
          </span>
        </div>
      </div>

      {/* Main nav */}
      <div className="container-main">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 group"
          >
            <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-amber-400/30 transition-all overflow-hidden">
              <Image src="/logo.png" alt="Lightworld Technologies" width={32} height={32} className="object-contain p-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight text-foreground">
                Lightworld
              </span>
              <span className="text-[10px] font-medium leading-tight text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                Technologies
              </span>
            </div>
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.page === 'services') {
                return (
                  <div key={link.page} className="relative group">
                    <button
                      onClick={() => handleNav('services')}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-colors relative flex items-center gap-1',
                        currentPage === link.page
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      )}
                    >
                      {link.label}
                      <ChevronDown className="size-3.5 transition-transform duration-200 group-hover:rotate-180" />
                      {currentPage === link.page && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>

                    {/* Services mega menu dropdown */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[520px] p-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform -translate-y-2 group-hover:translate-y-0 pt-6">
                      {/* Arrow pointer */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3 overflow-hidden">
                        <div className="w-3 h-3 bg-white dark:bg-slate-900 border-l border-t border-slate-200 dark:border-slate-700 rotate-45 translate-x-[12px] -translate-y-[2px]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {serviceDropdown.map((service) => (
                          <button
                            key={service.label}
                            onClick={() => handleNav('services')}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group/item"
                          >
                            <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-100 dark:group-hover/item:bg-emerald-900/50 transition-colors">
                              <service.icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{service.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{service.desc}</p>
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
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
                    currentPage === link.page
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  )}
                >
                  {link.label}
                  {currentPage === link.page && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Theme Toggle + CTA + Mobile menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => handleNav('contact')}
              className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg hover:shadow-emerald-500/25 transition-all relative group"
            >
              {/* Notification badge dot */}
              <span className="absolute -top-1 -right-1 flex items-center justify-center">
                <span className="absolute size-3 rounded-full bg-white animate-pulse-ring" />
                <span className="relative size-2 rounded-full bg-white border-2 border-emerald-600 dark:border-emerald-700" />
              </span>
              Get a Quote
            </Button>

            {/* Mobile hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center overflow-hidden">
                      <Image src="/logo.png" alt="Lightworld Technologies" width={24} height={24} className="object-contain p-0.5" />
                    </div>
                    <span className="font-bold text-foreground">Lightworld Technologies</span>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2">
                    <AnimatePresence initial={false}>
                      {navLinks.map((link, index) => {
                        if (link.page === 'services') {
                          return (
                            <div key={link.page}>
                              <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: index * 0.06 }}
                                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                                className={cn(
                                  'w-full text-left px-6 py-3 text-sm font-medium transition-all relative flex items-center justify-between',
                                  currentPage === link.page
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-r-2 border-emerald-500'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                )}
                              >
                                <span className="flex items-center gap-3">
                                  {currentPage === link.page && (
                                    <motion.span
                                      layoutId="mobile-active-indicator"
                                      className="size-1.5 rounded-full bg-emerald-500"
                                    />
                                  )}
                                  {link.label}
                                </span>
                                <motion.div
                                  animate={{ rotate: mobileServicesOpen ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="size-4 opacity-50" />
                                </motion.div>
                              </motion.button>

                              {/* Mobile services sub-menu */}
                              <AnimatePresence>
                                {mobileServicesOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 pb-2 pl-12 space-y-1">
                                      {serviceDropdown.map((service) => (
                                        <button
                                          key={service.label}
                                          onClick={() => handleNav('services')}
                                          className="w-full flex items-center gap-3 py-2 text-left text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-md px-2 -mx-2"
                                        >
                                          <service.icon className="size-4 shrink-0" />
                                          <div>
                                            <p className="font-medium text-slate-700 dark:text-slate-300">{service.label}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{service.desc}</p>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }

                        return (
                          <motion.button
                            key={link.page}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: index * 0.06 }}
                            onClick={() => handleNav(link.page)}
                            className={cn(
                              'w-full text-left px-6 py-3 text-sm font-medium transition-all relative',
                              currentPage === link.page
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-r-2 border-emerald-500'
                                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                          >
                            <span className="flex items-center gap-3">
                              {currentPage === link.page && (
                                <motion.span
                                  layoutId="mobile-active-indicator"
                                  className="size-1.5 rounded-full bg-emerald-500"
                                />
                              )}
                              {link.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      onClick={() => handleNav('contact')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md relative"
                    >
                      {/* Notification badge */}
                      <span className="absolute -top-1 -right-1 flex items-center justify-center">
                        <span className="absolute size-3 rounded-full bg-white animate-pulse-ring" />
                        <span className="relative size-2 rounded-full bg-white border-2 border-emerald-600 dark:border-emerald-700" />
                      </span>
                      Get a Quote
                    </Button>
                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <p className="flex items-center gap-2">
                        <Phone className="size-3 text-emerald-500" />
                        +233 (024) 361 8186
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="size-3 text-emerald-500" />
                        mail@lightworldtech.com
                      </p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
