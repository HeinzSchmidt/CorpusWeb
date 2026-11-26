/**
 * Focused tests for GET /api/checkout/session/:id (thank-you page lookup):
 * retrieves a Checkout Session from Stripe and answers ONLY
 * {paid, mode, email_masked}.
 *
 * Run: npm run test:checkoutsession   (tsx --test tests/checkout-session.test.ts)
 *
 * Hermetic by design: globalThis.fetch is stubbed (no real Stripe). The
 * express app is started from the real server.ts module so the full route
 * + middleware stack runs.
 *
 * Coverage: guest session (masked e-mail), upgrade session
 * (client_reference_id), unpaid session, missing e-mail, malformed id
 * (400, no Stripe call), unknown id (404), Stripe error (502), network
 * failure (502), STRIPE_SECRET_KEY unset (502), and the e-mail mask itself
 * (j***@e***.com shape, non-e-mail input). No full e-mail, customer id or
 * upgrade token ever appears in a response.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { maskCheckoutEmail } from '../stripe.ts';

const TEST_PORT = 45124;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const STRIPE_SESSIONS_PREFIX = 'https://api.stripe.com/v1/checkout/sessions/';
const STRIPE_TEST_KEY = 'sk_tes...only';

const GUEST_SESSION_ID = 'cs_testguestsession01';
const UPGRADE_SESSION_ID = 'cs_testupgradesession01';
const UNPAID_SESSION_ID = 'cs_testunpaidsession01';
const NO_EMAIL_SESSION_ID = 'cs_testnoemailsession01';
const FULL_EMAIL = 'jane.doe@example.com';
/** An opaque upgrade token (never asserted to appear in any response). */
const UPGRADE_TOKEN_VALUE = 'eyJhIj...aaaa';

interface StripeOutcome {
  status: number;
  body: unknown;
}

const stripeCalls: Array<{ url: string; headers?: unknown }> = [];
let stripeResponder: (url: string) => StripeOutcome = () => ({
  status: 404,
  body: { error: { message: 'No such checkout session' } },
});
let stripeShouldReject = false;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resetResponses() {
  stripeCalls.length = 0;
  stripeShouldReject = false;
  stripeResponder = () => ({
    status: 404,
    body: { error: { message: 'No such checkout session' } },
  });
}

async function getSession(id: string) {
  return fetch(`${BASE}/api/checkout/session/${id}`);
}

before(async () => {
  process.env.PORT = String(TEST_PORT);
  process.env.STRIPE_SECRET_KEY = STRIPE_TEST_KEY;

  // Keep the real fetch so the listen poll and the endpoint under test hit
  // the actual express server on the loopback port; only Stripe is stubbed.
  const realFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(`${BASE}/`)) {
      const headers = new Headers(init?.headers);
      headers.set('Connection', 'close');
      return realFetch(input, { ...init, headers });
    }
    if (url.startsWith(STRIPE_SESSIONS_PREFIX)) {
      if (stripeShouldReject) {
        throw new TypeError('fetch failed (simulated network outage)');
      }
      stripeCalls.push({ url, headers: init?.headers });
      const outcome = stripeResponder(url);
      return jsonResponse(outcome.status, outcome.body);
    }
    return jsonResponse(404, { error: 'unexpected url in test' });
  }) as typeof fetch;

  // Start the express server (module side-effect of importing server.ts).
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

// ---------------------------------------------------------------------------
// The e-mail mask (unit)
// ---------------------------------------------------------------------------

test('mask: keeps first letter of local part and domain plus the TLD', () => {
  assert.equal(maskCheckoutEmail('jane.doe@example.com'), 'j***@e***.com');
  // Multi-part TLDs keep only the final segment: b.co.uk -> b***.uk
  assert.equal(maskCheckoutEmail('a@b.co.uk'), 'a***@b***.uk');
});

test('mask: non-e-mail input collapses to ***', () => {
  assert.equal(maskCheckoutEmail('not-an-email'), '***');
  assert.equal(maskCheckoutEmail('@example.com'), '***');
});

// ---------------------------------------------------------------------------
// Happy paths: guest and upgrade
// ---------------------------------------------------------------------------

