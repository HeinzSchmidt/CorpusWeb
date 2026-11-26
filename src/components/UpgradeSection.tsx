import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Lock } from 'lucide-react';
import { COMPARISON_ROWS, CORPUS_APP_URL, type LegalDoc } from '../data/corpusData';
import { executeRecaptcha } from '../lib/recaptcha';

/**
 * "What is it? / Pay for Premium" upgrade section.
 *
 * This marketing site (corpuspremium.cybrnut.com) is the checkout host:
 * the CTA starts a Stripe Checkout Session (subscription mode) via the
 * server's POST /api/checkout and redirects to Stripe's hosted payment
 * page. Card handling happens on Stripe's page; the optional billing
 * e-mail below is used only for the server-side Stripe customer lookup
 * (dedupe) and is never stored here. After the payment the browser lands
 * on /thank-you or /cancel on this domain, and the Stripe webhook
 * (checkout.session.completed -> forwarder -> Corpus /internal/premium)
 * activates premium on the app side. New customers without an account
 * get the single-use claim e-mail (Corpus P2/P3) instead.
 *
 * Arriving from the Corpus app while signed in, the URL carries
 * `?upgrade=<opaque-token>` (a short-lived HMAC token minted by Corpus).
 * It is passed verbatim to /api/checkout, which puts it in the session's
 * client_reference_id; this site does NOT verify it — when the session
 * completes, the webhook forwards it back to Corpus as `upgrade_token`.
 */
interface UpgradeSectionProps {
  onOpenLegal: (docId: LegalDoc['id']) => void;
}

/**
 * Reads and sanitises the ?upgrade= parameter once, at mount. Anything that
 * does not look like a token (empty, wrong charset, over Stripe's
 * client_reference_id limit of 500) is dropped — the checkout then proceeds
 * as a plain guest purchase.
 */
function readUpgradeToken(): string {
  try {
    const raw = new URLSearchParams(window.location.search).get('upgrade')?.trim() ?? '';
    return /^[A-Za-z0-9._~-]{1,500}$/.test(raw) ? raw : '';
  } catch {
    return '';
  }
}

