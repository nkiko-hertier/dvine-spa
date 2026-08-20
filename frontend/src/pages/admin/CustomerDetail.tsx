import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import RequestAppointmentModal from "../../components/RequestAppointmentModal";
import { ArrowLeft, CalendarPlus, Phone, Mail, MessageCircle, Sparkles, Save } from "lucide-react";
import { useAdminCustomer, useUpdateCustomer } from "../../lib/helpers";
import { STATUS_LABEL, STATUS_CLASS, formatDateTime } from "../../lib/bookingStatus";

export default function CustomerDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError } = useAdminCustomer(id ?? "");
  const updateCustomer = useUpdateCustomer(id ?? "");

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState<boolean>(false);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [notesDraft, setNotesDraft] = useState<string>("");

  const startEditingNotes = () => {
    setNotesDraft(customer?.notes ?? "");
    setIsEditingNotes(true);
  };

  const saveNotes = async () => {
    await updateCustomer.mutateAsync({ notes: notesDraft });
    setIsEditingNotes(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title={customer?.full_name ?? "Client Profile"}
          subtitle="Client history, notes, and appointment shortcuts."
        />

        <main className="p-8 space-y-6">
          <Link
            to="/dashboard/customers"
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-600 hover:text-[#1C3A27] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Clients
          </Link>

          {isLoading ? (
            <p className="text-center text-stone-500 italic py-16 text-xs">Loading client...</p>
          ) : isError || !customer ? (
            <p className="text-center text-red-700 italic py-16 text-xs">Couldn't load this client.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: PROFILE + NOTES */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm space-y-5">
                  <div>
                    <h2 className="font-serif text-2xl text-[#1C3A27]">{customer.full_name}</h2>
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">
                      Client since {new Date(customer.customer_since).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-stone-700">
                      <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{customer.phone_number}</span>
                    </div>
                    {customer.whatsapp_number && (
                      <div className="flex items-center gap-2 text-stone-700">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{customer.whatsapp_number}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-stone-700">
                        <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-300/60">
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-stone-500">Visits</span>
                      <span className="block font-serif text-2xl text-[#1C3A27]">
                        {customer.total_visits ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-stone-500">Requests</span>
                      <span className="block font-serif text-2xl text-[#1C3A27]">
                        {customer.total_requests ?? 0}
                      </span>
                    </div>
                  </div>

                  {customer.source && (
                    <div className="pt-2">
                      <span className="inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold bg-stone-200 text-stone-700 capitalize">
                        via {customer.source.replace("_", " ")}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setIsAppointmentModalOpen(true)}
                    className="w-full inline-flex items-center justify-center space-x-2 bg-[#1C3A27] text-[#F8F6F0] py-3 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Add Appointment</span>
                  </button>

                  {customer.most_common_treatment && (
                    <div className="flex items-start gap-2 text-[11px] text-stone-600 bg-[#F8F6F0] border border-stone-300 p-3">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        Usually books <span className="font-semibold text-[#1C3A27]">{customer.most_common_treatment.name}</span> — the appointment form will pre-select it automatically.
                      </span>
                    </div>
                  )}
                </div>

                {/* NOTES */}
                <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg text-[#1C3A27]">Staff Notes</h3>
                    {!isEditingNotes && (
                      <button
                        onClick={startEditingNotes}
                        className="text-[10px] uppercase tracking-widest font-semibold text-stone-600 hover:text-[#1C3A27] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Preferences, allergies, therapist requests..."
                        className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setIsEditingNotes(false)}
                          className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-stone-600 hover:text-[#1C3A27]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveNotes}
                          disabled={updateCustomer.isPending}
                          className="inline-flex items-center gap-1.5 bg-[#1C3A27] text-[#F8F6F0] px-4 py-2 text-[10px] uppercase tracking-widest font-semibold hover:bg-[#0A2619] disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-600 whitespace-pre-wrap">
                      {customer.notes || "No notes on file yet."}
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT: RECENT BOOKINGS */}
              <div className="lg:col-span-2">
                <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
                    <div>
                      <h2 className="font-serif text-2xl text-[#1C3A27]">Recent Bookings</h2>
                      <p className="text-xs text-stone-600 font-light mt-0.5">
                        The last 10 requests from this client.
                      </p>
                    </div>
                    <Link
                      to={`/dashboard/bookings?customer_id=${customer.id}`}
                      className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-600 hover:text-[#1C3A27] transition-colors"
                    >
                      View All Bookings
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    {customer.recent_bookings.length === 0 ? (
                      <p className="text-center text-stone-500 italic py-10 text-xs">
                        No bookings yet for this client.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                            <th className="py-3 px-4 font-semibold">Booking ID</th>
                            <th className="py-3 px-4 font-semibold">Service</th>
                            <th className="py-3 px-4 font-semibold">Date</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                          {customer.recent_bookings.map((b) => (
                            <tr key={b.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                              <td className="py-4 px-4 font-medium text-stone-500">
                                {b.request_reference || b.id.slice(0, 8).toUpperCase()}
                              </td>
                              <td className="py-4 px-4 font-semibold">{b.treatment_name}</td>
                              <td className="py-4 px-4 text-stone-600 font-light">
                                {formatDateTime(b.preferred_date, "")}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${STATUS_CLASS[b.status]}`}
                                >
                                  {STATUS_LABEL[b.status]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {isAppointmentModalOpen && customer && (
        <RequestAppointmentModal customer={customer} onClose={() => setIsAppointmentModalOpen(false)} />
      )}
    </div>
  );
}
