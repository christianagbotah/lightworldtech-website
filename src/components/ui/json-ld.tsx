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
      'Software company',
      'Computer support and services',
      'Software training institute',
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
        areaServed: 'GH',
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
          areaServed: { '@type': 'Country', name: 'Ghana' },
        },
      })),
    },
    award: companyProfile.recognition.map(
      (item) => `${item.year} ${item.title} — ${item.publisher}`,
    ),
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
