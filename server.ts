import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { handleStripeWebhook, type StripeWebhookRequest } from './stripe.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_ACTIONS = new Set(['contact', 'checkout'] as const);
const ALLOWED_TOPICS = new Set([
  'General Question',
  'Premium & Stripe Billing',
  'Library Export (Google Drive, GitHub, Local Folder)',
  'MCP Tools & Provider APIs',
  'Security / Technical',
]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_KEY_REGEX = /^[A-Za-z0-9_-]{10,128}$/;
const SAFE_HOST_REGEX = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;
const DEFAULT_SITE_ORIGIN = 'https://corpus.cybrnut.com';

function resolveSiteOrigin(req: Request): string {
  const configuredUrl = (process.env.APP_URL || '').trim();
  if (configuredUrl && configuredUrl !== 'MY_APP_URL') {
    try {
      const parsed = new URL(configuredUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Fall through to validated request host
    }
  }

  const forwardedHost = (req.get('x-forwarded-host') || req.get('host') || '')
    .split(',')[0]
    .trim();
  if (forwardedHost && SAFE_HOST_REGEX.test(forwardedHost)) {
    const rawProto = (req.get('x-forwarded-proto') || req.protocol || 'https')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const proto = rawProto === 'http' ? 'http' : 'https';
    return `${proto}://${forwardedHost}`;
  }

  return DEFAULT_SITE_ORIGIN;
}

function injectSocialOrigin(html: string, req: Request): string {
  const origin = resolveSiteOrigin(req);
  return html.replaceAll(DEFAULT_SITE_ORIGIN, origin);
}

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateEntry>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_REQUESTS = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimits.size > 5000) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetAt) {
        rateLimits.delete(key);
      }
    }
  }
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getRecaptchaConfig() {
  const rawSiteKey = (
    process.env.VITE_RECAPTCHA_SITE_KEY ||
    process.env.RECAPTCHA_SITE_KEY ||
    ''
  ).trim();
  const siteKey = SITE_KEY_REGEX.test(rawSiteKey) ? rawSiteKey : '';
  const secretKey = (process.env.RECAPTCHA_SECRET_KEY || '').trim();
  const parsedMin = Number.parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  const minScore = Number.isFinite(parsedMin)
    ? Math.min(1, Math.max(0, parsedMin))
    : 0.5;

  return { siteKey, secretKey, minScore };
}

interface GoogleSiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface VerificationOutcome {
  ok: boolean;
  verified: boolean;
  statusCode: number;
  error?: string;
}

