/**
 * email.ts — thin send/retry wrapper around @sendgrid/mail.
 *
 * Rules:
 *  - Never throws. A booking action must never fail because SendGrid had a blip.
 *  - Never blocks the HTTP response. Callers fire-and-forget (void + catch).
 *  - One 500 ms retry, then log and swallow.
 *  - When SENDGRID_API_KEY is unset (e.g. local dev), every call is a no-op
 *    with a warning log so the app behaves identically to today.
 */

import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const enabled = Boolean(env.SENDGRID_API_KEY);
if (enabled) sgMail.setApiKey(env.SENDGRID_API_KEY!);

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a single transactional email. Never throws; logs on failure.
 * Callers should NOT await this in a way that holds up the HTTP response —
 * use the fire-and-forget pattern: `void sendEmail(...).catch(...)`.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!enabled) {
    logger.warn({ to, subject }, 'SendGrid not configured (SENDGRID_API_KEY unset) — email skipped.');
    return;
  }

  const msg = {
    to,
    from: {
      email: env.SENDGRID_FROM_EMAIL!,
      name: env.SENDGRID_FROM_NAME,
    },
    subject,
    html,
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await sgMail.send(msg);
      logger.info({ to, subject }, 'Email sent successfully.');
      return;
    } catch (err) {
      if (attempt === 2) {
        logger.error({ err, to, subject }, 'Failed to send email after retry — swallowing error.');
        return; // swallow — caller never sees this as a booking failure
      }
      await new Promise((r) => setTimeout(r, 500)); // brief backoff before the one retry
    }
  }
}

/**
 * Fan-out: send the same email to multiple recipients.
 * Each address is an independent send so one bad address doesn't kill the rest.
 */
export async function sendEmailToMany(recipients: string[], subject: string, html: string): Promise<void> {
  await Promise.allSettled(recipients.map((to) => sendEmail({ to, subject, html })));
}
