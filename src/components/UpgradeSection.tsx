import { ArrowUpRight, Lock } from 'lucide-react';
import { COMPARISON_ROWS, CORPUS_APP_URL, type LegalDoc } from '../data/corpusData';

/**
 * "What is it? / Pay for Premium" upgrade section.
 *
 * Checkout no longer happens on this marketing site: account creation and
 * payment live on the Corpus app itself (Stripe-hosted checkout at
 * `${CORPUS_APP_URL}/premium`). This section keeps the pricing copy and the
 * free-vs-premium comparison, then hands off with a single primary CTA.
 * There are deliberately NO password, card, or PII fields anywhere here —
 * billing details are collected only by Stripe on the app side.
 */
interface UpgradeSectionProps {
  onOpenLegal: (docId: LegalDoc['id']) => void;
}

export function UpgradeSection({ onOpenLegal }: UpgradeSectionProps) {
  // Same value as the app's STRIPE_CHECKOUT_SUCCESS_URL origin; the /premium
  // route shows sign-in, the upgrade button, and the activation state.
  const premiumUrl = `${CORPUS_APP_URL}/premium`;

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

              {/* Right: primary CTA to the app's /premium page */}
              <div className="flex flex-col justify-center lg:col-span-7">
                <h3 className="text-lg font-semibold text-[#F4FAFC]">Ready to upgrade?</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9CB3BE]">
                  Continue in the Corpus app: sign in — or create your Corpus account — and
                  complete the secure Stripe checkout there. Activation shows up in the app within
                  seconds of payment.
                </p>

                <a
                  href={premiumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-6 py-3.5 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5]"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  <span>Upgrade to Corpus Premium — $4.00 / mo</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>

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
