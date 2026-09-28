'use client';

import { Copy, Download, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaKitActions({
  copyText,
  mediaEmail,
}: {
  copyText: string;
  mediaEmail: string;
}) {
  const copyFacts = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success('Company facts copied');
    } catch {
      toast.error('Unable to copy company facts');
    }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
      >
        <Printer className="size-4" />
        Print / Save as PDF
      </button>
      <button
        type="button"
        onClick={() => void copyFacts()}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/65"
      >
        <Copy className="size-4" />
        Copy company facts
      </button>
      <a
        href="/logo.png"
        download="lightworld-technologies-logo.png"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/65"
      >
        <Download className="size-4" />
        PNG logo
      </a>
      <a
        href="/logo.svg"
        download="lightworld-technologies-logo.svg"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/65"
      >
        <Download className="size-4" />
        SVG logo
      </a>
      <a
        href={'mailto:' + mediaEmail + '?subject=Media%20enquiry'}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/65"
      >
        <Mail className="size-4" />
        Contact media team
      </a>
    </div>
  );
}
