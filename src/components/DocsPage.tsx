import { Check, X } from 'lucide-react';
import {
  DOCS_HOW_TO,
  OLLAMA_BROWSER_CAVEAT,
  OLLAMA_CAPABILITY_ROWS,
  OLLAMA_PLATFORM_GUIDES,
} from '../data/docsContent';

/**
 * The /docs page: a short how-to for using Corpus plus the "Use your own
 * local LLM with Ollama" guide (OLLAMA_ORIGINS per platform, browser caveat,
 * honest capability list). All copy is data-driven from docsContent.ts.
 */
export function DocsPage() {
  return (
    <div className="border-b border-[#172B35] bg-[#070C10]">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
        <p className="font-mono text-xs text-[#22D3EE]">Docs</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-[#F4FAFC] md:text-4xl">
          Using Corpus, and running your own local models with Ollama
        </h1>

        {/* How-to */}
        <section id="how-to" className="mt-14">
          <h2 className="text-xl font-semibold text-[#F4FAFC]">Getting started with Corpus</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {DOCS_HOW_TO.map((step) => (
              <div key={step.id} className="rounded-2xl border border-[#172B35] bg-[#0C141A] p-7">
                <p className="font-mono text-xs text-[#22D3EE]">
                  {step.label} · {step.title}
                </p>
                <div className="mt-3 space-y-3">
                  {step.body.map((paragraph, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-[#9CB3BE]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ollama */}
        <section id="ollama" className="mt-16">
          <h2 className="text-xl font-semibold text-[#F4FAFC]">Use your own local LLM with Ollama</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#9CB3BE]">
            In Corpus Settings, pick <span className="font-medium text-[#F4FAFC]">Ollama (local)</span> as the
            provider (default base URL <code className="font-mono text-[#22D3EE]">http://127.0.0.1:11434</code>).
            Unlike cloud providers, Ollama is called <span className="font-medium text-[#F4FAFC]">directly from
            your browser</span> — no request passes through a Corpus server, and no API key is involved. For that
            to work, Ollama must allow this site as an origin.
          </p>

          {/* Capability table */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-[#172B35] bg-[#0C141A]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#172B35] font-mono text-xs text-[#CBDCE3]">
                  <th className="px-6 py-3">Capability</th>
                  <th className="px-6 py-3">Ollama</th>
                  <th className="px-6 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {OLLAMA_CAPABILITY_ROWS.map((row) => (
                  <tr key={row.capability} className="border-b border-[#172B35] last:border-b-0">
                    <td className="px-6 py-4 font-medium text-[#F4FAFC]">{row.capability}</td>
                    <td className="px-6 py-4">
                      {row.supported ? (
                        <span className="inline-flex items-center gap-1.5 text-[#22D3EE]">
                          <Check className="h-4 w-4" aria-hidden="true" /> Supported
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#F2C94C]">
                          <X className="h-4 w-4" aria-hidden="true" /> Not supported
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 leading-relaxed text-[#9CB3BE]">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* OLLAMA_ORIGINS setup */}
          <h3 className="mt-10 text-base font-semibold text-[#F4FAFC]">
            Set <code className="font-mono text-[#22D3EE]">OLLAMA_ORIGINS</code> so your browser can reach
            Ollama
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#9CB3BE]">
            Ollama only serves browsers from origins listed in the{' '}
            <code className="font-mono text-[#22D3EE]">OLLAMA_ORIGINS</code> environment variable. Allow this
            site — <code className="font-mono text-[#22D3EE]">OLLAMA_ORIGINS=https://corpus.cybrnut.com</code> —
            on your machine:
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {OLLAMA_PLATFORM_GUIDES.map((guide) => (
              <div key={guide.platform} className="rounded-2xl border border-[#172B35] bg-[#0C141A] p-6">
                <p className="font-mono text-xs text-[#22D3EE]">{guide.platform}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#7E9AA6]">{guide.note}</p>
                <div className="mt-3 space-y-2">
                  {guide.commands.map((command, idx) => (
                    <pre
                      key={idx}
                      className="overflow-x-auto rounded-lg bg-[#060A0E] p-3 font-mono text-xs leading-relaxed text-[#3CF0FC]"
                    >
                      {command}
                    </pre>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-3xl rounded-2xl border border-[#F2C94C]/40 bg-[#0C141A] p-5 text-sm leading-relaxed text-[#F2C94C]">
            Browser note: {OLLAMA_BROWSER_CAVEAT}
          </p>
        </section>
      </div>
    </div>
  );
}
