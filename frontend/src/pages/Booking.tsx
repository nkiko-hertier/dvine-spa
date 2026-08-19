import React, { useState, useEffect, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiClient } from "../lib/apiClient";
import { ENDPOINTS } from "../lib/endpoints";
import { usePublicTreatments } from "../lib/helpers";
import type { PublicTreatment, BookingRequestCreateResult, ApiSuccess } from "../types";

interface ServiceItem {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
}

const TIME_SLOTS_24H = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export default function Booking(): React.ReactElement {
  const { data: treatmentsData, isLoading: treatmentsLoading, isError: treatmentsError } =
    usePublicTreatments({ limit: 100 });

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [createdReference, setCreatedReference] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    date: "",
    time: "",
    notes: "",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  const treatments = treatmentsData?.data ?? [];
  const spaServices: ServiceItem[] = treatments.map((t: PublicTreatment) => ({
    id: t.id,
    name: t.name,
    duration_minutes: t.duration_minutes,
    price: t.price,
  }));

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredServices = spaServices.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !formData.name || !formData.phone || !formData.date || !formData.time) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Backend expects 24h "HH:MM" time and ISO date
      const { data } = await apiClient.post<ApiSuccess<BookingRequestCreateResult>>(
        ENDPOINTS.public.bookingRequests.createBookingRequest(),
        {
          full_name: formData.name,
          phone_number: formData.phone,
          treatment_id: selectedService.id,
          preferred_date: formData.date,
          preferred_time: formData.time, // already "HH:MM"
          channel: "website",
          notes: formData.notes || undefined,
        }
      );
      setCreatedReference(data.data.request_reference ?? "");
      setIsSubmitted(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } } };
      const apiErr = axiosErr.response?.data?.error;
      if (apiErr?.details?.length) {
        setSubmitError(apiErr.details.map((d) => d.issue).join(", "));
      } else {
        setSubmitError(apiErr?.message || "Failed to submit your booking. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSelectedService(null);
    setSearchTerm("");
    setCreatedReference("");
    setSubmitError("");
    setFormData({
      name: "",
      phone: "",
      date: "",
      time: "",
      notes: "",
    });
  };

  return (
    <>
      <Header />
      <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0] min-h-screen">
        {/* SECTION 1: HERO HEADER */}
        <section className="relative h-[40vh] sm:h-[50vh] flex items-center justify-center overflow-hidden border-b border-stone-300/40">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600&auto=format&fit=crop')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white space-y-3" data-aos="fade-up">
            <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-emerald-300 block">
              Reservation Desk
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl tracking-tight text-white">
              Book a Treatment
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light max-w-xl mx-auto">
              Experience ultimate relaxation and rejuvenation at D'vine Spa in Kigali-Kiyovu.
            </p>
          </div>
        </section>

        {/* SECTION 2: BOOKING FORM CONTAINER */}
        <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <div className="bg-[#EFECE6] border border-stone-300/80 p-6 sm:p-12 shadow-sm relative z-20" data-aos="fade-up">
            {isSubmitted ? (
              <div className="py-12 text-center space-y-6">
                <div className="w-16 h-16 bg-[#1C3A27] text-[#F8F6F0] rounded-full flex items-center justify-center mx-auto text-3xl font-serif">
                  ✓
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl text-[#1C3A27]">Reservation Confirmed</h3>
                  <p className="text-xs sm:text-sm text-stone-600 font-light">
                    Thank you, <strong>{formData.name}</strong>. Your booking request for <strong>{selectedService?.name}</strong> has been received.
                  </p>
                </div>

                <div className="bg-[#F8F6F0] border border-stone-300/80 p-6 max-w-md mx-auto text-left text-xs space-y-2">
                  {createdReference && (
                    <p><strong>Reference:</strong> {createdReference}</p>
                  )}
                  <p><strong>Service:</strong> {selectedService?.name} ({selectedService?.duration_minutes} mins)</p>
                  <p><strong>Date & Time:</strong> {formData.date} at {formData.time}</p>
                  <p><strong>Contact:</strong> {formData.phone}</p>
                  <p className="text-stone-500 pt-2 text-[11px]">We will contact you shortly via phone or WhatsApp to confirm your slot.</p>
                </div>

                <div className="pt-4">
                  <button onClick={handleReset} className="btn-aside px-8 py-3 text-xs tracking-widest uppercase font-semibold">
                    Make Another Booking
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                <div className="border-b border-stone-300/60 pb-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block">
                    Secure Your Session
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-[#1C3A27]">
                    Appointment Details
                  </h2>
                </div>

                {/* SEARCHABLE SERVICE DROPDOWN */}
                <div className="relative space-y-1" ref={dropdownRef}>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600">
                    Select Treatment / Service *
                  </label>

                  {treatmentsLoading ? (
                    <div className="w-full bg-[#F8F6F0] border border-stone-300 p-3.5 text-stone-400">
                      Loading treatments...
                    </div>
                  ) : treatmentsError ? (
                    <div className="w-full bg-red-50 border border-red-200 p-3.5 text-red-700">
                      Couldn't load treatments. Please try again.
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full bg-[#F8F6F0] border border-stone-300 p-3.5 flex justify-between items-center cursor-pointer text-stone-800"
                      >
                        <span className={selectedService ? "text-[#1C3A27] font-medium" : "text-stone-400"}>
                          {selectedService
                            ? `${selectedService.name} — ${selectedService.duration_minutes} mins (RWF ${Number(selectedService.price).toLocaleString()})`
                            : "Search and choose a treatment..."}
                        </span>
                        <span className="text-stone-500 text-sm">▾</span>
                      </div>

                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#F8F6F0] border border-stone-300 shadow-lg z-50 max-h-64 overflow-y-auto">
                          <div className="p-2 border-b border-stone-200 sticky top-0 bg-[#F8F6F0]">
                            <input
                              type="text"
                              placeholder="Type to search services..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full bg-white border border-stone-300 p-2.5 outline-none text-xs text-[#1C3A27]"
                              autoFocus
                            />
                          </div>

                          <div className="divide-y divide-stone-200/60">
                            {filteredServices.length > 0 ? (
                              filteredServices.map((service) => (
                                <div
                                  key={service.id}
                                  onClick={() => {
                                    setSelectedService(service);
                                    setIsDropdownOpen(false);
                                    setSearchTerm("");
                                  }}
                                  className="p-3 hover:bg-[#EFECE6] cursor-pointer flex justify-between items-center transition-colors"
                                >
                                  <div>
                                    <p className="font-medium text-[#1C3A27]">{service.name}</p>
                                    <span className="text-[10px] text-stone-500 uppercase">{service.duration_minutes} minutes</span>
                                  </div>
                                  <span className="font-semibold text-[#1C3A27] text-[11px]">RWF {Number(service.price).toLocaleString()}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-stone-500">No matching treatments found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!selectedService && !treatmentsLoading && !treatmentsError && (
                    <p className="text-[10px] text-amber-800 pt-1">Please select a service from the list above.</p>
                  )}
                </div>

                {/* PERSONAL INFO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jean Claude"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+250 782 867 790"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                      Preferred Time *
                    </label>
                    <select
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                    >
                      <option value="">Select Time Slot</option>
                      {TIME_SLOTS_24H.map((slot) => {
                        const [h] = slot.split(":");
                        const hour = Number(h);
                        const label = hour < 12 ? `${slot} AM` : hour === 12 ? `${slot} PM` : `${String(hour - 12).padStart(2, "0")}:${slot.split(":")[1]} PM`;
                        return (
                          <option key={slot} value={slot}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                    Special Requests / Notes (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mention any specific physical wellness preferences or couple package details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                  />
                </div>

                {submitError && (
                  <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{submitError}</p>
                )}

                <div className="pt-4 text-center">
                  <button
                    type="submit"
                    disabled={!selectedService || isSubmitting || treatmentsLoading || treatmentsError}
                    className={`btn-aside w-full sm:w-auto px-10 py-3.5 uppercase tracking-widest font-semibold ${
                      !selectedService || isSubmitting || treatmentsLoading || treatmentsError ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Confirm Booking Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* SECTION 3: FOOTER CALLOUT */}
        <section className="bg-[#0A2619] text-[#F8F6F0] py-16 text-center">
          <div data-aos="fade-up" className="max-w-3xl mx-auto px-6 space-y-4">
            <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-emerald-300">
              D'vine Spa Kigali
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-wide">
              Your Sanctuary of Peace Awaits
            </h2>
            <p className="text-xs text-stone-300 font-light leading-relaxed max-w-lg mx-auto">
              Contact us directly at +250 782 867 790 or dvinespa2@gmail.com for immediate inquiries.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}