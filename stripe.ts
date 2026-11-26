/**
 * Stripe webhook receiver for CorpusWeb.
 *
 * POST /api/stripe/webhook — Stripe signs every delivery with a
 * `Stripe-Signature` header: `t=<unix-seconds>,v1=<hex>`, where v1 is
 * HMAC-SHA256 over `${t}.${rawBody}` with the webhook signing secret
 * (STRIPE_WEBHOOK_SECRET, from the Stripe Dashboard — not the API key).
 * Verified with the standard 5-minute tolerance and a constant-time compare.
 *
 * On a verified event we accept only the four types that matter for premium
 * state, extract ONLY {stripe_customer_id, event} (no PII, no e-mails —
 * nothing else from the event is ever read, stored, or logged), and forward
 * to the signed Corpus internal endpoint (CORPUS_PREMIUM_URL) using its
 * exact contract:
 *
 *   body:     exactly { "stripe_customer_id": "cus_...", "event": "<type>" }
 *   headers:  X-Corpus-Timestamp  = UNIX epoch seconds
 *             X-Corpus-Signature  = hex HMAC-SHA256 over `${timestamp}${rawBody}`,
 *                                   secret CORPUS_PREMIUM_HMAC_SECRET
 *   timeout:  10 seconds (AbortSignal.timeout)
 *
 * Status mapping drives Stripe's retry behaviour:
 *   - Corpus 200 -> 200 (applied)
 *   - Corpus 404 -> 200 (verified but no linked account yet; logged; not a
 *     retryable failure — account linking happens at checkout time)
 *   - Corpus 5xx / network failure / timeout -> 502 (Stripe will retry)
 *   - Bad Stripe signature / malformed event -> 400 (Stripe does NOT retry
 *     4xx, which is correct: replaying it cannot fix it)
 */
import crypto from 'crypto';
import type { Request, Response } from 'express';

/** Standard Stripe webhook timestamp tolerance (5 minutes). */
const STRIPE_TOLERANCE_MS = 5 * 60 * 1000;
/** Forward timeout per the brief. */
const FORWARD_TIMEOUT_MS = 10_000;
/** The only event types that may affect premium state. */
const ALLOWED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

/** Express request with the raw body (express.raw sets req.rawBody itself). */
export type StripeWebhookRequest = Request & { rawBody?: Buffer };

/** The fetch Response type, spelled so it cannot collide with express's Response. */
type FetchResp = Awaited<ReturnType<typeof fetch>>;

// ---------------------------------------------------------------------------
// Stripe signature verification
// ---------------------------------------------------------------------------

/**
 * Verifies a `Stripe-Signature` header against the raw request body.
 * Returns null when the event may be trusted, otherwise a short internal
 * reason (logged server-side; the caller always gets a generic 400 so probes
 * cannot learn which check failed).
 */
export function verifyStripeSignature(opts: {
  rawBody: Buffer;
  header: string | undefined;
  secret: string;
  nowMs?: number;
}): string | null {
  if (!opts.secret) return 'STRIPE_WEBHOOK_SECRET not configured';
  if (typeof opts.header !== 'string' || opts.header.trim() === '') {
    return 'missing Stripe-Signature header';
  }

  // Stripe's header is comma-separated `k=v` pairs: one t (timestamp) and
  // one or more v1 (HMACs, possibly from different signing keys).
  let t = '';
  const v1s: string[] = [];
  for (const part of opts.header.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') t = value;
    else if (key === 'v1') v1s.push(value);
  }
  if (!/^\d+$/.test(t)) return 'malformed timestamp in Stripe-Signature';
  if (v1s.length === 0) return 'missing v1 signature in Stripe-Signature';

  const nowMs = opts.nowMs ?? Date.now();
  const tsMs = Number(t) * 1000;
  // Reject replays older than the tolerance, and clocks too far ahead of us.
  if (Math.abs(nowMs - tsMs) > STRIPE_TOLERANCE_MS) return 'timestamp outside 5-minute window';

  // Stripe signs `${t}.${rawBody}` — the dot is part of the payload. Use the
  // header's t verbatim (no numeric normalisation).
  const expected = crypto
    .createHmac('sha256', opts.secret)
    .update(`${t}.`)
    .update(opts.rawBody)
    .digest('hex');
  for (const provided of v1s) {
    if (safeEqualHex(expected, provided.toLowerCase())) return null;
  }
  return 'signature mismatch';
}

/** Constant-time comparison of hex strings; a length mismatch is a non-match. */
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // Hex digests are fixed-length (64 chars), so a length check leaks nothing
  // useful, and it keeps timingSafeEqual from throwing on uneven input.
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ---------------------------------------------------------------------------
// Corpus forward signing
// ---------------------------------------------------------------------------

/**
 * hex HMAC-SHA256 over `${timestamp}` concatenated with the raw forward body —
 * the Corpus /internal/premium contract (no separator, unlike Stripe's dot).
 */
export function computeCorpusSignature(secret: string, timestamp: string, rawBody: string | Buffer): string {
  return crypto.createHmac('sha256', secret).update(timestamp).update(rawBody).digest('hex');
}

/**
 * Pulls the only two facts we may keep out of a verified event: the Stripe
 * customer id and the event type. Returns a reason instead when the event
 * carries no usable customer (logged by the handler; nothing is forwarded).
 * Stripe envelope: event.data.object is the resource (checkout session,
 * subscription, invoice) and .customer on it is the only field we read.
 */
