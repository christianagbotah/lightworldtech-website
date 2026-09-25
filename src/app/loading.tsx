import Image from 'next/image';

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[120] flex min-h-screen items-center justify-center bg-[#f7f9f8] px-6 text-slate-950 dark:bg-[#050b10] dark:text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading Lightworld Technologies"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto flex size-24 items-center justify-center rounded-full border border-amber-500/20 bg-white shadow-xl shadow-amber-500/10 dark:border-amber-300/10 dark:bg-slate-950">
          <span className="absolute inset-[-10px] rounded-full border border-amber-500/15" />
          <span className="absolute inset-[-18px] animate-pulse rounded-full border border-amber-500/10" />
          <Image src="/logo.png" alt="" width={52} height={52} priority className="relative z-10 object-contain" />
        </div>

        <p className="mt-6 text-lg font-semibold tracking-tight">Lightworld Technologies</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
          Preparing your experience
        </p>

        <div className="mx-auto mt-6 h-1.5 w-52 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.08]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-white/40">
          Loading page content…
        </p>
      </div>
    </div>
  );
}
