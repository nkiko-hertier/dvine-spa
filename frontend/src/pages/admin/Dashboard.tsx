import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import {
  Calendar,
  Eye,
  X,
  Check,
  Ban,
  Users,
  Clock,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ENDPOINTS } from "../../lib/endpoints";
import {
  useDashboardStats,
  useAdminBookingRequests,
} from "../../lib/helpers";
import type { BookingRequest, BookingStatus } from "../../types";

const STATUS_LABEL: Record<BookingStatus, string> = {
  new_request: "New Request",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  new_request: "bg-stone-200 text-stone-700",
  contacted: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-stone-300 text-stone-800",
};

// Booking requests move new_request -> contacted -> confirmed -> completed.
const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  new_request: "contacted",
  contacted: "confirmed",
  confirmed: "completed",
};

function formatDateTime(date: string, time: string): string {
  if (!date) return "—";
  const d = new Date(date);
  const dateStr = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return time ? `${dateStr}, ${time}` : dateStr;
}

export default function Dashboard(): React.ReactElement {
  const queryClient = useQueryClient();

  // Real backend stats
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats();

  // Recent 5 bookings (newest first)
  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError } =
    useAdminBookingRequests({ limit: 5, sort: "-created_at" });

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string>("");

  const handleOpenModal = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setStatusError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
    setStatusError("");
  };

  const handleUpdateStatus = async (booking: BookingRequest, newStatus: BookingStatus) => {
    setStatusError("");
    try {
      await apiClient.patch(
        ENDPOINTS.admin.bookingRequests.updateBookingRequestById(booking.id),
        newStatus === "cancelled"
          ? { status: newStatus, cancellation_reason: "Rejected by management." }
          : { status: newStatus }
      );
      // Keep modal in sync with the updated record
      setSelectedBooking((prev) =>
        prev && prev.id === booking.id ? { ...prev, status: newStatus } : prev
      );
      // Refresh dashboard stats + booking lists
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "list"] });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setStatusError(axiosErr.response?.data?.error?.message || "Failed to update booking status.");
    }
  };

  const recentBookings = bookingsData?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title="Today's Overview"
          subtitle="Welcome back. The sanctuary is active."
        />

        <main className="p-8 space-y-8">
          {/* STATS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 relative overflow-hidden shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Bookings Today
              </span>
              <div className="font-serif text-4xl sm:text-5xl text-[#1C3A27] tracking-tight mb-3">
                {statsLoading ? "—" : statsError ? "N/A" : stats?.todays_bookings ?? 0}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-stone-600 font-medium">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Active client sessions</span>
              </div>
            </div>

            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 relative overflow-hidden shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Pending Requests
              </span>
              <div className="font-serif text-4xl sm:text-5xl text-[#1C3A27] tracking-tight mb-3">
                {statsLoading ? "—" : statsError ? "N/A" : stats?.pending_requests ?? 0}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-medium">
                <Clock className="w-4 h-4" />
                <span>Awaiting review & contact</span>
              </div>
            </div>

            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 relative overflow-hidden shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                New Customers (30d)
              </span>
              <div className="font-serif text-4xl sm:text-5xl text-[#1C3A27] tracking-tight mb-3">
                {statsLoading ? "—" : statsError ? "N/A" : stats?.new_customers_30d ?? 0}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                <Users className="w-4 h-4" />
                <span>Registered in the last 30 days</span>
              </div>
            </div>
          </div>

          {/* SECONDARY STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Confirmed This Week
              </span>
              <div className="font-serif text-3xl text-[#1C3A27] tracking-tight">
                {statsLoading ? "—" : statsError ? "N/A" : stats?.this_week_confirmed ?? 0}
              </div>
            </div>
            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Completed This Month
              </span>
              <div className="font-serif text-3xl text-[#1C3A27] tracking-tight">
                {statsLoading ? "—" : statsError ? "N/A" : stats?.this_month_completed ?? 0}
              </div>
            </div>
            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Top Treatment (30d)
              </span>
              <div className="font-serif text-3xl text-[#1C3A27] tracking-tight truncate">
                {statsLoading ? "—" : statsError || !stats?.top_treatment_30d ? "N/A" : stats.top_treatment_30d.name}
              </div>
              <div className="text-xs text-stone-600 font-light mt-1">
                {stats?.top_treatment_30d?.bookings ?? 0} bookings
              </div>
            </div>
          </div>

          {/* TABLE SECTION: LAST 5 BOOKINGS */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">Recent Bookings</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">Showing the last 5 recorded sanctuary bookings</p>
              </div>
              <a
                href="/dashboard/bookings"
                className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-600 hover:text-[#1C3A27] transition-colors"
              >
                View All Bookings
              </a>
            </div>

            <div className="overflow-x-auto">
              {bookingsLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading bookings...</p>
              ) : bookingsError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load bookings.</p>
              ) : recentBookings.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">No bookings yet.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                      <th className="py-3 px-4 font-semibold">Booking ID</th>
                      <th className="py-3 px-4 font-semibold">Client Name</th>
                      <th className="py-3 px-4 font-semibold">Service</th>
                      <th className="py-3 px-4 font-semibold">Date & Time</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                        <td className="py-4 px-4 font-medium text-stone-500">
                          {booking.request_reference || booking.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-4 font-semibold">{booking.customer.full_name}</td>
                        <td className="py-4 px-4 text-stone-700">{booking.treatment.name}</td>
                        <td className="py-4 px-4 text-stone-600 font-light">
                          {formatDateTime(booking.preferred_date, booking.preferred_time)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${STATUS_CLASS[booking.status]}`}>
                            {STATUS_LABEL[booking.status]}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleOpenModal(booking)}
                            className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="View Submission Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* BOOKING DETAILS & ACTION MODAL */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Booking Submission
                </span>
                <h3 className="font-serif text-xl">{selectedBooking.request_reference || selectedBooking.id.slice(0, 8).toUpperCase()}</h3>
              </div>
              <button onClick={handleCloseModal} className="text-stone-300 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Client Name</span>
                  <span className="font-semibold text-[#1C3A27] text-sm">{selectedBooking.customer.full_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Status</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${STATUS_CLASS[selectedBooking.status]}`}>
                    {STATUS_LABEL[selectedBooking.status]}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Phone Number:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedBooking.customer.phone_number}</span>
                </div>
                {selectedBooking.customer.whatsapp_number && (
                  <div className="flex justify-between border-b border-stone-300/50 pb-2">
                    <span className="text-stone-500 uppercase tracking-wider text-[10px]">WhatsApp:</span>
                    <span className="font-medium text-[#1C3A27]">{selectedBooking.customer.whatsapp_number}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Requested Service:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedBooking.treatment.name}</span>
                </div>
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Scheduled Time:</span>
                  <span className="font-medium text-[#1C3A27]">
                    {formatDateTime(selectedBooking.preferred_date, selectedBooking.preferred_time)}
                  </span>
                </div>
                {selectedBooking.confirmed_date && (
                  <div className="flex justify-between pb-1">
                    <span className="text-stone-500 uppercase tracking-wider text-[10px]">Confirmed For:</span>
                    <span className="font-medium text-[#1C3A27]">
                      {formatDateTime(selectedBooking.confirmed_date, selectedBooking.confirmed_time ?? "")}
                    </span>
                  </div>
                )}
              </div>

              {selectedBooking.staff_notes && (
                <div className="bg-[#F8F6F0] p-4 border border-stone-300/60">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Staff Notes</span>
                  <p className="text-stone-700 italic font-light">{selectedBooking.staff_notes}</p>
                </div>
              )}

              {statusError && (
                <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{statusError}</p>
              )}
            </div>

            <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-between">
              {selectedBooking.status === "confirmed" ||
              selectedBooking.status === "completed" ||
              selectedBooking.status === "cancelled" ||
              selectedBooking.status === "no_show" ? (
                <div className="w-full flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedBooking, NEXT_STATUS[selectedBooking.status] ?? "confirmed")}
                      className="inline-flex items-center space-x-1 bg-emerald-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-emerald-800 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Advance</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedBooking, "cancelled")}
                      className="inline-flex items-center space-x-1 bg-red-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-red-800 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCloseModal}
                    className="bg-stone-300 text-stone-800 px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}