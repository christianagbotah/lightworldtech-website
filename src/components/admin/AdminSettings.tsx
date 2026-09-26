'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Search, RefreshCw, Database, Mail, MessageSquareText, KeyRound, CreditCard, HardDrive, Activity, GitCommitHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { fetchJson } from '@/lib/client-api';
import { useAppStore } from '@/lib/store';

type SettingsData = Record<string, string>;

type HealthData = {
  status: 'healthy' | 'attention';
  checkedAt: string;
  database: { status: 'healthy' | 'unhealthy'; latencyMs: number; message?: string };
  mail: { status: 'healthy' | 'attention'; mode: string; configured: boolean; warning: string };
  communications: {
    status: 'healthy' | 'attention';
    smsConfigured: boolean;
    otpConfigured: boolean;
    paymentsConfigured: boolean;
    dispatcherConfigured: boolean;
    automationEnabled: boolean;
    automation: {
      serviceRenewals: boolean;
      projectRenewals: boolean;
      collections: boolean;
      collectionEmail: boolean;
      renewalDrafts: boolean;
      projectRenewalDrafts: boolean;
    };
    runtime: {
      status: string;
      lastSuccessAt: string | null;
      lastCompletedAt: string | null;
      durationMs: number;
      consecutiveFailures: number;
      ageMinutes: number | null;
      maxAgeMinutes: number;
    };
    warning: string;
  };
};

type BackupArtifact = {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  ageHours: number;
  freshness: 'fresh' | 'stale';
};

type ReleaseStatus = {
  releaseSha: string | null;
  shortSha: string | null;
  artifactTimestamp: string | null;
  startedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  provenance: 'verified_artifact' | 'unavailable';
};

