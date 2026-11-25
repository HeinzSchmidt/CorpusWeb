import { ArrowRight } from 'lucide-react';
import { FEATURE_PANELS, type FeatureItem } from '../data/corpusData';

interface FeaturesSectionProps {
  onSelectUpgrade: () => void;
}

function FeaturePanel({
  feature,
  colSpanClass,
  onSelectUpgrade,
}: {
  feature: FeatureItem;
  colSpanClass: string;
  onSelectUpgrade: () => void;
}) {
  return (
    <article
      className={`group flex h-full flex-col justify-between rounded-2xl border p-7 transition-colors duration-200 md:p-8 ${colSpanClass} ${
        feature.upgradeRequired
          ? 'border-[#234352] bg-[#0E1820] hover:border-[#22D3EE]/60'
          : 'border-[#172B35] bg-[#0C141A] hover:border-[#234352]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs text-[#7E9AA6]">
            <span className="tabular-nums text-[#22D3EE]">{feature.number}.</span>{' '}
            <span aria-hidden="true">·</span> {feature.category}
          </p>
          {feature.upgradeRequired && (
            <span className="font-mono text-xs text-[#F2C94C] whitespace-nowrap shrink-0">
              $4/mo Premium*
            </span>
          )}
        </div>

        <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#F4FAFC] md:text-2xl">
          {feature.title}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-[#9CB3BE] md:text-[15px]">
          {feature.description}
        </p>

        {/* Clean structural illustrations strictly via hairline dividers (no nested cards) */}
        {feature.id === 'multi-provider' && (
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[#172B35] pt-5">
            <div>
              <p className="font-mono text-xs text-[#22D3EE]">Text</p>
              <p className="mt-1 text-xs text-[#B2C6CF]">Frontier LLMs & MCP</p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#22D3EE]">Image</p>
              <p className="mt-1 text-xs text-[#B2C6CF]">Diffusion & Multimodal</p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#22D3EE]">Video</p>
              <p className="mt-1 text-xs text-[#B2C6CF]">Keyframe Motion Models</p>
            </div>
          </div>
        )}

        {feature.id === 'video-keyframes' && (
          <div className="mt-6 flex items-center gap-4 border-t border-[#172B35] pt-5 font-mono text-xs">
            <div className="flex-1">
              <p className="text-[#22D3EE]">Start Frame</p>
              <p className="mt-1 text-[#89A3AF]">Active opening keyframe</p>
            </div>
            <div className="h-px flex-1 border-t border-dashed border-[#2A4D5E]" aria-hidden="true" />
            <div className="flex-1 text-right">
              <p className="text-[#22D3EE]">End Frame</p>
              <p className="mt-1 text-[#89A3AF]">Active closing keyframe</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[#172B35]/80 pt-4">
        <p className="font-mono text-xs text-[#7E9AA6]">{feature.detail}</p>

        {feature.upgradeRequired && (
          <a
            href="#upgrade"
            onClick={onSelectUpgrade}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE] transition-colors hover:text-[#67E8F9] whitespace-nowrap shrink-0"
          >
            <span>Unlock Library</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

export function FeaturesSection({ onSelectUpgrade }: FeaturesSectionProps) {
  return (
    <section id="features" className="border-b border-[#172B35] bg-[#080E12]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-xs text-[#22D3EE]">02 · Capabilities</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#F4FAFC] md:text-4xl">
            Every generation mode, reference stack, and prompt rail in one place
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#9CB3BE]">
            Built around clear visual structure so you can move seamlessly from drafting text to
            conditioning images and directing start-to-end video sequences.
          </p>
        </div>

        {/* Asymmetric Bento Grid of rounded-edge panels */}
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Row 1: 7 + 5 */}
          <FeaturePanel
            feature={FEATURE_PANELS[0]}
            colSpanClass="lg:col-span-7"
            onSelectUpgrade={onSelectUpgrade}
          />
          <FeaturePanel
            feature={FEATURE_PANELS[1]}
            colSpanClass="lg:col-span-5"
            onSelectUpgrade={onSelectUpgrade}
          />

          {/* Row 2: 5 + 7 */}
          <FeaturePanel
            feature={FEATURE_PANELS[2]}
            colSpanClass="lg:col-span-5"
            onSelectUpgrade={onSelectUpgrade}
          />
          <FeaturePanel
            feature={FEATURE_PANELS[3]}
            colSpanClass="lg:col-span-7"
            onSelectUpgrade={onSelectUpgrade}
          />

          {/* Row 3: 6 + 6 balanced pair */}
          <FeaturePanel
            feature={FEATURE_PANELS[4]}
            colSpanClass="lg:col-span-6"
            onSelectUpgrade={onSelectUpgrade}
          />
          <FeaturePanel
            feature={FEATURE_PANELS[5]}
            colSpanClass="lg:col-span-6"
            onSelectUpgrade={onSelectUpgrade}
          />

          {/* Row 4: Full-width marquee highlight for Library* */}
          <FeaturePanel
            feature={FEATURE_PANELS[6]}
            colSpanClass="lg:col-span-12"
            onSelectUpgrade={onSelectUpgrade}
          />
        </div>

        <p className="mt-6 text-xs text-[#7E9AA6]">
          * Library (Google Drive, GitHub, and Local Folder export) requires a Corpus Premium
          subscription ($4/month).
        </p>
      </div>
    </section>
  );
}
