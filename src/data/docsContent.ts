/**
 * Structured content for the /docs page.
 *
 * Kept as plain data (rendered by src/components/DocsPage.tsx) so the
 * required strings — especially the OLLAMA_ORIGINS setup commands — can be
 * asserted directly by tests/docs-page.test.ts without a DOM.
 */

/** The site origin Ollama must allow for browser-direct requests. */
export const OLLAMA_ORIGINS_VALUE = 'https://corpus.cybrnut.com';

/** One-time macOS command so the browser may reach local Ollama. */
export const OLLAMA_MACOS_COMMAND = `launchctl setenv OLLAMA_ORIGINS ${OLLAMA_ORIGINS_VALUE}`;

/** One-time Linux command (ollama running as a systemd service). */
export const OLLAMA_LINUX_COMMANDS = [
  `sudo systemctl edit ollama.service`,
  `# add under [Service]:  Environment="OLLAMA_ORIGINS=${OLLAMA_ORIGINS_VALUE}"`,
  'sudo systemctl daemon-reload',
  'sudo systemctl restart ollama',
];

/** One-time Windows commands (user-level environment variable). */
export const OLLAMA_WINDOWS_COMMANDS = [
  `setx OLLAMA_ORIGINS "${OLLAMA_ORIGINS_VALUE}"`,
  'then quit and restart Ollama',
];

export interface DocsHowToStep {
  id: string;
  label: string;
  title: string;
  body: string[];
}

/** Short how-to for using Corpus: sign in, settings & providers, library, premium. */
export const DOCS_HOW_TO: DocsHowToStep[] = [
  {
    id: 'signin',
    label: '01',
    title: 'Sign in',
    body: [
      'Open https://corpus.cybrnut.com and sign in with your account. Your session is kept in this browser only — nothing about your sign-in is stored centrally.',
      'New to Corpus? Accounts are provisioned by the operators. If you have no account yet, use the contact form on this site to request one.',
    ],
  },
  {
    id: 'settings',
    label: '02',
    title: 'Settings & providers',
    body: [
      'Open Settings and pick a provider per modality — TEXT, IMAGE and VIDEO each have their own provider, API key, base URL and model.',
      'API keys live in your browser\u2019s localStorage only; they are never written to a Corpus database. Use \u201cTest Connectivity\u201d to verify a key and \u201cList Models\u201d to load the model catalog for your choice.',
      'System prompts are per modality, so a TEXT persona does not leak into image or video requests.',
    ],
  },
  {
    id: 'library',
    label: '03',
    title: 'Library',
    body: [
      'Everything you generate is organised into sessions in your library. You can revisit a session, keep working in it, or export its content.',
      'Premium accounts can export library content directly to Google Drive, GitHub, or a local folder.',
    ],
  },
  {
    id: 'premium',
    label: '04',
    title: 'Premium',
    body: [
      'Corpus Premium is a flat $4/month subscription that unlocks premium features such as library export. Upgrade from this premium site.',
      'After payment, open the app\u2019s /premium page to see your status; the premium flag activates from the payment webhook.',
    ],
  },
];

export interface OllamaPlatformGuide {
  platform: string;
  note: string;
  commands: string[];
}

/** OLLAMA_ORIGINS setup per platform. Ollama only serves browsers from allowed origins. */
export const OLLAMA_PLATFORM_GUIDES: OllamaPlatformGuide[] = [
  {
    platform: 'macOS',
    note: 'Set the environment variable for your user session, then restart Ollama.',
    commands: [OLLAMA_MACOS_COMMAND, 'Restart the Ollama app (quit it from the menu bar, then start it again).'],
  },
  {
    platform: 'Linux',
    note: 'If Ollama runs as the default systemd service, add the variable to the unit override.',
    commands: OLLAMA_LINUX_COMMANDS,
  },
  {
    platform: 'Windows',
    note: 'Set a user-level environment variable (PowerShell or Command Prompt).',
    commands: OLLAMA_WINDOWS_COMMANDS,
  },
];

/** Browser caveat for the Ollama provider, stated once on the page. */
export const OLLAMA_BROWSER_CAVEAT =
  'Safari blocks HTTPS pages from reaching HTTP localhost. Use Chrome or Firefox for Ollama in Corpus.';

/** What the Ollama provider supports, honestly. */
export const OLLAMA_CAPABILITY_ROWS: Array<{ capability: string; supported: boolean; detail: string }> = [
  {
    capability: 'Text generation',
    supported: true,
    detail: 'Chat with any model you have pulled locally, including multi-turn history and system prompts.',
  },
  {
    capability: 'Image understanding (vision)',
    supported: true,
    detail: 'Vision models read images you attach in TEXT mode. Ollama does not generate images.',
  },
  {
    capability: 'Image generation',
    supported: false,
    detail: 'Not supported by Ollama. The option is shown in Settings with an honest \u201cnot supported\u201d message.',
  },
  {
    capability: 'Video generation / understanding',
    supported: false,
    detail: 'Not supported by Ollama. Pick a cloud provider for VIDEO.',
  },
];
