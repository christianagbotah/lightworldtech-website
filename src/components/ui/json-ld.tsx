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
    '@type': 'Organization',
    '@id': organizationId,
    name: config.siteName,
    legalName: config.legalName,
    alternateName: ['Lightworld Technologies Limited', 'Lightworld Technologies Ltd'],
    url: config.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: config.logoUrl,
    },
    image: config.ogImage,
    description: config.description,
    email: config.contactEmail,
    telephone: config.phone,
    address: organizationAddress(config),
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
