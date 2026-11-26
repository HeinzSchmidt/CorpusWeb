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
  /** Optional inline links: each occurrence of `text` in any body paragraph becomes an anchor. */
  links?: Array<{ text: string; href: string }>;
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
    // "Google Drive" now has its own setup guide below — link it from this line.
    links: [{ text: 'Google Drive', href: '#google-drive' }],
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

export interface DocsDriveStep {
  label: string;
  /** The exact console / app path for the step — rendered bold. */
  title: string;
  body: string[];
}

/**
 * "Save to Google Drive" setup guide (/docs, section id "google-drive").
 *
 * One-time Google Console setup for your OWN OAuth client, using the
 * non-sensitive drive.file scope: Corpus creates and fills a "Corpus"
 * folder in My Drive itself, and can only see files it created.
 */
export const DOCS_GOOGLE_DRIVE: {
  id: string;
  heading: string;
  intro: string;
  steps: DocsDriveStep[];
  troubleshooting: Array<{ problem: string; fix: string }>;
} = {
  id: 'google-drive',
  heading: 'Save to Google Drive: set up Google OAuth (2026)',
  intro:
    'Corpus Premium can save your exports (media files plus corpus-manifest.json) into a “Corpus” folder that Corpus creates in your Google Drive. This uses your own OAuth client with the drive.file scope — non-sensitive, no Google verification, and the app can only see files it created. One-time Google Console setup:',
  steps: [
    {
      label: '01',
      title: 'console.cloud.google.com',
      body: ['Create a project (or select an existing one).'],
    },
    {
      label: '02',
      title: 'APIs & Services > Library',
      body: ['Find Google Drive API and click Enable.'],
    },
    {
      label: '03',
      title: 'Google Auth Platform > Branding',
      body: [
        'Open Google Auth Platform (click Get started if prompted) and set Branding: app name, user support email, developer contact email.',
      ],
    },
    {
      label: '04',
      title: 'Audience',
      body: [
        'Choose External and leave it in Testing, then add your own Google account under Test users (max 100). While in Testing, Google expires consent after 7 days — just click Login to Google again when that happens.',
        'There is also a Personal audience option: creator only, no verification, no 100-user cap, no 7-day expiry. Choosing Personal can\u2019t be undone.',
      ],
    },
    {
      label: '05',
      title: 'Data Access > Add or remove scopes',
      body: [
        'Tick https://www.googleapis.com/auth/drive.file (non-sensitive: Corpus can only see files it creates), then Update > Save.',
      ],
    },
    {
      label: '06',
      title: 'Clients > Create client',
      body: [
        'Set Application type to Web application. Under Authorized JavaScript origins add https://corpus.cybrnut.com (no path, no trailing slash). No redirect URI is needed. Click Create, then copy the Client ID.',
        'A client secret is shown once: Corpus does NOT need it, so never paste the client secret anywhere.',
      ],
    },
    {
      label: '07',
      title: 'LIBRARY > Google Drive > Drive settings',
      body: [
        'In Corpus: paste the Client ID into \u201cGoogle OAuth client id\u201d, click Save Drive settings, then Login to Google and approve.',
      ],
    },
    {
      label: '08',
      title: 'Export > Google Drive',
      body: [
        'To save generated content: open Export and pick Google Drive. Files go to the \u201cCorpus\u201d folder Corpus creates in My Drive. Only files Corpus saved appear in its Drive panel.',
      ],
    },
  ],
  troubleshooting: [
    {
      problem: 'origin_mismatch',
      fix: 'The page origin is not registered exactly. Check for typos, and include the port when it is not 80/443 (for local tests that means http://localhost:3000).',
    },
    {
      problem: '“access blocked” / not a test user',
      fix: 'Your Google account is missing from Test users (max 100) while the app is in Testing — add it under Audience.',
    },
    {
      problem: 'Asked to sign in again',
      fix: 'In Testing, consent expires after 7 days; separately, the access token lasts about 1 hour. Click Login to Google again.',
    },
    {
      problem: 'Popup blocked',
      fix: 'Google sign-in opens in a popup — allow popups for the site.',
    },
    {
      problem: 'Self-hosted',
      fix: 'Add http://localhost and http://localhost:3000 as Authorized JavaScript origins too.',
    },
  ],
};
