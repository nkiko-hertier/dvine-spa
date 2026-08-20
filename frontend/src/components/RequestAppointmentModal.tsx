import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { ENDPOINTS } from "../lib/endpoints";
import { useAdminTreatments } from "../lib/helpers";
import { TIME_OPTIONS } from "../lib/bookingStatus";
import type { CustomerDetail } from "../types";

interface RequestAppointmentModalProps {
  onClose: () => void;
  /**
   * When opened from a customer's detail page, pre-fills name/phone/
   * email/whatsapp and — if the customer has booking history — selects
   * their most-booked treatment automatically (see
   * `most_common_treatment` from GET /admin/customers/:id).
   */
  customer?: CustomerDetail | null;
}

/**
 * "Request Appointment" form — the same public POST /booking-requests
 * endpoint the website's own booking page uses (it upserts the customer
 * by phone number, so re-booking an existing client just adds a new
 * request against their existing record rather than duplicating them).
 *
 * Used by the customer detail page's "Add Appointment" button. Kept
 * separate from the ad-hoc "Create Manual Booking" modal in
 * pages/admin/Booking.tsx (that one didn't need to support pre-fill).
 */
export default function RequestAppointmentModal({
  onClose,
  customer = null,
}: RequestAppointmentModalProps): React.ReactElement {
  const queryClient = useQueryClient();

  const { data: treatmentsData } = useAdminTreatments({ limit: 100, is_active: true });
  const treatments = treatmentsData?.data ?? [];

  const [fullName, setFullName] = useState<string>(customer?.full_name ?? "");
  const [phone, setPhone] = useState<string>(customer?.phone_number ?? "");
  const [whatsapp, setWhatsapp] = useState<string>(customer?.whatsapp_number ?? "");
  const [email, setEmail] = useState<string>(customer?.email ?? "");
  const [treatmentId, setTreatmentId] = useState<string>(customer?.most_common_treatment?.id ?? "");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const suggestedTreatment = customer?.most_common_treatment;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName || !phone || !date || !time || !treatmentId) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.public.bookingRequests.createBookingRequest(), {
        full_name: fullName,
        phone_number: phone,
        whatsapp_number: whatsapp || undefined,
        email: email || undefined,
        treatment_id: treatmentId,
        preferred_date: date,
        preferred_time: time,
        channel: "website",
        notes: notes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setIsSubmitted(true);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } };
      };
      const apiErr = axiosErr.response?.data?.error;
      if (apiErr?.details?.length) {
        setError(apiErr.details.map((d) => d.issue).join(", "));
      } else {
        setError(apiErr?.message || "Failed to create the appointment request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif] max-h-[90vh] overflow-y-auto">
        <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between sticky top-0">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
              Sanctuary Administration
            </span>
            <h3 className="font-serif text-xl">
              {customer ? `Request Appointment — ${customer.full_name}` : "Request Appointment"}
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-4">
            <p className="font-serif text-xl text-[#1C3A27]">Appointment requested.</p>
            <p className="text-xs text-stone-600">
              The request has been added to the pipeline and will show up under Bookings.
            </p>
            <button
              onClick={onClose}
              className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 text-xs">
              {suggestedTreatment && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-[11px]">
                  Pre-filled with <span className="font-semibold">{suggestedTreatment.name}</span> — this
                  client's most-booked service ({suggestedTreatment.times_booked}× booked).
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diane Uwase"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!customer}
                    placeholder="+250 788 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27] disabled:opacity-60"
                  />
                  {customer && (
                    <p className="text-[9px] text-stone-500">Locked — this is the client's record key.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+250 788 000 000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Select Service *
                </label>
                <select
                  required
                  value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                >
                  <option value="">Choose a treatment...</option>
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — RWF {Number(t.price).toLocaleString()} ({t.duration_minutes} min)
                      {suggestedTreatment?.id === t.id ? " ★ most booked" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                    Preferred Time *
                  </label>
                  <select
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  >
                    <option value="">Select time</option>
                    {TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Special Notes / Preferences
                </label>
                <textarea
                  rows={2}
                  placeholder="Any specific instructions or therapist requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              </div>

              {error && <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{error}</p>}
            </div>

            <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-stone-300 text-stone-800 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Request Appointment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
