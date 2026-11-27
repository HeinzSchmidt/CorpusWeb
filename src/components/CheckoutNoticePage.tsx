import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { CORPUS_APP_URL } from '../data/corpusData';

/**
 * /thank-you and /cancel — the landing pages Stripe redirects to after
 * the hosted checkout (success_url / cancel_url, P4 of the checkout plan).
 *
 * Both pages are static: no network calls, no PII. Activation is
 * driven entirely by the Stripe webhook path
 * (checkout.session.completed -> forwarder -> Corpus /internal/premium);
 * the thank-you copy says so explicitly.
 */
export function CheckoutNoticePage({ kind }: { kind: 'thank-you' | 'cancelled' }) {
  const isSuccess = kind === 'thank-you';

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-start justify-center px-6 py-20">
      {isSuccess ? (
        <CheckCircle2 className="h-12 w-12 text-[#22D3EE]" aria-hidden="true" />
      ) : (
        <XCircle className="h-12 w-12 text-[#F87171]" aria-hidden="true" />
      )}

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#F4FAFC]">
        {isSuccess ? 'Payment received' : 'Checkout cancelled'}
      </h1>

      {isSuccess ? (
        <p className="mt-4 text-base leading-relaxed text-[#9CB3BE]">
          Your Corpus Premium subscription is activating — the Stripe webhook flips the flag
          automatically, usually within a few seconds. If this purchase had no account yet, a
          single-use claim link (valid 72 hours) is on its way to the e-mail address used at
          checkout; follow it to set your password and sign in.
        </p>
      ) : (
        <p className="mt-4 text-base leading-relaxed text-[#9CB3BE]">
          Nothing was charged. You can start the secure checkout again whenever you are ready.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={CORPUS_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5]"
        >
          <span>{isSuccess ? 'Continue to the Corpus app' : 'Open the Corpus app'}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        {!isSuccess && (
          <a
            href="/#upgrade"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#234352] px-5 py-3 text-sm font-semibold text-[#CBDCE3] transition-colors duration-150 hover:bg-[#0C141A]"
          >
            <span>Back to the pricing section</span>
          </a>
        )}
      </div>
    </section>
  );
}
