'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Zap, Phone, Mail } from 'lucide-react';
import ThemeToggle from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Home', page: 'home' as const },
  { label: 'About', page: 'about' as const },
  { label: 'Services', page: 'services' as const },
  { label: 'Blog', page: 'blog' as const },
  { label: 'Contact', page: 'contact' as const },
];

export default function Header() {
  const { currentPage, navigate, mobileMenuOpen, setMobileMenuOpen } = useAppStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (page: 'home' | 'about' | 'services' | 'blog' | 'contact') => {
    navigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'glass shadow-md border-b border-border/50' : 'bg-transparent'
      )}
    >
      {/* Top bar */}
      <div className={cn(
        'transition-all duration-300 overflow-hidden',
        scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'
      )}>
        <div className="container-main flex items-center justify-between py-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              +233 (024) 361 8186
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="size-3" />
              mail@lightworldtech.com
            </span>
          </div>
          <span className="hidden sm:block font-medium text-emerald-600">
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
            className="flex items-center gap-2 group"
          >
            <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Zap className="size-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight text-foreground">
                Lightworld
              </span>
              <span className="text-[10px] font-medium leading-tight text-emerald-600 tracking-wider uppercase">
                Technologies
              </span>
            </div>
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
                  currentPage === link.page
                    ? 'text-emerald-600'
                    : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                )}
              >
                {link.label}
                {currentPage === link.page && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Theme Toggle + CTA + Mobile menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => handleNav('contact')}
              className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
            >
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
                  <div className="flex items-center gap-2 px-6 py-5 border-b">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                      <Zap className="size-4 text-white" />
                    </div>
                    <span className="font-bold text-foreground">Lightworld Technologies</span>
                  </div>
                  <div className="flex-1 py-4">
                    {navLinks.map((link) => (
                      <button
                        key={link.page}
                        onClick={() => handleNav(link.page)}
                        className={cn(
                          'w-full text-left px-6 py-3 text-sm font-medium transition-colors',
                          currentPage === link.page
                            ? 'text-emerald-600 bg-emerald-50 border-r-2 border-emerald-500'
                            : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                        )}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-6 border-t">
                    <Button
                      onClick={() => handleNav('contact')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Get a Quote
                    </Button>
                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <p className="flex items-center gap-2">
                        <Phone className="size-3" />
                        +233 (024) 361 8186
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="size-3" />
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
