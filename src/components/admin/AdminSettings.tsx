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
      { key: 'companyName', label: 'Company Name', type: 'input' },
      { key: 'companyTagline', label: 'Tagline', type: 'input' },
      { key: 'companyDescription', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'Phone numbers, email, and address',
    fields: [
      { key: 'phone1', label: 'Phone 1', type: 'input' },
      { key: 'phone2', label: 'Phone 2', type: 'input' },
      { key: 'contactEmail', label: 'Email', type: 'input' },
      { key: 'address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    id: 'social',
    title: 'Social Media',
    description: 'Social media profile links',
    fields: [
      { key: 'facebook', label: 'Facebook', type: 'input' },
      { key: 'twitter', label: 'Twitter / X', type: 'input' },
      { key: 'linkedin', label: 'LinkedIn', type: 'input' },
      { key: 'instagram', label: 'Instagram', type: 'input' },
    ],
  },
  {
    id: 'hero',
    title: 'Hero Section',
    description: 'Homepage hero content and CTAs',
    fields: [
      { key: 'heroTitle', label: 'Hero Title', type: 'input' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'heroBadge1', label: 'Badge 1 Text', type: 'input' },
      { key: 'heroBadge2', label: 'Badge 2 Text', type: 'input' },
      { key: 'heroCtaText', label: 'CTA Button Text', type: 'input' },
      { key: 'heroCtaLink', label: 'CTA Button Link', type: 'input' },
      { key: 'heroSecondaryCtaText', label: 'Secondary CTA Text', type: 'input' },
      { key: 'heroSecondaryCtaLink', label: 'Secondary CTA Link', type: 'input' },
    ],
  },
  {
    id: 'stats',
    title: 'Statistics',
    description: 'Company stats displayed on the site',
    fields: [
      { key: 'statProjects', label: 'Projects Completed', type: 'number' },
      { key: 'statClients', label: 'Happy Clients', type: 'number' },
      { key: 'statYears', label: 'Years of Experience', type: 'number' },
      { key: 'statSatisfaction', label: 'Satisfaction Rate (%)', type: 'number' },
    ],
  },
  {
    id: 'about',
    title: 'About Page',
    description: 'About section content',
    fields: [
      { key: 'aboutTitle', label: 'About Title', type: 'input' },
      { key: 'aboutSubtitle', label: 'About Subtitle', type: 'input' },
      { key: 'aboutDescription', label: 'Description', type: 'textarea' },
      { key: 'aboutMission', label: 'Mission', type: 'textarea' },
      { key: 'aboutVision', label: 'Vision', type: 'textarea' },
      { key: 'aboutValues', label: 'Values', type: 'textarea' },
    ],
  },
  {
    id: 'seo',
    title: 'SEO Settings',
    description: 'Meta tags and SEO information',
    fields: [
      { key: 'seoTitle', label: 'Meta Title', type: 'input' },
      { key: 'seoDescription', label: 'Meta Description', type: 'textarea' },
      { key: 'seoKeywords', label: 'Keywords', type: 'textarea' },
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
