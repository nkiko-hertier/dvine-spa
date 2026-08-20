import React, { useState, useEffect } from "react";
import { X, Check, Ban, ArrowRight } from "lucide-react";
import { useUpdateBookingRequest } from "../lib/helpers";
import {
  STATUS_LABEL,
  STATUS_CLASS,
  NEXT_STATUS,
  ADVANCE_LABEL,
  CANCEL_REASON,
  isTerminalStatus,
  formatDateTime,
  toDateInputValue,
  toTimeInputValue,
  TIME_OPTIONS,
} from "../lib/bookingStatus";
import type { BookingRequest } from "../types";

interface BookingActionModalProps {
  booking: BookingRequest;
  onClose: () => void;
}

/**
 * View details + advance/reject a booking request. Used by the Dashboard
 * and Bookings admin pages, and by the notification panel, so the Advance
 * button's behavior (label, the confirmed-date/time step) only lives in
 * one place.
 */
export default function BookingActionModal({
  booking: initialBooking,
  onClose,
}: BookingActionModalProps): React.ReactElement {
  const [booking, setBooking] = useState<BookingRequest>(initialBooking);
  const [statusError, setStatusError] = useState<string>("");

  // The "mark as confirmed" sub-step — only shown when advancing
  // contacted -> confirmed, since that's the one transition that needs
  // extra input (confirmed date/time) rather than a plain status bump.
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [confirmedDate, setConfirmedDate] = useState<string>("");
  const [confirmedTime, setConfirmedTime] = useState<string>("");
  const [useCustomerChoice, setUseCustomerChoice] = useState<boolean>(false);

  const updateBookingRequest = useUpdateBookingRequest(booking.id);
  const isUpdating = updateBookingRequest.isPending;

  // Reset local view state whenever a different booking is opened.
  useEffect(() => {
    setBooking(initialBooking);
    setStatusError("");
    setShowConfirmForm(false);
    setConfirmedDate("");
    setConfirmedTime("");
    setUseCustomerChoice(false);
  }, [initialBooking]);

  const handleUseCustomerChoiceToggle = (checked: boolean) => {
    setUseCustomerChoice(checked);
    if (checked) {
      setConfirmedDate(toDateInputValue(booking.preferred_date));
      setConfirmedTime(toTimeInputValue(booking.preferred_time));
    }
  };

  const runUpdate = async (
    newStatus: BookingRequest["status"],
    extra?: { confirmed_date?: string; confirmed_time?: string; cancellation_reason?: string }
  ) => {
    setStatusError("");
    try {
      const updated = await updateBookingRequest.mutateAsync({ status: newStatus, ...extra });
      setBooking((prev) => ({ ...prev, ...updated }));
      setShowConfirmForm(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setStatusError(axiosErr.response?.data?.error?.message || "Failed to update booking status.");
    }
  };

  const handleAdvanceClick = () => {
    const next = NEXT_STATUS[booking.status];
    if (!next) return;

    if (next === "confirmed") {
      // Needs confirmed date/time first — show the sub-form instead of
      // updating immediately.
      setStatusError("");
      setShowConfirmForm(true);
      return;
    }

    void runUpdate(next);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedDate || !confirmedTime) {
      setStatusError("Please provide both a confirmed date and time.");
      return;
    }
    void runUpdate("confirmed", { confirmed_date: confirmedDate, confirmed_time: confirmedTime });
  };

  const handleReject = () => {
    void runUpdate("cancelled", { cancellation_reason: CANCEL_REASON });
  };

  const advanceLabel = ADVANCE_LABEL[booking.status];
  const showActions = !isTerminalStatus(booking.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
        <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
              Booking Submission Details
            </span>
            <h3 className="font-serif text-xl">{booking.request_reference || booking.id.slice(0, 8).toUpperCase()}</h3>
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-[#F8F6F0] p-4 border border-stone-300/60">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Client Name</span>
              <span className="font-semibold text-[#1C3A27] text-sm">{booking.customer.full_name}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Status</span>
              <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${STATUS_CLASS[booking.status]}`}>
                {STATUS_LABEL[booking.status]}
              </span>
            </div>
          </div>

          <div className="space-y-3 bg-[#F8F6F0] p-4 border border-stone-300/60">
            <div className="flex justify-between border-b border-stone-300/50 pb-2">
              <span className="text-stone-500 uppercase tracking-wider text-[10px]">Phone Number:</span>
              <span className="font-medium text-[#1C3A27]">{booking.customer.phone_number}</span>
            </div>
            {booking.customer.whatsapp_number && (
              <div className="flex justify-between border-b border-stone-300/50 pb-2">
                <span className="text-stone-500 uppercase tracking-wider text-[10px]">WhatsApp:</span>
                <span className="font-medium text-[#1C3A27]">{booking.customer.whatsapp_number}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-stone-300/50 pb-2">
              <span className="text-stone-500 uppercase tracking-wider text-[10px]">Requested Service:</span>
              <span className="font-medium text-[#1C3A27]">{booking.treatment.name}</span>
            </div>
            <div className="flex justify-between border-b border-stone-300/50 pb-2">
              <span className="text-stone-500 uppercase tracking-wider text-[10px]">Scheduled Time:</span>
              <span className="font-medium text-[#1C3A27]">
                {formatDateTime(booking.preferred_date, booking.preferred_time)}
              </span>
            </div>
            {booking.confirmed_date && (
              <div className="flex justify-between pb-1">
                <span className="text-stone-500 uppercase tracking-wider text-[10px]">Confirmed For:</span>
                <span className="font-medium text-[#1C3A27]">
                  {formatDateTime(booking.confirmed_date, booking.confirmed_time ?? "")}
                </span>
              </div>
            )}
          </div>

          {booking.staff_notes && (
            <div className="bg-[#F8F6F0] p-4 border border-stone-300/60">
              <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Staff Notes</span>
              <p className="text-stone-700 italic font-light">{booking.staff_notes}</p>
            </div>
          )}

          {/* MARK-AS-CONFIRMED SUB-FORM — collects confirmed date/time before the status actually moves to "confirmed" */}
          {showConfirmForm && (
            <form onSubmit={handleConfirmSubmit} className="bg-emerald-50 p-4 border border-emerald-200 space-y-3">
              <span className="block text-[10px] uppercase tracking-wider text-emerald-800 font-semibold">
                Confirm Appointment Time
              </span>

              <label className="flex items-center space-x-2 text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomerChoice}
                  onChange={(e) => handleUseCustomerChoiceToggle(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1C3A27]"
                />
                <span>Use customer choice</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Confirmed Date *</label>
                  <input
                    type="date"
                    required
                    value={confirmedDate}
                    onChange={(e) => setConfirmedDate(e.target.value)}
                    className="w-full p-2 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Confirmed Time *</label>
                  <select
                    required
                    value={confirmedTime}
                    onChange={(e) => setConfirmedTime(e.target.value)}
                    className="w-full p-2 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  >
                    <option value="">Select time</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmForm(false)}
                  className="bg-stone-300 text-stone-800 px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center space-x-1 bg-emerald-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isUpdating ? "Saving..." : "Confirm Booking"}</span>
                </button>
              </div>
            </form>
          )}

          {statusError && (
            <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{statusError}</p>
          )}
        </div>

        <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-between">
          {!showActions ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors"
              >
                Close
              </button>
            </div>
          ) : showConfirmForm ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="bg-stone-300 text-stone-800 px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAdvanceClick}
                  disabled={isUpdating}
                  className="inline-flex items-center space-x-1 bg-emerald-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>{isUpdating ? "Saving..." : advanceLabel}</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={isUpdating}
                  className="inline-flex items-center space-x-1 bg-red-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="bg-stone-300 text-stone-800 px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
