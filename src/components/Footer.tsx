import { ArrowUpRight } from 'lucide-react';
import { CORPUS_APP_URL, type LegalDoc } from '../data/corpusData';
import { homeSectionHref } from '../lib/homeSectionHref';

interface FooterProps {
  onOpenLegal: (docId: LegalDoc['id']) => void;
}

export function Footer({ onOpenLegal }: FooterProps) {
  // Same rule as the Navbar: home section links point at "#id" on "/" and
  // at "/#id" from other routes (the home ids do not exist on e.g. /docs).
  const pathname = window.location.pathname;
  const sectionHref = (id: string) => homeSectionHref(id, pathname);
  return (
    <footer className="bg-[#060A0E]">
      <div className="mx-auto max-w-[1200px] px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand column */}
          <div className="md:col-span-5">
            <a
              href={sectionHref('top')}
              className="inline-flex items-center gap-2.5 whitespace-nowrap"
              aria-label="Corpus Home"
            >
              <img
                src="/corpus-mark.png"
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="corpus-wordmark text-2xl tracking-tight">CORPUS</span>
            </a>
            <p className="mt-2 font-mono text-xs text-[#D9A234]">
              Visual Content Generation · by Cybrnut.com
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#7E9AA6]">
              Browser-based AI harness for multi-provider text, image, and video workflows. Your
              API keys remain in your browser and your generated media stays yours.
            </p>
          </div>

          {/* Product navigation */}
          <div className="md:col-span-3">
            <h3 className="font-mono text-xs text-[#CBDCE3]">Corpus</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#89A3AF]">
              <li>
                <a href={sectionHref('what-is-corpus')} className="transition-colors hover:text-[#F4FAFC]">
                  What is Corpus
                </a>
              </li>
              <li>
                <a href={sectionHref('features')} className="transition-colors hover:text-[#F4FAFC]">
                  Features
                </a>
              </li>
              <li>
                <a href={sectionHref('security')} className="transition-colors hover:text-[#F4FAFC]">
                  Security Architecture
                </a>
              </li>
              <li>
                <a href="/docs" className="transition-colors hover:text-[#F4FAFC]">
                  Documentation (how-to, Ollama)
                </a>
              </li>
              <li>
                <a href={sectionHref('upgrade')} className="transition-colors hover:text-[#F4FAFC]">
                  Upgrade to Premium ($4/mo)
                </a>
              </li>
              <li>
                <a href={sectionHref('contact')} className="transition-colors hover:text-[#F4FAFC]">
                  Contact Developers
                </a>
              </li>
              <li>
                <a
                  href={CORPUS_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#22D3EE] transition-colors hover:text-[#67E8F9]"
                >
                  <span>Launch corpus.cybrnut.com</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal pages */}
          <div className="md:col-span-4">
            <h3 className="font-mono text-xs text-[#CBDCE3]">Legal & Compliance</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#89A3AF]">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="transition-colors hover:text-[#F4FAFC]"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="transition-colors hover:text-[#F4FAFC]"
                >
                  Terms of Use
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('storage')}
                  className="transition-colors hover:text-[#F4FAFC]"
                >
                  Cookie & Browser Storage Notice
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('refunds')}
                  className="transition-colors hover:text-[#F4FAFC]"
                >
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('security')}
                  className="transition-colors hover:text-[#F4FAFC]"
                >
                  Security Architecture Disclosure
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#172B35] pt-6 text-xs text-[#698491] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cybrnut.com · Corpus Studio. All rights reserved.</p>
          <p>
            * Library (Google Drive, GitHub, and Local Folder export) requires Corpus Premium
            ($4/mo via Stripe). Contact data is never used for marketing.
          </p>
        </div>
      </div>
    </footer>
  );
}
