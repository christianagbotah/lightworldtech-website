'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your website configuration</p>
      </div>

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

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={() => saveGroup(group)}
                  disabled={saving === group.id}
                  className="bg-emerald-600 hover:bg-emerald-700"
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
