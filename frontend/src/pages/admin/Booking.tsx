import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import { 
  TrendingUp, 
  Calendar, 
  Layers, 
  Eye, 
  Trash2, 
  X, 
  Check, 
  Ban, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

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

export default function DashboardBookings(): React.ReactElement {
  // Mock full list of bookings for pagination, search, and management
  const [bookings, setBookings] = useState<Booking[]>([
    { id: "BK-1092", clientName: "Alice Uwase", email: "alice@example.com", phone: "+250 788 123 456", service: "Signature Renewal Massage", date: "Today, 14:00", status: "Confirmed", notes: "Prefers firm pressure and soothing ambient music." },
    { id: "BK-1091", clientName: "Jean Bosco", email: "jean@example.com", phone: "+250 789 987 654", service: "Deep Hydration Facial", date: "Today, 15:30", status: "Arrived", notes: "Allergic to standard lavender essential oils." },
    { id: "BK-1090", clientName: "Chloe Mutesi", email: "chloe@example.com", phone: "+250 783 456 789", service: "Aromatherapy Full Body", date: "Today, 16:45", status: "Pending", notes: "First-time visitor to the sanctuary." },
    { id: "BK-1089", clientName: "Eric Kagame", email: "eric@example.com", phone: "+250 782 333 444", service: "Hot Stone Therapy", date: "Yesterday, 11:00", status: "Completed", notes: "Requested locker near the garden entrance." },
    { id: "BK-1088", clientName: "Diane Ingabire", email: "diane@example.com", phone: "+250 785 111 222", service: "Organic Rose Facial", date: "Yesterday, 13:30", status: "Completed", notes: "Regular client profile." },
    { id: "BK-1087", clientName: "Patrick Mugisha", email: "patrick@example.com", phone: "+250 784 555 666", service: "Deep Tissue Relief", date: "Aug 15, 10:00", status: "Pending", notes: "Focus on lower back tension." },
    { id: "BK-1086", clientName: "Aline Uwimana", email: "aline@example.com", phone: "+250 786 777 888", service: "Botanical Body Scrub", date: "Aug 15, 12:00", status: "Confirmed", notes: "Prefers organic citrus oils." },
    { id: "BK-1085", clientName: "David Ndayisaba", email: "david@example.com", phone: "+250 781 222 333", service: "Swedish Relaxation", date: "Aug 14, 15:00", status: "Completed", notes: "Standard session." },
    { id: "BK-1084", clientName: "Gisele Umumararungu", email: "gisele@example.com", phone: "+250 789 444 555", service: "Signature Renewal Massage", date: "Aug 14, 16:30", status: "Completed", notes: "VIP client tier." },
    { id: "BK-1083", clientName: "Fiston Niyigena", email: "fiston@example.com", phone: "+250 783 999 000", service: "Hot Stone Therapy", date: "Aug 13, 09:30", status: "Completed", notes: "Morning appointment preference." },
    { id: "BK-1082", clientName: "Sandrine Mukamana", email: "sandrine@example.com", phone: "+250 782 111 999", service: "Deep Hydration Facial", date: "Aug 13, 11:00", status: "Pending", notes: "Skin sensitivity check requested." },
  ]);

  // Available services list for dropdown selection when creating a new booking manually
  const availableServices = [
    "Signature Renewal Massage",
    "Deep Hydration Facial",
    "Aromatherapy Full Body",
    "Hot Stone Therapy",
    "Organic Rose Facial",
    "Deep Tissue Relief",
    "Botanical Body Scrub",
    "Swedish Relaxation"
  ];

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // View Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // New Booking Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newService, setNewService] = useState<string>(availableServices[0]);
  const [newDate, setNewDate] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");

  // Handlers for View Modal
  const handleOpenViewModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedBooking(null);
  };

  // Handlers for Status Updates
  const handleUpdateStatus = (id: string, newStatus: "Confirmed" | "Completed" | "Pending") => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Handler for Deleting Booking
  const handleDeleteBooking = (id: string) => {
    if (window.confirm(`Are you sure you want to delete booking ${id}?`)) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
      if (selectedBooking && selectedBooking.id === id) {
        handleCloseViewModal();
      }
    }
  };

  // Handler for Creating Manual Booking
  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newPhone || !newDate) {
      alert("Please fill in all required fields.");
      return;
    }

    const createdBooking: Booking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: newClientName,
      email: newEmail || "client@sanctuary.com",
      phone: newPhone,
      service: newService,
      date: newDate,
      status: "Pending",
      notes: newNotes || "Created manually via admin portal."
    };

    setBookings([createdBooking, ...bookings]);
    setIsNewModalOpen(false);

    // Reset Form Fields
    setNewClientName("");
    setNewEmail("");
    setNewPhone("");
    setNewService(availableServices[0]);
    setNewDate("");
    setNewNotes("");
  };

  // Filter Bookings based on Search Query
  const filteredBookings = bookings.filter((b) => 
    b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Calculations
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      
      {/* SIDEBAR COMPONENT */}
      <Sidebar />

      {/* MAIN DASHBOARD CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* DASHBOARD HEADER COMPONENT */}
        <DashboardHeader 
          title="Sanctuary Bookings" 
          subtitle="Manage all client reservations, statuses, and manual entries." 
        />

        {/* DASHBOARD BODY */}
        <main className="p-8 space-y-8">
          
          {/* ACTIONS & SEARCH BAR HEADER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#EFECE6] p-4 sm:p-6 border border-stone-300/85 shadow-sm">
            
            {/* Search Input */}
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
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
              />
            </div>

            {/* New Booking Button */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-[#1C3A27] text-[#F8F6F0] px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Booking</span>
            </button>

          </div>

          {/* TABLE SECTION */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">All Submitted Bookings</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">
                  Showing {filteredBookings.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} total entries
                </p>
              </div>
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
                  {currentTableData.length > 0 ? (
                    currentTableData.map((booking) => (
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
                        <td className="py-4 px-4 text-right space-x-1">
                          <button 
                            onClick={() => handleOpenViewModal(booking)}
                            className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="View Submission Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500 italic">
                        No bookings found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-300/60 text-xs">
                <span className="text-stone-600 font-light">
                  Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
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
            
            {/* Modal Header */}
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Booking Submission Details
                </span>
                <h3 className="font-serif text-xl">{selectedBooking.id}</h3>
              </div>
              <button 
                onClick={handleCloseViewModal}
                className="text-stone-300 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
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
              
              {selectedBooking.status === "Confirmed" || selectedBooking.status === "Completed" ? (
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
                      onClick={() => handleUpdateStatus(selectedBooking.id, "Confirmed")}
                      className="inline-flex items-center space-x-1 bg-emerald-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-emerald-800 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedBooking.id, "Pending");
                        alert(`Booking ${selectedBooking.id} rejected/set back to pending review.`);
                        handleCloseViewModal();
                      }}
                      className="inline-flex items-center space-x-1 bg-red-700 text-white px-4 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-red-800 transition-colors"
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
            
            {/* Modal Header */}
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Sanctuary Administration
                </span>
                <h3 className="font-serif text-xl">Create Manual Booking</h3>
              </div>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-stone-300 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Submission */}
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
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Email Address</label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
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
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Select Service *</label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  >
                    {availableServices.map((service, index) => (
                      <option key={index} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Date & Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tomorrow, 10:00"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
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

              </div>

              {/* Modal Footer Actions */}
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