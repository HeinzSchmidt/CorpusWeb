import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_ACTIONS = new Set(['register', 'contact'] as const);
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
  expectedAction: 'register' | 'contact',
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

  // Protected Registration endpoint verified with Google reCAPTCHA v3
  app.post('/api/register', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const acceptedTerms = body.acceptedTerms === true;

    if (fullName.length < 2 || fullName.length > 120) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      res
        .status(400)
        .json({ error: 'Please enter a valid email address for your Corpus account and Stripe receipt.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Please choose a password between 8 and 128 characters.' });
      return;
    }
    if (!acceptedTerms) {
      res.status(400).json({ error: 'Please confirm that you accept the Terms of Use and Privacy Policy.' });
      return;
    }

    const verification = await verifyRecaptchaToken(body.recaptchaToken, 'register', clientIp);
    if (!verification.ok) {
      res.status(verification.statusCode).json({ error: verification.error });
      return;
    }

    res.status(200).json({
      ok: true,
      recaptchaVerified: verification.verified,
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

  // Explicit verification endpoint if called directly by client workflows
  app.post('/api/recaptcha/verify', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many verification attempts. Please wait and try again.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const action = body.action;
    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action as 'register' | 'contact')) {
      res.status(400).json({ error: 'Invalid reCAPTCHA action.' });
      return;
    }

    const verification = await verifyRecaptchaToken(
      body.token,
      action as 'register' | 'contact',
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
