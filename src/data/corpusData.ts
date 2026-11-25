export interface FeatureItem {
  id: string;
  number: string;
  category: string;
  title: string;
  description: string;
  detail: string;
  upgradeRequired?: boolean;
  span: 'wide' | 'standard';
}

export interface InspectorRegion {
  id: string;
  label: string;
  title: string;
  description: string;
  /** Percentage box coordinates mapped accurately onto Screenshot1_85eab72d.png */
  highlight: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
}

export interface LegalDoc {
  id: 'privacy' | 'terms' | 'storage' | 'refunds' | 'security';
  title: string;
  updated: string;
  sections: {
    heading: string;
    body: string[];
  }[];
}

export const CORPUS_APP_URL = 'https://corpus.cybrnut.com';

export const ASSETS = {
  screenshot: '/assets/aistudio/Screenshot1_85eab72d.png',
  cyberpunkLab: '/assets/aistudio/cyberpunkbg1_8e1aba2b.jpg',
  cyberpunkWindow: '/assets/aistudio/cyberpunkbg2_5f28489f.jpg',
  crtDesk: '/assets/aistudio/crt_41eeb9f6.jpeg',
  referencesPanel: '/assets/aistudio/Screenshot_2026-11-25_at_12.03.03_36619de6.png',
  systemPromptsPanel: '/assets/aistudio/Screenshot_2026-11-25_at_12.03.25_2da837a4.png',
} as const;

export const INSPECTOR_REGIONS: InspectorRegion[] = [
  {
    id: 'canvas',
    label: 'Preview Canvas',
    title: 'High-Contrast Asset Viewer & Timeline',
    description:
      'Review the most recent or selected image and video directly on the grid canvas, with every session asset indexed along the timeline strip beneath it.',
    highlight: { top: '2.5%', left: '13.5%', width: '70.3%', height: '47%' },
  },
  {
    id: 'image-stack',
    label: 'Image Reference Stack',
    title: 'Visual Reference Conditioning',
    description:
      'Drop PNG, JPG, or WebP reference frames into the dedicated Image Generation Reference stack. References are sent only during image prompts to maintain style, composition, and subject continuity.',
    highlight: { top: '3.2%', left: '84.4%', width: '15.2%', height: '14.5%' },
  },
  {
    id: 'video-stack',
    label: 'Video Keyframes',
    title: 'Start Frame & End Frame Anchoring',
    description:
      'Assign explicit Start Frame and End Frame keyframes in the Video Generation Reference stack so motion models interpolate cleanly between two visual states.',
    highlight: { top: '18.2%', left: '84.4%', width: '15.2%', height: '16%' },
  },
  {
    id: 'system-prompts',
    label: 'System Prompts',
    title: 'Modality-Specific System Prompts',
    description:
      'Switch between independent TEXT, IMAGE, and VIDEO system prompt tabs. Keep art direction rules, output formatting, and negative constraints separate for each modality.',
    highlight: { top: '34.8%', left: '84.4%', width: '15.2%', height: '64.2%' },
  },
  {
    id: 'chat-composer',
    label: 'Chat & Model Router',
    title: 'Multi-Provider Chat & Mode Switcher',
    description:
      'Work in a familiar conversational log while switching between TEXT, IMAGE, and VIDEO modes and selecting the exact LLM provider or model from the bottom routing bar.',
    highlight: { top: '50.5%', left: '13.5%', width: '70.3%', height: '48.2%' },
  },
];

