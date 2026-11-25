import { ArrowRight } from 'lucide-react';

interface SecuritySectionProps {
  onOpenSecurityDoc: () => void;
}

const DATA_FLOW_STEPS = [
  {
    step: '01',
    zone: 'Your Web Browser',
    title: 'Local API Keys & Settings',
    description:
      'Provider API keys, session logs, and system prompts live exclusively in your browser storage—never in a Corpus database.',
  },
  {
    step: '02',
    zone: 'Stateless Relay',
    title: 'Node & Express Proxy',
    description:
      'Forwards generation, export, and MCP requests over TLS to your selected provider and discards payloads immediately after transfer.',
  },
  {
    step: '03',
    zone: 'Your Destination',
    title: 'Browser Download or Library*',
    description:
      'Generated images and videos stream straight back to you for manual download, or direct export through Library (Google Drive, GitHub, or a Local Folder).',
  },
];

export function SecuritySection({ onOpenSecurityDoc }: SecuritySectionProps) {
  return (
    <section id="security" className="relative border-b border-[#172B35] bg-[#070C10]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="font-mono text-xs text-[#F2C94C]">03 · Security & Ownership</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#F4FAFC] md:text-4xl">
              Your content stays with you. Always.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#9CB3BE]">
              Most AI web studios collect your API keys in central vaults and retain copies of
              every asset you generate. Corpus was engineered from day one to keep zero keys and
              zero generated media on our servers.
            </p>

            <button
              type="button"
              onClick={onOpenSecurityDoc}
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-[#22D3EE] transition-colors hover:text-[#67E8F9] whitespace-nowrap shrink-0"
            >
              <span>Read Security Architecture Disclosure</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-2xl border border-[#172B35] bg-[#0C141A] p-7">
              <p className="font-mono text-xs text-[#22D3EE]">Credential Isolation</p>
              <h3 className="mt-3 text-lg font-semibold text-[#F4FAFC]">
                API keys stay in your browser
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9CB3BE]">
                User API keys are never stored on the Corpus server. They remain strictly inside
                your web browser’s local storage, meaning you stay in full command of revocation and
                rotation at all times.
              </p>
            </div>

            <div className="rounded-2xl border border-[#172B35] bg-[#0C141A] p-7">
              <p className="font-mono text-xs text-[#22D3EE]">Zero Server Media Storage</p>
              <h3 className="mt-3 text-lg font-semibold text-[#F4FAFC]">
                Generated imagery and video never stay on our servers
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9CB3BE]">
                Generated images and videos are not archived on Corpus servers. Download them
                directly from your browser after generation, or export straight to Google Drive,
                GitHub, or a Local Folder using Library* with Premium.
              </p>
            </div>
          </div>
        </div>

        {/* Clean 3-stage stateless data flow bar */}
        <div className="mt-14 rounded-2xl border border-[#172B35] bg-[#0B1217] p-7 md:p-9">
          <div className="flex flex-col gap-2 border-b border-[#172B35] pb-5 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-semibold text-[#F4FAFC]">
              How a Corpus generation request travels
            </h3>
            <p className="font-mono text-xs text-[#7E9AA6]">
              Zero credential storage · Zero media retention
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-8 md:grid-cols-3">
            {DATA_FLOW_STEPS.map((item) => (
              <div key={item.step} className="relative">
                <p className="font-mono text-xs text-[#D9A234]">
                  <span className="tabular-nums">{item.step}</span> · {item.zone}
                </p>
                <h4 className="mt-2.5 text-base font-semibold text-[#F4FAFC]">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#9CB3BE]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
