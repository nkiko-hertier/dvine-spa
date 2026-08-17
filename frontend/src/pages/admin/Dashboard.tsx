import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import { TrendingUp, Calendar, Layers, Eye, X, Check, Ban } from "lucide-react";

interface Booking {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  status: "Confirmed" | "Arrived" | "Pending" | "Completed";
  notes?: string;
}

export default function Dashboard(): React.ReactElement {
  const [totalBookingsToday] = useState<number>(24);
  const [totalCategories] = useState<number>(8);
  const [totalSales] = useState<string>("RWF 5,450,000");

  // Initial bookings state so status updates reflect in real-time
  const [recentBookings, setRecentBookings] = useState<Booking[]>([
    { id: "BK-1092", clientName: "Alice Uwase", email: "alice@example.com", phone: "+250 788 123 456", service: "Signature Renewal Massage", date: "Today, 14:00", status: "Confirmed", notes: "Prefers firm pressure and soothing ambient music." },
    { id: "BK-1091", clientName: "Jean Bosco", email: "jean@example.com", phone: "+250 789 987 654", service: "Deep Hydration Facial", date: "Today, 15:30", status: "Arrived", notes: "Allergic to standard lavender essential oils." },
    { id: "BK-1090", clientName: "Chloe Mutesi", email: "chloe@example.com", phone: "+250 783 456 789", service: "Aromatherapy Full Body", date: "Today, 16:45", status: "Pending", notes: "First-time visitor to the sanctuary." },
    { id: "BK-1089", clientName: "Eric Kagame", email: "eric@example.com", phone: "+250 782 333 444", service: "Hot Stone Therapy", date: "Yesterday, 11:00", status: "Completed", notes: "Requested locker near the garden entrance." },
    { id: "BK-1088", clientName: "Diane Ingabire", email: "diane@example.com", phone: "+250 785 111 222", service: "Organic Rose Facial", date: "Yesterday, 13:30", status: "Completed", notes: "Regular client profile." },
  ]);

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const handleUpdateStatus = (id: string, newStatus: "Confirmed" | "Completed" | "Pending") => {
    setRecentBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      
      {/* SIDEBAR COMPONENT */}
      <Sidebar />

      {/* MAIN DASHBOARD CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* DASHBOARD HEADER COMPONENT */}
        <DashboardHeader 
          title="Today's Overview" 
          subtitle="Welcome back. The sanctuary is active." 
        />

        {/* DASHBOARD BODY */}
        <main className="p-8 space-y-8">
          
          {/* STATS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 relative overflow-hidden shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Bookings Today
              </span>
              <div className="font-serif text-4xl sm:text-5xl text-[#1C3A27] tracking-tight mb-3">
                {totalBookingsToday}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-stone-600 font-medium">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Active client sessions</span>
              </div>
            </div>

            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 relative overflow-hidden shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Service Categories
              </span>
              <div className="font-serif text-4xl sm:text-5xl text-[#1C3A27] tracking-tight mb-3">
                {totalCategories}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-stone-600 font-medium">
                <Layers className="w-4 h-4 text-amber-700" />
                <span>Active catalog sections</span>
              </div>
            </div>

            <div className="bg-[#EFECE6] border border-stone-300/85 p-6 relative overflow-hidden shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-2">
                Total Sales Today
              </span>
              <div className="font-serif text-3xl sm:text-4xl text-[#1C3A27] tracking-tight mb-3">
                {totalSales}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>+12% vs yesterday</span>
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
                href="/admin/bookings" 
                className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-600 hover:text-[#1C3A27] transition-colors"
              >
                View All Bookings
              </a>
            </div>

            {/* TABLE WRAPPER */}
            <div className="overflow-x-auto">
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
                      <td className="py-4 px-4 font-medium text-stone-500">{booking.id}</td>
                      <td className="py-4 px-4 font-semibold">{booking.clientName}</td>
                      <td className="py-4 px-4 text-stone-700">{booking.service}</td>
                      <td className="py-4 px-4 text-stone-600 font-light">{booking.date}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${
                          booking.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" :
                          booking.status === "Arrived" ? "bg-amber-100 text-amber-800" :
                          booking.status === "Completed" ? "bg-blue-100 text-blue-800" :
                          "bg-stone-200 text-stone-700"
                        }`}>
                          {booking.status}
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
            </div>
          </div>

        </main>
      </div>

      {/* BOOKING DETAILS & ACTION MODAL */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            
            {/* Modal Header */}
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Booking Submission
                </span>
                <h3 className="font-serif text-xl">{selectedBooking.id}</h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-stone-300 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Submitted Form Details */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Client Name</span>
                  <span className="font-semibold text-[#1C3A27] text-sm">{selectedBooking.clientName}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Status</span>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold bg-stone-200 text-stone-800">
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Email Address:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedBooking.email}</span>
                </div>
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Phone Number:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedBooking.phone}</span>
                </div>
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Requested Service:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedBooking.service}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Scheduled Time:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedBooking.date}</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="bg-[#F8F6F0] p-4 border border-stone-300/60">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Client Special Notes</span>
                  <p className="text-stone-700 italic font-light">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer: Dynamic Actions based on Status */}
            <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-between">
              
              {/* If Confirmed or Completed, show Close button only */}
              {selectedBooking.status === "Confirmed" || selectedBooking.status === "Completed" ? (
                <div className="w-full flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* If Pending or Arrived, show Confirm & Reject buttons along with Close */
                <>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedBooking.id, "Confirmed");
                      }}
                      className="inline-flex items-center space-x-1 bg-emerald-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-emerald-800 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedBooking.id, "Pending");
                        alert(`Booking ${selectedBooking.id} rejected/set back to pending review.`);
                        handleCloseModal();
                      }}
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