export const FEATURE_PANELS: FeatureItem[] = [
  {
    id: 'multi-provider',
    number: '01',
    category: 'Model Routing',
    title: 'Different AI providers for text, image, and video',
    description:
      'Pick the exact providers and models that fit each stage of your workflow. Pair one frontier model for scriptwriting, another for image synthesis, and a dedicated video model—using your own API keys or MCP tools.',
    detail: 'API Keys · MCP Tools · Per-Modality Model Selection',
    span: 'wide',
  },
  {
    id: 'ai-chat',
    number: '02',
    category: 'Conversational Drafting',
    title: 'Generate text responses in a familiar chat workspace',
    description:
      'Write prompts, refine art direction, iterate on copy, and organize work across multiple chat sessions with clean history and immediate response streaming.',
    detail: 'Multi-Session Log · Text Mode · Fast Context Switching',
    span: 'standard',
  },
  {
    id: 'image-references',
    number: '03',
    category: 'Visual Continuity',
    title: 'Image generation reference stack',
    description:
      'Add reference images to the image generation reference stack and generate new visuals guided directly by the active references—keeping lighting, character traits, and framing consistent.',
    detail: 'PNG / JPG / WebP · Active Stack Conditioning',
    span: 'standard',
  },
  {
    id: 'video-keyframes',
    number: '04',
    category: 'Motion Control',
    title: 'Video start and end frame reference stack',
    description:
      'Load a start frame and an end frame image into the video generation reference stack to direct camera transitions and motion arcs between your exact chosen keyframes.',
    detail: 'Start Frame · End Frame · Directed Motion Generation',
    span: 'wide',
  },
  {
    id: 'system-prompts',
    number: '05',
    category: 'Precision Guardrails',
    title: 'Unique system prompts for text, image, and video',
    description:
      'Configure three independent system prompts—one for text, one for image, and one for video generation—so tone, aesthetic direction, and technical constraints stay clean and reusable.',
    detail: 'Dedicated Tabs · Saved Locally · Instant Switching',
    span: 'standard',
  },
  {
    id: 'preview-window',
    number: '06',
    category: 'Inspection',
    title: 'Live preview window and session timeline',
    description:
      'Inspect the most recent generation or any previously selected image or video in full clarity inside the central preview canvas, paired with a thumbnail timeline for fast comparison.',
    detail: 'Full-Frame Canvas · Instant Selection · Direct Export',
    span: 'standard',
  },
  {
    id: 'google-drive',
    number: '07',
    category: 'Library · Premium',
    title: 'Library export to Google Drive, GitHub, or a Local Folder*',
    description:
      'Connect Corpus Library directly to your Google Drive, GitHub repository, or a Local Folder to organize, browse, and archive generated imagery and video in a personal library that remains completely under your control.',
    detail: 'Upgrade Required ($4/mo) · Google Drive, GitHub & Local Folder · Zero Corpus Media Storage',
    upgradeRequired: true,
    span: 'wide',
  },
];

export const COMPARISON_ROWS = [
  {
    capability: 'Multi-provider text, image, and video generation',
    free: 'Included',
    premium: 'Included',
  },
  {
    capability: 'Image reference stack & video start/end frame stack',
    free: 'Included',
    premium: 'Included',
  },
  {
    capability: 'Unique system prompts for text, image, and video',
    free: 'Included',
    premium: 'Included',
  },
  {
    capability: 'Browser-only API key storage & manual browser downloads',
    free: 'Included',
    premium: 'Included',
  },
  {
    capability: 'Library export — Google Drive, GitHub & Local Folder*',
    free: 'Not included',
    premium: 'Included',
  },
  {
    capability: 'Directly funds ongoing Corpus engineering & maintenance',
    free: '—',
    premium: 'Included',
  },
];

