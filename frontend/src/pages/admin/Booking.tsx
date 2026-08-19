import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import {
  Eye,
  X,
  Check,
  Ban,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ENDPOINTS } from "../../lib/endpoints";
import {
  useAdminBookingRequests,
  useAdminTreatments,
} from "../../lib/helpers";
import type { BookingRequest, BookingStatus, BookingRequestUpdateInput } from "../../types";

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

// Requests can only move forward: new_request -> contacted -> confirmed -> completed.
const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  new_request: "contacted",
  contacted: "confirmed",
  confirmed: "completed",
};

const CANCEL_REASON = "Cancelled by management.";

function formatDateTime(date: string, time: string): string {
  if (!date) return "—";
  const d = new Date(date);
  const dateStr = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return time ? `${dateStr}, ${time}` : dateStr;
}

export default function DashboardBookings(): React.ReactElement {
  const queryClient = useQueryClient();

  // Real paginated bookings from backend
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const itemsPerPage = 10;

  const { data: bookingsData, isLoading, isError } = useAdminBookingRequests({
    page,
    limit: itemsPerPage,
    search: searchQuery || undefined,
    sort: "-created_at",
  });

  // Treatments for the manual create modal (real catalog)
  const { data: treatmentsData } = useAdminTreatments({ limit: 100, is_active: true });

  // View Modal State
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // New Booking Modal State (uses the public create endpoint)
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newWhatsapp, setNewWhatsapp] = useState<string>("");
  const [newTreatmentId, setNewTreatmentId] = useState<string>("");
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [createError, setCreateError] = useState<string>("");

  const treatments = treatmentsData?.data ?? [];

  const handleOpenViewModal = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setStatusError("");
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedBooking(null);
    setStatusError("");
  };

  const handleUpdateStatus = async (booking: BookingRequest, newStatus: BookingStatus) => {
    setStatusError("");
    setIsUpdating(true);
    try {
      const body: BookingRequestUpdateInput =
        newStatus === "cancelled"
          ? { status: newStatus, cancellation_reason: CANCEL_REASON }
          : { status: newStatus };

      await apiClient.patch(
        ENDPOINTS.admin.bookingRequests.updateBookingRequestById(booking.id),
        body
      );
      // Keep modal in sync
      setSelectedBooking((prev) =>
        prev && prev.id === booking.id ? { ...prev, status: newStatus } : prev
      );
      // Refresh lists + dashboard stats
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "detail", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "list"] });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setStatusError(axiosErr.response?.data?.error?.message || "Failed to update booking status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!newClientName || !newPhone || !newDate || !newTime || !newTreatmentId) {
      setCreateError("Please fill in all required fields.");
      return;
    }

    try {
      // Public create endpoint — no auth required, creates customer + booking request.
      await apiClient.post(ENDPOINTS.public.bookingRequests.createBookingRequest(), {
        full_name: newClientName,
        phone_number: newPhone,
        whatsapp_number: newWhatsapp || undefined,
        treatment_id: newTreatmentId,
        preferred_date: newDate,
        preferred_time: newTime,
        channel: "website",
        notes: newNotes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "list"] });
      setIsNewModalOpen(false);
      setNewClientName("");
      setNewPhone("");
      setNewWhatsapp("");
      setNewTreatmentId("");
      setNewDate("");
      setNewTime("");
      setNewNotes("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } } };
      const apiErr = axiosErr.response?.data?.error;
      if (apiErr?.details?.length) {
        setCreateError(apiErr.details.map((d) => d.issue).join(", "));
      } else {
        setCreateError(apiErr?.message || "Failed to create booking. Please try again.");
      }
    }
  };

  const currentTableData = bookingsData?.data ?? [];
  const total = bookingsData?.meta?.total ?? 0;
  const totalPages = bookingsData?.meta?.total_pages ?? 1;

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title="Sanctuary Bookings"
          subtitle="Manage all client reservations, statuses, and manual entries."
        />

        <main className="p-8 space-y-8">
          {/* ACTIONS & SEARCH BAR HEADER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#EFECE6] p-4 sm:p-6 border border-stone-300/85 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by ID, client name, service, status..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
              />
            </div>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-[#1C3A27] text-[#F8F6F0] px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
            >
              <span className="text-lg leading-none mr-1">+</span>
              <span>New Booking</span>
            </button>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">All Submitted Bookings</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">
                  Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} total entries
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading bookings...</p>
              ) : isError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load bookings.</p>
              ) : currentTableData.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">No bookings found matching your search criteria.</p>
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
                    {currentTableData.map((booking) => (
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
                            onClick={() => handleOpenViewModal(booking)}
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

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-300/60 text-xs">
                <span className="text-stone-600 font-light">
                  Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* VIEW BOOKING DETAILS & ACTION MODAL */}
      {isViewModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Booking Submission Details
                </span>
                <h3 className="font-serif text-xl">{selectedBooking.request_reference || selectedBooking.id.slice(0, 8).toUpperCase()}</h3>
              </div>
              <button onClick={handleCloseViewModal} className="text-stone-300 hover:text-white transition-colors p-1">
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
                    onClick={handleCloseViewModal}
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
                      disabled={isUpdating}
                      className="inline-flex items-center space-x-1 bg-emerald-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isUpdating ? "Saving..." : "Advance"}</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedBooking, "cancelled")}
                      disabled={isUpdating}
                      className="inline-flex items-center space-x-1 bg-red-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-red-800 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCloseViewModal}
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

      {/* NEW MANUAL BOOKING MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Sanctuary Administration
                </span>
                <h3 className="font-serif text-xl">Create Manual Booking</h3>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-stone-300 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit}>
              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diane Uwase"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+250 788 000 000"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+250 788 000 000"
                      value={newWhatsapp}
                      onChange={(e) => setNewWhatsapp(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Select Service *</label>
                  <select
                    value={newTreatmentId}
                    onChange={(e) => setNewTreatmentId(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  >
                    <option value="">Choose a treatment...</option>
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — RWF {Number(t.price).toLocaleString()} ({t.duration_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Preferred Date *</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Preferred Time *</label>
                    <select
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                    >
                      <option value="">Select time</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="18:00">06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Special Notes / Preferences</label>
                  <textarea
                    rows={2}
                    placeholder="Any specific instructions or therapist requests..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>

                {createError && (
                  <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{createError}</p>
                )}
              </div>

              <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="bg-stone-300 text-stone-800 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}