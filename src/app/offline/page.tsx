import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b10] px-5 py-12 text-white">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Image src="/logo.png" alt="Lightworld Technologies" width={48} height={48} priority />
        </div>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">Connection unavailable</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">You are offline.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/50">
          The public Lightworld website could not reach the network. Reconnect and retry. Secure admin, client, invoice and payment areas are intentionally never served from offline cache.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950">
            Retry homepage
          </Link>
          <Link href="/contact" className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-semibold text-white">
            Contact Lightworld
          </Link>
        </div>
      </div>
    </main>
  );
}
