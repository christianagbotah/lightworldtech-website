import Image from 'next/image';

export default function Loading() {
  return (
    <div
      className="flex min-h-[55vh] items-center justify-center bg-[#f7f9f8] px-6 text-slate-950 dark:bg-[#050b10] dark:text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading Lightworld Technologies"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-500/15 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]">
          <Image src="/logo.png" alt="" width={34} height={34} priority className="object-contain" />
        </div>
        <p className="mt-5 text-sm font-semibold tracking-tight">Lightworld Technologies</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-white/40">Preparing your experience…</p>
        <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.08]">
          <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500" />
        </div>
      </div>
    </div>
  );
}
