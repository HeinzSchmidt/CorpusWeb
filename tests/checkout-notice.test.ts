/**
 * Targeted tests for the /thank-you page states (CheckoutNoticeBody —
 * the pure presentational half of src/components/CheckoutNoticePage.tsx).
 *
 * Rendered through react-dom/server (no DOM, no new dependencies):
 *   - guest: highlighted "check your email" callout present, NO
 *     "Open Corpus" button (the claim email is the only way back);
 *   - fallback (lookup failed / no session id): callout without the
 *     masked e-mail, still no button;
 *   - upgrade: "Return to Corpus" button present, no email callout;
 *   - cancel: buttons unchanged.
 *
 * Run: npm run test:checkoutnotice
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { CheckoutNoticeBody, type SessionLookup } from '../src/components/CheckoutNoticePage.tsx';
import { CORPUS_APP_URL } from '../src/data/corpusData.ts';

function renderHtml(kind: 'thank-you' | 'cancelled', lookup: SessionLookup | null | undefined): string {
  return renderToString(createElement(CheckoutNoticeBody, { kind, lookup }));
}

const CORPUS_HREF = new RegExp(`href="${CORPUS_APP_URL}"`);

test('guest: highlighted email callout present, no Open Corpus button', () => {
  const html = renderHtml('thank-you', {
    paid: true,
    mode: 'guest',
    emailMasked: 'j***@e***.com',
  });

  // The callout: status role, accent border, bold instruction with the
  // masked e-mail, plus the spam/junk tip and the link expiry on their own
  // short lines.
  assert.match(html, /role="status"/);
  assert.match(html, /border-\[#22D3EE\]/);
  assert.match(html, /font-bold/);
  assert.match(html, /Check your email/);
  assert.match(html, /j\*\*\*@e\*\*\*\.com/);
  assert.match(html, /to set your password\./);
  assert.match(html, /spam\/junk/i);
  assert.match(html, /The link expires in 72 hours\./);

  // The claim email is the only way back — no app button in guest mode.
  assert.doesNotMatch(html, /Open Corpus/);
  assert.doesNotMatch(html, CORPUS_HREF);

  // The support line stays.
  assert.match(html, /Didn’t get it\? Contact support\./);
});

test('guest fallback (lookup failed): callout without masked email, no button', () => {
  const html = renderHtml('thank-you', null);

  assert.match(html, /role="status"/);
  assert.match(html, /Check your email/);
  assert.match(html, /the address you used at checkout/);
  assert.match(html, /The link expires in 72 hours\./);
  assert.doesNotMatch(html, /Open Corpus/);
  assert.doesNotMatch(html, CORPUS_HREF);
});

test('upgrade: Return to Corpus button present, no email callout', () => {
  const html = renderHtml('thank-you', {
    paid: true,
    mode: 'upgrade',
    emailMasked: null,
  });

  assert.match(html, /You’re Premium/);
  assert.match(html, CORPUS_HREF);
  assert.match(html, /Open Corpus/);
  assert.doesNotMatch(html, /Check your email/);
  assert.doesNotMatch(html, /Didn’t get it\? Contact support\./);
});

test('cancel: buttons unchanged', () => {
  const html = renderHtml('cancelled', undefined);

  assert.match(html, /Checkout cancelled/);
  assert.match(html, CORPUS_HREF);
  assert.match(html, /Open the Corpus app/);
  assert.match(html, /Back to the pricing section/);
  assert.doesNotMatch(html, /Check your email/);
});
