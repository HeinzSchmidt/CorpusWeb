/**
 * Focused checks for the /docs page content (node:test, no DOM needed).
 *
 * The docs page renders docsContent.ts; asserting the data module pins down
 * the required copy: the four how-to steps (sign in, settings & providers,
 * library, premium) and the Ollama OLLAMA_ORIGINS guides for macOS/Linux/
 * Windows plus the Safari caveat and honest capability list.
 *
 * Run: npm run test:docs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test } from 'node:test';
import {
  DOCS_GOOGLE_DRIVE,
  DOCS_HOW_TO,
  OLLAMA_BROWSER_CAVEAT,
  OLLAMA_CAPABILITY_ROWS,
  OLLAMA_LINUX_COMMANDS,
  OLLAMA_MACOS_COMMAND,
  OLLAMA_ORIGINS_VALUE,
  OLLAMA_PLATFORM_GUIDES,
  OLLAMA_WINDOWS_COMMANDS,
} from '../src/data/docsContent';

test('how-to covers sign in, settings & providers, library and premium', () => {
  const titles = DOCS_HOW_TO.map((step) => step.title.toLowerCase());
  assert.ok(titles.some((t) => t.includes('sign in')), 'sign-in step present');
  assert.ok(titles.some((t) => t.includes('settings')), 'settings & providers step present');
  assert.ok(titles.some((t) => t.includes('library')), 'library step present');
  assert.ok(titles.some((t) => t.includes('premium')), 'premium step present');
  // Every step has at least one non-empty paragraph.
  for (const step of DOCS_HOW_TO) {
    assert.ok(step.body.length > 0);
    for (const paragraph of step.body) {
      assert.ok(paragraph.trim().length > 0);
    }
  }
});

test('OLLAMA_ORIGINS value is the premium site origin', () => {
  assert.equal(OLLAMA_ORIGINS_VALUE, 'https://corpus.cybrnut.com');
});

test('macOS guide contains the exact launchctl command and a restart step', () => {
  assert.equal(OLLAMA_MACOS_COMMAND, 'launchctl setenv OLLAMA_ORIGINS https://corpus.cybrnut.com');
  const macos = OLLAMA_PLATFORM_GUIDES.find((g) => g.platform === 'macOS');
  assert.ok(macos, 'macOS guide present');
  assert.ok(macos.commands.includes(OLLAMA_MACOS_COMMAND));
  assert.ok(macos.commands.some((c) => c.toLowerCase().includes('restart')), 'restart step present');
});

test('Linux and Windows guides set OLLAMA_ORIGINS and restart the service', () => {
  const linux = OLLAMA_PLATFORM_GUIDES.find((g) => g.platform === 'Linux');
  const windows = OLLAMA_PLATFORM_GUIDES.find((g) => g.platform === 'Windows');
  assert.ok(linux && windows, 'both guides present');
  assert.ok(
    OLLAMA_LINUX_COMMANDS.join('\n').includes(`OLLAMA_ORIGINS=${OLLAMA_ORIGINS_VALUE}`),
    'linux commands carry the OLLAMA_ORIGINS value'
  );
  assert.ok(OLLAMA_LINUX_COMMANDS.some((c) => c.includes('systemctl restart ollama')));
  assert.ok(OLLAMA_WINDOWS_COMMANDS.join('\n').includes(OLLAMA_ORIGINS_VALUE), 'windows command carries the value');
  assert.ok(OLLAMA_WINDOWS_COMMANDS.some((c) => c.toLowerCase().includes('restart')));
});

test('Safari caveat is stated', () => {
  assert.match(OLLAMA_BROWSER_CAVEAT, /Safari/i);
  assert.match(OLLAMA_BROWSER_CAVEAT, /Chrome or Firefox/i);
});

test('capability list is honest: text + vision yes, image/video generation no', () => {
  const byCapability = new Map(OLLAMA_CAPABILITY_ROWS.map((row) => [row.capability, row.supported]));
  assert.equal(byCapability.get('Text generation'), true);
  assert.equal(byCapability.get('Image understanding (vision)'), true);
  assert.equal(byCapability.get('Image generation'), false);
  assert.equal(byCapability.get('Video generation / understanding'), false);
});

test('google drive section pins its id, heading and eight numbered steps', () => {
  assert.equal(DOCS_GOOGLE_DRIVE.id, 'google-drive');
  assert.match(DOCS_GOOGLE_DRIVE.heading, /Save to Google Drive: set up Google OAuth \(2026\)/);
  assert.equal(DOCS_GOOGLE_DRIVE.steps.length, 8, 'exactly eight steps');
  DOCS_GOOGLE_DRIVE.steps.forEach((step, i) => {
    assert.equal(step.label, String(i + 1).padStart(2, '0'), `step ${i + 1} label`);
    assert.ok(step.title.trim().length > 0, 'bold console/app path present');
    assert.ok(step.body.length > 0, 'step body present');
    for (const paragraph of step.body) assert.ok(paragraph.trim().length > 0);
  });
  // DocsPage renders <section id={DOCS_GOOGLE_DRIVE.id}> — verify the source,
  // no DOM needed.
  const docsPageSrc = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'DocsPage.tsx'),
    'utf8'
  );
  assert.ok(docsPageSrc.includes('id={DOCS_GOOGLE_DRIVE.id}'), 'section id rendered by DocsPage');
});

test('google drive steps carry the exact console paths and drive.file scope text', () => {
  const titles = DOCS_GOOGLE_DRIVE.steps.map((s) => s.title).join(' | ');
  assert.ok(titles.includes('console.cloud.google.com'));
  assert.ok(titles.includes('APIs & Services > Library'));
  assert.ok(titles.includes('Google Auth Platform > Branding'));
  assert.ok(titles.includes('Audience'));
  assert.ok(titles.includes('Data Access > Add or remove scopes'));
  assert.ok(titles.includes('Clients > Create client'));
  assert.ok(titles.includes('LIBRARY > Google Drive > Drive settings'));
  assert.ok(titles.includes('Export > Google Drive'));
  const body = DOCS_GOOGLE_DRIVE.steps.map((s) => s.body.join(' ')).join(' ');
  assert.ok(body.includes('https://www.googleapis.com/auth/drive.file'), 'drive.file scope URL');
  assert.ok(body.includes('non-sensitive'), 'drive.file classified as non-sensitive');
  assert.ok(body.includes('https://corpus.cybrnut.com'), 'exact app origin, no path');
  assert.ok(body.includes('Test users (max 100)'), 'testing-user cap stated');
  assert.ok(body.includes('expires consent after 7 days'), 'testing consent expiry stated');
  assert.ok(body.includes('Personal'), 'personal audience option mentioned');
  assert.match(body, /can’t be undone|can't be undone/, 'personal audience is irreversible');
  assert.ok(body.includes('No redirect URI is needed'));
});

test('google drive copy warns the client secret must never be pasted', () => {
  const body = DOCS_GOOGLE_DRIVE.steps.map((s) => s.body.join(' ')).join(' ');
  assert.match(body, /never paste the client secret anywhere/);
  assert.match(body, /shown once/i);
});

test('google drive troubleshooting covers the known failure modes', () => {
  const rows = DOCS_GOOGLE_DRIVE.troubleshooting;
  assert.ok(rows.length >= 5);
  const all = rows.map((r) => `${r.problem} ${r.fix}`).join(' ');
  assert.ok(all.includes('origin_mismatch'));
  assert.ok(all.includes('port'));
  assert.ok(all.includes('Test users'));
  assert.ok(all.includes('7 days') && all.includes('1 hour'));
  assert.match(all, /popup/i);
  assert.ok(all.includes('http://localhost') && all.includes('http://localhost:3000'));
});

test('library how-to card links the Drive line to the new section', () => {
  const library = DOCS_HOW_TO.find((step) => step.id === 'library');
  assert.ok(library, 'library step present');
  assert.deepEqual(library?.links, [{ text: 'Google Drive', href: '#google-drive' }]);
  assert.ok(library.body.some((p) => p.includes('Google Drive')), 'link target text exists in the card');
});
