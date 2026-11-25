import { useState, type FormEvent } from 'react';
import { Check, Send } from 'lucide-react';
import { CORPUS_APP_URL } from '../data/corpusData';
import { executeRecaptcha } from '../lib/recaptcha';

export function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('General Question');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address so we can reply.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter a message of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { token } = await executeRecaptcha('contact');

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
          recaptchaToken: token,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || 'Your message could not be verified. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete reCAPTCHA verification. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="border-b border-[#172B35] bg-[#070C10]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left editorial column */}
          <div className="lg:col-span-5">
            <p className="font-mono text-xs text-[#22D3EE]">05 · Contact</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#F4FAFC] md:text-4xl">
              Direct line to the Corpus developers
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#9CB3BE]">
              Have a question about multi-provider API configuration, MCP tools, Library export
              (Google Drive, GitHub, or Local Folder), or billing? Send a note directly to the
              engineering team behind Corpus.
            </p>

            <div className="mt-8 space-y-5 border-t border-[#172B35] pt-6 text-sm">
              <div>
                <p className="font-mono text-xs text-[#D9A234]">Privacy Commitment</p>
                <p className="mt-1 text-sm leading-relaxed text-[#9CB3BE]">
                  We use your email solely to respond to your inquiry. Your contact information is
                  never added to a mailing list or used for marketing.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-[#D9A234]">Web Application</p>
                <a
                  href={CORPUS_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-sm text-[#22D3EE] transition-colors hover:text-[#67E8F9]"
                >
                  https://corpus.cybrnut.com
                </a>
              </div>
            </div>
          </div>

          {/* Right Contact Form */}
          <div className="rounded-2xl border border-[#172B35] bg-[#0C141A] p-7 md:p-9 lg:col-span-7">
            {submitted ? (
              <div className="py-6">
                <div className="inline-flex items-center gap-2 font-mono text-xs text-[#22D3EE]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Message Received</span>
                </div>
                <h3 className="mt-3 text-2xl font-bold text-[#F4FAFC]">
                  Thank you, {name.trim()}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#9CB3BE]">
                  Your note regarding <span className="text-[#E6EFF2]">{topic}</span> has been
                  logged for our team. We will reply directly to{' '}
                  <span className="font-mono text-[#E6EFF2]">{email.trim()}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="mt-6 rounded-lg border border-[#234352] px-4 py-2 text-xs font-medium text-[#CBDCE3] transition-colors hover:border-[#22D3EE]/60 hover:text-white"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium text-[#CBDCE3]"
                    >
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Vance"
                      className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-medium text-[#CBDCE3]"
                    >
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jordan@studio.com"
                      className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-topic"
                    className="block text-xs font-medium text-[#CBDCE3]"
                  >
                    Topic
                  </label>
                  <select
                    id="contact-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-2.5 text-sm text-[#F4FAFC] transition-colors focus:border-[#22D3EE] focus:outline-none"
                  >
                    <option value="General Question">General Question</option>
                    <option value="Premium & Stripe Billing">Premium & Stripe Billing</option>
                    <option value="Library Export (Google Drive, GitHub, Local Folder)">
                      Library Export (Google Drive, GitHub, Local Folder)
                    </option>
                    <option value="MCP Tools & Provider APIs">MCP Tools & Provider APIs</option>
                    <option value="Security / Technical">Security / Technical</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-medium text-[#CBDCE3]"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us how we can help with your Corpus workflow..."
                    className="mt-2 w-full resize-y rounded-lg border border-[#1E3642] bg-[#070C10] px-4 py-3 text-sm text-[#F4FAFC] placeholder-[#526B77] transition-colors focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-[#7F1D1D] bg-[#2A0E12] px-4 py-2.5 text-xs text-[#FCA5A5]"
                  >
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-6 py-3 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    <span>{isSubmitting ? 'Verifying & Sending...' : 'Send Message'}</span>
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <p className="text-xs text-[#7E9AA6]">
                    Never shared or used for marketing.
                  </p>
                </div>

                <p className="text-[11px] leading-relaxed text-[#698491]">
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
