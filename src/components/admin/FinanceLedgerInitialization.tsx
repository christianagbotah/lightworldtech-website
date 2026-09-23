'use client';

import { useEffect, useState } from 'react';
import { DatabaseZap, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BackfillPreview = {
  pending: number;
  ready: number;
  blocked: number;
  byType: Record<string, number>;
  blockedRecords: Array<{
    kind: string;
    id: string;
    date: string;
  }>;
  periods: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  canBackfill: boolean;
};

async function getPreview(): Promise<BackfillPreview> {
  const response = await fetch('/api/admin/finance/accounting/backfill', { cache: 'no-store' });
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep HTML gateway responses out of the UI.
  }
  if (!response.ok) throw new Error(payload?.error || 'Unable to inspect ledger initialization state');
  return payload.data as BackfillPreview;
}

export default function FinanceLedgerInitialization() {
  const [preview, setPreview] = useState<BackfillPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setPreview(await getPreview());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to inspect ledger initialization state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const backfill = async () => {
    setPosting(true);
    try {
      const response = await fetch('/api/admin/finance/accounting/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 250 }),
      });
      const raw = await response.text();
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        // Controlled fallback for upstream non-JSON responses.
      }

      if (!response.ok && response.status !== 207) {
        throw new Error(payload?.error || 'Unable to initialize historical ledger journals');
      }

      const result = payload?.data;
      if (result?.failed?.length) {
        toast.warning(
          'Ledger initialization posted ' +
          String(result.posted || 0) +
          ' records, with ' +
          String(result.failed.length) +
          ' requiring review.',
        );
      } else {
        toast.success(
          result?.remaining
            ? 'Posted ' + String(result.posted || 0) + ' historical journals. More records remain.'
            : 'Historical ledger initialization completed.',
        );
      }

      setConfirmOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to initialize historical ledger journals');
    } finally {
      setPosting(false);
    }
  };

  if (loading && !preview) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking historical ledger synchronization…
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const typeSummary = Object.entries(preview.byType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => type.replaceAll('_', ' ') + ': ' + count)
    .join(' · ');

  return (
    <>
      <Card className={preview.pending
        ? 'border-amber-300/70 bg-amber-50/35 dark:border-amber-900/50 dark:bg-amber-950/10'
        : 'border-emerald-300/70 bg-emerald-50/35 dark:border-emerald-900/50 dark:bg-emerald-950/10'}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/70">
                {preview.pending ? <DatabaseZap className="size-5 text-amber-700" /> : <ShieldCheck className="size-5 text-emerald-700" />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {preview.pending ? 'Historical ledger initialization required' : 'Operational ledger synchronized'}
                  </p>
                  <Badge variant="outline">{preview.pending} pending</Badge>
                  {preview.blocked > 0 && <Badge className="border-0 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{preview.blocked} blocked</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {preview.pending
                    ? 'Existing operational finance records can be converted into source-linked double-entry journals without duplicating records.'
                    : 'Existing operational finance records already have source-linked journal entries.'}
                </p>
                {typeSummary && <p className="mt-2 text-[11px] text-muted-foreground">{typeSummary}</p>}
                {preview.blocked > 0 && (
                  <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
                    {preview.blocked} record(s) fall outside an open accounting period. Open the required historical period before backfilling them.
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void refresh()} disabled={loading || posting}>
                <RefreshCw className={loading ? 'mr-2 size-3.5 animate-spin' : 'mr-2 size-3.5'} />
                Refresh status
              </Button>
              {preview.canBackfill && preview.ready > 0 && (
                <Button type="button" size="sm" onClick={() => setConfirmOpen(true)} disabled={posting}>
                  <DatabaseZap className="mr-2 size-3.5" />
                  {preview.pending > 250 ? 'Initialize next 250' : 'Initialize ledger'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(open) => !posting && setConfirmOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Initialize historical ledger journals?</DialogTitle>
            <DialogDescription>
              This will create source-linked double-entry journals for up to 250 existing finance records.
              It will not change invoice, receipt, supplier-bill, payment or expense values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/35 p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Ready</p>
                <p className="mt-1 text-lg font-semibold">{preview.ready}</p>
              </div>
              <div className="rounded-xl bg-muted/35 p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Blocked</p>
                <p className="mt-1 text-lg font-semibold">{preview.blocked}</p>
              </div>
              <div className="rounded-xl bg-muted/35 p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Pending total</p>
                <p className="mt-1 text-lg font-semibold">{preview.pending}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The operation is idempotent: a source event that already has a journal cannot be posted twice.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={posting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void backfill()} disabled={posting || preview.ready === 0}>
              {posting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Initialize journals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
