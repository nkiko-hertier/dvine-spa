import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiClient } from "../lib/apiClient";
import { ENDPOINTS } from "../lib/endpoints";
import { usePublicCategories, usePublicCategoryTreatments } from "../lib/helpers";
import type { PublicCategory, PublicTreatment } from "../types";

export default function Services(): React.ReactElement {
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = usePublicCategories();

  const categories = categoriesData ?? [];

  // First API category is active by default — never hardcoded.
  // `activeCategoryId` starts null; the effective active category falls
  // back to the first API category until the user clicks a tab.
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const effectiveActiveCategoryId = activeCategoryId ?? categories[0]?.id ?? null;

  const {
    data: treatmentsData,
    isLoading: treatmentsLoading,
    isError: treatmentsError,
  } = usePublicCategoryTreatments(effectiveActiveCategoryId ?? "", { enabled: !!effectiveActiveCategoryId });

  const [selectedService, setSelectedService] = useState<{ id: string; name: string; price: string; duration_minutes: number } | null>(null);
  const [sameAsPhone, setSameAsPhone] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [createdReference, setCreatedReference] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    whatsapp: "",
    date: "",
    time: "10:00",
    notes: ""
  });

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  const handleOpenBookingModal = (item: { id: string; name: string; price: string; duration_minutes: number }) => {
    setSelectedService(item);
    setIsSubmitted(false); // Ensure form is visible when opening
    setSubmitError("");
  };

  const handleCloseModal = () => {
    setSelectedService(null);
    setSameAsPhone(false);
    setIsSubmitted(false);
    setSubmitError("");
    setCreatedReference("");
    setFormData({
      name: "",
      email: "",
      address: "",
      phone: "",
      whatsapp: "",
      date: "",
      time: "10:00",
      notes: ""
    });
  };

  const handlePhoneChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      phone: val,
      whatsapp: sameAsPhone ? val : prev.whatsapp
    }));
  };

  const handleSameAsPhoneToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSameAsPhone(isChecked);
    if (isChecked) {
      setFormData((prev) => ({ ...prev, whatsapp: prev.phone }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !formData.name || !formData.phone || !formData.date) {
      return; // HTML5 'required' handles basic validation
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const { data } = await apiClient.post(ENDPOINTS.public.bookingRequests.createBookingRequest(), {
        full_name: formData.name,
        phone_number: formData.phone,
        whatsapp_number: formData.whatsapp || undefined,
        treatment_id: selectedService.id,
        preferred_date: formData.date,
        preferred_time: formData.time, // "HH:MM"
        channel: "website",
        notes: formData.notes || undefined,
      });
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

  const treatments = treatmentsData ?? [];

  return (
    <>
      <Header />
      <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0] min-h-screen">
        
        {/* SECTION 1: HERO HEADER */}
        <section className="relative h-[50vh] sm:h-[60vh] flex items-center justify-center overflow-hidden border-b border-stone-300/40">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('/ISIMBI%20PICTURES%20(73).jpg')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white space-y-3" data-aos="fade-up">
            <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-emerald-300 block">
              Exclusive Menu
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl tracking-tight text-white">
              Treatments & Rituals
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light max-w-xl mx-auto">
              Experience complete physical realignment with our specialized massotherapy, targeted facials, smooth waxing, and luxury spa packages.
            </p>
          </div>
        </section>

        {/* SECTION 2: CATEGORY TABS + TREATMENTS GRID */}
        <section className="max-w-7xl mx-auto px-6 py-16 space-y-10">
          <div data-aos="fade-up" className="border-b border-stone-300/60 pb-4">
            <span className="text-[9px] uppercase tracking-[0.3em] text-stone-500 font-semibold block mb-1">
              Current Treatment Menu
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
              Available Treatments
            </h2>
          </div>

          {/* CATEGORY TABS — dynamically generated from the API */}
          {categoriesLoading ? (
            <p className="text-center text-stone-500 italic py-6 text-sm">Loading categories...</p>
          ) : categoriesError ? (
            <p className="text-center text-red-700 italic py-6 text-sm">Unable to load service categories. Please try again.</p>
          ) : categories.length === 0 ? (
            <p className="text-center text-stone-500 italic py-6 text-sm">No service categories available.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-stone-300/40">
              {categories.map((cat: PublicCategory) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`whitespace-nowrap px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors ${
                    effectiveActiveCategoryId === cat.id
                      ? "bg-[#1C3A27] text-[#F8F6F0] border border-[#1C3A27]"
                      : "bg-[#EFECE6] text-[#1C3A27] border border-stone-300/60 hover:border-[#1C3A27]/40"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* TREATMENTS GRID — filtered by the active category */}
          {treatmentsLoading ? (
            <p className="text-center text-stone-500 italic py-20 text-sm">Loading services...</p>
          ) : treatmentsError ? (
            <p className="text-center text-red-700 italic py-20 text-sm">Unable to load services. Please try again.</p>
          ) : treatments.length === 0 ? (
            <p className="text-center text-stone-500 italic py-20 text-sm">No treatments available in this category right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {treatments.map((item: PublicTreatment) => (
                <div
                  key={item.id}
                  data-aos="fade-up"
                  className="bg-[#EFECE6] border border-stone-300/60 flex flex-col justify-between p-6 space-y-4 hover:border-[#1C3A27]/40 transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="img-zoom-container border border-stone-300/60 h-48">
                      <img
                        src={item.image_url || "/ISIMBI%20PICTURES%20(74).jpg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-stone-300/60 pb-2 mb-2">
                        <h3 className="font-serif text-xl text-[#1C3A27] font-medium">{item.name}</h3>
                        <div className="text-right">
                          <span className="text-xs font-semibold tracking-wider text-[#1C3A27] block">
                            RWF {Number(item.price).toLocaleString()}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-stone-500 block">
                            {item.duration_minutes} mins
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-stone-600 font-light leading-relaxed mt-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-300/40">
                    <button
                      onClick={() => handleOpenBookingModal(item)}
                      className="btn-aside w-full text-center"
                    >
                      Book Treatment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: SCROLLABLE BOOKING MODAL */}
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#F8F6F0] border border-stone-300/80 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative text-[#1C3A27]">
              
              {/* Modal Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-stone-500 hover:text-black text-xl font-bold p-1"
              >
                ✕
              </button>

              {isSubmitted ? (
                /* --- SUCCESS MESSAGE UI --- */
                <div className="py-8 text-center space-y-6 animate-fadeIn">
                  <div className="w-16 h-16 bg-[#1C3A27] text-[#F8F6F0] rounded-full flex items-center justify-center mx-auto text-3xl font-serif">
                    ✓
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-3xl text-[#1C3A27]">Request Received</h3>
                    <p className="text-sm text-stone-600 font-light">Thank you, {formData.name.split(" ")[0]}.</p>
                  </div>
                  
                  <div className="bg-[#EFECE6] border border-stone-300/80 p-4 text-xs text-stone-700 leading-relaxed text-left space-y-3">
                    <p>
                      <strong className="text-[#1C3A27] uppercase tracking-wider text-[10px]">Important Notice</strong>
                    </p>
                    {createdReference && (
                      <p><strong>Reference:</strong> {createdReference}</p>
                    )}
                    <p>
                      Your booking request for the <strong>{selectedService.name}</strong> on {formData.date} is currently <strong>PENDING</strong>.
                    </p>
                    <p>
                      Automatic approvals are not issued. Our spa concierge will review our schedule and contact you shortly at {formData.phone} to confirm your appointment details.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button onClick={handleCloseModal} className="btn-aside w-full">
                      Return to Menu
                    </button>
                  </div>
                </div>
              ) : (
                /* --- BOOKING FORM UI --- */
                <>
                  {/* Modal Header */}
                  <div className="space-y-1 border-b border-stone-300/60 pb-3">
                    <span className="text-[9px] uppercase tracking-[0.3em] font-semibold text-stone-500">
                      Reservation Request
                    </span>
                    <h3 className="font-serif text-2xl text-[#1C3A27]">
                      {selectedService.name}
                    </h3>
                    <p className="text-xs text-emerald-800 font-semibold">RWF {Number(selectedService.price).toLocaleString()}</p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jane Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. jane@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kigali"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +250 788 000 000"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600">
                          WhatsApp Number
                        </label>
                        <label className="flex items-center space-x-1.5 text-[10px] text-stone-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAsPhone}
                            onChange={handleSameAsPhoneToggle}
                            className="accent-[#1C3A27]"
                          />
                          <span>Same as phone</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        placeholder="e.g. +250 788 000 000"
                        disabled={sameAsPhone}
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className={`w-full border p-2.5 outline-none ${
                          sameAsPhone
                            ? "bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed"
                            : "bg-[#EFECE6] border-stone-300 focus:border-[#1C3A27]"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                          Preferred Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                          Preferred Time
                        </label>
                        <select
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                        >
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

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                        Special Notes / Allergies
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Mention any physical concerns or preferences..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                      />
                    </div>

                    {submitError && (
                      <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{submitError}</p>
                    )}

                    <div className="pt-2 flex items-center justify-end space-x-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="text-stone-500 uppercase tracking-widest text-[10px] hover:text-black"
                      >
                        Cancel
                      </button>
                      <button type="submit" disabled={isSubmitting} className={`btn-aside ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* SECTION 4: FOOTER CALLOUT */}
        <section className="bg-[#0A2619] text-[#F8F6F0] py-16 text-center">
          <div data-aos="fade-up" className="max-w-3xl mx-auto px-6 space-y-4">
            <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-emerald-300">
              Assistance & Custom Bundles
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-wide">
              Need Help Customizing Your Visit?
            </h2>
            <p className="text-xs text-stone-300 font-light leading-relaxed max-w-lg mx-auto">
              Our concierge team is available to assist you in designing a personalized spa itinerary.
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}