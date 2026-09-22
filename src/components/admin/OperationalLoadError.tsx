'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OperationalLoadError({
  title = 'This workspace could not be refreshed',
  message,
  retrying = false,
  onRetry,
}: {
  title?: string;
  message: string;
  retrying?: boolean;
  onRetry: () => void;
}) {
  return (
    <Card role="alert" className="border-amber-300/70 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-amber-950 dark:text-amber-100">{title}</p>
            <p className="mt-1 text-sm leading-6 text-amber-900/70 dark:text-amber-200/70">{message}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRetry} disabled={retrying} className="shrink-0 border-amber-300 bg-background">
          <RefreshCw className={retrying ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
