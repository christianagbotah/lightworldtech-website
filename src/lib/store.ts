import { create } from 'zustand';

export type Page = 'home' | 'about' | 'services' | 'blog' | 'blog-detail' | 'contact' | 'portfolio' | 'careers' | 'products' | 'admin' | 'admin-dashboard' | 'admin-pages' | 'admin-services' | 'admin-blog' | 'admin-blog-editor' | 'admin-team' | 'admin-testimonials' | 'admin-crm' | 'admin-proposals' | 'admin-messages' | 'admin-settings' | 'admin-faqs' | 'admin-portfolio';

interface AppState {
  currentPage: Page;
  blogPostSlug: string | null;
  navigate: (page: Page, slug?: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  adminTab: string;
  setAdminTab: (tab: string) => void;
  blogSearch: string;
  setBlogSearch: (search: string) => void;
  blogCategory: string;
  setBlogCategory: (category: string) => void;
  contactSubject: string;
  setContactSubject: (subject: string) => void;
  isAdminLoggedIn: boolean;
  adminName: string;
  loginAdmin: (name: string) => void;
  logoutAdmin: () => void;
}

const publicRoutes: Partial<Record<Page, string>> = {
  home: '/',
  about: '/about',
  services: '/services',
  blog: '/blog',
  contact: '/contact',
  portfolio: '/portfolio',
  careers: '/careers',
  products: '/products',
  admin: '/admin',
};

const adminTabs: Partial<Record<Page, string>> = {
  'admin-dashboard': 'dashboard',
  'admin-pages': 'pages',
  'admin-services': 'services',
  'admin-blog': 'blog',
  'admin-blog-editor': 'blog-editor',
  'admin-team': 'team',
  'admin-testimonials': 'testimonials',
  'admin-crm': 'crm',
  'admin-proposals': 'proposals',
  'admin-messages': 'messages',
  'admin-settings': 'settings',
  'admin-faqs': 'faqs',
  'admin-portfolio': 'portfolio',
};

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'home',
  blogPostSlug: null,
  navigate: (page, slug) => {
    if (typeof window !== 'undefined') {
      if (page === 'blog-detail' && slug) {
        window.location.assign('/blog/' + encodeURIComponent(slug));
        return;
      }

      const publicRoute = publicRoutes[page];
      if (publicRoute) {
        if (page === 'admin' && window.location.pathname === '/admin') {
          set({ currentPage: page, adminTab: 'dashboard', blogPostSlug: null });
          return;
        }
        window.location.assign(publicRoute);
        return;
      }
    }

    const adminTab = adminTabs[page];
    set({
      currentPage: page,
      blogPostSlug: slug || null,
      ...(adminTab ? { adminTab } : {}),
    });

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  adminTab: 'dashboard',
  setAdminTab: (tab) => set({ adminTab: tab }),
  blogSearch: '',
  setBlogSearch: (search) => set({ blogSearch: search }),
  blogCategory: 'all',
  setBlogCategory: (category) => set({ blogCategory: category }),
  contactSubject: '',
  setContactSubject: (subject) => set({ contactSubject: subject }),
  isAdminLoggedIn: false,
  adminName: '',
  loginAdmin: (name) => set({ isAdminLoggedIn: true, adminName: name }),
  logoutAdmin: () => set({ isAdminLoggedIn: false, adminName: '', adminTab: 'dashboard' }),
}));
