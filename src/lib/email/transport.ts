/**
 * transport.ts — nodemailer transporter singleton (raw SMTP).
 * Lazy init: created on first send so a missing env var never breaks the build.
 */

import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} required for email delivery.`);
  }
  return value;
}

export function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = requiredEnv('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT ?? '465');
  const user = requiredEnv('SMTP_USER');
  const pass = requiredEnv('SMTP_PASS');

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}
