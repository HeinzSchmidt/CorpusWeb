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
import { test } from 'node:test';
import {
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
