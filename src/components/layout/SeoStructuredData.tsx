import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/ui/json-ld';
import { getSeoConfig } from '@/lib/seo-config';

export default async function SeoStructuredData() {
  const seo = await getSeoConfig();

  return (
    <>
      <OrganizationJsonLd config={seo} />
      <WebSiteJsonLd config={seo} />
    </>
  );
}
