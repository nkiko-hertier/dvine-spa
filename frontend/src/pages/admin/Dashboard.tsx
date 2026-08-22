import React, { useState, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import BookingActionModal from "../../components/BookingActionModal";
import { Calendar, Eye, Users, Clock, Download } from "lucide-react";
import {
  useDashboardStats,
  useAdminBookingRequests,
  useAdminCustomers,
} from "../../lib/helpers";
import { STATUS_LABEL, STATUS_CLASS, formatDateTime } from "../../lib/bookingStatus";
import { downloadBookingConfirmationPdf } from "../../lib/bookingPdf";
import type { BookingRequest } from "../../types";

type ClientFilter = "all" | "new" | "repeating";

export default function Dashboard(): React.ReactElement {
  // Real backend stats
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats();

  // Recent 5 bookings (newest first)
  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError } =
    useAdminBookingRequests({ limit: 5, sort: "-created_at" });

  // All customers — used to determine new vs repeating client
  const { data: customersData, isError: customersError } = useAdminCustomers({ limit: 100, sort: "-customerSince" });

  // Client type filter
  const [clientFilter, setClientFilter] = useState<ClientFilter>("all");

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);

  const handleOpenModal = (booking: BookingRequest) => setSelectedBooking(booking);
  const handleCloseModal = () => setSelectedBooking(null);

  const recentBookings = bookingsData?.data ?? [];

  // Build a lookup map: customer_id -> total_requests
  const customerRequestCounts = useMemo(() => {
    const map = new Map<string, number>();
    (customersData?.data ?? []).forEach((c) => {
      map.set(c.id, c.total_requests ?? 0);
    });
    return map;
  }, [customersData]);

  // Determine if a booking's client is new (first request) or repeating.
  // If customer data failed to load, fall back to "unknown" classification.
  const isNewClient = (booking: BookingRequest): boolean => {
    if (customersError) return false; // can't determine — treat as repeating to avoid false "new" labels
    const count = customerRequestCounts.get(booking.customer.id) ?? 0;
    return count <= 1;
  };

  // Apply client type filter
  const filteredBookings = useMemo(() => {
    if (clientFilter === "all") return recentBookings;
    return recentBookings.filter((b) =>
      clientFilter === "new" ? isNewClient(b) : !isNewClient(b)
    );
  }, [recentBookings, clientFilter, customerRequestCounts]);

  const handleDownloadPdf = (booking: BookingRequest) => {
    downloadBookingConfirmationPdf(booking);
  };

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
              <div className="flex items-center gap-4">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value as ClientFilter)}
                  className="p-2 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                >
                  <option value="all">All Clients</option>
                  <option value="new">New Clients</option>
                  <option value="repeating">Repeating Clients</option>
                </select>
                <a
                  href="/dashboard/bookings"
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-600 hover:text-[#1C3A27] transition-colors"
                >
                  View All Bookings
                </a>
              </div>
            </div>

            <div className="overflow-x-auto">
              {bookingsLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading bookings...</p>
              ) : bookingsError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load bookings.</p>
              ) : filteredBookings.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">
                  {clientFilter === "all"
                    ? "No bookings yet."
                    : clientFilter === "new"
                    ? "No new client bookings found."
                    : "No repeating client bookings found."}
                </p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                      <th className="py-3 px-4 font-semibold">Booking ID</th>
                      <th className="py-3 px-4 font-semibold">Client Name</th>
                      <th className="py-3 px-4 font-semibold">Client Type</th>
                      <th className="py-3 px-4 font-semibold">Service</th>
                      <th className="py-3 px-4 font-semibold">Date & Time</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                        <td className="py-4 px-4 font-medium text-stone-500">
                          {booking.request_reference || booking.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-4 font-semibold">{booking.customer.full_name}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${
                              isNewClient(booking)
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {isNewClient(booking) ? "New" : "Repeating"}
                          </span>
                        </td>
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
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownloadPdf(booking)}
                              className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                              title="Download Booking Confirmation (PDF)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal(booking)}
                              className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                              title="View Submission Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
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
      {selectedBooking && <BookingActionModal booking={selectedBooking} onClose={handleCloseModal} />}
    </div>
  );
}