/**
 * Focused tests for POST /api/stripe/webhook (step 2 of the premium work).
 *
 * Run: npm run test:webhook   (tsx --test tests/stripe-webhook.test.ts)
 *
 * Hermetic by design: the handler-level cases stub globalThis.fetch (no real
 * Stripe, no real Corpus call) — bad Stripe signature -> 400, valid event ->
 * correctly signed forward, and Corpus 503 -> 5xx so Stripe retries. The
 * final case boots the real express mount (server.ts) to guard the live bug
 * where express.raw's Buffer lived in req.body, not req.rawBody.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { createServer, type Server } from 'node:http';
import type { Response as ExpressResponse } from 'express';
import {
  handleStripeWebhook,
  type StripeWebhookRequest,
} from '../stripe.ts';

const WEBHOOK_SECRET = 'whsec_…est1';
const CORPUS_SECRET = 'corp…6789';
const CORPUS_URL = 'https://corpus-api.test.local/internal/premium';

/** Stripe-style event: only what the handler may touch. */
function makeEvent(type: string, customer: string): Buffer {
  const body = JSON.stringify({
    id: 'evt_test1',
    type,
    object: 'event',
    data: { object: { customer, id: 'obj_test1' } },
  });
  return Buffer.from(body, 'utf8');
}

/** Builds a valid `Stripe-Signature` header: t=<ts>,v1=HMAC(`${ts}.${raw}`). */
function stripeSignature(secret: string, rawBody: Buffer, ts = Math.floor(Date.now() / 1000)): string {
  const v1 = crypto.createHmac('sha256', secret).update(`${ts}.`).update(rawBody).digest('hex');
  return `t=${ts},v1=${v1}`;
}

/** Captures status codes and JSON bodies from an express-like response. */
function makeRes() {
  const res = {
    code: 0 as number,
    body: undefined as unknown,
    status(c: number) {
      res.code = c;
      return res;
    },
    json(o: unknown) {
      res.body = o;
      // Express defaults to 200 when res.status() was never called.
      if (res.code === 0) res.code = 200;
      return res;
    },
  };
  return res;
}

/**
 * Minimal express Request carrying the raw body + one Stripe header. The
 * Buffer travels via `body` ONLY — that is what express.raw() produces
 * (req.rawBody is a legacy alias the handler must not depend on).
 */
function makeReq(rawBody: Buffer, signatureHeader: string | undefined): StripeWebhookRequest {
  const headers: Record<string, string> = {};
  if (signatureHeader !== undefined) headers['stripe-signature'] = signatureHeader;
  const req = {
    body: rawBody,
    ip: '203.0.113.7',
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
  return req as unknown as StripeWebhookRequest;
}

/** Stubs globalThis.fetch; records calls; replies with a fixed status. */
function fetchStub(status: number, payload: object = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return {
      ok: status < 400,
      status,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    } as unknown as Response;
  }) as typeof fetch;
  return calls;
}

let realFetch: typeof fetch;

before(() => {
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.CORPUS_PREMIUM_HMAC_SECRET = CORPUS_SECRET;
  process.env.CORPUS_PREMIUM_URL = CORPUS_URL;
  realFetch = globalThis.fetch;
});

after(() => {
  globalThis.fetch = realFetch;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.CORPUS_PREMIUM_HMAC_SECRET;
  delete process.env.CORPUS_PREMIUM_URL;
});

test('bad Stripe signature -> 400, nothing forwarded', async () => {
  const rawBody = makeEvent('customer.subscription.deleted', 'cus_test42');
  // Signed with the WRONG webhook secret — what a forger would produce.
  const header = stripeSignature('whsec_wrong', rawBody);

  const calls = fetchStub(200);
  const res = makeRes();
  await handleStripeWebhook(makeReq(rawBody, header), res as unknown as ExpressResponse);

  assert.equal(res.code, 400, `expected 400, got ${res.code}: ${JSON.stringify(res.body)}`);
  assert.equal(calls.length, 0, 'a failed signature must never reach the Corpus endpoint');
});

