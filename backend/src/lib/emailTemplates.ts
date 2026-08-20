/**
 * emailTemplates.ts — pure template functions, one per email in the plan.
 *
 * Design: cream (#F8F6F0) background, deep green (#1C3A27) header, matching
 * the live site's About/Booking/Contact pages exactly.
 * Google Fonts @font-face is a progressive enhancement; Georgia/Helvetica
 * are the safe fallbacks for clients that don't render web fonts.
 *
 * Each function returns { subject, html }. No send logic lives here.
 */

import { env } from '../config/env.js';

// ────────────────────────────────────────────────────────────
// Shared base layout
// ────────────────────────────────────────────────────────────

function baseLayout(headingText: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headingText}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Work+Sans:wght@400;500;600&display=swap');

    body {
      margin: 0;
      padding: 0;
      background-color: #F0EDE6;
      font-family: 'Work Sans', Helvetica, Arial, sans-serif;
      color: #1C3A27;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 32px auto;
      background-color: #F8F6F0;
      border: 1px solid #D9D5CC;
    }
    .header {
      background-color: #1C3A27;
      padding: 28px 40px;
      text-align: center;
    }
    .header-wordmark {
      font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
      font-size: 26px;
      font-weight: 600;
      color: #F8F6F0;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .header-tagline {
      font-size: 11px;
      color: #9DC4A8;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin: 6px 0 0;
    }
    .body {
      padding: 36px 40px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
      font-size: 22px;
      font-weight: 600;
      color: #1C3A27;
      margin: 0 0 18px;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.7;
      color: #2E4A38;
      margin: 0 0 14px;
    }
    .detail-box {
      background-color: #EEE9DF;
      border-left: 3px solid #1C3A27;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 13px;
      line-height: 1.8;
    }
    .detail-box strong {
      color: #1C3A27;
    }
    .ref-badge {
      display: inline-block;
      background-color: #1C3A27;
      color: #F8F6F0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      margin: 2px 0 4px;
    }
    .cta-btn {
      display: inline-block;
      background-color: #1C3A27;
      color: #F8F6F0 !important;
      text-decoration: none;
      font-family: 'Work Sans', Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 13px 28px;
      margin: 20px 0 8px;
    }
    .divider {
      border: none;
      border-top: 1px solid #D9D5CC;
      margin: 24px 0;
    }
    .footer {
      background-color: #EEE9DF;
      padding: 20px 40px;
      text-align: center;
      font-size: 11px;
      color: #6B7C6B;
      line-height: 1.6;
    }
    .footer a {
      color: #1C3A27;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-wordmark">d'Vine Spa</p>
      <p class="header-tagline">Wellness &amp; Serenity · Kigali, Rwanda</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>d'Vine Spa · Kigali, Rwanda<br />
      Questions? Contact us via <a href="https://wa.me/250782867790">WhatsApp</a></p>
      <p style="margin-top:8px;color:#9CA89C;">You received this email because you made a booking with d'Vine Spa.<br />
      This is a transactional notification — no marketing, no unsubscribe needed.</p>
    </div>
  </div>
</body>
</html>`;
}

// ────────────────────────────────────────────────────────────
// Shared type for booking context passed to templates
// ────────────────────────────────────────────────────────────

export interface BookingEmailContext {
  requestReference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  treatmentName: string;
  preferredDate: Date;
  preferredTime: Date | null;
  confirmedDate?: Date | null;
  confirmedTime?: Date | null;
  cancellationReason?: string | null;
  staffNotes?: string | null;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t: Date | null | undefined): string {
  if (!t) return '—';
  return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ────────────────────────────────────────────────────────────
// Email #1 — Booking request received (customer)
// ────────────────────────────────────────────────────────────

export function bookingReceivedCustomer(ctx: BookingEmailContext): { subject: string; html: string } {
  const subject = `We've received your booking request — d'Vine Spa`;

  const body = `
    <h1>Your booking request has been received</h1>
    <p>Dear ${ctx.customerName},</p>
    <p>Thank you for choosing d'Vine Spa. We have received your booking request and our team will be in touch shortly to confirm your appointment.</p>

    <div class="detail-box">
      <strong>Booking Reference</strong><br />
      <span class="ref-badge">${ctx.requestReference}</span><br /><br />
      <strong>Treatment:</strong> ${ctx.treatmentName}<br />
      <strong>Requested Date:</strong> ${formatDate(ctx.preferredDate)}<br />
      <strong>Requested Time:</strong> ${formatTime(ctx.preferredTime)}<br />
      <strong>Contact:</strong> ${ctx.customerPhone}
    </div>

    <p>Please keep your reference number handy — you can use it to track your booking status.</p>
    <p>Our team will contact you via phone or WhatsApp to confirm your slot. If you need to reach us in the meantime, please don't hesitate to get in touch.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#5A6B5A;">We look forward to welcoming you.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #2 — New booking alert (staff)
// ────────────────────────────────────────────────────────────

export function newBookingStaffAlert(
  ctx: BookingEmailContext,
  dashboardUrl: string,
  bookingId: string,
): { subject: string; html: string } {
  const subject = `New booking request — ${ctx.customerName}`;
  const bookingLink = `${dashboardUrl}/bookings/${bookingId}`;

  const body = `
    <h1>New Booking Request</h1>
    <p>A new booking request has just been submitted through the website.</p>

    <div class="detail-box">
      <strong>Reference:</strong> <span class="ref-badge">${ctx.requestReference}</span><br /><br />
      <strong>Customer:</strong> ${ctx.customerName}<br />
      <strong>Phone:</strong> ${ctx.customerPhone}<br />
      ${ctx.customerEmail ? `<strong>Email:</strong> ${ctx.customerEmail}<br />` : ''}
      <strong>Treatment:</strong> ${ctx.treatmentName}<br />
      <strong>Requested Date:</strong> ${formatDate(ctx.preferredDate)}<br />
      <strong>Requested Time:</strong> ${formatTime(ctx.preferredTime)}
    </div>

    <p style="text-align:center;">
      <a href="${bookingLink}" class="cta-btn">Open in Dashboard</a>
    </p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #3 — Booking contacted (customer)
// ────────────────────────────────────────────────────────────

export function bookingContactedCustomer(ctx: BookingEmailContext): { subject: string; html: string } {
  const subject = `We're reaching out about your booking — d'Vine Spa`;

  const body = `
    <h1>We're reaching out</h1>
    <p>Dear ${ctx.customerName},</p>
    <p>Our team is currently reviewing your booking request for <strong>${ctx.treatmentName}</strong>. We will be in touch with you very shortly via WhatsApp or phone to confirm your appointment slot.</p>

    <div class="detail-box">
      <strong>Booking Reference:</strong> <span class="ref-badge">${ctx.requestReference}</span><br /><br />
      <strong>Treatment:</strong> ${ctx.treatmentName}<br />
      <strong>Requested Date:</strong> ${formatDate(ctx.preferredDate)}<br />
      <strong>Requested Time:</strong> ${formatTime(ctx.preferredTime)}
    </div>

    <p>If you have any questions before we reach you, feel free to contact us directly on WhatsApp.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #4 — Booking confirmed (customer)
// ────────────────────────────────────────────────────────────

export function bookingConfirmedCustomer(ctx: BookingEmailContext): { subject: string; html: string } {
  const dateLabel = ctx.confirmedDate ? formatDate(ctx.confirmedDate) : formatDate(ctx.preferredDate);
  const timeLabel = ctx.confirmedTime ? formatTime(ctx.confirmedTime) : formatTime(ctx.preferredTime);
  const subject = `Your booking is confirmed — ${dateLabel} at ${timeLabel}`;

  const body = `
    <h1>Your booking is confirmed ✓</h1>
    <p>Dear ${ctx.customerName},</p>
    <p>We're pleased to confirm your appointment at d'Vine Spa. We look forward to welcoming you.</p>

    <div class="detail-box">
      <strong>Booking Reference:</strong> <span class="ref-badge">${ctx.requestReference}</span><br /><br />
      <strong>Treatment:</strong> ${ctx.treatmentName}<br />
      <strong style="font-size:15px;">Date:</strong> <span style="font-size:15px;color:#1C3A27;">${dateLabel}</span><br />
      <strong style="font-size:15px;">Time:</strong> <span style="font-size:15px;color:#1C3A27;">${timeLabel}</span>
    </div>

    <p>Please arrive a few minutes early so you can relax before your treatment begins.</p>
    <p>If you need to cancel or reschedule, please let us know as soon as possible via WhatsApp or by calling us directly.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#5A6B5A;">We look forward to seeing you soon.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #5 — Booking completed — thank you + review ask (customer)
// ────────────────────────────────────────────────────────────

export function bookingCompletedCustomer(ctx: BookingEmailContext): { subject: string; html: string } {
  const subject = `Thank you for visiting d'Vine Spa`;

  const reviewCta =
    env.REVIEW_LINK_URL
      ? `<hr class="divider" />
         <p style="text-align:center;font-size:13px;">Enjoyed your visit? We'd love to hear from you.</p>
         <p style="text-align:center;">
           <a href="${env.REVIEW_LINK_URL}" class="cta-btn">Leave Us a Review</a>
         </p>`
      : '';

  const body = `
    <h1>Thank you for visiting us</h1>
    <p>Dear ${ctx.customerName},</p>
    <p>It was a pleasure having you at d'Vine Spa. We hope you thoroughly enjoyed your <strong>${ctx.treatmentName}</strong> and left feeling refreshed and renewed.</p>
    <p>Your wellbeing is at the heart of everything we do, and we'd love to welcome you back whenever you're ready for another moment of calm.</p>

    ${reviewCta}

    <hr class="divider" />
    <p style="font-size:13px;color:#5A6B5A;">We hope to see you again soon.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #6 — Booking cancelled (customer)
// ────────────────────────────────────────────────────────────

export function bookingCancelledCustomer(ctx: BookingEmailContext): { subject: string; html: string } {
  const subject = `Your booking has been cancelled — d'Vine Spa`;

  const reasonBlock = ctx.cancellationReason
    ? `<p><strong>Reason:</strong> ${ctx.cancellationReason}</p>`
    : '';

  const body = `
    <h1>Booking cancellation</h1>
    <p>Dear ${ctx.customerName},</p>
    <p>We're writing to let you know that your booking request has been cancelled.</p>

    <div class="detail-box">
      <strong>Booking Reference:</strong> <span class="ref-badge">${ctx.requestReference}</span><br /><br />
      <strong>Treatment:</strong> ${ctx.treatmentName}<br />
      ${reasonBlock}
    </div>

    <p>If this was unexpected or if you'd like to make a new booking, we'd be happy to help. Please reach out via WhatsApp or visit our website to submit a new request.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#5A6B5A;">We hope to welcome you at d'Vine Spa soon.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #7 — Booking no-show (customer)
// ────────────────────────────────────────────────────────────

export function bookingNoShowCustomer(ctx: BookingEmailContext): { subject: string; html: string } {
  const subject = `About your recent booking — d'Vine Spa`;

  const body = `
    <h1>We missed you</h1>
    <p>Dear ${ctx.customerName},</p>
    <p>It looks like we weren't able to connect for your appointment. We understand that things come up, and there are no hard feelings.</p>

    <div class="detail-box">
      <strong>Booking Reference:</strong> <span class="ref-badge">${ctx.requestReference}</span><br /><br />
      <strong>Treatment:</strong> ${ctx.treatmentName}<br />
      <strong>Date:</strong> ${formatDate(ctx.preferredDate)}
    </div>

    <p>Whenever you're ready, we'd love to welcome you at d'Vine Spa. Please feel free to submit a new booking request at your convenience.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#5A6B5A;">We hope to see you soon.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}

// ────────────────────────────────────────────────────────────
// Email #8 — Staff invited (staff member)
// ────────────────────────────────────────────────────────────

export function staffInvited(
  staffName: string,
  role: string,
  inviteUrl: string,
): { subject: string; html: string } {
  const subject = `You've been invited to the d'Vine Spa dashboard`;

  const body = `
    <h1>Welcome to the team</h1>
    <p>Dear ${staffName},</p>
    <p>You've been invited to join the d'Vine Spa staff dashboard as <strong>${role}</strong>.</p>
    <p>Click the button below to accept your invitation and set up your account. The link is valid for a limited time.</p>

    <p style="text-align:center;">
      <a href="${inviteUrl}" class="cta-btn">Accept Invitation</a>
    </p>

    <hr class="divider" />
    <p style="font-size:13px;color:#5A6B5A;">If you didn't expect this invitation, you can safely ignore this email.</p>
  `;

  return { subject, html: baseLayout(subject, body) };
}
