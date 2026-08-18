import React, { useState, useEffect, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
interface ServiceItem {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: string;
}

const SPA_SERVICES: ServiceItem[] = [
  { id: "1", name: "Signature Midrange Massage", category: "Massages", duration: "60 mins", price: "35,000 RWF" },
  { id: "2", name: "Deep Tissue Stress Relief", category: "Massages", duration: "60 mins", price: "45,000 RWF" },
  { id: "3", name: "Couple Treatment Package", category: "Packages", duration: "90 mins", price: "80,000 RWF" },
  { id: "4", name: "Aromatherapy Full Body Care", category: "Body Care", duration: "75 mins", price: "50,000 RWF" },
  { id: "5", name: "Express Lunch Break Massage", category: "Express", duration: "30 mins", price: "20,000 RWF" },
  { id: "6", name: "Rejuvenating Facial Treatment", category: "Skincare", duration: "45 mins", price: "30,000 RWF" },
  { id: "7", name: "Hot Stone Therapy", category: "Massages", duration: "90 mins", price: "60,000 RWF" },
];

export default function Booking(): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    notes: "",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredServices = SPA_SERVICES.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !formData.name || !formData.email || !formData.date || !formData.time) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSelectedService(null);
    setSearchTerm("");
    setFormData({
      name: "",
      email: "",
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
                <p><strong>Service:</strong> {selectedService?.name} ({selectedService?.duration})</p>
                <p><strong>Date & Time:</strong> {formData.date} at {formData.time}</p>
                <p><strong>Contact:</strong> {formData.phone || formData.email}</p>
                <p className="text-stone-500 pt-2 text-[11px]">We will contact you shortly via phone or email to confirm your slot.</p>
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
                
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-[#F8F6F0] border border-stone-300 p-3.5 flex justify-between items-center cursor-pointer text-stone-800"
                >
                  <span className={selectedService ? "text-[#1C3A27] font-medium" : "text-stone-400"}>
                    {selectedService ? `${selectedService.name} — ${selectedService.duration} (${selectedService.price})` : "Search and choose a treatment..."}
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
                              <span className="text-[10px] text-stone-500 uppercase">{service.category} • {service.duration}</span>
                            </div>
                            <span className="font-semibold text-[#1C3A27] text-[11px]">{service.price}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-stone-500">No matching treatments found</div>
                      )}
                    </div>
                  </div>
                )}
                {!selectedService && (
                  <p className="text-[10px] text-amber-800 pt-1">Please select a service from the list above.</p>
                )}
              </div>

              {/* PERSONAL INFO GRID */}
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
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="dvinespa2@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
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

              <div className="pt-4 text-center">
                <button
                  type="submit"
                  disabled={!selectedService}
                  className={`btn-aside w-full sm:w-auto px-10 py-3.5 uppercase tracking-widest font-semibold ${
                    !selectedService ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Confirm Booking Request
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