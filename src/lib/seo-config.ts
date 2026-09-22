import 'server-only';

import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/site-content-server';
import type { SiteSettings } from '@/lib/site-content';

export interface SeoConfig {
  siteUrl: string;
  siteName: string;
  legalName: string;
  defaultTitle: string;
  description: string;
  keywords: string[];
  ogImage: string;
  logoUrl: string;
  locale: string;
  googleVerification: string;
  bingVerification: string;
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  countryCode: string;
  socialUrls: string[];
}

const DEFAULT_SITE_URL = 'https://lightworldtech.com';

function text(settings: SiteSettings, key: string, fallback: string): string {
  const value = settings[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeSiteUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function assetUrl(siteUrl: string, value: string, fallbackPath: string): string {
  const candidate = value.trim() || fallbackPath;
  try {
    return new URL(candidate, siteUrl + '/').toString();
  } catch {
    return new URL(fallbackPath, siteUrl + '/').toString();
  }
}

function validWebUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return '+233' + digits.slice(1);
  if (/^2330\d{9}$/.test(digits)) return '+233' + digits.slice(4);
  if (/^233\d{9}$/.test(digits)) return '+' + digits;
  return value.trim();
}

export function buildSeoConfig(settings: SiteSettings): SeoConfig {
  const siteUrl = normalizeSiteUrl(text(settings, 'seo_site_url', DEFAULT_SITE_URL));
  const siteName = text(settings, 'seo_site_name', 'Lightworld Technologies');
  const legalName = text(settings, 'seo_legal_name', 'Lightworld Technologies Limited');
  const description = text(
    settings,
    'seo_description',
    'Lightworld Technologies Limited is a Ghanaian software and IT company in Tema, Greater Accra, building websites, mobile apps, enterprise software, AI automation and cloud solutions, with IT training and technology consulting.',
  );
  const keywords = text(
    settings,
    'seo_keywords',
    'Lightworld Technologies Limited, Lightworld Technologies Ghana, software company Ghana, software development Ghana, web development Ghana, website development Ghana, mobile app development Ghana, enterprise software Ghana, AI automation Ghana, IT company Tema, IT company Ghana, IT consulting Ghana, IT training Ghana, cloud solutions Ghana',
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

  const socialKeys = [
    'social_facebook',
    'social_twitter',
    'social_linkedin',
    'social_instagram',
  ];
  const socialUrls = socialKeys
    .map((key) => settings[key]?.trim())
    .filter((value): value is string => Boolean(value))
    .map(validWebUrl)
    .filter((value): value is string => Boolean(value));

  return {
    siteUrl,
    siteName,
    legalName,
    defaultTitle: text(
      settings,
      'seo_title',
      'Lightworld Technologies Limited | Software Company in Ghana',
    ),
    description,
    keywords,
    ogImage: assetUrl(siteUrl, text(settings, 'seo_og_image', '/slides/slide-hero.png'), '/slides/slide-hero.png'),
    logoUrl: assetUrl(siteUrl, text(settings, 'seo_logo_url', '/logo.png'), '/logo.png'),
    locale: text(settings, 'seo_locale', 'en_GH'),
    googleVerification: text(settings, 'seo_google_verification', ''),
    bingVerification: text(settings, 'seo_bing_verification', ''),
    contactEmail: text(settings, 'company_email', 'mail@lightworldtech.com'),
    phone: normalizePhone(text(settings, 'company_phone1', '0243618186')),
    address: text(settings, 'company_address', 'Tema, Ghana'),
    city: text(settings, 'seo_address_city', 'Tema'),
    region: text(settings, 'seo_address_region', 'Greater Accra'),
    countryCode: text(settings, 'seo_country_code', 'GH').toUpperCase().slice(0, 2),
    socialUrls,
  };
}

export async function getSeoConfig(): Promise<SeoConfig> {
  return buildSeoConfig(await getSiteSettings());
}

export function seoAbsoluteUrl(config: SeoConfig, path: string): string {
  return new URL(path || '/', config.siteUrl + '/').toString();
}


export function buildPageMetadata(
  config: SeoConfig,
  input: {
    title: string;
    description: string;
    path: string;
    openGraphTitle?: string;
    image?: string;
    absoluteTitle?: boolean;
  },
): Metadata {
  const image = input.image || config.ogImage;
  const url = seoAbsoluteUrl(config, input.path);

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: config.locale,
      siteName: config.siteName,
      title: input.openGraphTitle || input.title,
      description: input.description,
      url,
      images: [{ url: image, alt: input.openGraphTitle || input.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.openGraphTitle || input.title,
      description: input.description,
      images: [image],
    },
  };
}