export const LEGAL_DOCS: Record<LegalDoc['id'], LegalDoc> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    updated: 'Last updated November 2026',
    sections: [
      {
        heading: '1. Core Privacy Architecture',
        body: [
          'Corpus (operated by Cybrnut.com) is architected so that your credentials and creative work remain under your direct control. All LLM provider API keys, model selections, and workspace system prompts are stored exclusively inside your local web browser storage.',
          'The Corpus Node/Express backend functions strictly as a stateless proxy to forward generation requests, export actions, and MCP tool calls to the external providers you choose. API keys and generated media payloads are never persisted to Corpus databases or server disks.',
        ],
      },
      {
        heading: '2. Zero Marketing Use of Contact Information',
        body: [
          'When you register for Corpus Premium or submit an inquiry via the Contact Form, we collect only the details necessary to manage your subscription or reply to your message (such as your name and email address).',
          'Your contact information is never sold, rented, shared with third-party advertisers, or used for marketing campaigns or promotional newsletters.',
        ],
      },
      {
        heading: '3. Payment Processing via Stripe',
        body: [
          'Corpus Premium subscriptions ($4 USD/month) are processed securely through Stripe. Corpus never receives, processes, or stores your full payment card number, CVC, or bank account credentials on our servers.',
        ],
      },
      {
        heading: '4. Library Export Integration (Premium)',
        body: [
          'If you upgrade to Corpus Premium and configure Library (Google Drive, GitHub, or Local Folder export), Corpus accesses only the specific Library destination you authorize in order to transfer and browse your generated images and videos. You can disconnect or revoke Library destination access at any time.',
        ],
      },
      {
        heading: '5. Spam Protection via Google reCAPTCHA v3',
        body: [
          'Our Registration and Contact forms are protected by Google reCAPTCHA v3 to prevent automated spam and abuse. Verification tokens are validated server-side against Google’s reCAPTCHA API, and Google’s Privacy Policy and Terms of Service apply to that verification step.',
        ],
      },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Use',
    updated: 'Last updated November 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: [
          'By accessing Corpus at corpus.cybrnut.com or subscribing to Corpus Premium, you agree to these Terms of Use. Corpus provides a browser-based studio interface for connecting your own AI provider API keys, MCP tools, and export destinations.',
        ],
      },
      {
        heading: '2. Third-Party Providers & API Keys',
        body: [
          'You are responsible for maintaining valid accounts and complying with the terms of service of any third-party AI providers (text, image, video, or MCP services) you connect through Corpus. Usage fees charged by external AI providers are billed directly by those providers.',
        ],
      },
      {
        heading: '3. Intellectual Property & Ownership',
        body: [
          'Corpus claims zero ownership over the prompts you write or the text, images, and videos you generate. Because Corpus does not store your generated media on its servers, you are solely responsible for downloading your assets or exporting them through your connected Library destination (Google Drive, GitHub, or Local Folder).',
        ],
      },
      {
        heading: '4. Premium Subscription',
        body: [
          'Corpus Premium is billed at $4 USD per month via Stripe and unlocks the Library feature (Google Drive, GitHub, and Local Folder export). Subscriptions renew monthly until cancelled. You may cancel at any time prior to the next billing date with no cancellation fees.',
        ],
      },
    ],
  },
  storage: {
    id: 'storage',
    title: 'Cookie & Browser Storage Notice',
    updated: 'Last updated November 2026',
    sections: [
      {
        heading: '1. Essential Browser Storage Only',
        body: [
          'Corpus uses your browser’s local storage and session storage exclusively to retain your workspace settings, system prompts, active session history, and locally encrypted provider API keys so they never need to be stored on our servers.',
        ],
      },
      {
        heading: '2. No Advertising or Cross-Site Tracking Cookies',
        body: [
          'Corpus does not deploy third-party advertising trackers, behavioral profiling pixels, or cross-site tracking cookies. Essential authentication cookies are used solely for Premium account sessions and Stripe checkout security.',
        ],
      },
    ],
  },
  refunds: {
    id: 'refunds',
    title: 'Refund & Cancellation Policy',
    updated: 'Last updated November 2026',
    sections: [
      {
        heading: '1. Cancel Anytime',
        body: [
          'You may cancel your $4/month Corpus Premium subscription at any time from your billing link or by contacting support through the Contact Form. Your Library access (Google Drive, GitHub, and Local Folder export) remains active through the end of the current paid billing cycle.',
        ],
      },
      {
        heading: '2. Fair Refund Window',
        body: [
          'If you experience a technical issue with Library integration or were billed in error, reach out within 14 days of your billing date and we will issue a full refund for that cycle—no hoops, no automated runaround.',
        ],
      },
    ],
  },
  security: {
    id: 'security',
    title: 'Security Architecture Disclosure',
    updated: 'Last updated November 2026',
    sections: [
      {
        heading: '1. Zero-Persistence Credential Handling',
        body: [
          'Provider API keys remain in browser storage and are transmitted over TLS strictly within the request header needed for the stateless Node/Express proxy to dispatch your generation call to your selected provider. Keys are never written to logs, analytics, or disk.',
        ],
      },
      {
        heading: '2. Stateless Media Transfer',
        body: [
          'Generated images and videos stream directly back to your browser preview canvas for manual download or direct transfer through Library (Google Drive, GitHub, or Local Folder — Premium). No server-side media bucket retains copies of your work.',
        ],
      },
      {
        heading: '3. Responsible Disclosure',
        body: [
          'If you discover a security vulnerability in Corpus or its proxy layer, please report it directly via the Contact Form on this page with the topic "Security / Technical" so our engineering team can respond promptly.',
        ],
      },
    ],
  },
};
