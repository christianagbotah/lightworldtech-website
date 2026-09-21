import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const enterpriseWorkspaces = [
  'src/components/admin/AdminPages.tsx',
  'src/components/admin/AdminMedia.tsx',
  'src/components/admin/AdminServices.tsx',
  'src/components/admin/AdminBlog.tsx',
  'src/components/admin/AdminBlogEditor.tsx',
  'src/components/admin/AdminTeam.tsx',
  'src/components/admin/AdminFAQs.tsx',
  'src/components/admin/AdminPortfolio.tsx',
  'src/components/admin/AdminTestimonials.tsx',
  'src/components/admin/AdminCRM.tsx',
  'src/components/admin/AdminProposals.tsx',
  'src/components/admin/AdminClients.tsx',
  'src/components/admin/AdminSupportDesk.tsx',
  'src/components/admin/AdminFinance.tsx',
  'src/components/admin/AdminMessages.tsx',
  'src/components/admin/AdminNewsletter.tsx',
  'src/components/admin/AdminCampaigns.tsx',
  'src/components/admin/AdminSms.tsx',
  'src/components/admin/AdminGovernance.tsx',
  'src/components/admin/AdminSettings.tsx',
];

describe('admin workspace consistency', () => {
  test('major admin workspaces share the enterprise page header', () => {
    for (const path of enterpriseWorkspaces) {
      expect(source(path)).toContain('AdminPageHeader');
    }
  });

  test('CMS and communication workspaces do not use the legacy green primary CTA', () => {
    for (const path of enterpriseWorkspaces) {
      expect(source(path)).not.toContain('bg-emerald-600 hover:bg-emerald-700');
    }
  });

  test('proposal native selectors use the shared rounded focus treatment', () => {
    const proposals = source('src/components/admin/AdminProposals.tsx');

    expect(proposals).toContain('rounded-xl border border-input');
    expect(proposals).toContain('focus:ring-2 focus:ring-amber-500/15');
  });

  test('blog editor exposes back, draft and publish actions through the shared header', () => {
    const editor = source('src/components/admin/AdminBlogEditor.tsx');

    expect(editor).toContain('Back to posts');
    expect(editor).toContain('Save Draft');
    expect(editor).toContain("form.published ? 'Update' : 'Publish'");
  });
});
