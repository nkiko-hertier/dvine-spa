import React from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { useBookingConfirmation } from "../lib/helpers";
import { formatDateTime } from "../lib/bookingStatus";

/**
 * Public, unauthenticated page a completed booking's PDF QR code links to
 * (`/booking-confirmation/:id`). Lets a client (or the front desk) verify
 * a confirmation online. Only ever resolves for completed bookings — the
 * backend 404s for anything else, which is treated the same as "not found"
 * here so it can't be used to check on the status of a pending booking.
 */
export default function BookingConfirmation(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useBookingConfirmation(id);

  return (
    <main className="min-h-screen bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-stone-500 block mb-2">
            D'Vine Spa
          </span>
          <h1 className="font-serif text-3xl text-[#1C3A27]">Booking Confirmation</h1>
        </div>

        <div className="bg-[#EFECE6] border border-stone-300/85 shadow-sm p-8">
          {isLoading ? (
            <p className="text-center text-stone-500 italic text-xs py-6">Verifying booking...</p>
          ) : isError || !data ? (
            <div className="text-center space-y-3 py-4">
              <XCircle className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="font-serif text-xl text-[#1C3A27]">Not Found</p>
              <p className="text-xs text-stone-600 leading-relaxed">
                We couldn't verify a completed booking for this code. It may not have been
                completed yet, or the link may be incorrect.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
                <p className="font-serif text-xl text-[#1C3A27]">Visit Completed</p>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">
                  {data.request_reference || data.id.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 border border-stone-300/60 text-xs">
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Client:</span>
                  <span className="font-medium text-[#1C3A27]">{data.customer_name}</span>
                </div>
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Service:</span>
                  <span className="font-medium text-[#1C3A27]">{data.treatment_name}</span>
                </div>
                {data.category_name && (
                  <div className="flex justify-between border-b border-stone-300/50 pb-2">
                    <span className="text-stone-500 uppercase tracking-wider text-[10px]">Category:</span>
                    <span className="font-medium text-[#1C3A27]">{data.category_name}</span>
                  </div>
                )}
                {data.confirmed_date && (
                  <div className="flex justify-between pb-1">
                    <span className="text-stone-500 uppercase tracking-wider text-[10px]">Appointment:</span>
                    <span className="font-medium text-[#1C3A27]">
                      {formatDateTime(data.confirmed_date, data.confirmed_time ?? "")}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-center text-[10px] text-stone-500">
                This confirms a genuine, completed appointment at D'Vine Spa.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-stone-400 mt-6">
          <Link to="/" className="hover:text-stone-600 transition-colors">
            D'Vine Spa — Sanctuary of Beauty &amp; Wellness
          </Link>
        </p>
      </div>
    </main>
  );
}
