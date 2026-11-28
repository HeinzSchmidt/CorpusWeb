import { useState } from 'react';
import { ArrowUpRight, Monitor } from 'lucide-react';
import { ASSETS, CORPUS_APP_URL, INSPECTOR_REGIONS } from '../data/corpusData';

export function HeroSection() {
  const [activeRegionId, setActiveRegionId] = useState<string>('canvas');
  const [bgFailed, setBgFailed] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);

  const activeRegion =
    INSPECTOR_REGIONS.find((r) => r.id === activeRegionId) ?? INSPECTOR_REGIONS[0];

  return (
    <section id="top" className="relative overflow-hidden border-b border-[#172B35]">
      {/* Subtle cyberpunk lab atmospheric backdrop with measured dark contrast scrim */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {!bgFailed && (
          <img
            src={ASSETS.cyberpunkLab}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="h-full w-full object-cover object-center opacity-22 saturate-75"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070C10]/90 via-[#070C10]/85 to-[#070C10]" />
        <div className="corpus-grid-bg absolute inset-0 opacity-70" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Editorial Hero Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs tracking-wide text-[#D9A234]">
            Visual Content Generation Studio · by Cybrnut.com
          </p>

          <h1
            className="mt-4 font-bold tracking-tight text-[#F4FAFC]"
            style={{ fontSize: 'clamp(2.35rem, 4.4vw, 3.85rem)', lineHeight: 1.08 }}
          >
            One browser studio for every AI text, image, and video workflow
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#9CB3BE] md:text-lg">
            Corpus connects your own API keys and MCP tools to multiple LLM providers inside a
            single focused interface. Your keys never leave your browser, your media never sits on
            our servers, and Library exports go straight to Google Drive, GitHub, or a Local Folder.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href={CORPUS_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-6 py-3 text-sm font-semibold text-[#061318] transition-colors duration-150 hover:bg-[#4AE0F5] whitespace-nowrap shrink-0"
            >
              <span>Open Corpus Studio</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <a
              href="#upgrade"
              className="inline-flex items-center justify-center rounded-lg border border-[#234352] bg-[#0C141A]/90 px-6 py-3 text-sm font-medium text-[#E6EFF2] transition-colors duration-150 hover:border-[#22D3EE]/60 hover:text-white whitespace-nowrap shrink-0"
            >
              Upgrade to Premium — $4/mo
            </a>
          </div>
        </div>

        {/* Dominant Focal Anchor: Actual Corpus Interface with Interactive Region Inspector */}
        <div className="mt-14 md:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#E6EFF2]">
                Inspect the live Corpus workspace
              </h2>
              <p className="mt-0.5 text-xs text-[#7E9AA6]">
                Select a workspace panel to learn more about what it does.
              </p>
            </div>

            {/* Interactive Segmented Selector (functional tabs, not static pills) */}
            <div
              role="tablist"
              aria-label="Corpus workspace regions"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#172B35] bg-[#0A1117] p-1"
            >
              {INSPECTOR_REGIONS.map((region) => {
                const isActive = region.id === activeRegion.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveRegionId(region.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#F6CF55] text-[#061318] font-semibold'
                        : 'bg-[#D9A234] text-[#061318] font-medium hover:bg-[#E6B543]'
                    }`}
                  >
                    {region.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Bezel Frame holding Screenshot1 */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#1F3A47] bg-[#0B1217] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#080E12]">
              {!shotFailed ? (
                <img
                  src={ASSETS.screenshot}
                  alt="Corpus web studio interface displaying the preview canvas, Reference Prompts tab, image and video reference panels, and the multi-provider chat composer"
                  referrerPolicy="no-referrer"
                  onError={() => setShotFailed(true)}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0A1218] p-8 text-center">
                  <Monitor className="h-10 w-10 text-[#22D3EE]" aria-hidden="true" />
                  <p className="text-sm font-medium text-[#E6EFF2]">
                    Corpus Studio Interface Preview
                  </p>
                  <p className="max-w-md text-xs text-[#7E9AA6]">
                    Visit corpus.cybrnut.com to open the full browser studio.
                  </p>
                </div>
              )}

              {/* Highlight Frame matching active region */}
              {!shotFailed && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-lg border-2 border-[#22D3EE] bg-[#22D3EE]/10 shadow-[0_0_24px_rgba(34,211,238,0.28)] transition-all duration-200"
                  style={{
                    top: activeRegion.highlight.top,
                    left: activeRegion.highlight.left,
                    width: activeRegion.highlight.width,
                    height: activeRegion.highlight.height,
                  }}
                />
              )}
            </div>

            {/* Clean caption strip below screenshot (no overlapping text on screenshot) */}
            <div className="flex flex-col gap-3 border-t border-[#172B35] bg-[#0C141A] px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-[#F4FAFC]">{activeRegion.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#9CB3BE]">
                  {activeRegion.description}
                </p>
              </div>
              <a
                href={CORPUS_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-[#22D3EE] transition-colors hover:text-[#67E8F9] whitespace-nowrap shrink-0"
              >
                <span>corpus.cybrnut.com</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
