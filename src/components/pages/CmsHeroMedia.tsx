'use client';

import { contentText, type SiteSettings } from '@/lib/site-content';

export default function CmsHeroMedia({
  settings,
  settingKey,
}: {
  settings?: SiteSettings;
  settingKey: string;
}) {
  const src = contentText(settings, settingKey, '').trim();
  if (!src) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <img
        src={src}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="h-full w-full scale-[1.02] object-cover opacity-30 dark:opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#f7f9f8] via-[#f7f9f8]/90 to-[#f7f9f8]/45 dark:from-[#050b10] dark:via-[#050b10]/90 dark:to-[#050b10]/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#f7f9f8]/45 via-transparent to-[#f7f9f8]/15 dark:from-[#050b10]/55 dark:to-[#050b10]/15" />
    </div>
  );
}
