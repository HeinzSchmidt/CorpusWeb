/**
 * Focused tests for POST /api/checkout (guest checkout start, P4 of the
 * checkout plan): creates a Stripe Checkout Session (subscription mode)
 * and returns its hosted URL.
 *
 * Run: npm run test:checkout   (tsx --test tests/checkout.test.ts)
 *
 * Hermetic by design: globalThis.fetch is stubbed (no real Stripe, no real
 * Google, no real corpuspremium.cybrnut.com). The express app is started
 * from the real server.ts module so the full route + middleware stack runs.
 *
 * Coverage: 503 unconfigured, session shape + Bearer auth, URL overrides,
 * Stripe reject/unreachable 502s, reCAPTCHA gates, the opaque upgrade
 * token (client_reference_id passthrough + 400 on bad shapes), and the
 * optional billing e-mail (existing-customer reuse, prefill, fail-soft,
 * malformed 400).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';

const TEST_PORT = 45123;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_CUSTOMERS = 'https://api.stripe.com/v1/customers';
const GOOGLE_VERIFY = 'https://www.google.com/recaptcha/api/siteverify';
const STRIPE_TEST_KEY = 'sk_test_checkout_only';
const STRIPE_PRICE_ID = 'price_test12345';
/** Opaque upgrade token as minted by Corpus (base64url payload + signature). */
const UPGRADE_TOKEN = 'eyJhIjoiYWNjIiwibm9uY2UiOiJ4In0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

interface StripeOutcome {
  status: number;
  body: unknown;
}
interface GoogleOutcome {
  status: number;
  body: unknown;
}

const stripeCalls: Array<{ headers?: unknown; body?: string }> = [];
const customersCalls: Array<{ url: string; headers?: unknown }> = [];
const googleCalls: Array<URLSearchParams> = [];
let stripeResponder: () => StripeOutcome = () => ({
  status: 200,
  body: { id: 'cs_test1', url: 'https://checkout.stripe.test/c/test123' },
});
let stripeShouldReject = false;
let customersResponder: () => StripeOutcome = () => ({ status: 200, body: { data: [] } });
let customersShouldReject = false;
let googleResponder: () => GoogleOutcome = () => ({
  status: 200,
  body: { success: true, action: 'checkout', score: 0.9 },
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resetResponses() {
  stripeCalls.length = 0;
  customersCalls.length = 0;
  googleCalls.length = 0;
  stripeShouldReject = false;
  customersShouldReject = false;
  stripeResponder = () => ({
    status: 200,
    body: { id: 'cs_test1', url: 'https://checkout.stripe.test/c/test123' },
  });
  customersResponder = () => ({ status: 200, body: { data: [] } });
  googleResponder = () => ({ status: 200, body: { success: true, action: 'checkout', score: 0.9 } });
}

async function postCheckout(body: unknown) {
  return fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

before(async () => {
  process.env.PORT = String(TEST_PORT);
  process.env.STRIPE_SECRET_KEY = STRIPE_TEST_KEY;
  process.env.STRIPE_PREMIUM_PRICE_ID = STRIPE_PRICE_ID;

  // Keep the real fetch so the listen poll and the endpoint calls under test
  // hit the actual express server on the loopback port; only Stripe/Google
  // are stubbed. Connection: close keeps undici from holding sockets after
  // the server is torn down in after().
  const realFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(`${BASE}/`)) {
      const headers = new Headers(init?.headers);
      headers.set('Connection', 'close');
      return realFetch(input, { ...init, headers });
    }
    if (url === GOOGLE_VERIFY) {
      const params = new URLSearchParams(String(init?.body ?? ''));
      googleCalls.push(params);
      const outcome = googleResponder();
      return jsonResponse(outcome.status, outcome.body);
    }
    if (url === STRIPE_API) {
      if (stripeShouldReject) {
        throw new TypeError('fetch failed (simulated network outage)');
      }
      stripeCalls.push({ headers: init?.headers, body: String(init?.body ?? '') });
      const outcome = stripeResponder();
      return jsonResponse(outcome.status, outcome.body);
    }
    if (url.startsWith(STRIPE_CUSTOMERS)) {
      if (customersShouldReject) {
        throw new TypeError('fetch failed (simulated network outage)');
      }
      customersCalls.push({ url, headers: init?.headers });
      const outcome = customersResponder();
      return jsonResponse(outcome.status, outcome.body);
    }
    return jsonResponse(404, { error: 'unexpected url in test' });
  }) as typeof fetch;

  // start the express server (module side-effect of importing server.ts)
  await import('../server.ts');

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const started = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('server did not start in time'));
      }
    }, 5000);
    const poll = async () => {
      if (settled) return;
      try {
        const res = await fetch(`${BASE}/api/recaptcha/config`);
        if (res.status === 200) {
          settled = true;
          clearTimeout(started);
          resolve();
          return;
        }
      } catch {
        // not listening yet
      }
      setTimeout(poll, 50);
    };
    poll();
  });
});

