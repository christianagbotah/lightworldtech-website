'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  Home,
  LayoutGrid,
  Mail,
  MessageSquare,
  Newspaper,
  Package,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
  Code2,
  BrainCircuit,
  Cloud,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { contentJson, contentText, type SiteSettings } from '@/lib/site-content';
import {
  normalizeNavigationLinks,
  normalizeNavigationMenu,
  safeNavigationHref,
} from '@/lib/navigation-content';

interface SearchItem {
  id: string;
  title: string;
  description: string;
  group: 'Pages' | 'Services' | 'Insights' | 'Portfolio' | 'FAQ';
  icon: LucideIcon;
  href: string;
}

interface ServiceRecord {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
}

interface BlogRecord {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  category?: { name?: string | null } | null;
}

interface PortfolioRecord {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
}

interface FaqRecord {
  id?: string;
  question?: string;
  answer?: string;
}

const navigationIcons = {
  building: Building2,
  brain: BrainCircuit,
  briefcase: Briefcase,
  cloud: Cloud,
  code: Code2,
  graduation: GraduationCap,
  grid: LayoutGrid,
  home: Home,
  key: KeyRound,
  message: MessageSquare,
  newspaper: Newspaper,
  shield: ShieldCheck,
  smartphone: Smartphone,
  users: Users,
  workflow: Workflow,
} as const;

function iconForKey(key: string): LucideIcon {
  return navigationIcons[key as keyof typeof navigationIcons] || LayoutGrid;
}

function iconForHref(href: string): LucideIcon {
  if (href === '/') return Home;
  if (href.startsWith('/blog')) return FileText;
  if (href.startsWith('/portfolio')) return Briefcase;
  if (href.startsWith('/products')) return Package;
  if (href.startsWith('/contact')) return Mail;
  if (href.startsWith('/team')) return Users;
  if (href.startsWith('/trust')) return ShieldCheck;
  if (href.startsWith('/newsroom')) return Newspaper;
  if (href.startsWith('/client')) return KeyRound;
  return LayoutGrid;
}

function cleanDescription(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 180) : fallback;
}

