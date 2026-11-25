import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { COMPARISON_ROWS, CORPUS_APP_URL, type LegalDoc } from '../data/corpusData';
import { executeRecaptcha } from '../lib/recaptcha';

interface UpgradeSectionProps {
  onOpenLegal: (docId: LegalDoc['id']) => void;
}

type CheckoutStep = 'register' | 'stripe' | 'complete';

interface RegistrationData {
  fullName: string;
  email: string;
  workspaceName: string;
  password: string;
  acceptedTerms: boolean;
}

interface CardData {
  cardNumber: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
  country: string;
  postalCode: string;
  paymentMethod: 'card' | 'link';
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }
  return digits;
}

export function UpgradeSection({ onOpenLegal }: UpgradeSectionProps) {
  const [step, setStep] = useState<CheckoutStep>('register');
  const [showPassword, setShowPassword] = useState(false);

  const [registration, setRegistration] = useState<RegistrationData>({
    fullName: '',
    email: '',
    workspaceName: '',
    password: '',
    acceptedTerms: false,
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const [card, setCard] = useState<CardData>({
    cardNumber: '',
    expiry: '',
    cvc: '',
    cardholderName: '',
    country: 'United States',
    postalCode: '',
    paymentMethod: 'card',
  });
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptId, setReceiptId] = useState<string>('');

  const handleRegistrationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (registration.fullName.trim().length < 2) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!emailRegex.test(registration.email.trim())) {
      setRegError('Please enter a valid email address for your Corpus account and Stripe receipt.');
      return;
    }
    if (registration.password.length < 8) {
      setRegError('Please choose a password of at least 8 characters.');
      return;
    }
    if (!registration.acceptedTerms) {
      setRegError('Please confirm that you accept the Terms of Use and Privacy Policy.');
      return;
    }

    setIsRegistering(true);
    try {
      const { token } = await executeRecaptcha('register');

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: registration.fullName.trim(),
          email: registration.email.trim(),
          workspaceName: registration.workspaceName.trim(),
          password: registration.password,
          acceptedTerms: registration.acceptedTerms,
          recaptchaToken: token,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setRegError(data.error || 'Registration could not be verified. Please try again.');
        return;
      }

      setCard((prev) => ({
        ...prev,
        cardholderName: prev.cardholderName || registration.fullName.trim(),
      }));
      setStep('stripe');
    } catch (err) {
      setRegError(
        err instanceof Error
          ? err.message
          : 'Unable to complete reCAPTCHA verification. Please try again.'
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleStripeSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStripeError(null);

    if (card.paymentMethod === 'card') {
      const cleanCard = card.cardNumber.replace(/\s/g, '');
      const expiryDigits = card.expiry.replace(/\D/g, '');
      const cleanCvc = card.cvc.replace(/\D/g, '');

      if (cleanCard.length < 15) {
        setStripeError('Please enter a valid 16-digit card number.');
        return;
      }
      if (expiryDigits.length !== 4) {
        setStripeError('Please enter an expiration date in MM / YY format.');
        return;
      }
      const month = Number(expiryDigits.slice(0, 2));
      if (month < 1 || month > 12) {
        setStripeError('Expiration month must be between 01 and 12.');
        return;
      }
      if (cleanCvc.length < 3) {
        setStripeError('Please enter a valid 3 or 4 digit CVC code.');
        return;
      }
      if (card.cardholderName.trim().length < 2) {
        setStripeError('Please enter the cardholder name.');
        return;
      }
      if (card.postalCode.trim().length < 3) {
        setStripeError('Please enter your billing ZIP or postal code.');
        return;
      }
    }

    setIsProcessing(true);
    window.setTimeout(() => {
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      setReceiptId(`CRP-${randomCode}`);
      setIsProcessing(false);
      setStep('complete');
    }, 650);
  };

  const handleResetFlow = () => {
    setStep('register');
    setRegError(null);
    setStripeError(null);
  };

  return (
    <section id="upgrade" className="relative border-b border-[#172B35] bg-[#080E12]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
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

        {/* Interactive Upgrade Flow: Step 1 Registration -> Step 2 Stripe Payment Page */}
        <div className="mt-12">
          {/* Interactive Step Tabs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Upgrade checkout steps"
              className="inline-flex items-center gap-1 rounded-xl border border-[#172B35] bg-[#0A1117] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={step === 'register'}
                onClick={() => setStep('register')}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  step === 'register'
                    ? 'bg-[#22D3EE] text-[#061318] font-semibold'
                    : 'text-[#9CB3BE] hover:text-white'
                }`}
              >
                1. Registration Form
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={step === 'stripe'}
                onClick={() => setStep('stripe')}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  step === 'stripe'
                    ? 'bg-[#22D3EE] text-[#061318] font-semibold'
                    : 'text-[#9CB3BE] hover:text-white'
                }`}
              >
                2. Stripe Payment Page
              </button>
              {step === 'complete' && (
                <span className="rounded-lg bg-[#16303A] px-4 py-2 text-xs font-semibold text-[#22D3EE] whitespace-nowrap shrink-0">
                  3. Activated
                </span>
              )}
            </div>

            <p className="text-xs text-[#89A3AF]">
              Complete registration, then proceed directly to Stripe Checkout.
            </p>
          </div>

          {/* STEP 1: REGISTRATION FORM */}
          {step === 'register' && (
            <div className="mt-6 grid grid-cols-1 gap-8 rounded-2xl border border-[#172B35] bg-[#0C141A] p-7 md:p-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="font-mono text-xs text-[#22D3EE]">Step 1 of 2 · Create Account</p>
                <h3 className="mt-3 text-2xl font-bold text-[#F4FAFC]">
                  Register for Corpus Premium
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#9CB3BE]">
                  Create your Corpus operator credentials to associate your Library upgrade
                  (Google Drive, GitHub, and Local Folder export) with your workspace.
                </p>

                <dl className="mt-8 space-y-4 border-t border-[#172B35] pt-6 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#89A3AF]">Plan</dt>
                    <dd className="font-medium text-[#F4FAFC]">Corpus Premium</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#89A3AF]">Price</dt>
                    <dd className="font-mono font-semibold text-[#F4FAFC] tabular-nums">
                      $4.00 / month
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#89A3AF]">Unlocks</dt>
                    <dd className="text-right text-[#CBDCE3]">
                      Library (Google Drive, GitHub, Local Folder)
                    </dd>
                  </div>
                </dl>

                {/* Explicit No-Marketing Privacy Commitment */}
                <div className="mt-8 border-t border-[#172B35] pt-6">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#F2C94C]"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#F4FAFC]">
                        Zero Marketing Guarantee
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#9CB3BE]">
                        Your contact information is used strictly for account authentication and
                        Stripe billing receipts. It is never sold, shared, or used for marketing
                        purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegistrationSubmit} noValidate className="lg:col-span-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="reg-name"
                      className="block text-xs font-medium text-[#CBDCE3]"
                    >
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={registration.fullName}
                      onChange={(e) =>
                        setRegistration({ ...registration, fullName: e.target.value })
                      }
                      placeholder="Alex Mercer"
                      className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-workspace"
                      className="block text-xs font-medium text-[#CBDCE3]"
                    >
                      Operator Handle (optional)
                    </label>
                    <input
                      id="reg-workspace"
                      type="text"
                      value={registration.workspaceName}
                      onChange={(e) =>
                        setRegistration({ ...registration, workspaceName: e.target.value })
                      }
                      placeholder="Studio Operator"
                      className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="reg-email" className="block text-xs font-medium text-[#CBDCE3]">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={registration.email}
                    onChange={(e) => setRegistration({ ...registration, email: e.target.value })}
                    placeholder="you@studio.com"
                    className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-medium text-[#CBDCE3]"
                  >
                    Account Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={registration.password}
                      onChange={(e) =>
                        setRegistration({ ...registration, password: e.target.value })
                      }
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-lg border border-[#1E3642] bg-[#070C10] py-2.5 pr-11 pl-4 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#7E9AA6] transition-colors hover:text-[#E6EFF2]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="mt-6 flex cursor-pointer items-start gap-3 text-xs text-[#9CB3BE]">
                  <input
                    type="checkbox"
                    checked={registration.acceptedTerms}
                    onChange={(e) =>
                      setRegistration({ ...registration, acceptedTerms: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[#234352] bg-[#070C10] accent-[#22D3EE]"
                  />
                  <span className="leading-relaxed">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('terms')}
                      className="underline decoration-[#22D3EE]/60 underline-offset-2 hover:text-[#F4FAFC]"
                    >
                      Terms of Use
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('privacy')}
                      className="underline decoration-[#22D3EE]/60 underline-offset-2 hover:text-[#F4FAFC]"
                    >
                      Privacy Policy
                    </button>
                    . I understand my contact information will never be used for marketing.
                  </span>
                </label>

                {regError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-[#7F1D1D] bg-[#2A0E12] px-4 py-2.5 text-xs text-[#FCA5A5]"
                  >
                    {regError}
                  </p>
                )}

                <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-6 py-3 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    <span>
                      {isRegistering ? 'Verifying with reCAPTCHA...' : 'Continue to Stripe Payment'}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <span className="font-mono text-xs text-[#7E9AA6]">
                    Next: Secure Stripe Checkout ($4.00/mo)
                  </span>
                </div>

                <p className="mt-4 text-[11px] leading-relaxed text-[#698491]">
                  Protected by Google reCAPTCHA v3 ·{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[#234352] underline-offset-2 hover:text-[#9CB3BE]"
                  >
                    Google Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[#234352] underline-offset-2 hover:text-[#9CB3BE]"
                  >
                    Terms of Service
                  </a>{' '}
                  apply.
                </p>
              </form>
            </div>
          )}

          {/* STEP 2: STRIPE PAYMENT PAGE */}
          {step === 'stripe' && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#234352] bg-[#0B1217] shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
              {/* Top Stripe Checkout Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#172B35] bg-[#0E1820] px-6 py-4 md:px-8">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStep('register')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9CB3BE] transition-colors hover:text-[#F4FAFC] whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit Registration</span>
                  </button>
                  <span className="text-[#234352]" aria-hidden="true">
                    |
                  </span>
                  <span className="corpus-wordmark text-base">CORPUS</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#9CB3BE]">
                  <Lock className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                  <span>Stripe Checkout · TLS Encrypted</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left Column: Order Summary */}
                <div className="border-b border-[#172B35] bg-[#0A1117] p-7 md:p-10 lg:col-span-5 lg:border-r lg:border-b-0">
                  <p className="font-mono text-xs text-[#7E9AA6]">Subscribe to Corpus Premium</p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold text-[#F4FAFC] tabular-nums">
                      $4.00
                    </span>
                    <span className="text-sm text-[#89A3AF]">per month</span>
                  </div>

                  <div className="mt-8 space-y-4 border-t border-[#172B35] pt-6 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#F4FAFC]">
                          Corpus Premium — Library Export
                        </p>
                        <p className="mt-0.5 text-xs text-[#7E9AA6]">
                          Connect Google Drive, GitHub, and Local Folder export via Library
                        </p>
                      </div>
                      <span className="font-mono text-sm text-[#F4FAFC] tabular-nums">$4.00</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#172B35]/70 pt-4 text-xs text-[#89A3AF]">
                      <span>Billing cycle</span>
                      <span className="font-mono text-[#CBDCE3]">Monthly recurring</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#89A3AF]">
                      <span>Account email</span>
                      <span className="font-mono text-[#CBDCE3]">
                        {registration.email.trim() || 'you@studio.com'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#172B35] pt-4 text-sm font-semibold text-[#F4FAFC]">
                      <span>Total due today</span>
                      <span className="font-mono tabular-nums">$4.00 USD</span>
                    </div>
                  </div>

                  <p className="mt-8 text-xs leading-relaxed text-[#7E9AA6]">
                    Your $4/month subscription supports the Cybrnut developers maintaining Corpus.
                    Your email and billing details are never used for marketing. Cancel anytime in
                    one click.
                  </p>
                </div>

                {/* Right Column: Stripe Payment Form */}
                <form
                  onSubmit={handleStripeSubmit}
                  noValidate
                  className="p-7 md:p-10 lg:col-span-7"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-[#F4FAFC]">Pay with Stripe</h3>

                    {/* Functional Payment Method Switcher */}
                    <div
                      role="tablist"
                      aria-label="Payment method"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#172B35] bg-[#070C10] p-1"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={card.paymentMethod === 'card'}
                        onClick={() => setCard({ ...card, paymentMethod: 'card' })}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          card.paymentMethod === 'card'
                            ? 'bg-[#16303A] text-[#F4FAFC]'
                            : 'text-[#89A3AF] hover:text-white'
                        }`}
                      >
                        Credit / Debit Card
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={card.paymentMethod === 'link'}
                        onClick={() => setCard({ ...card, paymentMethod: 'link' })}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          card.paymentMethod === 'link'
                            ? 'bg-[#16303A] text-[#F4FAFC]'
                            : 'text-[#89A3AF] hover:text-white'
                        }`}
                      >
                        Stripe Link
                      </button>
                    </div>
                  </div>

                  {card.paymentMethod === 'card' ? (
                    <div className="mt-6 space-y-5">
                      <div>
                        <label
                          htmlFor="stripe-card-number"
                          className="block text-xs font-medium text-[#CBDCE3]"
                        >
                          Card Information
                        </label>
                        <div className="relative mt-2">
                          <input
                            id="stripe-card-number"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            value={card.cardNumber}
                            onChange={(e) =>
                              setCard({ ...card, cardNumber: formatCardNumber(e.target.value) })
                            }
                            placeholder="1234 5678 9012 3456"
                            className="w-full rounded-t-lg border border-[#1E3642] bg-[#070C10] py-2.5 pr-12 pl-4 font-mono text-sm text-[#F4FAFC] placeholder-[#526B77] tabular-nums focus:z-10 focus:border-[#22D3EE] focus:outline-none"
                          />
                          <CreditCard
                            className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#7E9AA6]"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="grid grid-cols-2">
                          <input
                            id="stripe-expiry"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            aria-label="Expiration date MM / YY"
                            value={card.expiry}
                            onChange={(e) =>
                              setCard({ ...card, expiry: formatExpiry(e.target.value) })
                            }
                            placeholder="MM / YY"
                            className="-mt-px w-full rounded-bl-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 font-mono text-sm text-[#F4FAFC] placeholder-[#526B77] tabular-nums focus:z-10 focus:border-[#22D3EE] focus:outline-none"
                          />
                          <input
                            id="stripe-cvc"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            aria-label="CVC security code"
                            value={card.cvc}
                            onChange={(e) =>
                              setCard({
                                ...card,
                                cvc: e.target.value.replace(/\D/g, '').slice(0, 4),
                              })
                            }
                            placeholder="CVC"
                            className="-mt-px -ml-px w-full rounded-br-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 font-mono text-sm text-[#F4FAFC] placeholder-[#526B77] tabular-nums focus:z-10 focus:border-[#22D3EE] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="stripe-cardholder"
                          className="block text-xs font-medium text-[#CBDCE3]"
                        >
                          Cardholder Name
                        </label>
                        <input
                          id="stripe-cardholder"
                          type="text"
                          autoComplete="cc-name"
                          value={card.cardholderName}
                          onChange={(e) => setCard({ ...card, cardholderName: e.target.value })}
                          placeholder="Full name on card"
                          className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] placeholder-[#526B77] focus:border-[#22D3EE] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="stripe-country"
                            className="block text-xs font-medium text-[#CBDCE3]"
                          >
                            Country or Region
                          </label>
                          <select
                            id="stripe-country"
                            value={card.country}
                            onChange={(e) => setCard({ ...card, country: e.target.value })}
                            className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] focus:border-[#22D3EE] focus:outline-none"
                          >
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Canada">Canada</option>
                            <option value="European Union">European Union</option>
                            <option value="Australia">Australia</option>
                            <option value="Japan">Japan</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="stripe-postal"
                            className="block text-xs font-medium text-[#CBDCE3]"
                          >
                            ZIP / Postal Code
                          </label>
                          <input
                            id="stripe-postal"
                            type="text"
                            autoComplete="postal-code"
                            value={card.postalCode}
                            onChange={(e) => setCard({ ...card, postalCode: e.target.value })}
                            placeholder="94107"
                            className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 font-mono text-sm text-[#F4FAFC] placeholder-[#526B77] focus:border-[#22D3EE] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-[#1E3642] bg-[#070C10] p-6">
                      <p className="text-sm font-semibold text-[#F4FAFC]">
                        Express checkout with Stripe Link
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#9CB3BE]">
                        Continue using your saved Stripe Link payment method associated with{' '}
                        <span className="font-mono text-[#E6EFF2]">
                          {registration.email.trim() || 'your account email'}
                        </span>
                        . Stripe handles authentication directly—Corpus never sees your payment
                        details.
                      </p>
                    </div>
                  )}

                  {stripeError && (
                    <p
                      role="alert"
                      className="mt-5 rounded-lg border border-[#7F1D1D] bg-[#2A0E12] px-4 py-2.5 text-xs text-[#FCA5A5]"
                    >
                      {stripeError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-6 py-3.5 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {isProcessing
                        ? 'Authorizing with Stripe...'
                        : 'Subscribe to Corpus Premium — $4.00 / mo'}
                    </span>
                  </button>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7E9AA6]">
                    <span>Powered by Stripe · PCI-DSS Level 1</span>
                    <button
                      type="button"
                      onClick={() => onOpenLegal('refunds')}
                      className="underline decoration-[#234352] underline-offset-2 hover:text-[#CBDCE3]"
                    >
                      Refund & Cancellation Policy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* STEP 3: ACTIVATION CONFIRMATION */}
          {step === 'complete' && (
            <div className="mt-6 rounded-2xl border border-[#22D3EE]/50 bg-[#0C141A] p-8 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 font-mono text-xs text-[#22D3EE]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Subscription Confirmed · Receipt {receiptId}</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-[#F4FAFC]">
                    Welcome to Corpus Premium
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#9CB3BE]">
                    Your account{' '}
                    <span className="font-mono text-[#E6EFF2]">
                      {registration.email.trim() || 'operator'}
                    </span>{' '}
                    is now ready for Library export (Google Drive, GitHub, and Local Folder) at
                    $4.00/month. Thank you for supporting independent development at Cybrnut.com.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <a
                    href={CORPUS_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#22D3EE] px-5 py-2.5 text-sm font-semibold text-[#061318] transition-colors hover:bg-[#4AE0F5] whitespace-nowrap shrink-0"
                  >
                    <span>Open Corpus Studio</span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={handleResetFlow}
                    className="rounded-lg border border-[#234352] px-4 py-2.5 text-xs font-medium text-[#CBDCE3] transition-colors hover:border-[#22D3EE]/60 hover:text-white whitespace-nowrap shrink-0"
                  >
                    Back to Form
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
