import type { SeoConfig } from '@/lib/seo-config';
import { companyProfile } from '@/lib/company-profile';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

function organizationAddress(config: SeoConfig): Record<string, unknown> {
  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressLocality: config.city,
    addressRegion: config.region,
    addressCountry: config.countryCode,
  };

  const normalized = config.address.trim().toLowerCase();
  const genericLocations = new Set([
    config.city.trim().toLowerCase(),
    `${config.city}, ghana`.toLowerCase(),
    `${config.city}, ${config.region}`.toLowerCase(),
    `${config.city}, ${config.region}, ghana`.toLowerCase(),
  ]);

  if (normalized && !genericLocations.has(normalized)) {
    address.streetAddress = config.address;
  }

  return address;
}

export function OrganizationJsonLd({ config }: { config: SeoConfig }) {
  const organizationId = config.siteUrl + '/#organization';

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': organizationId,
    name: config.legalName,
    legalName: config.legalName,
    alternateName: [config.siteName, 'Lightworld Technologies Ltd'],
    url: config.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: config.logoUrl,
    },
    image: config.ogImage,
    description: config.description,
    slogan: companyProfile.tagline,
    email: config.contactEmail,
    telephone: config.phone,
    address: organizationAddress(config),
    location: {
      '@type': 'Place',
      '@id': config.siteUrl + '/#location',
      name: config.legalName + ' — Tema',
      address: organizationAddress(config),
      hasMap: companyProfile.googleMapsUrl,
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'Google Maps Place ID',
        value: companyProfile.googleMapsPlaceId,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: companyProfile.businessHours.weekdays.days,
          opens: companyProfile.businessHours.weekdays.opens,
          closes: companyProfile.businessHours.weekdays.closes,
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: companyProfile.businessHours.saturday.days,
          opens: companyProfile.businessHours.saturday.opens,
          closes: companyProfile.businessHours.saturday.closes,
        },
      ],
    },
    hasMap: companyProfile.googleMapsUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: companyProfile.businessHours.weekdays.days,
        opens: companyProfile.businessHours.weekdays.opens,
        closes: companyProfile.businessHours.weekdays.closes,
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: companyProfile.businessHours.saturday.days,
        opens: companyProfile.businessHours.saturday.opens,
        closes: companyProfile.businessHours.saturday.closes,
      },
    ],
    keywords: [
      ...companyProfile.businessCategories,
      'IT training institute',
      'Software development company in Ghana',
    ],

    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: config.phone,
        contactType: 'sales and customer service',
        email: config.contactEmail,
        availableLanguage: ['English'],
        areaServed: ['GH', 'Worldwide'],
      },
    ],
    knowsAbout: [
      'Software development',
      'Web development',
      'Mobile application development',
      'Enterprise software',
      'Artificial intelligence automation',
      'Cloud infrastructure',
      'Cybersecurity',
      'Search engine optimization',
      'Information technology training',
      'Technology consulting',
      'Software company',
      'Software training institute',
      'Computer support and services',
    ],
    areaServed: [
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'AdministrativeArea', name: 'Greater Accra Region' },
      { '@type': 'Place', name: 'Africa' },
      { '@type': 'Place', name: 'Worldwide' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Technology services',
      itemListElement: companyProfile.services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service,
          provider: { '@id': organizationId },
          areaServed: [
            { '@type': 'Country', name: 'Ghana' },
            { '@type': 'Place', name: 'Africa' },
            { '@type': 'Place', name: 'Worldwide' },
          ],
        },
      })),
    },
    award: companyProfile.recognition.map(
      (item) => `${item.year} ${item.title} — ${item.publisher}`,
    ),
    employee: companyProfile.leadership.map((person) => ({
      '@id': config.siteUrl + '/team#' + person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    })),
    subjectOf: [
      ...companyProfile.recognition.map((item) => ({
        '@type': 'CreativeWork',
        name: `${item.year} ${item.title}`,
        url: item.href,
        publisher: { '@type': 'Organization', name: item.publisher },
      })),
      ...companyProfile.coverage.map((item) => ({
        '@type': 'NewsArticle',
        headline: item.title,
        url: item.href,
        publisher: { '@type': 'Organization', name: item.publisher },
      })),
    ],
    sameAs: [companyProfile.googleMapsUrl, ...config.socialUrls],
  };

  return <JsonLd data={data} />;
}