test('valid event -> correct signed forward, 200', async () => {
  const rawBody = makeEvent('checkout.session.completed', 'cus_test42');
  const calls = fetchStub(200, { ok: true, premium: true });

  const res = makeRes();
  await handleStripeWebhook(
    makeReq(rawBody, stripeSignature(WEBHOOK_SECRET, rawBody)),
    res as unknown as ExpressResponse
  );

  assert.equal(res.code, 200, `expected 200, got ${res.code}: ${JSON.stringify(res.body)}`);
  assert.equal(calls.length, 1, 'exactly one forward call');
  const { url, init } = calls[0];
  assert.equal(url, CORPUS_URL);
  assert.equal(init.method, 'POST');

  // The forwarded body must be EXACTLY {stripe_customer_id, event} — the PII
  // firewall: no other field from the Stripe event may cross the wire.
  assert.equal(
    init.body,
    JSON.stringify({ stripe_customer_id: 'cus_test42', event: 'checkout.session.completed' })
  );

  const headers = init.headers as Record<string, string>;
  assert.match(headers['X-Corpus-Timestamp'], /^\d{10,11}$/);
  // Recompute the expected signature from what was actually sent: the contract
  // is hex HMAC-SHA256 over `${timestamp}${body}` with CORPUS_PREMIUM_HMAC_SECRET.
  const expected = crypto
    .createHmac('sha256', CORPUS_SECRET)
    .update(headers['X-Corpus-Timestamp'])
    .update(init.body as string)
    .digest('hex');
  assert.equal(headers['X-Corpus-Signature'], expected, 'forward signature must match the Corpus contract');
});

test('Corpus answers 503 -> 5xx so Stripe retries', async () => {
  const rawBody = makeEvent('invoice.payment_failed', 'cus_test42');
  const calls = fetchStub(503, { error: 'Premium endpoint is not configured on this server.' });

  const res = makeRes();
  await handleStripeWebhook(
    makeReq(rawBody, stripeSignature(WEBHOOK_SECRET, rawBody)),
    res as unknown as ExpressResponse
  );

  assert.ok(res.code >= 500 && res.code < 600, `expected 5xx, got ${res.code}: ${JSON.stringify(res.body)}`);
  assert.equal(calls.length, 1, 'the forward was attempted exactly once before failing to Stripe');
});

// ---------------------------------------------------------------------------
// Real express mount (regression for the live bug: express.raw stores the
// raw bytes in req.body, NOT req.rawBody — every real Stripe delivery was
// rejected with "Empty request body."). Boots server.ts on a test port,
// stubs only the outbound Corpus call, and POSTs signed raw bytes through
// the actual route.
// ---------------------------------------------------------------------------
const MOUNT_PORT = 45124;
const MOUNT_BASE = `http://127.0.0.1:${MOUNT_PORT}`;

test('real mount: signed raw body reaches the handler, empty body stays 400', async () => {
  // The handler-level tests above have swapped globalThis.fetch with their
  // own stubs — use the ORIGINAL fetch (saved in before()) for real HTTP.
  const fetchBefore = realFetch;
  const corpusCalls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(`${MOUNT_BASE}/`)) {
      // Local server traffic goes through the real fetch; Connection: close
      // keeps undici from holding sockets after the server is torn down.
      const headers = new Headers(init?.headers);
      headers.set('Connection', 'close');
      return fetchBefore(input, { ...init, headers });
    }
    if (url === CORPUS_URL) {
      corpusCalls.push({ url, init });
      const payload = { ok: true, premium: true };
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      } as unknown as Response;
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => '',
    } as unknown as Response;
  }) as typeof fetch;

  process.env.PORT = String(MOUNT_PORT);
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
        const res = await fetch(`${MOUNT_BASE}/api/recaptcha/config`);
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

  try {
    // 1) Signed event with a Stripe-style content-type (charset parameter):
    //    must pass express.raw, verify, forward, and answer 200 {ok:true}.
    const rawBody = makeEvent('checkout.session.completed', 'cus_mount42');
    const res = await fetch(`${MOUNT_BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Stripe-Signature': stripeSignature(WEBHOOK_SECRET, rawBody),
      },
      body: new Uint8Array(rawBody),
    });
    // Read the body ONCE (the assert message evaluates eagerly and would
    // otherwise consume it before the json() below).
    const resText = await res.text();
    assert.equal(res.status, 200, `expected 200, got ${res.status}: ${resText}`);
    const data = JSON.parse(resText) as { ok?: boolean };
    assert.equal(data.ok, true);
    assert.equal(corpusCalls.length, 1, 'the raw body reached the handler and was forwarded once');
    assert.equal(corpusCalls[0].url, CORPUS_URL);
    assert.equal(
      corpusCalls[0].init?.body,
      JSON.stringify({ stripe_customer_id: 'cus_mount42', event: 'checkout.session.completed' })
    );

    // 2) Empty body -> the live-bug symptom must remain a 400 (now logged).
    const empty = await fetch(`${MOUNT_BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new Uint8Array(Buffer.alloc(0)),
    });
    assert.equal(empty.status, 400);
    const emptyData = (await empty.json()) as { error?: string };
    assert.match(emptyData.error ?? '', /empty request body/i);
  } finally {
    globalThis.fetch = fetchBefore;
    // Tear down the listening server (same pattern as the checkout tests).
    const handles = (process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles();
    for (const handle of handles) {
      if (handle instanceof createServer && (handle as Server).listening) {
        (handle as Server).close();
      }
    }
  }
});
