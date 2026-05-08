'use client';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const SITE_URL = 'https://www.lightworldtech.com';
const LOGO_URL = 'https://www.lightworldtech.com/wp-content/uploads/2018/10/Lightworldtech-Logo-favicon-1.png';

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lightworld Technologies Limited',
    alternateName: 'Lightworld Tech',
    url: SITE_URL,
    logo: LOGO_URL,
    description: 'Innovative IT solutions provider offering web development, mobile app development, software development, and digital marketing services in Ghana.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Accra',
      addressLocality: 'Accra',
      addressRegion: 'Greater Accra',
      addressCountry: 'GH',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+233-24-361-8186',
      contactType: 'customer service',
      email: 'mail@lightworldtech.com',
      availableLanguage: ['English'],
    },
    sameAs: [
      'https://facebook.com/lightworldtech',
      'https://twitter.com/lightworldtech',
      'https://linkedin.com/company/lightworldtech',
      'https://instagram.com/lightworldtech',
    ],
    foundingDate: '2016',
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      minValue: 10,
      maxValue: 50,
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 5.6037,
        longitude: -0.1870,
      },
      geoRadius: '500 km',
    },
  };

  return <JsonLd data={data} />;
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lightworld Technologies',
    alternateName: 'Lightworld Tech',
    url: SITE_URL,
    description: 'Innovative IT solutions provider in Ghana - Web Development, Mobile Apps, Software Development, Digital Marketing',
    publisher: {
      '@type': 'Organization',
      name: 'Lightworld Technologies Limited',
      logo: {
        '@type': 'ImageObject',
        url: LOGO_URL,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en',
  };

  return <JsonLd data={data} />;
}
