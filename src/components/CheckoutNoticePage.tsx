import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { CORPUS_APP_URL } from '../data/corpusData';

export type SessionLookup = {
  paid: boolean;
  mode: 'guest' | 'upgrade';
  emailMasked: string | null;
};

type NoticeKind = 'thank-you' | 'cancelled';

/**
 * Presentational body of /thank-you and /cancel — a pure function of
 * (kind, lookup) so the node:test suite can render every state through
 * react-dom/server without a DOM. The fetch/lookup logic stays in
 * CheckoutNoticePage below.
 *
 *   - upgrade mode: "You’re Premium. Return to Corpus and reload." + button
 *   - guest mode (and fallback when the lookup fails / no session id):
 *     the highlighted check-your-email callout. The claim link in the
 *     email is the ONLY way back for a guest paying without an account,
 *     so guest mode deliberately has no "Open Corpus" button.
 *   - 72-hour link expiry matches Corpus server/premium.ts
 *     CLAIM_TTL_HOURS; do not change one side without the other.
 */
export function CheckoutNoticeBody({
  kind,
  lookup,
}: {
  kind: NoticeKind;
  lookup: SessionLookup | null | undefined;
}) {
  const isSuccess = kind === 'thank-you';
  const isUpgrade = lookup?.mode === 'upgrade';
  // Guest instructions are the floor: upgrade mode replaces them, anything
  // else (unpaid answer, failed lookup, missing session id) keeps them.
  const maskedEmail = lookup?.emailMasked ?? null;

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-start justify-center px-6 py-20">
      {isSuccess ? (
        <CheckCircle2 className="h-12 w-12 text-[#22D3EE]" aria-hidden="true" />
      ) : (
        <XCircle className="h-12 w-12 text-[#F87171]" aria-hidden="true" />
      )}

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#F4FAFC]">
        {isSuccess
          ? isUpgrade
            ? 'You’re Premium. Return to Corpus and reload.'
            : 'Payment received. One more step: set your password.'
          : 'Checkout cancelled'}
      </h1>

      {isSuccess ? (
        isUpgrade ? (
          <p className="mt-4 text-base leading-relaxed text-[#9CB3BE]">
            Your account has just been upgraded. Reopen the Corpus app (or reload it) and the
            premium features will be there.
          </p>
        ) : (
          // Highlighted callout — "check your email" must not get lost in a
          // paragraph. Accent-bordered/tinted box, envelope icon (inline
          // SVG, no new dependency), bold instruction line. role="status"
          // so assistive tech announces the box when it appears.
          <div role="status" className="mt-6 w-full rounded-lg border border-[#22D3EE] bg-[#0A1B22] p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-[#22D3EE]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug text-[#F4FAFC]">
                  Check your email: we’ve sent a link to{' '}
                  {maskedEmail ? <span>{maskedEmail}</span> : <span>the address you used at checkout</span>}{''}
                  to set your password.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#9CB3BE]">
                  Also check your spam/junk folder — the email comes from Corpus.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#9CB3BE]">
                  The link expires in 72 hours.
                </p>
              </div>
            </div>
          </div>
        )
      ) : (
        <p className="mt-4 text-base leading-relaxed text-[#9CB3BE]">
          Nothing was charged. You can start the secure checkout again whenever you are ready.
        </p>
      )}

      {/* The claim email is the only way back in guest mode, so the button
          row is hidden for thank-you guests; upgrade mode and the cancel
          page keep theirs. */}
      {(!isSuccess || isUpgrade) && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={CORPUS_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5]"
          >
            <span>{isSuccess ? 'Open Corpus' : 'Open the Corpus app'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          {!isSuccess && (
            <a
              href="#upgrade"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#234352] px-5 py-3 text-sm font-semibold text-[#CBDCE3] transition-colors duration-150 hover:bg-[#0C141A]"
            >
              <span>Back to the pricing section</span>
            </a>
          )}
        </div>
      )}

      {isSuccess && !isUpgrade && (
        <p className="mt-6 text-sm text-[#9CB3BE]">
          {/* TODO: turn "Contact support" into a mailto link once the site has
              a configured support address — none exists in the site config
              today, and no address should be invented for this page. */}
          Didn’t get it? Contact support.
        </p>
      )}
    </section>
  );
}

/**
 * /thank-you and /cancel — the landing pages Stripe redirects to after
 * the hosted checkout (success_url / cancel_url, P4 of the checkout plan).
 *
 * Stripe appends ?session_id={CHECKOUT_SESSION_ID} to the success_url; the
 * thank-you page looks that session up via GET /api/checkout/session/:id,
 * which answers only {paid, mode, email_masked} (no full e-mail, no
 * customer id, no upgrade token), then renders CheckoutNoticeBody:
 *   - upgrade mode: "You're Premium. Return to Corpus and reload."
 *   - guest mode: the highlighted check-your-email callout (masked e-mail
 *     plus the 72-hour link expiry — see CheckoutNoticeBody).
 *   - fallback (no session id, or the lookup failed): the guest callout
 *     without the masked e-mail, so a guest is never left without it.
 * Activation itself stays webhook-driven as before.
 */
export function CheckoutNoticePage({ kind }: { kind: NoticeKind }) {
  const isSuccess = kind === 'thank-you';

  // Read ?session_id= once. Only well-formed ids are looked up — the server
  // re-validates anyway, this just spares it junk requests.
  const [sessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const raw = new URLSearchParams(window.location.search).get('session_id') ?? '';
    return /^cs_[A-Za-z0-9]{6,}$/.test(raw) ? raw : '';
  });
  // undefined = not yet / not requested; null = lookup failed (fallback).
  const [lookup, setLookup] = useState<SessionLookup | null | undefined>(undefined);

  useEffect(() => {
    if (!isSuccess || !sessionId) return;
    let cancelled = false;
    fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        setLookup({
          paid: data.paid === true,
          mode: data.mode === 'upgrade' ? 'upgrade' : 'guest',
          emailMasked:
            typeof data.email_masked === 'string' && data.email_masked !== ''
              ? data.email_masked
              : null,
        });
      })
      .catch(() => {
        // Any failure (404/502/network) degrades to the fallback copy —
        // the guest still gets the claim instructions, just no masked e-mail.
        if (!cancelled) setLookup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuccess, sessionId]);

  return <CheckoutNoticeBody kind={kind} lookup={lookup} />;
}
