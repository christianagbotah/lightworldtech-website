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
const LOGO_URL = SITE_URL + '/logo.png';

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lightworld Technologies Ltd',
    alternateName: 'Lightworld Technologies',
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      'Technology company in Ghana building websites, mobile applications, enterprise software, AI-enabled workflows and cloud solutions, with IT training and technology consultancy.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Accra',
      addressRegion: 'Greater Accra',
      addressCountry: 'GH',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+233-24-361-8186',
      contactType: 'sales and customer service',
      email: 'mail@lightworldtech.com',
      availableLanguage: ['English'],
    },
    sameAs: [
      'https://facebook.com/lightworldtechnologies',
      'https://x.com/lightworldtech',
      'https://linkedin.com/company/lightworldtechnologies',
      'https://instagram.com/lightworldtechnologies',
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
      { '@type': 'Place', name: 'Africa' },
    ],
  };

  return <JsonLd data={data} />;
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lightworld Technologies',
    url: SITE_URL,
    description:
      'Software engineering, websites, mobile apps, enterprise systems, AI automation, cloud solutions, IT training and technology consultancy.',
    publisher: {
      '@type': 'Organization',
      name: 'Lightworld Technologies Ltd',
      logo: {
        '@type': 'ImageObject',
        url: LOGO_URL,
      },
    },
    inLanguage: 'en',
  };

  return <JsonLd data={data} />;
}
