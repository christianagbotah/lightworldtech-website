import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, MailX, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Newsletter preferences | Lightworld Technologies',
  description: 'Manage your Lightworld Technologies newsletter subscription.',
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const token = params.token || '';

  const success = status === 'success';
  const invalid = status === 'invalid';
  const failed = status === 'error';

  return (
    <main className="min-h-screen bg-[#07110d] px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 backdrop-blur md:p-9">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            {success ? <CheckCircle2 className="size-6" /> : <MailX className="size-6" />}
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Lightworld Technologies
          </p>

          {success ? (
            <>
              <h1 className="mt-3 text-3xl font-bold">You have been unsubscribed.</h1>
              <p className="mt-4 leading-7 text-white/60">
                This email address will no longer receive Lightworld Technologies newsletter campaigns.
                Transactional messages related to services you actively use may still be sent when necessary.
              </p>
            </>
          ) : invalid ? (
            <>
              <h1 className="mt-3 text-3xl font-bold">This link is not valid.</h1>
              <p className="mt-4 leading-7 text-white/60">
                The unsubscribe link may have been altered. You can contact us if you need help updating your preferences.
              </p>
            </>
          ) : failed ? (
            <>
              <h1 className="mt-3 text-3xl font-bold">We could not update your preference.</h1>
              <p className="mt-4 leading-7 text-white/60">
                Please try the unsubscribe link again. If the issue continues, contact Lightworld Technologies.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-3xl font-bold">Unsubscribe from updates?</h1>
              <p className="mt-4 leading-7 text-white/60">
                Confirm below to stop receiving Lightworld Technologies newsletter campaigns at the address linked to this secure request.
              </p>

              {token ? (
                <form
                  className="mt-7"
                  action={'/api/newsletter/unsubscribe?redirect=1&token=' + encodeURIComponent(token)}
                  method="post"
                >
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-400"
                  >
                    Confirm unsubscribe
                  </button>
                </form>
              ) : (
                <p className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                  No unsubscribe token was supplied.
                </p>
              )}
            </>
          )}

          <div className="mt-7 flex items-center gap-2 text-xs text-white/35">
            <ShieldCheck className="size-4" />
            Signed preference links prevent one subscriber from changing another subscriber&apos;s settings.
          </div>

          <div className="mt-8 border-t border-white/10 pt-5">
            <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
              Return to Lightworld Technologies
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
