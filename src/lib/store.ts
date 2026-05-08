import { create } from 'zustand';

export type Page = 'home' | 'about' | 'services' | 'blog' | 'blog-detail' | 'contact' | 'portfolio' | 'admin' | 'admin-dashboard' | 'admin-services' | 'admin-blog' | 'admin-blog-editor' | 'admin-team' | 'admin-testimonials' | 'admin-messages' | 'admin-settings' | 'admin-faqs' | 'admin-portfolio';

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
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'home',
  blogPostSlug: null,
  navigate: (page, slug) => {
    if (slug) {
      set({ currentPage: page, blogPostSlug: slug });
    } else {
      set({ currentPage: page, blogPostSlug: null });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  adminTab: 'dashboard',
  setAdminTab: (tab) => set({ adminTab: tab }),
  blogSearch: '',
  setBlogSearch: (search) => set({ blogSearch: search }),
  blogCategory: 'all',
  setBlogCategory: (category) => set({ blogCategory: category }),
}));