after(() => {
  // Close the listening server so the test process can exit.
  const handles = (process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles();
  for (const handle of handles) {
    if (handle instanceof createServer && (handle as Server).listening) {
      (handle as Server).close();
    }
  }
});

test('503 fail-closed when Stripe env is unset', async () => {
  resetResponses();
  const realKey = process.env.STRIPE_SECRET_KEY;
  const realPrice = process.env.STRIPE_PREMIUM_PRICE_ID;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PREMIUM_PRICE_ID;
  try {
    const res = await postCheckout({ recaptchaToken: '' });
    assert.equal(res.status, 503);
    const data = (await res.json()) as { error: string };
    assert.match(data.error, /not available/i);
    assert.equal(stripeCalls.length, 0, 'no Stripe call when unconfigured');
  } finally {
    process.env.STRIPE_SECRET_KEY = realKey;
    process.env.STRIPE_PREMIUM_PRICE_ID = realPrice;
  }
});

test('creates a subscription session and returns the hosted URL (reCAPTCHA off)', async () => {
  resetResponses();
  const res = await postCheckout({ recaptchaToken: '' });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { url: string };
  assert.equal(data.url, 'https://checkout.stripe.test/c/test123');

  assert.equal(stripeCalls.length, 1);
  const call = stripeCalls[0];
  const params = new URLSearchParams(call.body);
  assert.equal(params.get('mode'), 'subscription');
  assert.equal(params.get('line_items[0][price]'), STRIPE_PRICE_ID);
  assert.equal(params.get('line_items[0][quantity]'), '1');
  assert.equal(params.get('success_url'), 'https://corpuspremium.cybrnut.com/thank-you');
  assert.equal(params.get('cancel_url'), 'https://corpuspremium.cybrnut.com/cancel');

  const auth = (call.headers as Headers | Record<string, string>).get
    ? (call.headers as Headers).get('authorization')
    : (call.headers as Record<string, string>).authorization;
  assert.equal(auth, `Bearer ${STRIPE_TEST_KEY}`);
});

test('respects the success/cancel URL overrides from env', async () => {
  resetResponses();
  const realSuccess = process.env.STRIPE_CHECKOUT_SUCCESS_URL;
  const realCancel = process.env.STRIPE_CHECKOUT_CANCEL_URL;
  process.env.STRIPE_CHECKOUT_SUCCESS_URL = 'https://example.test/done';
  process.env.STRIPE_CHECKOUT_CANCEL_URL = 'https://example.test/stop';
  try {
    const res = await postCheckout({ recaptchaToken: '' });
    assert.equal(res.status, 200);
    await res.json();
    const params = new URLSearchParams(stripeCalls[0].body);
    assert.equal(params.get('success_url'), 'https://example.test/done');
    assert.equal(params.get('cancel_url'), 'https://example.test/stop');
  } finally {
    if (realSuccess === undefined) delete process.env.STRIPE_CHECKOUT_SUCCESS_URL;
    else process.env.STRIPE_CHECKOUT_SUCCESS_URL = realSuccess;
    if (realCancel === undefined) delete process.env.STRIPE_CHECKOUT_CANCEL_URL;
    else process.env.STRIPE_CHECKOUT_CANCEL_URL = realCancel;
  }
});

test('502 generic error when Stripe rejects the request', async () => {
  resetResponses();
  stripeResponder = () => ({ status: 400, body: { error: { message: 'price id not found' } } });
  const res = await postCheckout({ recaptchaToken: '' });
  assert.equal(res.status, 502);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /could not start the checkout/i);
});

test('502 when the Stripe API is unreachable', async () => {
  resetResponses();
  stripeShouldReject = true;
  const res = await postCheckout({ recaptchaToken: '' });
  assert.equal(res.status, 502);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /could not reach the payment service/i);
});

