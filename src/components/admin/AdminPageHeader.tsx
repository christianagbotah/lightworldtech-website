import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            {eyebrow}
          </p>
        )}
        <h1 className={cn('text-2xl font-bold tracking-[-0.03em] text-foreground', eyebrow && 'mt-1')}>
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
