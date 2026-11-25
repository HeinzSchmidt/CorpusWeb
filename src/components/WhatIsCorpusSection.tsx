import { useState } from 'react';
import { Monitor, Layers } from 'lucide-react';
import { ASSETS } from '../data/corpusData';

export function WhatIsCorpusSection() {
  const [crtFailed, setCrtFailed] = useState(false);
  const [windowFailed, setWindowFailed] = useState(false);

  return (
    <section id="what-is-corpus" className="border-b border-[#172B35] bg-[#070C10]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:pt-22 md:pb-28">
        {/* Top split: Proposition & Architecture Summary */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="font-mono text-xs text-[#22D3EE]">01 · What is Corpus</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#F4FAFC] md:text-4xl">
                A multi-provider AI harness built like a tactile studio instrument
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[#B2C6CF]">
                Corpus is a browser-based studio for generating text, image and video assets
                through multiple LLM providers via your own API keys or MCP tools and downloading
                finished work directly to your computer or exporting through your Library
                <a
                  href="#upgrade"
                  className="ml-0.5 font-mono text-xs text-[#F2C94C] transition-colors hover:text-[#FDE073]"
                  aria-label="Library Premium subscription note"
                >
                  (*)
                </a>
                .
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-[#F4FAFC]">What about security?</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#9CB3BE] md:text-[15px]">
                    All credentials and workspace settings remain inside your web browser. Our
                    Node/Express backend serves strictly as a stateless proxy for generation,
                    export and MCP calls—giving you the clarity and responsiveness of a modern
                    creative tool while your credentials remain on your system.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#F4FAFC]">
                    What happens if I clear my browser session data?
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#9CB3BE] md:text-[15px]">
                    Your credentials, generated text, images and video will be lost. We do not
                    store your data so it is important that you copy generated text and download
                    images and videos before clearing your browser session. Note that your session
                    will survive browser restarts if it&apos;s set to do that.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#F4FAFC]">
                    Can I export my images and video directly to Google Drive, GitHub, or a Local
                    Folder?
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#9CB3BE] md:text-[15px]">
                    Yes—together these make up the Library feature, which is part of the paid
                    Premium plan. Setting up cloud destinations also requires a bit of technical
                    know-how.
                  </p>
                </div>
              </div>

              <p className="mt-6 border-t border-[#172B35]/70 pt-4 text-xs leading-relaxed text-[#89A3AF]">
                <span className="font-mono text-[#F2C94C]">(*)</span> Library (Google Drive,
                GitHub, and Local Folder export) is part of the{' '}
                <a
                  href="#upgrade"
                  className="text-[#CBDCE3] underline decoration-[#22D3EE]/60 underline-offset-2 transition-colors hover:text-[#F4FAFC]"
                >
                  Premium subscription
                </a>
                , but at $4 per month it won&apos;t break the bank.
              </p>
            </div>

            {/* Clean unboxed architectural pillars separated by hairline dividers */}
            <div className="mt-10 grid grid-cols-1 gap-6 border-t border-[#172B35] pt-8 sm:grid-cols-3">
              <div>
                <p className="font-mono text-xs text-[#D9A234]">Inputs</p>
                <p className="mt-1.5 text-sm font-semibold text-[#F4FAFC]">
                  Bring Your Own API Keys & MCP
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#89A3AF]">
                  Connect the exact models you prefer across text, image, and video without vendor
                  lock-in.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-[#D9A234]">Proxy Layer</p>
                <p className="mt-1.5 text-sm font-semibold text-[#F4FAFC]">
                  Stateless Node & Express Relay
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#89A3AF]">
                  Forwards generation, export, and MCP requests without retaining keys or media.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-[#D9A234]">Library*</p>
                <p className="mt-1.5 text-sm font-semibold text-[#F4FAFC]">
                  Google Drive, GitHub, or Local Folder
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#89A3AF]">
                  Download assets manually or route them directly into your own connected Library
                  destinations.
                </p>
              </div>
            </div>
          </div>

          {/* Right column: Workspace References & Atmosphere Visuals */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            <figure className="overflow-hidden rounded-2xl border border-[#172B35] bg-[#0C141A]">
              <div className="flex w-full items-center justify-center bg-[#080E12] p-4">
                {!crtFailed ? (
                  <img
                    src={ASSETS.referencesPanel}
                    alt="Corpus Assets panel showing separate Image Generation References stack and Video Generation References start and end frame slots"
                    referrerPolicy="no-referrer"
                    onError={() => setCrtFailed(true)}
                    className="max-h-[340px] w-auto rounded-lg border border-[#172B35]/80 object-contain"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-[#0C141A]">
                    <Monitor className="h-8 w-8 text-[#D9A234]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <figcaption className="border-t border-[#172B35] bg-[#0C141A] p-5">
                <p className="font-mono text-xs text-[#F2C94C]">
                  Separate Image and Video references
                </p>
                <p className="mt-1 text-sm text-[#E6EFF2]">
                  References for image generation and start- and end frame references for video
                  generation
                </p>
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-2xl border border-[#172B35] bg-[#0C141A]">
              <div className="flex w-full items-center justify-center bg-[#080E12] p-4">
                {!windowFailed ? (
                  <img
                    src={ASSETS.systemPromptsPanel}
                    alt="Corpus System Prompt panel showing dedicated TEXT, IMAGE, and VIDEO system prompt tabs with editable guidance and Save button"
                    referrerPolicy="no-referrer"
                    onError={() => setWindowFailed(true)}
                    className="max-h-[340px] w-auto rounded-lg border border-[#172B35]/80 object-contain"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-[#0C141A]">
                    <Layers className="h-8 w-8 text-[#22D3EE]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <figcaption className="border-t border-[#172B35] bg-[#0C141A] p-5">
                <p className="font-mono text-xs text-[#22D3EE]">Dedicated System Prompts</p>
                <p className="mt-1 text-sm text-[#E6EFF2]">
                  Text, image and video models each have their own system prompts, to guide the
                  model in writing, image- and video gen.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