export function LeadershipJsonLd({ config }: { config: SeoConfig }) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': companyProfile.leadership.map((person) => ({
      '@type': 'Person',
      '@id': config.siteUrl + '/team#' + person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name: person.name,
      jobTitle: person.role,
      description: person.description,
      url: config.siteUrl + '/team',
      worksFor: {
        '@id': config.siteUrl + '/#organization',
      },
    })),
  };

  return <JsonLd data={data} />;
}

export function WebSiteJsonLd({ config }: { config: SeoConfig }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': config.siteUrl + '/#website',
    name: config.siteName,
    alternateName: config.legalName,
    url: config.siteUrl,
    description: config.description,
    publisher: {
      '@id': config.siteUrl + '/#organization',
    },
    inLanguage: 'en-GH',
  };

  return <JsonLd data={data} />;
}

export function ServiceJsonLd({
  config,
  name,
  description,
  path,
  serviceType,
}: {
  config: SeoConfig;
  name: string;
  description: string;
  path: string;
  serviceType: string;
}) {
  const url = new URL(path, config.siteUrl + '/').toString();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': url + '#service',
    name,
    description,
    serviceType,
    url,
    provider: {
      '@id': config.siteUrl + '/#organization',
    },
    areaServed: [
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'AdministrativeArea', name: 'Greater Accra Region' },
      { '@type': 'Place', name: 'Africa' },
      { '@type': 'Place', name: 'Worldwide' },
    ],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: url,
    },
  };

  return <JsonLd data={data} />;
}

export function BreadcrumbJsonLd({
  config,
  items,
}: {
  config: SeoConfig;
  items: Array<{ name: string; path: string }>;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, config.siteUrl + '/').toString(),
    })),
  };

  return <JsonLd data={data} />;
}


export function EntityWebPageJsonLd({
  config,
  path,
  name,
  description,
  pageType = 'WebPage',
}: {
  config: SeoConfig;
  path: string;
  name: string;
  description: string;
  pageType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';
}) {
  const url = new URL(path, config.siteUrl + '/').toString();
  const data = {
    '@context': 'https://schema.org',
    '@type': pageType,
    '@id': url + '#webpage',
    url,
    name,
    description,
    isPartOf: {
      '@id': config.siteUrl + '/#website',
    },
    about: {
      '@id': config.siteUrl + '/#organization',
    },
    mainEntity: {
      '@id': config.siteUrl + '/#organization',
    },
    inLanguage: 'en-GH',
  };

  return <JsonLd data={data} />;
}

export function ServicesCollectionJsonLd({
  config,
  services,
}: {
  config: SeoConfig;
  services: Array<{ name: string; path: string; description: string }>;
}) {
  const url = new URL('/services', config.siteUrl + '/').toString();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url + '#webpage',
    url,
    name: 'Technology services from ' + config.legalName,
    description: 'Software, web, mobile, AI, cloud, security, SEO and IT training services from ' + config.legalName + ' in Ghana.',
    isPartOf: {
      '@id': config.siteUrl + '/#website',
    },
    about: {
      '@id': config.siteUrl + '/#organization',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: services.map((service, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Service',
          '@id': new URL(service.path, config.siteUrl + '/').toString() + '#service',
          name: service.name,
          description: service.description,
          url: new URL(service.path, config.siteUrl + '/').toString(),
          provider: {
            '@id': config.siteUrl + '/#organization',
          },
        },
      })),
    },
    inLanguage: 'en-GH',
  };

  return <JsonLd data={data} />;
}

export function BlogPostingJsonLd({
  config,
  post,
}: {
  config: SeoConfig;
  post: {
    slug: string;
    title: string;
    description: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    image?: string;
  };
}) {
  const url = new URL('/blog/' + post.slug, config.siteUrl + '/').toString();
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': url + '#article',
    headline: post.title,
    description: post.description,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url + '#webpage',
    },
    isPartOf: {
      '@id': config.siteUrl + '/#website',
    },
    author: {
      '@type': 'Organization',
      '@id': config.siteUrl + '/#organization',
      name: post.author || config.legalName,
    },
    publisher: {
      '@id': config.siteUrl + '/#organization',
    },
    inLanguage: 'en-GH',
  };

  if (post.image) {
    data.image = {
      '@type': 'ImageObject',
      url: post.image,
    };
  }

  return <JsonLd data={data} />;
}
