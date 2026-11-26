/**
 * Focused tests for POST /api/stripe/webhook (step 2 of the premium work).
 *
 * Run: npm run test:webhook   (tsx --test tests/stripe-webhook.test.ts)
 *
 * Hermetic by design: globalThis.fetch is stubbed (no real Stripe, no real
 * Corpus call). The three cases are the ones from the brief: bad Stripe
 * signature -> 400, valid event -> correctly signed forward, and Corpus 503
 * -> 5xx so Stripe retries.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
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

/** Minimal express Request carrying the raw body + one Stripe header. */
function makeReq(rawBody: Buffer, signatureHeader: string | undefined): StripeWebhookRequest {
  const headers: Record<string, string> = {};
  if (signatureHeader !== undefined) headers['stripe-signature'] = signatureHeader;
  const req = {
    rawBody,
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
