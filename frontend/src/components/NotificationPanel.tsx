import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAdminPendingNotifications, useRealtimeNotifications } from "../lib/helpers";
import { STATUS_LABEL, STATUS_CLASS, formatDateTime } from "../lib/bookingStatus";
import BookingActionModal from "./BookingActionModal";
import type { BookingRequest } from "../types";

/**
 * Bell icon + dropdown panel of booking requests still needing attention.
 * By default that means status in [new_request, contacted, confirmed] —
 * see NOTIFICATION_TRACKED_STATUSES in lib/helpers.ts. The list is fetched
 * over REST and kept live by a Socket.IO connection to the backend (see
 * lib/socket.ts / useRealtimeNotifications) — the socket only triggers a
 * refetch, since the raw pg_notify payloads don't carry the customer/
 * treatment names this panel displays.
 */
export default function NotificationPanel(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { connected } = useRealtimeNotifications();
  const { data, isLoading, isError } = useAdminPendingNotifications();

  const notifications = data?.data ?? [];
  const total = data?.meta?.total ?? notifications.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectNotification = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative p-2 text-stone-600 hover:text-[#1C3A27] hover:bg-stone-200/50 transition-colors"
          aria-label="Open notifications"
          title={connected ? "Live updates connected" : "Reconnecting to live updates..."}
        >
          <Bell className="w-5 h-5" />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-700 text-white text-[9px] font-semibold rounded-full leading-none">
              {total > 99 ? "99+" : total}
            </span>
          )}
          {!connected && (
            <span
              className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-stone-400"
              title="Reconnecting to live updates..."
            />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-[#EFECE6] border border-stone-300 shadow-lg z-50 text-xs max-h-[26rem] flex flex-col">
            <div className="px-4 py-3 border-b border-stone-300/65 flex items-center justify-between">
              <p className="font-semibold text-[#1C3A27]">Needs Attention</p>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                {total} pending
              </span>
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <p className="text-center text-stone-500 italic py-8">Loading...</p>
              ) : isError ? (
                <p className="text-center text-red-700 italic py-8">Couldn't load notifications.</p>
              ) : notifications.length === 0 ? (
                <p className="text-center text-stone-500 italic py-8">Nothing needs attention right now.</p>
              ) : (
                <ul className="divide-y divide-stone-300/60">
                  {notifications.map((booking) => (
                    <li key={booking.id}>
                      <button
                        onClick={() => handleSelectNotification(booking)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F8F6F0] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#1C3A27] truncate">{booking.customer.full_name}</span>
                          <span className={`shrink-0 inline-block px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${STATUS_CLASS[booking.status]}`}>
                            {STATUS_LABEL[booking.status]}
                          </span>
                        </div>
                        <p className="text-stone-600 mt-0.5 truncate">{booking.treatment.name}</p>
                        <p className="text-stone-500 mt-0.5">
                          {formatDateTime(booking.preferred_date, booking.preferred_time)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingActionModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </>
  );
}
