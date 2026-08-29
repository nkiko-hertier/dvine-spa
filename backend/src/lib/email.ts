/**
 * email.ts — thin send/retry wrapper around a transactional email provider.
 *
 * Provider selection (decided once at module load):
 *  1. Google SMTP — when GMAIL_USER and GMAIL_APP_PASSWORD are both set.
 *  2. SendGrid    — when SENDGRID_API_KEY is set.
 *  3. Neither     — every call is a no-op with a warning log, so the app
 *                   behaves identically to running with no email configured.
 *
 * Rules:
 *  - Never throws. A booking action must never fail because the provider had a blip.
 *  - Never blocks the HTTP response. Callers fire-and-forget (void + catch).
 *  - One 500 ms retry, then log and swallow.
 */

import sgMail from '@sendgrid/mail';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

type Provider = 'gmail' | 'sendgrid' | 'none';

const provider: Provider =
  env.GMAIL_USER && env.GMAIL_APP_PASSWORD
    ? 'gmail'
    : env.SENDGRID_API_KEY
      ? 'sendgrid'
      : 'none';

const fromName = env.SENDGRID_FROM_NAME;
const fromEmail =
  provider === 'gmail'
    ? env.GMAIL_FROM_EMAIL ?? env.GMAIL_USER!
    : env.SENDGRID_FROM_EMAIL;

let gmailTransport: Transporter | null = null;

if (provider === 'gmail') {
  gmailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.GMAIL_USER!, pass: env.GMAIL_APP_PASSWORD! },
  });
  logger.info('Email provider: Google SMTP (Gmail).');
} else if (provider === 'sendgrid') {
  sgMail.setApiKey(env.SENDGRID_API_KEY!);
  logger.info('Email provider: SendGrid.');
} else {
  logger.warn('No email provider configured (set GMAIL_USER + GMAIL_APP_PASSWORD, or SENDGRID_API_KEY) — emails will be skipped.');
}

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

async function deliver({ to, subject, html }: SendArgs): Promise<void> {
  if (provider === 'gmail') {
    await gmailTransport!.sendMail({
      to,
      from: `${fromName} <${fromEmail}>`,
      subject,
      html,
    });
    return;
  }

  // sendgrid
  await sgMail.send({
    to,
    from: { email: fromEmail!, name: fromName },
    subject,
    html,
  });
}

/**
 * Send a single transactional email. Never throws; logs on failure.
 * Callers should NOT await this in a way that holds up the HTTP response —
 * use the fire-and-forget pattern: `void sendEmail(...).catch(...)`.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (provider === 'none') {
    logger.warn({ to, subject }, 'No email provider configured — email skipped.');
    return;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await deliver({ to, subject, html });
      logger.info({ to, subject, provider }, 'Email sent successfully.');
      return;
    } catch (err) {
      if (attempt === 2) {
        logger.error({ err, to, subject, provider }, 'Failed to send email after retry — swallowing error.');
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