test('guest session: paid, masked e-mail, no PII in the response', async () => {
  stripeResponder = (url) =>
    url === `${STRIPE_SESSIONS_PREFIX}${GUEST_SESSION_ID}`
      ? {
          status: 200,
          body: {
            id: GUEST_SESSION_ID,
            payment_status: 'paid',
            customer: 'cus_fullcustomerid01',
            customer_details: { email: FULL_EMAIL },
          },
        }
      : { status: 404, body: { error: { message: 'No such checkout session' } } };

  const res = await getSession(GUEST_SESSION_ID);
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.deepEqual(body, { paid: true, mode: 'guest', email_masked: 'j***@e***.com' });

  // PII firewall: the full e-mail, customer id and any token stay server-side.
  const raw = JSON.stringify(body);
  assert.ok(!raw.includes(FULL_EMAIL), 'full e-mail must not be returned');
  assert.ok(!raw.includes('cus_fullcustomerid01'), 'Stripe customer id must not be returned');
  assert.ok(raw.includes('j***@e***.com'), 'masked e-mail must be returned');

  // The lookup itself was authenticated with the server-side key.
  assert.equal(stripeCalls.length, 1);
  const auth = (stripeCalls[0].headers as Headers).get('Authorization');
  assert.equal(auth, 'Bearer ' + STRIPE_TEST_KEY);
});

test('upgrade session: client_reference_id makes mode=upgrade, token never returned', async () => {
  stripeResponder = (url) =>
    url === `${STRIPE_SESSIONS_PREFIX}${UPGRADE_SESSION_ID}`
      ? {
          status: 200,
          body: {
            id: UPGRADE_SESSION_ID,
            payment_status: 'paid',
            client_reference_id: UPGRADE_TOKEN_VALUE,
            customer_details: { email: FULL_EMAIL },
          },
        }
      : { status: 404, body: { error: { message: 'No such checkout session' } } };

  const res = await getSession(UPGRADE_SESSION_ID);
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.paid, true);
  assert.equal(body.mode, 'upgrade');
  assert.equal(body.email_masked, 'j***@e***.com');
  assert.ok(!JSON.stringify(body).includes(UPGRADE_TOKEN_VALUE), 'the token must never be echoed');
});

test('unpaid session: paid=false, guest mode, e-mail still masked', async () => {
  stripeResponder = (url) =>
    url === `${STRIPE_SESSIONS_PREFIX}${UNPAID_SESSION_ID}`
      ? {
          status: 200,
          body: {
            id: UNPAID_SESSION_ID,
            payment_status: 'unpaid',
            customer_details: { email: FULL_EMAIL },
          },
        }
      : { status: 404, body: { error: { message: 'No such checkout session' } } };

  const res = await getSession(UNPAID_SESSION_ID);
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.deepEqual(body, { paid: false, mode: 'guest', email_masked: 'j***@e***.com' });
});

test('session without an e-mail: email_masked is null', async () => {
  stripeResponder = (url) =>
    url === `${STRIPE_SESSIONS_PREFIX}${NO_EMAIL_SESSION_ID}`
      ? {
          status: 200,
          body: { id: NO_EMAIL_SESSION_ID, payment_status: 'paid' },
        }
      : { status: 404, body: { error: { message: 'No such checkout session' } } };

  const res = await getSession(NO_EMAIL_SESSION_ID);
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.deepEqual(body, { paid: true, mode: 'guest', email_masked: null });
});

// ---------------------------------------------------------------------------
// Errors: malformed id, unknown id, Stripe failure
// ---------------------------------------------------------------------------

test('malformed id: 400 without any Stripe call', async () => {
  resetResponses();
  const res = await getSession('definitely-not-a-session');
  assert.equal(res.status, 400);
  assert.equal(stripeCalls.length, 0, 'no network call for a bad shape');

  const tooShort = await getSession('cs_12345');
  assert.equal(tooShort.status, 400);
  assert.equal(stripeCalls.length, 0);
});

test('unknown session: Stripe 404 -> 404', async () => {
  resetResponses(); // responder defaults to Stripe 404
  const res = await getSession(GUEST_SESSION_ID);
  assert.equal(res.status, 404);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.error, 'Unknown checkout session.');
  assert.equal(stripeCalls.length, 1);
});

test('Stripe 500 -> 502 generic error', async () => {
  stripeResponder = () => ({ status: 500, body: { error: { message: 'internal' } } });

  const res = await getSession(GUEST_SESSION_ID);
  assert.equal(res.status, 502);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.error, 'Checkout lookup failed right now. Please try again.');
  assert.ok(JSON.stringify(body).length < 200, 'no Stripe detail in the client answer');
});

test('Stripe network failure -> 502', async () => {
  resetResponses();
  stripeShouldReject = true;

  const res = await getSession(GUEST_SESSION_ID);
  assert.equal(res.status, 502);
  await res.json();
});

test('STRIPE_SECRET_KEY unset -> 502, no Stripe call (fail closed)', async () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    resetResponses();
    const res = await getSession(GUEST_SESSION_ID);
    assert.equal(res.status, 502);
    await res.json();
    assert.equal(stripeCalls.length, 0, 'without a key there is nothing to call Stripe with');
  } finally {
    process.env.STRIPE_SECRET_KEY = saved;
  }
});
