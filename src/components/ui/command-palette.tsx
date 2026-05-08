'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Home,
  Info,
  Briefcase,
  FileText,
  Mail,
  FolderOpen,
  HelpCircle,
  Search,
  LayoutDashboard,
  Globe,
  Smartphone,
  GraduationCap,
  TrendingUp,
  Code,
  Server,
  Package,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore, type Page } from '@/lib/store';

interface SearchItem {
  id: string;
  title: string;
  description: string;
  group: string;
  icon: LucideIcon;
  action: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { navigate } = useAppStore();

  // Build search index with useMemo to avoid setState in effect
  const items = useMemo<SearchItem[]>(() => {
    const searchItems: SearchItem[] = [];

    // Navigation pages
    const pages: { title: string; desc: string; icon: LucideIcon; page: Page }[] = [
      { title: 'Home', desc: 'Go to the homepage', icon: Home, page: 'home' },
      { title: 'About Us', desc: 'Learn about our company', icon: Info, page: 'about' },
      { title: 'Services', desc: 'View our services', icon: Briefcase, page: 'services' },
      { title: 'Blog', desc: 'Read our latest articles', icon: FileText, page: 'blog' },
      { title: 'Contact', desc: 'Get in touch with us', icon: Mail, page: 'contact' },
      { title: 'Portfolio', desc: 'View our work', icon: FolderOpen, page: 'portfolio' },
      { title: 'Careers', desc: 'Join our team', icon: Briefcase, page: 'careers' },
      { title: 'Products', desc: 'Upcoming products', icon: Package, page: 'products' },
    ];

    for (const p of pages) {
      searchItems.push({
        id: `page-${p.page}`,
        title: p.title,
        description: p.desc,
        group: 'Pages',
        icon: p.icon,
        action: () => navigate(p.page),
      });
    }

    // Services
    const services = [
      { title: 'Web Development', desc: 'Custom websites and web applications', icon: Globe },
      { title: 'Mobile App Development', desc: 'iOS and Android applications', icon: Smartphone },
      { title: 'Skills Development', desc: 'IT training programs', icon: GraduationCap },
      { title: 'SEO & Marketing', desc: 'Digital marketing strategies', icon: TrendingUp },
      { title: 'Software Development', desc: 'Custom software solutions', icon: Code },
      { title: 'Hosting & Domain', desc: 'Reliable hosting services', icon: Server },
    ];

    for (const s of services) {
      searchItems.push({
        id: `service-${s.title}`,
        title: s.title,
        description: s.desc,
        group: 'Services',
        icon: s.icon,
        action: () => navigate('services'),
      });
    }

    // Blog posts (defaults)
    const blogPosts = [
      { title: 'Why Every Business Needs a Professional Website in 2025', desc: 'Business' },
      { title: 'The Complete Guide to Mobile App Development', desc: 'Mobile Apps' },
      { title: 'Top 10 Web Development Trends to Watch in 2025', desc: 'Web Development' },
      { title: 'How School Management Software Transforms Education', desc: 'Technology' },
      { title: 'UI/UX Design Principles Every Business Owner Should Know', desc: 'Design' },
      { title: 'SEO Strategies to Grow Your Business Online in Ghana', desc: 'SEO & Marketing' },
    ];

    for (const p of blogPosts) {
      searchItems.push({
        id: `blog-${p.title}`,
        title: p.title,
        description: p.desc,
        group: 'Blog Posts',
        icon: FileText,
        action: () => navigate('blog'),
      });
    }

    // Portfolio projects
    const projects = [
      { title: 'Grace Tabernacle Church Website', desc: 'Church' },
      { title: 'EduPrime School Management System', desc: 'Education' },
      { title: 'FreshBite Food Ordering Platform', desc: 'E-Commerce' },
      { title: 'Premier Hotels Booking System', desc: 'Hospitality' },
      { title: 'SecureGuard Security Management', desc: 'Security' },
      { title: 'MediCare Health Portal', desc: 'Healthcare' },
    ];

    for (const p of projects) {
      searchItems.push({
        id: `portfolio-${p.title}`,
        title: p.title,
        description: p.desc,
        group: 'Portfolio',
        icon: FolderOpen,
        action: () => navigate('portfolio'),
      });
    }

    // FAQs
    const faqs = [
      { title: 'How long does it take to build a website?', desc: 'FAQ' },
      { title: 'Do you provide website maintenance and support?', desc: 'FAQ' },
      { title: 'What technologies do you use for web development?', desc: 'FAQ' },
      { title: 'Can you help with existing website redesign?', desc: 'FAQ' },
      { title: 'Do you offer payment plans for projects?', desc: 'FAQ' },
      { title: 'Do you provide training on how to manage the website?', desc: 'FAQ' },
    ];

    for (const f of faqs) {
      searchItems.push({
        id: `faq-${f.title}`,
        title: f.title,
        description: f.desc,
        group: 'FAQ',
        icon: HelpCircle,
        action: () => navigate('home'),
      });
    }

    return searchItems;
  }, [navigate]);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const runAction = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, services, blog posts..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        </CommandEmpty>
        <CommandGroup heading="Pages">
          {items
            .filter((item) => item.group === 'Pages')
            .map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => runAction(item.action)}
                className="cursor-pointer"
              >
                <item.icon className="size-4 text-amber-500 dark:text-amber-400" />
                <span className="flex-1">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
                <ArrowRight className="size-3 text-muted-foreground/50 ml-2" />
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Services">
          {items
            .filter((item) => item.group === 'Services')
            .map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => runAction(item.action)}
                className="cursor-pointer"
              >
                <item.icon className="size-4 text-amber-500 dark:text-amber-400" />
                <div className="flex-1">
                  <span>{item.title}</span>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ArrowRight className="size-3 text-muted-foreground/50" />
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Blog Posts">
          {items
            .filter((item) => item.group === 'Blog Posts')
            .map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => runAction(item.action)}
                className="cursor-pointer"
              >
                <item.icon className="size-4 text-amber-500 dark:text-amber-400" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{item.title}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.description}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Portfolio">
          {items
            .filter((item) => item.group === 'Portfolio')
            .map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => runAction(item.action)}
                className="cursor-pointer"
              >
                <item.icon className="size-4 text-amber-500 dark:text-amber-400" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{item.title}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.description}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="FAQ">
          {items
            .filter((item) => item.group === 'FAQ')
            .map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => runAction(item.action)}
                className="cursor-pointer"
              >
                <item.icon className="size-4 text-slate-400 dark:text-slate-500" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block text-sm">{item.title}</span>
                </div>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Search across all content</span>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">↑↓</kbd>
          <span>Navigate</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">↵</kbd>
          <span>Select</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Esc</kbd>
          <span>Close</span>
        </div>
      </div>
    </CommandDialog>
  );
}
