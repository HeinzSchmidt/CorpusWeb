import { useEffect } from 'react';
import { X } from 'lucide-react';
import { LEGAL_DOCS, type LegalDoc } from '../data/corpusData';

interface LegalModalProps {
  activeDocId: LegalDoc['id'] | null;
  onSelectDoc: (docId: LegalDoc['id']) => void;
  onClose: () => void;
}

const DOC_ORDER: LegalDoc['id'][] = ['privacy', 'terms', 'storage', 'refunds', 'security'];

export function LegalModal({ activeDocId, onSelectDoc, onClose }: LegalModalProps) {
  useEffect(() => {
    if (!activeDocId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDocId, onClose]);

  if (!activeDocId) return null;

  const doc = LEGAL_DOCS[activeDocId];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070A]/80 p-4 backdrop-blur-sm md:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#234352] bg-[#0B1217] shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#172B35] px-6 py-5 md:px-8">
          <div>
            <p className="font-mono text-xs text-[#22D3EE]">Corpus Legal · Cybrnut.com</p>
            <h2 id="legal-modal-title" className="mt-1 text-xl font-bold text-[#F4FAFC] md:text-2xl">
              {doc.title}
            </h2>
            <p className="mt-1 text-xs text-[#7E9AA6]">{doc.updated}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal document"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#172B35] text-[#9CB3BE] transition-colors hover:border-[#22D3EE]/50 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Document Switcher Bar */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[#172B35] bg-[#080E12] px-6 py-2.5 md:px-8">
          {DOC_ORDER.map((id) => {
            const item = LEGAL_DOCS[id];
            const isSelected = id === activeDocId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectDoc(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#16303A] text-[#22D3EE]'
                    : 'text-[#89A3AF] hover:text-[#E6EFF2]'
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        {/* Scrollable Legal Body */}
        <div className="overflow-y-auto px-6 py-6 md:px-8 md:py-7">
          <div className="space-y-6">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-base font-semibold text-[#F4FAFC]">{section.heading}</h3>
                <div className="mt-2.5 space-y-3">
                  {section.body.map((paragraph, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-[#9CB3BE]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-[#172B35] bg-[#080E12] px-6 py-4 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#22D3EE] px-5 py-2 text-xs font-semibold text-[#061318] transition-colors hover:bg-[#4AE0F5]"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
}
