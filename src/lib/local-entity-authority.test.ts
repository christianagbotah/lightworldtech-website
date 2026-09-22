import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('local entity and crawl authority', () => {
  test('keeps verified Maps identity and business hours in one company profile', () => {
    const profile = source('src/lib/company-profile.ts');

    expect(profile).toContain("googleMapsPlaceId: 'ChIJl7EfYil_3w8R126pXLqlMgw'");
    expect(profile).toContain("phoneDisplay: '0243618186'");
    expect(profile).toContain("opens: '08:30'");
    expect(profile).toContain("closes: '17:30'");
    expect(profile).toContain("opens: '14:00'");
    expect(profile).toContain("closes: '16:00'");
  });

  test('organization schema links the company to its verified Tema place', () => {
    const schema = source('src/components/ui/json-ld.tsx');

    expect(schema).toContain("'@type': 'Place'");
    expect(schema).toContain("config.siteUrl + '/#location'");
    expect(schema).toContain("hasMap: companyProfile.googleMapsUrl");
    expect(schema).toContain("propertyID: 'Google Maps Place ID'");
    expect(schema).toContain("value: companyProfile.googleMapsPlaceId");
    expect(schema).toContain("'@type': 'OpeningHoursSpecification'");
    expect(schema).toContain('companyProfile.businessHours.weekdays.days');
    expect(schema).toContain('companyProfile.businessHours.saturday.days');
  });

  test('contact page does not duplicate the Maps Place ID or business-hour values', () => {
    const contact = source('src/components/pages/ContactPage.tsx');

    expect(contact).toContain("import { companyProfile } from '@/lib/company-profile'");
    expect(contact).toContain('const GOOGLE_MAPS_OPEN_URL = companyProfile.googleMapsUrl');
    expect(contact).toContain('companyProfile.googleMapsPlaceId');
    expect(contact).toContain('companyProfile.businessHours.weekdays.opens');
    expect(contact).toContain('companyProfile.businessHours.saturday.opens');
    expect(contact).not.toContain("const GOOGLE_MAPS_PLACE_ID =");
  });

  test('footer links the visible location to the verified Maps entity', () => {
    const footer = source('src/components/layout/Footer.tsx');

    expect(footer).toContain("import { companyProfile } from '@/lib/company-profile'");
    expect(footer).toContain('href={companyProfile.googleMapsUrl}');
    expect(footer).toContain("'Open ' + companyName + ' on Google Maps'");
  });
});
