/**
 * Unit tests for homeSectionHref (src/lib/homeSectionHref.ts) — the helper
 * that fixes bare-hash nav/footer links from non-home routes (/docs,
 * /thank-you, /cancel). node:test, no DOM.
 *
 * Run: npx tsx --test tests/nav-links.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test } from 'node:test';
import { homeSectionHref } from '../src/lib/homeSectionHref';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

test('home route keeps the bare hash', () => {
  assert.equal(homeSectionHref('features', '/'), '#features');
  assert.equal(homeSectionHref('top', ''), '#top');
  assert.equal(homeSectionHref('upgrade', '/'), '#upgrade');
});

test('off-home routes get the root-prefixed hash', () => {
  for (const pathname of ['/docs', '/thank-you', '/cancel', '/docs#google-drive']) {
    assert.equal(homeSectionHref('features', pathname), '/#features', pathname);
    assert.equal(homeSectionHref('top', pathname), '/#top', pathname);
  }
});

test('every home section id resolves on both route kinds', () => {
  const ids = ['top', 'what-is-corpus', 'features', 'security', 'upgrade', 'contact'];
  for (const id of ids) {
    assert.equal(homeSectionHref(id, '/'), `#${id}`);
    assert.equal(homeSectionHref(id, '/docs'), `/#${id}`);
  }
});

test('Navbar and Footer use the helper; /docs path links stay unchanged', () => {
  const navbar = readSrc('src/components/Navbar.tsx');
  const footer = readSrc('src/components/Footer.tsx');
  assert.ok(navbar.includes("homeSectionHref('top', pathname)"), 'navbar logo');
  assert.ok(navbar.includes("homeSectionHref('upgrade', pathname)"), 'navbar CTAs');
  assert.ok(navbar.includes('item.path ?? homeSectionHref(item.section!, pathname)'), 'navbar section links');
  assert.ok(navbar.includes("path: '/docs'"), 'docs link stays a plain path');
  assert.ok(footer.includes('homeSectionHref(id, pathname)'), 'footer section links via helper');
  assert.ok(footer.includes('sectionHref(\'top\')'), 'footer logo');
  assert.ok(footer.includes('href="/docs"'), 'footer docs link unchanged');
  // No bare home-section hashes left in the chrome components.
  for (const src of [navbar, footer]) {
    for (const id of ['what-is-corpus', 'features', 'security', 'upgrade', 'contact']) {
      assert.ok(!src.includes(`href="#${id}"`), `bare #${id} removed`);
    }
    assert.ok(!src.includes('href="#top"'), 'bare #top removed');
  }
});

test('cancel-page CTA is a root-prefixed link; home sections keep bare hashes', () => {
  const cancel = readSrc('src/components/CheckoutNoticePage.tsx');
  assert.ok(cancel.includes('href="/#upgrade"'), 'cancel CTA');
  assert.ok(!cancel.includes('href="#upgrade"'), 'no bare hash left on cancel page');
  // Home-only sections render on "/" exclusively, so their bare hashes are
  // correct and must NOT be rewritten.
  for (const rel of [
    'src/components/HeroSection.tsx',
    'src/components/FeaturesSection.tsx',
    'src/components/WhatIsCorpusSection.tsx',
  ]) {
    const src = readSrc(rel);
    assert.ok(!src.includes('/#'), `${rel} untouched (no root-prefixed hashes)`);
  }
});

test('docs in-page anchors are not rewritten by the helper', () => {
  // The helper only ever receives home section ids from the chrome
  // components; docs anchors like #google-drive live inside DocsPage's own
  // page and keep working on /docs.
  const docsContent = readSrc('src/data/docsContent.ts');
  assert.ok(docsContent.includes("href: '#google-drive'"), 'docs cross-link stays a same-page hash');
  // Sanity: the helper would produce "/#google-drive" from /docs — that must
  // NOT be what the docs page links use.
  assert.equal(homeSectionHref('google-drive', '/docs'), '/#google-drive');
  assert.ok(!docsContent.includes('/#google-drive'));
});

test('App scrolls to the hash after mount on the home route only', () => {
  const app = readSrc('src/App.tsx');
  assert.ok(app.includes('window.addEventListener(\'hashchange\', scrollToHash)'), 'hashchange listener');
  assert.ok(app.includes("HOME_SECTION_IDS = ['top', 'what-is-corpus', 'features', 'security', 'upgrade', 'contact']"));
  assert.ok(app.includes("if (!onHome) return;"), 'effect gated to the home route');
  assert.ok(app.includes('scrollIntoView({ behavior: \'smooth\' })'));
  // Off-home, the upgrade click handler must not preventDefault so the
  // /#upgrade navigation proceeds.
  assert.ok(app.includes('if (!onHome) return;\n    e?.preventDefault();'), 'no preventDefault off-home');
});
