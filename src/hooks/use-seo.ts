'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

interface SEOOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
}

const defaultSEO = {
  title: 'Home',
  description:
    'Lightworld Technologies Limited - Leading IT solutions provider in Ghana. Web development, mobile apps, SEO, software development, and IT training.',
  keywords: ['IT company Ghana', 'web development', 'mobile apps', 'SEO', 'software development', 'Accra'],
  ogType: 'website',
};

export function useSEO(options: SEOOptions = {}) {
  const { currentPage } = useAppStore();

  useEffect(() => {
    const companyName = 'Lightworld Technologies';
    const title = options.title
      ? `${options.title} | ${companyName}`
      : `${defaultSEO.title} | ${companyName}`;
    const description = options.description || defaultSEO.description;
    const keywords = options.keywords?.length
      ? options.keywords.join(', ')
      : defaultSEO.keywords.join(', ');
    const ogImage = options.ogImage || '/og-default.png';
    const ogType = options.ogType || defaultSEO.ogType;
    const url = typeof window !== 'undefined' ? window.location.href : '';

    // Set document title
    document.title = title;

    // Helper to set or create meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      const selector = `meta[${attr}="${key}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', description);
    setMeta('name', 'keywords', keywords);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:site_name', companyName);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);
  }, [currentPage, options.title, options.description, options.keywords?.join(','), options.ogImage, options.ogType]);
}