export function UpgradeSection({ onOpenLegal }: UpgradeSectionProps) {
  // 'idle' -> 'starting' while POST /api/checkout runs; 'error' surfaces the
  // server's PII-safe message. A successful start replaces the whole page
  // with Stripe's hosted checkout (window.location.assign).
  const [checkoutState, setCheckoutState] = useState<'idle' | 'starting' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  // The opaque upgrade token (if the URL carries one) is read exactly once.
  const [upgradeToken] = useState(readUpgradeToken);
  const [email, setEmail] = useState('');

  const startCheckout = async (): Promise<void> => {
    if (checkoutState === 'starting') {
      return;
    }
    setCheckoutState('starting');
    setCheckoutError('');
    try {
      // reCAPTCHA v3 token for the 'checkout' action (server-verified).
      const { token } = await executeRecaptcha('checkout');
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recaptchaToken: token ?? '',
          ...(upgradeToken ? { upgradeToken } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (response.ok && typeof data.url === 'string' && data.url.startsWith('https://')) {
        window.location.assign(data.url);
        return;
      }
      setCheckoutError(typeof data.error === 'string' ? data.error : 'Could not start the checkout. Please try again.');
      setCheckoutState('error');
    } catch {
      setCheckoutError('Could not start the checkout. Please check your connection and try again.');
      setCheckoutState('error');
    }
  };

  return (
    <section id="upgrade" className="relative border-b border-[#172B35] bg-[#080E12]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:pt-22 md:pb-28">
        {/* Section Heading & Transparent $4/mo Positioning */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs text-[#F2C94C]">04 · Upgrade to Premium*</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#F4FAFC] md:text-4xl">
              Unlock Library export for $4 per month
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#B2C6CF]">
              Unlock the Library feature to export and organize your generated images and videos
              directly to Google Drive, GitHub, or a Local Folder for just{' '}
              <span className="font-mono font-semibold text-[#F4FAFC] tabular-nums">$4/month</span>.
              This modest subscription directly funds our developers so we can maintain, improve,
              and support Corpus without selling ads or monetizing your data.
            </p>
          </div>

          <div className="flex flex-col items-start lg:col-span-5 lg:items-end">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tracking-tight text-[#F4FAFC] tabular-nums">
                $4
              </span>
              <span className="font-mono text-sm text-[#89A3AF]">USD / month</span>
            </div>
            <p className="mt-1.5 text-xs text-[#7E9AA6]">
              Billed monthly via Stripe · Cancel anytime · No hidden fees
            </p>
          </div>
        </div>

        {/* Clean Free vs Premium Comparison Table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-[#172B35] bg-[#0C141A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#172B35] font-mono text-xs text-[#7E9AA6]">
                  <th scope="col" className="px-6 py-4 font-medium">
                    Workspace Capability
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap">
                    Free Studio ($0)
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold text-[#22D3EE] whitespace-nowrap">
                    Corpus Premium ($4/mo)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172B35]/70">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.capability} className="transition-colors hover:bg-[#101B23]/60">
                    <td className="px-6 py-3.5 text-[#CBDCE3]">{row.capability}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-[#7E9AA6] whitespace-nowrap">
                      {row.free}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs font-medium text-[#E6EFF2] whitespace-nowrap">
                      {row.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upgrade CTA — checkout happens on the Corpus app (Stripe-hosted) */}
        <div className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-[#234352] bg-[#0C141A] shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="grid grid-cols-1 gap-8 p-7 md:p-10 lg:grid-cols-12">
              {/* Left: order summary */}
              <div className="lg:col-span-5">
                <p className="font-mono text-xs text-[#7E9AA6]">Subscribe to Corpus Premium</p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold text-[#F4FAFC] tabular-nums">
                    $4.00
                  </span>
                  <span className="text-sm text-[#89A3AF]">per month</span>
                </div>

                <div className="mt-8 space-y-4 border-t border-[#172B35] pt-6 text-sm">
                  <div>
                    <p className="font-medium text-[#F4FAFC]">
                      Corpus Premium — Library Export
                    </p>
                    <p className="mt-0.5 text-xs text-[#7E9AA6]">
                      Connect Google Drive, GitHub, and Local Folder export via Library
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#172B35]/70 pt-4 text-xs text-[#89A3AF]">
                    <span>Billing cycle</span>
                    <span className="font-mono text-[#CBDCE3]">Monthly recurring</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#172B35] pt-4 text-sm font-semibold text-[#F4FAFC]">
                    <span>Total due today</span>
                    <span className="font-mono tabular-nums">$4.00 USD</span>
                  </div>
                </div>

                <p className="mt-8 text-xs leading-relaxed text-[#7E9AA6]">
                  Your $4/month subscription supports the Cybrnut developers maintaining Corpus.
                  Payment is handled entirely by Stripe — card details never touch this site.
                  Cancel anytime in one click.
                </p>
              </div>

              {/* Right: primary CTA — starts the Stripe checkout on this site */}
              <div className="flex flex-col justify-center lg:col-span-7">
                <h3 className="text-lg font-semibold text-[#F4FAFC]">Ready to upgrade?</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9CB3BE]">
                  You will be taken to Stripe's secure checkout page. After payment you land back
                  here on the thank-you page — activation shows up in the Corpus app within
                  seconds.
                </p>

                <div className="mt-5">
                  <label className="block">
                    <span className="font-mono text-xs text-[#7E9AA6]">
                      Billing e-mail (optional)
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1.5 w-full max-w-xs px-3 py-2 rounded-lg bg-[#08161E] border border-[#234352] focus:border-[#22D3EE] text-sm text-[#F4FAFC] placeholder:text-[#4A6470] focus:outline-none transition-colors"
                    />
                  </label>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4A6470]">
                    If you have purchased before, add that e-mail and we reuse your existing
                    Stripe account instead of creating a new one.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={checkoutState === 'starting'}
                  className="mt-6 inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-6 py-3.5 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5] disabled:cursor-wait disabled:opacity-70"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {checkoutState === 'starting'
                      ? 'Starting secure checkout…'
                      : 'Upgrade to Corpus Premium — $4.00 / mo'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                {checkoutState === 'error' && (
                  <p className="mt-3 text-sm text-[#F87171]" role="alert">
                    {checkoutError}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7E9AA6]">
                  <span>Powered by Stripe · PCI-DSS Level 1</span>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('refunds')}
                    className="underline decoration-[#234352] underline-offset-2 hover:text-[#CBDCE3]"
                  >
                    Refund &amp; Cancellation Policy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
