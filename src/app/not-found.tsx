import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import PublicShell from '@/components/layout/PublicShell';

export default function NotFound() {
  return (
    <PublicShell>
      <section className="container-main flex min-h-[68svh] items-center py-20">
        <div className="max-w-2xl">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Search className="size-5" />
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">404 · Not found</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">This route is not part of the system.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500 dark:text-white/40">
            The page may have moved or the address may be incorrect. Head back to the main experience or explore our services.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-slate-950">
              <ArrowLeft className="size-4" /> Home
            </Link>
            <Link href="/services" className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold dark:border-white/10">
              Explore services
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
