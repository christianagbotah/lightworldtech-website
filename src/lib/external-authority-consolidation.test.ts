import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('external authority consolidation', () => {
  test('connects the verified GhanaWeb and MyJoyOnline coverage to the company profile', () => {
    const profile = source('src/lib/company-profile.ts');

    expect(profile).toContain('Lightworld-Technologies-Limited-introduces-school-management-application-734612');
    expect(profile).toContain('Lightworld-Technologies-Limited-hosts-stakeholder-symposium-to-drive-tech-enabled-business-growth-1001818');
    expect(profile).toContain('myjoyonline.com/innovation-future-trends-how-technology-is-shaping-ghanas-tomorrow/');
    expect(profile).toContain("publisher: 'MyJoyOnline'");
  });

  test('newsroom defaults expose the same verified coverage sources', () => {
    const content = source('src/lib/site-content.ts');

    expect(content).toContain('export const defaultCoverage');
    expect(content).toContain('stakeholder symposium to drive tech-enabled business growth');
    expect(content).toContain('Innovation & Future Trends: How Technology is Shaping Ghana’s Tomorrow');
  });

  test('organization schema continues to publish coverage as subjectOf authority links', () => {
    const schema = source('src/components/ui/json-ld.tsx');

    expect(schema).toContain('...companyProfile.coverage.map');
    expect(schema).toContain("'@type': 'NewsArticle'");
    expect(schema).toContain('publisher: { \'@type\': \'Organization\', name: item.publisher }');
  });

  test('assistant media answers acknowledge both publishers without inventing social identities', () => {
    const profile = source('src/lib/company-profile.ts');

    expect(profile).toContain('/ghanaweb|myjoy|news|press|media|coverage/');
    expect(profile).toContain('Independent Ghanaian publishers have covered Lightworld Technologies Limited');
  });
});