type BackupData = {
  status: 'healthy' | 'attention' | 'missing';
  database: BackupArtifact | null;
  uploads: BackupArtifact | null;
  checkedAt: string;
  restoreVerification: {
    status: 'verified' | 'stale' | 'failed' | 'not_verified';
    verifiedAt: string | null;
    ageHours: number | null;
    databaseArtifact: string;
    uploadsArtifact: string;
    publicTableCount: number | null;
    uploadArchiveEntries: number | null;
    method: string;
    message: string;
  };
};


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
  const { adminRole, navigate } = useAppStore();
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [release, setRelease] = useState<ReleaseStatus | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');


  const fetchReadiness = useCallback(async () => {
    setReadinessLoading(true);
    setReadinessError('');
    try {
      const [healthPayload, backupPayload, releasePayload] = await Promise.all([
        fetchJson<{ data: HealthData }>('/api/admin/health', { cache: 'no-store' }, 'Unable to load system health'),
        adminRole === 'super_admin'
          ? fetchJson<{ data: BackupData }>('/api/admin/operations/backup-status', { cache: 'no-store' }, 'Unable to load backup readiness')
          : Promise.resolve(null),
        fetchJson<{ data: ReleaseStatus }>('/api/admin/operations/release-status', { cache: 'no-store' }, 'Unable to load release provenance'),
      ]);
      setHealth(healthPayload.data);
      setBackup(backupPayload?.data || null);
      setRelease(releasePayload.data);
    } catch (error) {
      setReadinessError(error instanceof Error ? error.message : 'Unable to load production readiness');
    } finally {
      setReadinessLoading(false);
    }
  }, [adminRole]);

  const fetchSettings = useCallback(async () => {
    try {
      setSettings(await fetchJson<SettingsData>('/api/settings', { cache: 'no-store' }, 'Failed to load settings'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.all([fetchSettings(), fetchReadiness()]); }, [fetchSettings, fetchReadiness]);

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

      await fetchJson('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      }, 'Failed to save ' + group.title + ' settings');

      toast.success(`${group.title} settings saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${group.title} settings`);
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

      <Card className="border-border/60">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Production readiness</CardTitle>
            <CardDescription className="mt-1">
              Live server-side checks for the systems behind customer communication, payments, automation and recovery.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchReadiness()} disabled={readinessLoading}>
            <RefreshCw className={readinessLoading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            Refresh status
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {readinessError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{readinessError}</span>
            </div>
          )}

          {readinessLoading && !health ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: adminRole === 'super_admin' ? 9 : 8 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : health ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'Deployed release',
                    value: release?.shortSha || 'Unknown',
                    ready: release?.provenance === 'verified_artifact',
                    detail: release?.artifactTimestamp
                      ? 'Artifact ' + new Date(release.artifactTimestamp).toLocaleString()
                      : 'RELEASE_SHA is not available in this runtime',
                    icon: GitCommitHorizontal,
                  },
                  {
                    label: 'Database',
                    value: health.database.status === 'healthy' ? health.database.latencyMs + ' ms' : 'Unavailable',
                    ready: health.database.status === 'healthy',
                    detail: health.database.message || 'PostgreSQL connectivity',
                    icon: Database,
                  },
                  {
                    label: 'Outbound mail',
                    value: health.mail.configured ? health.mail.mode : 'Not configured',
                    ready: health.mail.configured,
                    detail: health.mail.warning || 'Transactional email ready',
                    icon: Mail,
                  },
                  {
                    label: 'Hubtel SMS',
                    value: health.communications.smsConfigured ? 'Configured' : 'Not configured',
                    ready: health.communications.smsConfigured,
                    detail: 'Single, campaign and automated SMS',
                    icon: MessageSquareText,
                  },
                  {
                    label: 'Hubtel OTP',
                    value: health.communications.otpConfigured ? 'Configured' : 'Not configured',
                    ready: health.communications.otpConfigured,
                    detail: 'OTP send and verification endpoints',
                    icon: KeyRound,
                  },
                  {
                    label: 'Hubtel payments',
                    value: health.communications.paymentsConfigured ? 'Configured' : 'Not configured',
                    ready: health.communications.paymentsConfigured,
                    detail: 'Checkout and verified transaction status',
                    icon: CreditCard,
                  },
                  {
                    label: 'Automation dispatcher',
                    value: health.communications.dispatcherConfigured ? 'Configured' : 'Not configured',
                    ready: health.communications.dispatcherConfigured,
                    detail: health.communications.automationEnabled ? 'Protected scheduler required by enabled automations' : 'No automation currently enabled',
                    icon: Activity,
                  },
                  {
                    label: 'Automation runtime',
                    value:
                      health.communications.runtime.status === 'healthy'
                        ? 'Healthy'
                        : health.communications.runtime.status.replaceAll('_', ' '),
                    ready:
                      !health.communications.automationEnabled ||
                      (health.communications.runtime.status === 'healthy' &&
                        health.communications.runtime.ageMinutes !== null &&
                        health.communications.runtime.ageMinutes <= health.communications.runtime.maxAgeMinutes),
                    detail: health.communications.runtime.lastSuccessAt
                      ? 'Last success ' + new Date(health.communications.runtime.lastSuccessAt).toLocaleString()
                      : 'No successful dispatcher run recorded',
                    icon: RefreshCw,
                  },
                  ...(adminRole === 'super_admin'
                    ? [{
                        label: 'Backup & recovery',
                        value: backup?.status === 'healthy' ? 'Verified' : backup?.status === 'attention' ? 'Needs attention' : 'Missing',
                        ready: backup?.status === 'healthy',
                        detail: backup?.database && backup?.uploads
                          ? 'DB ' + backup.database.ageHours + 'h · uploads ' + backup.uploads.ageHours + 'h · restore ' +
                            (backup.restoreVerification.status === 'verified'
                              ? (backup.restoreVerification.ageHours ?? 0) + 'h ago'
                              : backup.restoreVerification.status.replaceAll('_', ' '))
                          : 'Fresh database, uploads and a recent restore rehearsal are required',
                        icon: HardDrive,
                      }]
                    : []),
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className={'flex size-9 items-center justify-center rounded-lg ' + (item.ready ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')}>
                          <Icon className="size-4" />
                        </span>
                        {item.ready ? (
                          <CheckCircle2 className="size-4 text-emerald-600" aria-label="Ready" />
                        ) : (
                          <AlertTriangle className="size-4 text-amber-600" aria-label="Needs attention" />
                        )}
                      </div>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold">{item.value}</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{item.detail}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Overall production signal: {health.status === 'healthy' ? 'Healthy' : 'Needs attention'}
                  </p>
                  {release && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Runtime started {new Date(release.startedAt).toLocaleString()} · {release.nodeVersion} · {release.environment}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {health.communications.warning || 'Database, mail and enabled automation dependencies are currently reporting healthy.'}
                    {adminRole === 'super_admin' && backup?.restoreVerification?.message
                      ? ' ' + backup.restoreVerification.message
                      : ''}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => navigate('admin-sms')}>
                  Open SMS & automation
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

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
                          ['Insights RSS', canonicalSiteUrl + '/feed.xml'],
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
