'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, LifeBuoy, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type KnowledgeItem = {
  id: string;
  question: string;
  answer: string;
  order: number;
};

export default function ClientKnowledgeWidget() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/faqs?active=true', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to load support knowledge');
        setItems(Array.isArray(payload?.data) ? payload.data : []);
      })
      .catch(() => setItems([]));
  }, []);

  const visible = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items.slice(0, 8);
    return items
      .filter((item) => [item.question, item.answer].some((text) => text.toLowerCase().includes(value)))
      .slice(0, 8);
  }, [items, query]);

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <Card className="w-[min(92vw,430px)] overflow-hidden border-amber-200/70 bg-white/98 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-amber-900/35 dark:bg-[#071018]/98">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpenText className="size-4 text-amber-600" />
                  Client help & knowledge
                </CardTitle>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Search Lightworld&apos;s managed answers. For account-specific issues, use Support inside the portal.
                </p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close client help">
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search hosting, maintenance, development…"
                className="pl-9"
                aria-label="Search client help"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[55vh] overflow-y-auto p-3">
            {visible.length ? (
              <div className="space-y-2">
                {visible.map((item) => (
                  <details key={item.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <summary className="cursor-pointer list-none pr-4 text-sm font-semibold leading-5 marker:hidden">
                      {item.question}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.answer}</p>
                  </details>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center">
                <BookOpenText className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No matching answer found</p>
                <p className="mt-1 text-xs text-muted-foreground">Sign in and submit a Support request for account-specific help.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-12 rounded-full bg-amber-600 px-4 text-white shadow-lg shadow-amber-900/15 hover:bg-amber-700 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
        aria-expanded={open}
        aria-controls="client-help-panel"
      >
        <LifeBuoy className="mr-2 size-4" />
        Client help
      </Button>
    </div>
  );
}
