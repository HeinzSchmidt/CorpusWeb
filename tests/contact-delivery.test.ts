/**
 * Focused tests for POST /api/contact failure modes: fail-closed on missing
 * MAIL_* env vars, the CONTACT_TO -> MAIL_FROM fallback, SMTP transport
 * errors, and the tighter contact-specific rate limit (429 JSON).
 *
 * Own process + own loopback port (45125): the contact rate-limit budget
 * (5 per 15 min per IP, shared by all /api/contact posts from 127.0.0.1 in
 * this process) is consumed deliberately — see the test order below.
 *
 * Run: npm run test:contact
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { SentMessageInfo, SendMailOptions } from 'nodemailer';
import {
  getContactMailConfig,
  setContactTransportFactory,
  type ContactTransportFactory,
} from '../server/contactEmail';

const TEST_PORT = 45125;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

const MAIL_HOST = 'smtp.test.local';
const MAIL_USER = 'mailer@test.local';
const MAIL_PASS = 'test-only-password';
const MAIL_FROM = 'noreply-test@test.local';
const CONTACT_TO = 'team-test@test.local';

interface SentMail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}
const mailCalls: SentMail[] = [];
let mailShouldReject = false;

const fakeTransportFactory: ContactTransportFactory = () => ({
  sendMail: async (info: SendMailOptions) => {
    if (mailShouldReject) {
      throw new Error('connect ECONNREFUSED (simulated SMTP outage)');
    }
    mailCalls.push({
      from: String(info.from),
      to: String(info.to),
      replyTo: String(info.replyTo ?? ''),
      subject: String(info.subject ?? ''),
      text: String(info.text ?? ''),
    });
    return {
      accepted: [String(info.to)],
      rejected: [],
      envelope: { from: String(info.from), to: [String(info.to)] },
      messageId: 'test-message-id',
    } as unknown as SentMessageInfo;
  },
});
setContactTransportFactory(fakeTransportFactory);

function setMailEnv(withContactTo = true) {
  process.env.MAIL_SMTP_HOST = MAIL_HOST;
  process.env.MAIL_SMTP_PORT = '587';
  process.env.MAIL_SMTP_USER = MAIL_USER;
  process.env.MAIL_SMTP_PASS = MAIL_PASS;
  process.env.MAIL_FROM = MAIL_FROM;
  if (withContactTo) {
    process.env.CONTACT_TO = CONTACT_TO;
  } else {
    delete process.env.CONTACT_TO;
  }
}

function clearMailEnv() {
  delete process.env.MAIL_SMTP_HOST;
  delete process.env.MAIL_SMTP_PORT;
  delete process.env.MAIL_SMTP_USER;
  delete process.env.MAIL_SMTP_PASS;
  delete process.env.MAIL_FROM;
  delete process.env.CONTACT_TO;
}

function validBody() {
  return {
    name: 'Jordan Vance',
    email: 'jordan.vance@example.test',
    topic: 'Security / Technical',
    message: 'A question about the security architecture page.',
    recaptchaToken: '',
  };
}

async function postContact(body: unknown) {
  return fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

before(async () => {
  process.env.PORT = String(TEST_PORT);
  setMailEnv();
  delete process.env.VITE_RECAPTCHA_SITE_KEY;
  delete process.env.RECAPTCHA_SECRET_KEY;

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
  clearMailEnv();
  const handles = (process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles();
  for (const handle of handles) {
    if (handle instanceof createServer && (handle as Server).listening) {
      (handle as Server).close();
    }
  }
});

// ---------------------------------------------------------------------------
// getContactMailConfig unit checks (pure — no HTTP, no rate-limit spend)
// ---------------------------------------------------------------------------

test('getContactMailConfig: resolves defaults and the CONTACT_TO fallback', () => {
  setMailEnv(true);
  let config = getContactMailConfig();
  assert.deepEqual(config, {
    host: MAIL_HOST,
    port: 587,
    user: MAIL_USER,
    pass: MAIL_PASS,
    to: CONTACT_TO,
    from: MAIL_FROM,
  });

  // No CONTACT_TO -> enquiries go to MAIL_FROM.
  setMailEnv(false);
  config = getContactMailConfig();
  assert.equal(config?.to, MAIL_FROM);
  assert.equal(config?.port, 587);

  // Explicit port is respected.
  process.env.MAIL_SMTP_PORT = '465';
  config = getContactMailConfig();
  assert.equal(config?.port, 465);
  clearMailEnv();
});

test('getContactMailConfig: null when any required key is missing', () => {
  setMailEnv(false);
  const required = [
    'MAIL_SMTP_HOST',
    'MAIL_SMTP_USER',
    'MAIL_SMTP_PASS',
    'MAIL_FROM',
  ] as const;
  for (const key of required) {
    const saved = process.env[key];
    delete process.env[key];
    assert.equal(getContactMailConfig(), null, `${key} missing -> null`);
    if (saved !== undefined) process.env[key] = saved;
  }
  clearMailEnv();
  assert.equal(getContactMailConfig(), null, 'all missing -> null');
});

// ---------------------------------------------------------------------------
// HTTP failure modes (rate-limit spend: 1 each, in this order)
// ---------------------------------------------------------------------------

test('missing mail env fails closed: 4xx ok:false, no send', async () => {
  clearMailEnv();
  const res = await postContact(validBody());
  assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
  const data = (await res.json()) as { ok?: boolean; error?: string };
  assert.equal(data.ok, false, 'never ok:true when mail cannot send');
  assert.match(data.error ?? '', /temporarily unavailable/i);
  assert.equal(mailCalls.length, 0, 'no mail attempt without config');
});

test('one missing key (partial config) also fails closed', async () => {
  setMailEnv(false);
  delete process.env.MAIL_SMTP_PASS;
  const res = await postContact(validBody());
  assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
  const data = (await res.json()) as { ok?: boolean };
  assert.equal(data.ok, false);
  assert.equal(mailCalls.length, 0);
  setMailEnv();
});

test('SMTP transport error: 4xx ok:false with a clear message, never 5xx', async () => {
  mailShouldReject = true;
  try {
    const res = await postContact(validBody());
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
    const data = (await res.json()) as { ok?: boolean; error?: string };
    assert.equal(data.ok, false, 'a failed delivery is not a success');
    assert.match(data.error ?? '', /could not be delivered/i);
  } finally {
    mailShouldReject = false;
  }
});

test('delivery succeeds when everything is configured (fallback to MAIL_FROM)', async () => {
  setMailEnv(false); // no CONTACT_TO -> to === MAIL_FROM
  const res = await postContact(validBody());
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok?: boolean };
  assert.equal(data.ok, true);
  assert.equal(mailCalls.length, 1);
  assert.equal(mailCalls[0].to, MAIL_FROM, 'enquiries fall back to MAIL_FROM');
  assert.equal(mailCalls[0].replyTo, 'jordan.vance@example.test');
  setMailEnv();
});

// ---------------------------------------------------------------------------
// Tighter contact rate limit (separate 5-per-15-min bucket from checkout's 30)
// Requests so far in this process: 4. Budget: 5 -> the 5th still passes,
// the 6th gets 429.
// ---------------------------------------------------------------------------

test('the 5th contact request still passes; the 6th gets a 429 JSON response', async () => {
  setMailEnv();
  const fifth = await postContact(validBody());
  assert.equal(fifth.status, 200, 'request 5 is within the budget of 5');
  const fifthData = (await fifth.json()) as { ok?: boolean };
  assert.equal(fifthData.ok, true);
  assert.equal(mailCalls.length, 2, 'the 5th request delivered its mail');

  const sixth = await postContact(validBody());
  assert.equal(sixth.status, 429, 'request 6 is rate limited');
  const sixthData = (await sixth.json()) as { ok?: boolean; error?: string };
  assert.equal(sixthData.ok, false);
  assert.match(sixthData.error ?? '', /too many requests/i);
  assert.equal(mailCalls.length, 2, 'no mail for a 429');
});