export function extractForwardPayload(
  parsed: unknown
): { stripeCustomerId: string; eventType: string } | { error: string } {
  const event = parsed as { type?: unknown; data?: { object?: { customer?: unknown } } };
  const eventType = typeof event?.type === 'string' ? event.type : '';
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    // Not an error: Stripe sends many types we intentionally ignore (we answer
    // 200 for them so they are not retried forever).
    return { error: `unhandled event type: ${eventType || '(missing)'}` };
  }
  const customer = event.data?.object?.customer;
  if (typeof customer !== 'string' || !/^cus_[A-Za-z0-9]{6,}$/.test(customer)) {
    return { error: `event ${eventType} carries no usable Stripe customer id` };
  }
  return { stripeCustomerId: customer, eventType };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

/**
 * POST /api/stripe/webhook
 * Must be mounted with express.raw (see server.ts) so req.rawBody holds the
 * exact bytes Stripe signed — a JSON-parsed-then-reserialized body would
 * never verify.
 */
export async function handleStripeWebhook(req: StripeWebhookRequest, res: Response): Promise<void> {
  const rawBody = req.rawBody;
  if (!rawBody || rawBody.length === 0) {
    res.status(400).json({ error: 'Empty request body.' });
    return;
  }

  // 1) Verify Stripe's signature over the raw bytes (fail closed).
  const rejectReason = verifyStripeSignature({
    rawBody,
    header: req.get('stripe-signature'),
    secret: (process.env.STRIPE_WEBHOOK_SECRET || '').trim(),
  });
  if (rejectReason !== null) {
    // Deliberately generic toward the client; the internal reason is logged
    // for the operator. No body content is ever logged.
    console.error(`[stripe-webhook] rejected from ${req.ip || 'unknown'}: ${rejectReason}`);
    res.status(400).json({ error: 'Invalid Stripe signature.' });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString('utf8'));
  } catch {
    console.error(`[stripe-webhook] verified but body is not JSON, from ${req.ip || 'unknown'}`);
    res.status(400).json({ error: 'Invalid event payload.' });
    return;
  }

  const extracted = extractForwardPayload(parsed);
  if ('error' in extracted) {
    if (extracted.error.startsWith('unhandled event type')) {
      // Expected traffic we do not care about — acknowledge so Stripe stops.
      console.info(`[stripe-webhook] ignored unhandled event type: ${extracted.error.replace('unhandled event type: ', '')}`);
      res.json({ received: true, ignored: true });
      return;
    }
    // Verified event of an allowed type but no customer id to act on
    // (e.g. subscription of an already-deleted customer). Acknowledge:
    // retrying cannot produce the missing customer either.
    console.warn(`[stripe-webhook] ${extracted.error} — nothing to forward`);
    res.json({ received: true, forwarded: false });
    return;
  }
  const { stripeCustomerId, eventType } = extracted;

  // 2) Forward to the Corpus internal endpoint with its exact signing contract.
  const target = (process.env.CORPUS_PREMIUM_URL || '').trim();
  const corpusSecret = (process.env.CORPUS_PREMIUM_HMAC_SECRET || '').trim();
  if (!target || !corpusSecret) {
    console.error('[stripe-webhook] CORPUS_PREMIUM_URL / CORPUS_PREMIUM_HMAC_SECRET not configured; refusing forward');
    // 5xx so Stripe retries once the operator has configured the endpoint.
    res.status(503).json({ error: 'Premium endpoint is not configured on this server.' });
    return;
  }

  // The forward body is EXACTLY these two fields — the Corpus endpoint
  // rejects anything extra, which is the PII firewall.
  const forwardBody = JSON.stringify({ stripe_customer_id: stripeCustomerId, event: eventType });
  const timestamp = String(Math.floor(Date.now() / 1000)); // UNIX epoch seconds
  const signature = computeCorpusSignature(corpusSecret, timestamp, forwardBody);

  let corpusResp: FetchResp;
  try {
    corpusResp = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Corpus-Timestamp': timestamp,
        'X-Corpus-Signature': signature,
      },
      body: forwardBody,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
  } catch (err) {
    // Network failure or the 10 s timeout -> transient, let Stripe retry.
    console.error(`[stripe-webhook] forward to ${target} failed:`, err instanceof Error ? err.message : String(err));
    res.status(502).json({ error: 'Premium endpoint unreachable.' });
    return;
  }

  // 3) Map Corpus's answer onto Stripe's retry expectations.
  if (corpusResp.status === 200) {
    console.info(`[stripe-webhook] applied ${eventType} for ${stripeCustomerId} (Corpus 200)`);
    res.json({ ok: true });
    return;
  }
  if (corpusResp.status === 404) {
    // Verified, but no Corpus account is linked to this customer yet.
    // Account linking happens at checkout (see the linking proposal), so this
    // is expected state, not a fault: acknowledge to stop the retry loop.
    console.info(`[stripe-webhook] no linked account for ${stripeCustomerId} (${eventType})`);
    res.json({ ok: true, linked: false });
    return;
  }
  if (corpusResp.status >= 500) {
    // 502/503 from Corpus = its Stripe lookup or database was flaky; retry.
    console.error(`[stripe-webhook] Corpus answered ${corpusResp.status} for ${eventType}`);
    res.status(502).json({ error: 'Premium endpoint error. Will retry.' });
    return;
  }
  // Unexpected 4xx from a correctly-signed internal call means a contract or
  // secret mismatch (e.g. 401 = both sides' HMAC secrets differ). That will
  // not fix itself on retry, but Stripe only distinguishes 4xx vs 5xx for the
  // caller; use 500 + a loud log so the operator sees it in the health check.
  const detail = await corpusResp.text().catch(() => '');
  console.error(
    `[stripe-webhook] Corpus answered ${corpusResp.status} (contract error?) for ${eventType}: ${detail.slice(0, 200)}`
  );
  res.status(500).json({ error: 'Premium endpoint contract error.' });
}
