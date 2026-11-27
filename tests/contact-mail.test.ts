/**
 * Focused tests for POST /api/contact mail delivery: honeypot, validation,
 * and the happy-path send (nodemailer transport faked — no real SMTP).
 *
 * Run: npm run test:contact  (tsx --test tests/contact-mail.test.ts tests/contact-delivery.test.ts)
 *
 * Hermetic by design, same pattern as tests/checkout.test.ts: the express
 * app is started from the real server.ts module, globalThis.fetch is kept
 * for the loopback endpoint, and the nodemailer transport factory is
 * replaced with a recorder via setContactTransportFactory.
 *
 * reCAPTCHA is OFF in these tests (no VITE_RECAPTCHA_SITE_KEY /
 * RECAPTCHA_SECRET_KEY), so verification passes without any Google call.
 *
 * NOTE: this file shares the process-wide contact rate-limit budget
 * (5 per 15 min per IP) — it must not send more than 5 requests that pass
 * the honeypot check. The fail-closed / error / rate-limit cases live in
 * tests/contact-delivery.test.ts (its own process, its own server).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { SentMessageInfo, SendMailOptions } from 'nodemailer';
import {
  setContactTransportFactory,
  type ContactTransportFactory,
} from '../server/contactEmail';

const TEST_PORT = 45124;
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

// Fake transport: records every sendMail call, never touches the network.
const fakeTransportFactory: ContactTransportFactory = () => ({
  sendMail: async (info: SendMailOptions) => {
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

function resetMail() {
  mailCalls.length = 0;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Jordan Vance',
    email: 'jordan.vance@example.test',
    topic: 'General Question',
    message: 'My Ollama provider status panel keeps showing offline.',
    recaptchaToken: '',
    ...overrides,
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
  process.env.MAIL_SMTP_HOST = MAIL_HOST;
  process.env.MAIL_SMTP_PORT = '587';
  process.env.MAIL_SMTP_USER = MAIL_USER;
  process.env.MAIL_SMTP_PASS = MAIL_PASS;
  process.env.MAIL_FROM = MAIL_FROM;
  process.env.CONTACT_TO = CONTACT_TO;
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
  const handles = (process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles();
  for (const handle of handles) {
    if (handle instanceof createServer && (handle as Server).listening) {
      (handle as Server).close();
    }
  }
});

test('honeypot: a filled website field returns a silent 200 and sends no mail', async () => {
  resetMail();
  const res = await postContact(validBody({ website: 'http://spam.example' }));
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok?: boolean };
  assert.equal(data.ok, true, 'bots are not tipped off');
  assert.equal(mailCalls.length, 0, 'no mail for honeypot submissions');
});

test('validation: malformed fields each get a 400 ok:false and no mail', async () => {
  resetMail();
  const cases: Array<{ body: Record<string, unknown>; match: RegExp }> = [
    { body: validBody({ name: 'J' }), match: /enter your name/i },
    { body: validBody({ email: 'not-an-email' }), match: /valid email/i },
    { body: validBody({ topic: 'Something Else' }), match: /valid inquiry topic/i },
    { body: validBody({ message: 'short' }), match: /between 10 and 5000/i },
  ];
  for (const { body, match } of cases) {
    const res = await postContact(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    const data = (await res.json()) as { ok?: boolean; error?: string };
    assert.equal(data.ok, false);
    assert.match(data.error ?? '', match);
  }
  assert.equal(mailCalls.length, 0, 'no mail on validation failures');
});

test('success: one mail with Reply-To + topic subject, ok:true response, no PII in the response', async () => {
  resetMail();
  const res = await postContact(validBody());
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok?: boolean; recaptchaVerified?: boolean };
  assert.equal(data.ok, true);
  assert.equal(data.recaptchaVerified, false, 'recaptcha off in this test env');
  // The response must not echo the submitted message or the submitter address.
  assert.ok(JSON.stringify(data).length < 120, 'response stays a tiny status object');
  assert.ok(!JSON.stringify(data).includes('jordan.vance@example.test'));
  assert.ok(!JSON.stringify(data).includes('Ollama'));

  assert.equal(mailCalls.length, 1, 'exactly one mail per submission');
  const mail = mailCalls[0];
  assert.equal(mail.from, MAIL_FROM);
  assert.equal(mail.to, CONTACT_TO, 'CONTACT_TO receives the enquiry');
  assert.equal(mail.replyTo, 'jordan.vance@example.test', 'reply reaches the submitter');
  assert.match(mail.subject, /General Question/, 'subject includes the topic');
  assert.match(mail.subject, /Jordan Vance/, 'subject includes the sender name');
  assert.match(mail.text, /jordan.vance@example\.test/);
  assert.match(mail.text, /My Ollama provider status panel keeps showing offline\./);
});