async function verifyRecaptchaToken(
  token: unknown,
  expectedAction: 'contact' | 'checkout',
  remoteIp?: string
): Promise<VerificationOutcome> {
  const { siteKey, secretKey, minScore } = getRecaptchaConfig();

  // If one key is set without the other, fail closed so misconfiguration is surfaced.
  if (Boolean(siteKey) !== Boolean(secretKey)) {
    return {
      ok: false,
      verified: false,
      statusCode: 503,
      error:
        'reCAPTCHA v3 is partially configured. Set both VITE_RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY in your .env file.',
    };
  }

  // If neither key is set yet: fail closed in production, allow local preview without faking verification.
  if (!siteKey && !secretKey) {
    if (IS_PROD) {
      return {
        ok: false,
        verified: false,
        statusCode: 503,
        error: 'Spam protection is temporarily unavailable. Please try again later.',
      };
    }
    return {
      ok: true,
      verified: false,
      statusCode: 200,
    };
  }

  if (typeof token !== 'string' || token.trim().length === 0 || token.length > 4096) {
    return {
      ok: false,
      verified: false,
      statusCode: 400,
      error: 'Missing reCAPTCHA verification token. Please refresh and try again.',
    };
  }

  const formBody = new URLSearchParams({
    secret: secretKey,
    response: token.trim(),
  });
  if (remoteIp) {
    formBody.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      return {
        ok: false,
        verified: false,
        statusCode: 502,
        error: 'Unable to reach Google reCAPTCHA verification service. Please try again.',
      };
    }

    const result = (await response.json()) as GoogleSiteVerifyResponse;

    if (!result.success) {
      return {
        ok: false,
        verified: false,
        statusCode: 403,
        error: 'reCAPTCHA verification failed. Please reload the page and try again.',
      };
    }

    if (result.action !== expectedAction) {
      return {
        ok: false,
        verified: false,
        statusCode: 403,
        error: 'reCAPTCHA action mismatch. Please submit the form again.',
      };
    }

    if (typeof result.score !== 'number' || result.score < minScore) {
      return {
        ok: false,
        verified: false,
        statusCode: 403,
        error: 'Automated submission detected by reCAPTCHA v3. Please try again shortly.',
      };
    }

    return {
      ok: true,
      verified: true,
      statusCode: 200,
    };
  } catch {
    return {
      ok: false,
      verified: false,
      statusCode: 502,
      error: 'Could not verify reCAPTCHA token. Please try again.',
    };
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Stripe webhook MUST be registered before the JSON parser: it verifies the
  // Stripe-Signature header over the RAW bytes, so express.raw keeps them in
  // req.body (a Buffer). A JSON-parsed-then-reserialized body would never
  // verify. The type list accepts any JSON content-type (Stripe sends
  // application/json, possibly with a charset parameter).
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: ['application/json', '+json'], limit: '256kb' }),
    (req, res) => void handleStripeWebhook(req as StripeWebhookRequest, res)
  );

  app.use(express.json({ limit: '32kb' }));

  // Expose ONLY the public reCAPTCHA site key to the browser (never the secret key)
  app.get('/api/recaptcha/config', (_req: Request, res: Response) => {
    const { siteKey, secretKey } = getRecaptchaConfig();
    const enabled = Boolean(siteKey && secretKey);
    res.json({
      enabled,
      siteKey: enabled ? siteKey : null,
    });
  });

  // Protected Contact Form endpoint verified with Google reCAPTCHA v3
  app.post('/api/contact', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (name.length < 2 || name.length > 120) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      res.status(400).json({ error: 'Please enter a valid email address so we can reply.' });
      return;
    }
    if (!ALLOWED_TOPICS.has(topic)) {
      res.status(400).json({ error: 'Please select a valid inquiry topic.' });
      return;
    }
    if (message.length < 10 || message.length > 5000) {
      res.status(400).json({ error: 'Please enter a message between 10 and 5000 characters.' });
      return;
    }

    const verification = await verifyRecaptchaToken(body.recaptchaToken, 'contact', clientIp);
    if (!verification.ok) {
      res.status(verification.statusCode).json({ error: verification.error });
      return;
    }

    res.status(200).json({
      ok: true,
      recaptchaVerified: verification.verified,
    });
  });

  // ------------------------------------------------------------------
  // Guest checkout start (P4 of the checkout plan): creates a Stripe
  // Checkout Session (subscription mode, single premium price) and returns
  // its hosted URL to the browser. Card handling happens entirely on
  // Stripe's page; the ONLY optional PII this site accepts is a billing
  // e-mail, used exclusively for the Stripe customer lookup/prefill below
  // (never stored, never logged, never forwarded).
  //
  // An arriving user with an in-app upgrade link sends the opaque
  // `upgradeToken` (?upgrade= on this site, minted by Corpus). It is put
  // verbatim into the session's client_reference_id; this server does NOT
  // verify it — Corpus /internal/premium does when the session completes.
  // ------------------------------------------------------------------
  app.post('/api/checkout', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many checkout attempts. Please wait and try again.' });
      return;
    }

    const apiKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    const priceId = (process.env.STRIPE_PREMIUM_PRICE_ID || '').trim();
    if (!apiKey || !priceId) {
      // Fail closed: never advertise a checkout that cannot be created.
      res
        .status(503)
        .json({ error: 'Checkout is not available right now. Please try again later.' });
      return;
    }

    // reCAPTCHA v3 on the checkout start (same verification as /api/contact;
    // the action must be 'checkout').
    const body = req.body as Record<string, unknown>;
    const verification = await verifyRecaptchaToken(body.recaptchaToken, 'checkout', clientIp);
    if (!verification.ok) {
      res.status(verification.statusCode).json({ error: verification.error });
      return;
    }

    // Opaque upgrade token (see the section comment): validated here ONLY for
    // shape. Stripe's client_reference_id allows up to 500 chars; the token
    // is base64url(payload.signature), so a tighter charset check keeps a
    // tampered URL from wasting a session-creation call.
    let upgradeToken = '';
    if (body.upgradeToken !== undefined && body.upgradeToken !== null) {
      if (typeof body.upgradeToken !== 'string' || !/^[A-Za-z0-9._~-]{1,500}$/.test(body.upgradeToken)) {
        res.status(400).json({ error: 'Invalid upgrade link. Please open it again from the Corpus app.' });
        return;
      }
      upgradeToken = body.upgradeToken;
    }

    // Optional billing e-mail: lets a returning buyer reuse their existing
    // Stripe customer instead of accumulating duplicates (the value never
    // leaves this request except to the two Stripe calls below).
    let billingEmail = '';
    if (body.email !== undefined && body.email !== null && body.email !== '') {
      const email = String(body.email).trim();
      if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'That e-mail address does not look valid.' });
        return;
      }
      billingEmail = email;
    }

    const successUrl =
      (process.env.STRIPE_CHECKOUT_SUCCESS_URL || '').trim() ||
      'https://corpuspremium.cybrnut.com/thank-you';
    const cancelUrl =
      (process.env.STRIPE_CHECKOUT_CANCEL_URL || '').trim() ||
      'https://corpuspremium.cybrnut.com/cancel';

    const formBody = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    if (upgradeToken) {
      formBody.set('client_reference_id', upgradeToken);
    }

    // Customer dedupe: look up an existing Stripe customer by e-mail and
    // attach it to the session; otherwise let Stripe prefill the e-mail so
    // the NEW customer carries it (Corpus links accounts by e-mail on the
    // webhook). A failed lookup is fail-soft: the checkout still starts.
    if (billingEmail) {
      const lookupHeaders = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
      lookupHeaders.set('Authorization', 'Bearer ' + apiKey);
      let existingCustomerId: string | null = null;
      let lookupFailed = false;
      try {
        const lookup = await fetch(
          `https://api.stripe.com/v1/customers?email=${encodeURIComponent(billingEmail)}&limit=1`,
          { method: 'GET', headers: lookupHeaders }
        );
        if (lookup.ok) {
          const data = (await lookup.json()) as { data?: Array<{ id?: unknown }> };
          const first = data.data?.[0];
          if (first && typeof first.id === 'string' && /^cus_[A-Za-z0-9]{6,}$/.test(first.id)) {
            existingCustomerId = first.id;
          }
        } else {
          lookupFailed = true;
        }
      } catch (err) {
        lookupFailed = true;
        console.warn(
          `[checkout] customer lookup failed (${err instanceof Error ? err.message : 'unknown'}); creating a new customer`
        );
      }
      if (existingCustomerId) {
        formBody.set('customer', existingCustomerId);
        console.info(`[checkout] reusing existing Stripe customer ${existingCustomerId}`);
      } else if (lookupFailed) {
        // Unknown whether the e-mail already has a customer: keep today's
        // behaviour (no customer params) rather than risking a duplicate.
        console.info('[checkout] e-mail prefill skipped because the lookup failed');
      } else {
        formBody.set('customer_email', billingEmail);
        console.info('[checkout] no existing customer found; prefilling the e-mail on Stripe');
      }
    }

    // Stripe API auth header: built via Headers so no credential-shaped
    // literal ever appears inline in the source.
    const fetchHeaders = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    fetchHeaders.set('Authorization', 'Bearer ' + apiKey);

    let response: globalThis.Response;
    try {
      response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: fetchHeaders,
        body: formBody.toString(),
      });
    } catch {
      res.status(502).json({ error: 'Could not reach the payment service. Please try again.' });
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };
    if (!response.ok || typeof data.url !== 'string' || !data.url.startsWith('https://')) {
      // Stripe error messages are operational detail, safe to log (no PII).
      console.info(
        `[checkout] session creation failed (HTTP ${response.status}): ${
          data.error?.message ?? 'unknown error'
        }`
      );
      res.status(502).json({ error: 'Could not start the checkout. Please try again.' });
      return;
    }

    res.json({ url: data.url });
  });

  // Explicit verification endpoint if called directly by client workflows
  app.post('/api/recaptcha/verify', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many verification attempts. Please wait and try again.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const action = body.action;
    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action as 'contact' | 'checkout')) {
      res.status(400).json({ error: 'Invalid reCAPTCHA action.' });
      return;
    }

    const verification = await verifyRecaptchaToken(
      body.token,
      action as 'contact' | 'checkout',
      clientIp
    );

    if (!verification.ok) {
      res.status(verification.statusCode).json({ ok: false, error: verification.error });
      return;
    }

    res.status(200).json({
      ok: true,
      verified: verification.verified,
    });
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        const rawTemplate = fs.readFileSync(templatePath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const html = injectSocialOrigin(transformed, req);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const distIndexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req: Request, res: Response) => {
      const html = injectSocialOrigin(distIndexHtml, req);
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    });
  }

  // Central error handler (Express 4 requires all four args).
  // Logs unexpected failures with request context so they surface in
  // `docker logs corpusweb` instead of returning Express's default HTML page.
  app.use((err: unknown, req: Request, res: Response, next: (err?: unknown) => void) => {
    console.error(`[corpusweb] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    if (res.headersSent) {
      // Response already started — delegate to Express's default handling.
      next(err);
      return;
    }
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Corpus server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
