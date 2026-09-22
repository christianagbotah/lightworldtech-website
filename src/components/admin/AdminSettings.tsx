'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type SettingsData = Record<string, string>;

interface SettingsGroup {
  id: string;
  title: string;
  description: string;
  fields: { key: string; label: string; type: 'input' | 'textarea' | 'number' }[];
}

const settingsGroups: SettingsGroup[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Basic company information',
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'input' },
      { key: 'company_tagline', label: 'Tagline', type: 'input' },
      { key: 'company_description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'Phone numbers, email, and address',
    fields: [
      { key: 'company_phone1', label: 'Phone 1', type: 'input' },
      { key: 'company_phone2', label: 'Phone 2', type: 'input' },
      { key: 'company_whatsapp', label: 'WhatsApp Number', type: 'input' },
      { key: 'company_email', label: 'Email', type: 'input' },
      { key: 'company_address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    id: 'social',
    title: 'Social Media',
    description: 'Social media profile links',
    fields: [
      { key: 'social_facebook', label: 'Facebook', type: 'input' },
      { key: 'social_twitter', label: 'Twitter / X', type: 'input' },
      { key: 'social_linkedin', label: 'LinkedIn', type: 'input' },
      { key: 'social_instagram', label: 'Instagram', type: 'input' },
    ],
  },
  {
    id: 'hero',
    title: 'Hero Section',
    description: 'Homepage hero content and CTAs',
    fields: [
      { key: 'hero_title', label: 'Hero Title', type: 'input' },
      { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'hero_badge1', label: 'Badge 1 Text', type: 'input' },
      { key: 'hero_badge2', label: 'Badge 2 Text', type: 'input' },
      { key: 'hero_cta_text', label: 'CTA Button Text', type: 'input' },
      { key: 'hero_cta_link', label: 'CTA Button Link', type: 'input' },
      { key: 'hero_cta2_text', label: 'Secondary CTA Text', type: 'input' },
      { key: 'hero_cta2_link', label: 'Secondary CTA Link', type: 'input' },
    ],
  },
  {
    id: 'stats',
    title: 'Statistics',
    description: 'Company stats displayed on the site',
    fields: [
      { key: 'stat_projects', label: 'Projects Completed', type: 'number' },
      { key: 'stat_clients', label: 'Happy Clients', type: 'number' },
      { key: 'stat_years', label: 'Years of Experience', type: 'number' },
      { key: 'stat_satisfaction', label: 'Satisfaction Rate (%)', type: 'number' },
    ],
  },
  {
    id: 'about',
    title: 'About Page',
    description: 'About section content',
    fields: [
      { key: 'about_title', label: 'About Title', type: 'input' },
      { key: 'about_subtitle', label: 'About Subtitle', type: 'input' },
      { key: 'about_description', label: 'Description', type: 'textarea' },
      { key: 'about_mission', label: 'Mission', type: 'textarea' },
      { key: 'about_vision', label: 'Vision', type: 'textarea' },
      { key: 'about_values', label: 'Values', type: 'textarea' },
    ],
  },
  {
    id: 'seo',
    title: 'SEO & Brand Discovery',
    description: 'Global search, social preview, canonical host and organization identity settings',
    fields: [
      { key: 'seo_site_url', label: 'Canonical Site URL', type: 'input' },
      { key: 'seo_site_name', label: 'Site / Brand Name', type: 'input' },
      { key: 'seo_legal_name', label: 'Legal Company Name', type: 'input' },
      { key: 'seo_title', label: 'Default Meta Title', type: 'input' },
      { key: 'seo_description', label: 'Default Meta Description', type: 'textarea' },
      { key: 'seo_keywords', label: 'Keywords (comma-separated)', type: 'textarea' },
      { key: 'seo_og_image', label: 'Default Social Preview Image URL', type: 'input' },
      { key: 'seo_logo_url', label: 'Organization Logo URL', type: 'input' },
      { key: 'seo_locale', label: 'Open Graph Locale', type: 'input' },
      { key: 'seo_google_verification', label: 'Google Site Verification Token', type: 'input' },
      { key: 'seo_bing_verification', label: 'Bing Site Verification Token', type: 'input' },
      { key: 'seo_address_city', label: 'Organization City', type: 'input' },
      { key: 'seo_address_region', label: 'Organization Region', type: 'input' },
      { key: 'seo_country_code', label: 'Country Code', type: 'input' },
    ],
  },
  {
    id: 'page-seo',
    title: 'Page SEO',
    description: 'Search titles and descriptions for the main public pages',
    fields: [
      { key: 'seo_home_title', label: 'Home Title', type: 'input' },
      { key: 'seo_home_description', label: 'Home Description', type: 'textarea' },
      { key: 'seo_services_title', label: 'Services Title', type: 'input' },
      { key: 'seo_services_description', label: 'Services Description', type: 'textarea' },
      { key: 'seo_about_title', label: 'About Title', type: 'input' },
      { key: 'seo_about_description', label: 'About Description', type: 'textarea' },
      { key: 'seo_portfolio_title', label: 'Portfolio Title', type: 'input' },
      { key: 'seo_portfolio_description', label: 'Portfolio Description', type: 'textarea' },
      { key: 'seo_products_title', label: 'Products Title', type: 'input' },
      { key: 'seo_products_description', label: 'Products Description', type: 'textarea' },
      { key: 'seo_contact_title', label: 'Contact Title', type: 'input' },
      { key: 'seo_contact_description', label: 'Contact Description', type: 'textarea' },
      { key: 'seo_team_title', label: 'Team Title', type: 'input' },
      { key: 'seo_team_description', label: 'Team Description', type: 'textarea' },
      { key: 'seo_careers_title', label: 'Careers Title', type: 'input' },
      { key: 'seo_careers_description', label: 'Careers Description', type: 'textarea' },
      { key: 'seo_trust_title', label: 'Trust Center Title', type: 'input' },
      { key: 'seo_trust_description', label: 'Trust Center Description', type: 'textarea' },
      { key: 'seo_newsroom_title', label: 'Newsroom Title', type: 'input' },
      { key: 'seo_newsroom_description', label: 'Newsroom Description', type: 'textarea' },
      { key: 'seo_blog_title', label: 'Blog / Insights Title', type: 'input' },
      { key: 'seo_blog_social_title', label: 'Blog Social Preview Title', type: 'input' },
      { key: 'seo_blog_description', label: 'Blog / Insights Description', type: 'textarea' },
    ],
  },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      setSettings(await res.json());
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateField = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveGroup = async (group: SettingsGroup) => {
    setSaving(group.id);
    try {
      const groupData: Record<string, string> = {};
      group.fields.forEach(f => {
        groupData[f.key] = settings[f.key] || '';
      });

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${group.title} settings saved`);
    } catch {
      toast.error(`Failed to save ${group.title} settings`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const canonicalSiteUrl = (settings.seo_site_url || 'https://lightworldtech.com').trim().replace(/\/+$/, '');
  const googleVerified = Boolean((settings.seo_google_verification || '').trim());
  const bingVerified = Boolean((settings.seo_bing_verification || '').trim());

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage global company information, contact details, brand metadata, SEO and website configuration."
      />

      <div className="space-y-6">
        {settingsGroups.map((group) => (
          <Card key={group.id} className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {group.fields.map((field, idx) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'grid gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                    <div className="grid gap-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={settings[field.key] || ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={settings[field.key] || ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {group.id === 'seo' && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/10 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Search className="size-4 text-amber-700 dark:text-amber-300" />
                        <p className="text-sm font-semibold">Search visibility readiness</p>
                      </div>
                      <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
                        Use Google Search Console to verify the canonical site, submit the sitemap, inspect indexed URLs and monitor the real queries bringing people to Lightworld. Verification tokens are never guessed or generated by the website.
                      </p>
                    </div>
                    <a
                      href="https://search.google.com/search-console"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-background px-3.5 text-xs font-semibold text-amber-800 transition hover:border-amber-500 dark:text-amber-200"
                    >
                      Open Search Console <ExternalLink className="size-3.5" />
                    </a>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'Canonical website',
                        value: canonicalSiteUrl,
                        ready: canonicalSiteUrl === 'https://lightworldtech.com',
                        detail: canonicalSiteUrl === 'https://lightworldtech.com' ? 'Apex domain is aligned' : 'Use https://lightworldtech.com',
                      },
                      {
                        label: 'Google verification',
                        value: googleVerified ? 'Configured' : 'Not configured',
                        ready: googleVerified,
                        detail: googleVerified ? 'Verification meta tag will be published' : 'Paste the token from Search Console',
                      },
                      {
                        label: 'Bing verification',
                        value: bingVerified ? 'Configured' : 'Not configured',
                        ready: bingVerified,
                        detail: bingVerified ? 'Bing verification meta tag will be published' : 'Optional, but useful for Bing discovery',
                      },
                      {
                        label: 'Sitemap',
                        value: canonicalSiteUrl + '/sitemap.xml',
                        ready: true,
                        detail: 'Submit this exact URL in Search Console',
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border/60 bg-background p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                          {item.ready ? (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="Ready" />
                          ) : (
                            <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-label="Needs attention" />
                          )}
                        </div>
                        <p className="mt-2 break-all text-xs font-semibold">{item.value}</p>
                        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
                    <div className="rounded-xl border border-border/60 bg-background p-4">
                      <p className="text-xs font-semibold">Google Search Console workflow</p>
                      <ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                        <li><strong className="text-foreground">1.</strong> Add <span className="font-mono text-foreground">{canonicalSiteUrl}</span> as the URL-prefix property, or verify the whole domain with DNS.</li>
                        <li><strong className="text-foreground">2.</strong> If Google gives an HTML meta tag, paste only its <span className="font-mono text-foreground">content</span> token into “Google Site Verification Token” above and save this group.</li>
                        <li><strong className="text-foreground">3.</strong> Submit <span className="font-mono text-foreground">{canonicalSiteUrl + '/sitemap.xml'}</span> under Sitemaps.</li>
                        <li><strong className="text-foreground">4.</strong> Use URL Inspection for the homepage, About, Services, Software Development and IT Training pages, then request indexing when Google says a page is not indexed.</li>
                      </ol>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background p-4">
                      <p className="text-xs font-semibold">Live crawl resources</p>
                      <div className="mt-3 grid gap-2">
                        {[
                          ['Sitemap', canonicalSiteUrl + '/sitemap.xml'],
                          ['Robots', canonicalSiteUrl + '/robots.txt'],
                          ['Software development', canonicalSiteUrl + '/services/software-development'],
                          ['IT training', canonicalSiteUrl + '/services/it-training'],
                        ].map(([label, href]) => (
                          <a key={href} href={href} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border/60 px-3 text-xs font-medium transition hover:border-amber-300">
                            <span>{label}</span><ExternalLink className="size-3.5 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!googleVerified && (
                    <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-100/60 p-3 text-xs leading-5 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <p>Google verification is still empty. The website is crawlable and indexable, but Search Console ownership cannot be confirmed until a real Google verification method is completed.</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={() => saveGroup(group)}
                  disabled={saving === group.id}
                >
                  {saving === group.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save {group.title}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
