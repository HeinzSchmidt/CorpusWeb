/**
 * Contact-form mail delivery (POST /api/contact).
 *
 * Reads the SMTP/contact env vars (MAIL_SMTP_HOST, MAIL_SMTP_PORT,
 * MAIL_SMTP_USER, MAIL_SMTP_PASS, MAIL_FROM, and optionally CONTACT_TO),
 * builds a nodemailer transport (STARTTLS on port 587 by default, implicit
 * TLS on 465), and sends ONE plain-text message to the team inbox with the
 * submitter's address as Reply-To. No host or address is hardcoded anywhere.
 * CONTACT_TO is optional: when unset, enquiries go to MAIL_FROM.
 *
 * Logging policy: the message body, the submitter's e-mail, and
 * MAIL_SMTP_PASS must never reach the logs — callers log only error kinds.
 *
 * The transport factory is a module-level seam: production uses real
 * nodemailer SMTP, tests substitute a fake (no real SMTP, ever).
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface ContactMailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  from: string;
}

export interface ContactMailPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
}

/** Anything nodemailer's Transporter needs for sendMail. */
export type ContactTransportFactory = (config: ContactMailConfig) => Pick<Transporter, 'sendMail'>;

function buildSmtpTransport(config: ContactMailConfig): Pick<Transporter, 'sendMail'> {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 587 = STARTTLS (upgrade to TLS); 465 = implicit TLS from the start.
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
  });
}

let transportFactory: ContactTransportFactory = buildSmtpTransport;

/** Test seam: substitute the transport factory; pass null to restore SMTP. */
export function setContactTransportFactory(factory: ContactTransportFactory | null): void {
  transportFactory = factory ?? buildSmtpTransport;
}

/**
 * Resolve the SMTP/contact env vars. Returns null when ANY required key is
 * missing/blank (or the port is out of range) — callers fail closed and
 * never claim delivery. MAIL_SMTP_PORT defaults to 587 (STARTTLS).
 * CONTACT_TO is optional: enquiries fall back to MAIL_FROM.
 */
export function getContactMailConfig(): ContactMailConfig | null {
  const host = (process.env.MAIL_SMTP_HOST || '').trim();
  const user = (process.env.MAIL_SMTP_USER || '').trim();
  const pass = (process.env.MAIL_SMTP_PASS || '').trim();
  const from = (process.env.MAIL_FROM || '').trim();
  if (!host || !user || !pass || !from) return null;
  const to = (process.env.CONTACT_TO || '').trim() || from;
  const rawPort = (process.env.MAIL_SMTP_PORT || '').trim();
  const port = rawPort === '' ? 587 : Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port, user, pass, to, from };
}

/** Sends exactly one contact message; throws on transport failure. */
export async function sendContactMail(config: ContactMailConfig, payload: ContactMailPayload): Promise<void> {
  const transport = transportFactory(config);
  await transport.sendMail({
    from: config.from,
    to: config.to,
    // A reply to this mail reaches the submitter.
    replyTo: payload.email,
    // The topic must be visible in the inbox subject line.
    subject: `Corpus contact: ${payload.topic} — ${payload.name}`,
    text: [
      'New contact form message',
      '',
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Topic: ${payload.topic}`,
      '',
      payload.message,
    ].join('\n'),
  });
}
