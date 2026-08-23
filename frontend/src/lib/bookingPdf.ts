import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { BookingRequest } from "../types";
import { STATUS_LABEL, formatDateTime } from "./bookingStatus";

/**
 * Generates and downloads a PDF booking confirmation for a given booking.
 * Includes the booking ID/reference as evidence, client details, service
 * details, scheduled time, and status.
 *
 * Only completed bookings get a verification QR code (linking to the
 * public /booking-confirmation/:id page) — see the Download button, which
 * is only ever rendered for completed bookings in the first place. This
 * function still guards on status itself so it degrades gracefully if
 * ever called for a booking in another state.
 */
export async function downloadBookingConfirmationPdf(booking: BookingRequest): Promise<void> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // --- Header band ---
  doc.setFillColor(28, 58, 39); // #1C3A27
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(248, 246, 240); // #F8F6F0
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("D'VINE SPA", margin, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Booking Confirmation", margin, 30);

  // --- Booking reference / ID ---
  const bookingRef = booking.request_reference || booking.id.slice(0, 8).toUpperCase();
  doc.setTextColor(28, 58, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Booking ID: ${bookingRef}`, margin, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108); // stone-500
  doc.text(`Internal ID: ${booking.id}`, margin, 62);

  // --- Divider ---
  doc.setDrawColor(214, 211, 209); // stone-300
  doc.setLineWidth(0.5);
  doc.line(margin, 68, pageWidth - margin, 68);

  // --- Client details ---
  let y = 80;
  doc.setTextColor(28, 58, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Client Details", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  doc.text(`Name: ${booking.customer.full_name}`, margin, y);
  y += 6;
  doc.text(`Phone: ${booking.customer.phone_number}`, margin, y);
  y += 6;
  if (booking.customer.whatsapp_number) {
    doc.text(`WhatsApp: ${booking.customer.whatsapp_number}`, margin, y);
    y += 6;
  }
  if (booking.customer.email) {
    doc.text(`Email: ${booking.customer.email}`, margin, y);
    y += 6;
  }

  y += 6;

  // --- Service details ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Service Details", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  doc.text(`Service: ${booking.treatment.name}`, margin, y);
  y += 6;
  doc.text(`Price: RWF ${Number(booking.treatment.price).toLocaleString()}`, margin, y);
  y += 6;
  doc.text(`Duration: ${booking.treatment.duration_minutes} minutes`, margin, y);
  y += 6;
  if (booking.treatment.category_name) {
    doc.text(`Category: ${booking.treatment.category_name}`, margin, y);
    y += 6;
  }

  y += 6;

  // --- Schedule details ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Schedule", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  doc.text(`Preferred: ${formatDateTime(booking.preferred_date, booking.preferred_time)}`, margin, y);
  y += 6;
  if (booking.confirmed_date) {
    doc.text(
      `Confirmed: ${formatDateTime(booking.confirmed_date, booking.confirmed_time ?? "")}`,
      margin,
      y
    );
    y += 6;
  }

  y += 6;

  // --- Status ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Status", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(STATUS_LABEL[booking.status], margin, y);

  if (booking.staff_notes) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Staff Notes", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const notesLines = doc.splitTextToSize(booking.staff_notes, contentWidth);
    doc.text(notesLines, margin, y);
  }

  // --- Verification QR code (completed bookings only) — links to the
  // public /booking-confirmation/:id page so the client (or front desk)
  // can verify this confirmation online.
  const pageHeight = doc.internal.pageSize.getHeight();
  if (booking.status === "completed") {
    const confirmationUrl = `${window.location.origin}/booking-confirmation/${booking.id}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(confirmationUrl, {
        margin: 1,
        width: 200,
        color: { dark: "#1C3A27", light: "#F8F6F0" },
      });
      const qrSize = 28;
      const qrX = pageWidth - margin - qrSize;
      const qrY = pageHeight - 30 - qrSize - 6;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 113, 108);
      doc.text("Scan to verify", qrX, qrY + qrSize + 4, { align: "left" });
    } catch {
      // If QR generation fails for any reason, the PDF still downloads —
      // just without the verification code.
    }
  }

  // --- Footer ---
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text("D'Vine Spa — Sanctuary of Beauty & Wellness", margin, pageHeight - 22);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    margin,
    pageHeight - 16
  );
  doc.text(`Booking ID: ${bookingRef}`, margin, pageHeight - 10);

  // --- Save ---
  const safeName = booking.customer.full_name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`dvine_spa_booking_${bookingRef}_${safeName}.pdf`);
}