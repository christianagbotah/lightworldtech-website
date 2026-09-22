'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type ConfirmTone = 'default' | 'warning' | 'destructive';

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'warning',
  onConfirm,
}: ConfirmActionDialogProps) {
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) setWorking(false);
  }, [open]);

  const confirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (working) return;

    setWorking(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  };

  const destructive = tone === 'destructive';

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!working) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent className="overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl shadow-slate-950/20 dark:shadow-black/40">
        <div
          className={cn(
            'h-1 w-full',
            destructive ? 'bg-rose-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-slate-400',
          )}
        />
        <AlertDialogHeader className="px-6 pb-2 pt-5 sm:text-left">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-2xl border',
                destructive
                  ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
              )}
            >
              {destructive ? <ShieldAlert className="size-5" /> : <AlertTriangle className="size-5" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <AlertDialogTitle className="text-lg tracking-[-0.02em]">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm leading-6">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-3 border-t border-border/60 bg-muted/20 px-6 py-4">
          <AlertDialogCancel disabled={working} className="rounded-xl">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={working}
            onClick={confirm}
            className={cn(
              'rounded-xl',
              destructive
                ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500'
                : 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
            )}
          >
            {working && <Loader2 className="mr-2 size-4 animate-spin" />}
            {working ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
