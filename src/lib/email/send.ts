/**
 * send.ts — Email delivery. Never throws: the caller decides what to do with a
 * failure. Keeping SMTP errors non-throwing means Inngest does not retry a bad
 * password 4 times; the failure is recorded in reminder_deliveries instead.
 */

import { getTransporter } from './transport';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
      return { ok: false, error: 'Missing SMTP_FROM or SMTP_USER in the environment.' };
    }

    await getTransporter().sendMail({
      from,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      subject: input.subject,
      html: input.html,
    });

    return { ok: true };
  } catch (error) {
    const err = error as Error;
    return { ok: false, error: err.message || 'Unknown error while sending the email.' };
  }
}
