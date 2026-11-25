import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigateUpgrade: () => void;
}

const NAV_LINKS = [
  { label: 'What is Corpus', href: '#what-is-corpus' },
  { label: 'Features', href: '#features' },
  { label: 'Security', href: '#security' },
  { label: 'Upgrade', href: '#upgrade' },
  { label: 'Contact', href: '#contact' },
];

export function Navbar({ onNavigateUpgrade }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#172B35] bg-[#070C10]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-8 px-6">
        {/* Zone 1: Single-line brand mark and wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0"
          aria-label="Corpus Home"
        >
          <img
            src="/assets/aistudio/corpus_mark_256_39206a8c.png"
            alt=""
            referrerPolicy="no-referrer"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="corpus-wordmark text-2xl tracking-tight">CORPUS</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9CB3BE]"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F0F7F9] after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-[#22D3EE] after:transition-all after:duration-200 hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#upgrade"
            onClick={onNavigateUpgrade}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#22D3EE] px-4 py-2 text-xs font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5] whitespace-nowrap shrink-0"
          >
            Upgrade to Premium
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#172B35] text-[#CBDCE3] transition-colors hover:border-[#22D3EE]/50 hover:text-white md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[#172B35] bg-[#0A1117] px-6 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-[#CBDCE3] transition-colors hover:text-[#22D3EE]"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#upgrade"
              onClick={() => {
                setMobileOpen(false);
                onNavigateUpgrade();
              }}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#061318]"
            >
              Upgrade to Premium
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
