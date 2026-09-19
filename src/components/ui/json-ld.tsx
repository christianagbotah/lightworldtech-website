import type { SeoConfig } from '@/lib/seo-config';

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

export function OrganizationJsonLd({ config }: { config: SeoConfig }) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.legalName,
    alternateName: config.siteName,
    url: config.siteUrl,
    logo: config.logoUrl,
    description: config.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.address,
      addressLocality: config.city,
      addressRegion: config.region,
      addressCountry: config.countryCode,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: config.phone,
      contactType: 'sales and customer service',
      email: config.contactEmail,
      availableLanguage: ['English'],
    },
    sameAs: config.socialUrls,
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
      { '@type': 'Place', name: 'Africa' },
    ],
  };

  return <JsonLd data={data} />;
}

export function WebSiteJsonLd({ config }: { config: SeoConfig }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteName,
    url: config.siteUrl,
    description: config.description,
    publisher: {
      '@type': 'Organization',
      name: config.legalName,
      logo: {
        '@type': 'ImageObject',
        url: config.logoUrl,
      },
    },
    inLanguage: 'en',
  };

  return <JsonLd data={data} />;
}