export default function CommandPalette({ settings = {} }: { settings?: SiteSettings }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [posts, setPosts] = useState<BlogRecord[]>([]);
  const [projects, setProjects] = useState<PortfolioRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);

  const primaryNav = normalizeNavigationLinks(
    contentJson<unknown>(settings, 'header_primary_links', [
      { label: 'Work', href: '/portfolio' },
      { label: 'Products', href: '/products' },
      { label: 'Insights', href: '/blog' },
    ]),
    [
      { label: 'Work', href: '/portfolio' },
      { label: 'Products', href: '/products' },
      { label: 'Insights', href: '/blog' },
    ],
  );

  const companyMenu = normalizeNavigationMenu(
    contentJson<unknown>(settings, 'header_company_menu', [
      { title: 'About Lightworld', desc: 'Company, direction and how we work', href: '/about', icon: 'building' },
      { title: 'Leadership', desc: 'Meet the people leading Lightworld', href: '/team', icon: 'users' },
      { title: 'Trust Center', desc: 'Security, privacy and responsible AI', href: '/trust', icon: 'shield' },
      { title: 'Newsroom & media', desc: 'Verified facts, awards and public coverage', href: '/newsroom', icon: 'newspaper' },
      { title: 'Careers', desc: 'Talent network and opportunities', href: '/careers', icon: 'briefcase' },
      { title: 'Contact', desc: 'Start a project or conversation', href: '/contact', icon: 'message' },
      { title: 'Client Portal', desc: 'Secure project and support workspace', href: '/client', icon: 'key' },
    ]),
    [],
  );

  const managedServiceMenu = normalizeNavigationMenu(
    contentJson<unknown>(settings, 'header_service_menu', []),
    [],
  );

  const pageItems = useMemo<SearchItem[]>(() => {
    const serviceLabel = contentText(settings, 'header_services_label', 'Services');
    const serviceHref = safeNavigationHref(
      contentText(settings, 'header_services_link', '/services'),
      '/services',
    );

    const raw: SearchItem[] = [
      {
        id: 'page-home',
        title: 'Home',
        description: 'Go to the homepage',
        group: 'Pages',
        icon: Home,
        href: '/',
      },
      {
        id: 'page-services',
        title: serviceLabel,
        description: 'Explore Lightworld capabilities',
        group: 'Pages',
        icon: LayoutGrid,
        href: serviceHref,
      },
      ...primaryNav.map((item) => ({
        id: 'page-primary-' + item.href + '-' + item.label,
        title: item.label,
        description: 'Open ' + item.label,
        group: 'Pages' as const,
        icon: iconForHref(item.href),
        href: item.href,
      })),
      ...companyMenu.map((item) => ({
        id: 'page-company-' + item.href + '-' + item.title,
        title: item.title,
        description: item.desc || 'Open ' + item.title,
        group: 'Pages' as const,
        icon: iconForKey(item.icon),
        href: item.href,
      })),
    ];

    return raw.filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.href === item.href && candidate.title === item.title) === index,
    );
  }, [companyMenu, primaryNav, settings]);

  const serviceItems = useMemo<SearchItem[]>(() => {
    if (services.length > 0) {
      return services
        .filter((service) => typeof service.title === 'string' && service.title.trim())
        .map((service, index) => ({
          id: 'service-' + (service.id || service.slug || index),
          title: String(service.title).trim(),
          description: cleanDescription(service.description, 'Lightworld service'),
          group: 'Services',
          icon: iconForKey(managedServiceMenu[index]?.icon || 'grid'),
          href: '/services',
        }));
    }

    return managedServiceMenu.map((service, index) => ({
      id: 'service-menu-' + index + '-' + service.title,
      title: service.title,
      description: service.desc || 'Lightworld service',
      group: 'Services',
      icon: iconForKey(service.icon),
      href: service.href,
    }));
  }, [managedServiceMenu, services]);

  const insightItems = useMemo<SearchItem[]>(
    () =>
      posts
        .filter((post) => post.title?.trim() && post.slug?.trim())
        .slice(0, 20)
        .map((post, index) => ({
          id: 'insight-' + (post.id || post.slug || index),
          title: String(post.title).trim(),
          description: cleanDescription(post.category?.name || post.excerpt, 'Published insight'),
          group: 'Insights',
          icon: FileText,
          href: '/blog/' + String(post.slug).trim(),
        })),
    [posts],
  );

  const portfolioItems = useMemo<SearchItem[]>(
    () =>
      projects
        .filter((project) => project.title?.trim())
        .slice(0, 20)
        .map((project, index) => ({
          id: 'portfolio-' + (project.id || index),
          title: String(project.title).trim(),
          description: cleanDescription(project.category || project.description, 'Published project'),
          group: 'Portfolio',
          icon: Briefcase,
          href: '/portfolio',
        })),
    [projects],
  );

  const faqItems = useMemo<SearchItem[]>(
    () =>
      faqs
        .filter((faq) => faq.question?.trim())
        .slice(0, 20)
        .map((faq, index) => ({
          id: 'faq-' + (faq.id || index),
          title: String(faq.question).trim(),
          description: cleanDescription(faq.answer, 'Frequently asked question'),
          group: 'FAQ',
          icon: MessageSquare,
          href: '/',
        })),
    [faqs],
  );

  const items = useMemo(
    () => [...pageItems, ...serviceItems, ...insightItems, ...portfolioItems, ...faqItems],
    [pageItems, serviceItems, insightItems, portfolioItems, faqItems],
  );

  useEffect(() => {
    if (!open || loaded) return;

    let cancelled = false;
    Promise.allSettled([
      fetch('/api/services?active=true', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/blog?published=true&limit=20', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/portfolio?active=true', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/faqs?active=true', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
    ]).then((results) => {
      if (cancelled) return;
      const values = results.map((result) => result.status === 'fulfilled' ? result.value : null);
      setServices(Array.isArray(values[0]?.data) ? values[0].data : []);
      setPosts(Array.isArray(values[1]?.data) ? values[1].data : []);
      setProjects(Array.isArray(values[2]?.data) ? values[2].data : []);
      setFaqs(Array.isArray(values[3]?.data) ? values[3].data : []);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [loaded, open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'Escape' && open) setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const openHref = useCallback(
    (rawHref: string) => {
      const href = safeNavigationHref(rawHref, '/');
      setOpen(false);
      if (href.startsWith('/')) {
        router.push(href);
        return;
      }
      window.location.assign(href);
    },
    [router],
  );

  const groups: Array<SearchItem['group']> = ['Pages', 'Services', 'Insights', 'Portfolio', 'FAQ'];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, services, insights, projects and FAQs..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No published content matches your search.</p>
          </div>
        </CommandEmpty>

        {groups.map((group, groupIndex) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;

          return (
            <div key={group}>
              {groupIndex > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => openHref(item.href)}
                    className="cursor-pointer"
                  >
                    <item.icon className="size-4 text-amber-500 dark:text-amber-400" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">{item.title}</span>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="ml-2 size-3 shrink-0 text-muted-foreground/50" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>

      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>Search current published website content</span>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
          <span>Navigate</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
          <span>Select</span>
          <Bot className="ml-1 size-3" />
        </div>
      </div>
    </CommandDialog>
  );
}