test('400/403 when reCAPTCHA is configured and Google rejects the token', async () => {
  resetResponses();
  const realSite = process.env.VITE_RECAPTCHA_SITE_KEY;
  const realSecret = process.env.RECAPTCHA_SECRET_KEY;
  process.env.VITE_RECAPTCHA_SITE_KEY = 'sitekey_test_012345';
  process.env.RECAPTCHA_SECRET_KEY = '***';
  try {
    // Empty token with keys configured -> 400 missing token, no Google call.
    let res = await postCheckout({ recaptchaToken: '' });
    assert.equal(res.status, 400);
    await res.json();
    assert.equal(googleCalls.length, 0);

    // Google says failure -> 403, and no Stripe call is made.
    googleResponder = () => ({
      status: 200,
      body: { success: false, 'error-codes': ['invalid-input-response'] },
    });
    res = await postCheckout({ recaptchaToken: 'test-token-123' });
    assert.equal(res.status, 403);
    await res.json();
    assert.equal(stripeCalls.length, 0);

    // Google ok but action mismatch (contact instead of checkout) -> 403.
    googleResponder = () => ({ status: 200, body: { success: true, action: 'contact', score: 0.9 } });
    res = await postCheckout({ recaptchaToken: 'test-token-123' });
    assert.equal(res.status, 403);
    await res.json();
    assert.equal(stripeCalls.length, 0);
  } finally {
    if (realSite === undefined) delete process.env.VITE_RECAPTCHA_SITE_KEY;
    else process.env.VITE_RECAPTCHA_SITE_KEY = realSite;
    if (realSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = realSecret;
  }
});

// ---------------------------------------------------------------------------
// Upgrade token (?upgrade= -> client_reference_id) + e-mail customer dedupe
// ---------------------------------------------------------------------------

test('upgradeToken is passed through to client_reference_id unverified', async () => {
  resetResponses();
  const res = await postCheckout({ recaptchaToken: '', upgradeToken: UPGRADE_TOKEN });
  assert.equal(res.status, 200);
  await res.json();
  assert.equal(stripeCalls.length, 1);
  const params = new URLSearchParams(stripeCalls[0].body);
  assert.equal(params.get('client_reference_id'), UPGRADE_TOKEN);
  assert.equal(params.get('customer'), null, 'no customer without an e-mail');
  assert.equal(params.get('customer_email'), null);
  assert.equal(customersCalls.length, 0, 'no customer lookup without an e-mail');
});

test('an oversized or malformed upgradeToken -> 400, no session created', async () => {
  resetResponses();
  let res = await postCheckout({ recaptchaToken: '', upgradeToken: 'a'.repeat(501) });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /invalid upgrade link/i);

  res = await postCheckout({ recaptchaToken: '', upgradeToken: 'tok en' });
  assert.equal(res.status, 400);
  await res.json();
  assert.equal(stripeCalls.length, 0, 'no Stripe session call for a bad token');
});

test('a known billing e-mail reuses the existing Stripe customer', async () => {
  resetResponses();
  customersResponder = () => ({ status: 200, body: { data: [{ id: 'cus_existing42' }] } });
  const res = await postCheckout({ recaptchaToken: '', email: 'buyer@example.test' });
  assert.equal(res.status, 200);
  await res.json();
  const params = new URLSearchParams(stripeCalls[0].body);
  assert.equal(params.get('customer'), 'cus_existing42', 'existing customer attached to the session');
  assert.equal(params.get('customer_email'), null, 'no e-mail prefill when a customer was found');

  assert.equal(customersCalls.length, 1, 'exactly one customer lookup');
  assert.match(customersCalls[0].url, /\/v1\/customers\?email=buyer%40example\.test&limit=1$/);
  const auth = (customersCalls[0].headers as Headers | Record<string, string>).get
    ? (customersCalls[0].headers as Headers).get('authorization')
    : (customersCalls[0].headers as Record<string, string>).authorization;
  assert.equal(auth, `Bearer ${STRIPE_TEST_KEY}`, 'the lookup uses the Stripe API key');
});

test('an unknown e-mail prefills customer_email (new customer carries it)', async () => {
  resetResponses();
  customersResponder = () => ({ status: 200, body: { data: [] } });
  const res = await postCheckout({ recaptchaToken: '', email: 'newbuyer@example.test' });
  assert.equal(res.status, 200);
  await res.json();
  const params = new URLSearchParams(stripeCalls[0].body);
  assert.equal(params.get('customer'), null);
  assert.equal(params.get('customer_email'), 'newbuyer@example.test');
});

test('a failed customer lookup is fail-soft: the checkout still starts', async () => {
  resetResponses();
  customersShouldReject = true;
  const res = await postCheckout({ recaptchaToken: '', email: 'flaky@example.test' });
  assert.equal(res.status, 200);
  await res.json();
  const params = new URLSearchParams(stripeCalls[0].body);
  assert.equal(params.get('customer'), null);
  assert.equal(params.get('customer_email'), null, 'no e-mail forwarded when the lookup failed');
});

test('a malformed e-mail -> 400, no Stripe calls at all', async () => {
  resetResponses();
  const res = await postCheckout({ recaptchaToken: '', email: 'not-an-email' });
  assert.equal(res.status, 400);
  await res.json();
  assert.equal(stripeCalls.length, 0);
  assert.equal(customersCalls.length, 0);
});
