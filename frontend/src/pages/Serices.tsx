import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
interface ServiceItem {
  id: string;
  name: string;
  duration?: string;
  price: string;
  description?: string;
  features?: string[];
  image: string;
}

interface ServiceCategory {
  id: string;
  category: string;
  subtitle: string;
  items: ServiceItem[];
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "massage",
    category: "Massotherapy & Bodywork",
    subtitle: "Restorative Pressure & Muscle Relief",
    items: [
      { id: "m1", name: "Black Massage", duration: "30 MIN", price: "10,000 RWF", description: "Targeted localized therapy using soothing technique to ease tension points quickly.", image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop" },
      { id: "m2", name: "Relax Foot Massage", duration: "30 MIN", price: "10,000 RWF", description: "Concentrated reflexology work to alleviate lower leg stress and improve circulation.", image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop" },
      { id: "m3", name: "Leg Massage", duration: "30 MIN", price: "10,000 RWF", description: "Relieves heaviness, soreness, and muscular fatigue in the lower extremities.", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
      { id: "m4", name: "Head Massage", duration: "30 MIN", price: "10,000 RWF", description: "Focuses on scalp and temple pressure points to ease tension headaches and mental fatigue.", image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop" },
      { id: "m5", name: "De-Stress Back", duration: "45 MIN", price: "15,000 RWF", description: "Focused deep pressure on the shoulders, scapula, and lumbar region.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
      { id: "m6", name: "Full Body Soft Massage", duration: "60 MIN", price: "15,000 RWF", description: "Gentle, full-body effleurage techniques to promote deep whole-body relaxation.", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
      { id: "m7", name: "Aromatherapy", duration: "60 MIN", price: "25,000 RWF", description: "Custom botanical essential oil infusions to calm the nervous system.", image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop" },
      { id: "m8", name: "Lomi Lomi Massage", duration: "60 MIN", price: "25,000 RWF", description: "Rhythmic long fore-arm gliding strokes that mimic natural wave movements.", image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop" },
      { id: "m9", name: "Deep Tissue Massage", duration: "60 MIN", price: "20,000 RWF", description: "Firm pressure targeting muscle fibers and fascia to release chronic knots.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
      { id: "m10", name: "Sport Massage", duration: "60 MIN", price: "25,000 RWF", description: "Dynamic stretching and pressure designed to accelerate post-workout recovery.", image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop" },
      { id: "m11", name: "Hot Stone Therapy", duration: "60 MIN / 90 MIN", price: "30,000 RWF (60m) / 40,000 RWF (90m)", description: "Smooth basalt stones warmed to release muscular stiffness and restore warmth.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
      { id: "m12", name: "Warm Candle Massage", duration: "60 MIN / 90 MIN", price: "35,000 RWF (60m) / 40,000 RWF (90m)", description: "Nourishing melted botanical candle wax poured gently over skin for intense hydration.", image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop" },
      { id: "m13", name: "Prenatal Massage", duration: "60 MIN", price: "30,000 RWF", description: "Gentle, supportive positioning therapy tailored specifically for expecting mothers.", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
      { id: "m14", name: "Sauna Blanket", duration: "30 MIN", price: "10,000 RWF", description: "Infrared thermal wrap to stimulate sweat, release toxins, and improve metabolic rate.", image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=800&auto=format&fit=crop" },
      { id: "m15", name: "Full Body Scrub", duration: "30 MIN", price: "15,000 RWF", description: "Exfoliating botanical scrub to polish away dead dermal cells and soften skin.", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop" },
      { id: "m16", name: "Nourishing Body Wrap", duration: "60 MIN", price: "30,000 RWF", description: "Hydrating mineral mask applied across the body, wrapped to lock in moisture.", image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    id: "facial",
    category: "Aesthetic Facials",
    subtitle: "Dermal Clarity & Skin Resurfacing",
    items: [
      { id: "f1", name: "Basic Facial", price: "15,000 RWF", description: "Essential cleansing, gentle exfoliation, and a balancing moisture finish.", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop" },
      { id: "f2", name: "Customized Facial", price: "25,000 RWF", description: "Tailored treatment tailored specifically to your exact skin type and current needs.", image: "https://images.unsplash.com/photo-1512290900673-7002ff22d251?q=80&w=800&auto=format&fit=crop" },
      { id: "f3", name: "Anti-Age Facial", price: "35,000 RWF", description: "Advanced collagen-boosting serums and firming massages for youthful vitality.", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    id: "waxing",
    category: "Precision Waxing",
    subtitle: "Smooth Dermal Hair Removal",
    items: [
      { id: "w1", name: "Underarm Waxing", price: "5,000 RWF", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
      { id: "w2", name: "Upper Lip & Chin", price: "5,000 RWF", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop" },
      { id: "w3", name: "Eyebrows Waxing", price: "5,000 RWF", image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=800&auto=format&fit=crop" },
      { id: "w4", name: "Stomach & Chest", price: "10,000 RWF", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
      { id: "w5", name: "Back Waxing", price: "15,000 RWF", image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop" },
      { id: "w6", name: "Half Leg Waxing", price: "10,000 RWF", image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop" },
      { id: "w7", name: "Full Leg Waxing", price: "20,000 RWF", image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop" },
      { id: "w8", name: "Full Arm Waxing", price: "10,000 RWF", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
      { id: "w9", name: "Bikini Line", price: "15,000 RWF", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
      { id: "w10", name: "Brazilian Waxing", price: "20,000 RWF", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
      { id: "w11", name: "Brazilian For Beginner", price: "25,000 RWF", description: "Extra delicate care and soothing botanical post-treatment gels included.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    id: "body-treatment",
    category: "Body Treatments",
    subtitle: "Holistic Detox & Body Contouring",
    items: [
      {
        id: "bt1",
        name: "Detox or Cellulite Treatment",
        price: "50,000 RWF",
        description: "A complete intensive ritual designed to flush retained fluids and smooth tissue texture.",
        features: ["Sauna Blanket session", "Exfoliating Body Wrap", "Targeted Massage Therapy"],
        image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "packages",
    category: "Spa Packages",
    subtitle: "Bundled Immersion Journeys",
    items: [
      {
        id: "p1",
        name: "Basic Package",
        price: "45,000 RWF",
        features: ["Full Body Scrub", "Restorative Massage", "Basic Facial"],
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "p2",
        name: "Beautiful Day Package",
        price: "50,000 RWF",
        features: ["Sauna Blanket", "Body Scrub", "Brazilian Waxing", "Basic Facial"],
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop",
      },
      {
        id: "p3",
        name: "Couple Treatment Package",
        price: "65,000 RWF",
        features: ["Exfoliating Body Scrub", "Aromatherapy Massage for Two"],
        image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop",
      },
    ],
  },
];

export default function Services(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<string>(SERVICE_CATEGORIES[0].id);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [sameAsPhone, setSameAsPhone] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    whatsapp: "",
    date: "",
    time: "10:00 AM",
    notes: ""
  });

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  const handleOpenBookingModal = (item: ServiceItem) => {
    setSelectedService(item);
    setIsSubmitted(false); // Ensure form is visible when opening
  };

  const handleCloseModal = () => {
    setSelectedService(null);
    setSameAsPhone(false);
    setIsSubmitted(false);
    setFormData({
      name: "",
      email: "",
      address: "",
      phone: "",
      whatsapp: "",
      date: "",
      time: "10:00 AM",
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.date || !formData.email) {
      return; // HTML5 'required' handles the basic validation
    }

    // Switch modal state to success message instead of standard browser alert
    setIsSubmitted(true);
  };

  const currentCategory = SERVICE_CATEGORIES.find((cat) => cat.id === activeTab) || SERVICE_CATEGORIES[0];

  return (
    <>
    <Header />
    <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0] min-h-screen">
      
      {/* SECTION 1: HERO HEADER */}
      <section className="relative h-[50vh] sm:h-[60vh] flex items-center justify-center overflow-hidden border-b border-stone-300/40">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1600&auto=format&fit=crop')`,
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

      {/* SECTION 2: STICKY CATEGORY TABS BAR */}
      <section className="bg-[#EFECE6] border-b border-stone-300/50 sticky top-0 z-30 shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar space-x-2 sm:space-x-8 py-3">
            {SERVICE_CATEGORIES.map((cat) => {
              const isActive = cat.id === activeTab;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-300 border-b-2 ${
                    isActive
                      ? "border-[#1C3A27] text-[#1C3A27] bg-[#F8F6F0]/60"
                      : "border-transparent text-stone-500 hover:text-[#1C3A27]"
                  }`}
                >
                  {cat.category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: CATEGORY ITEMS DISPLAY */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div data-aos="fade-up" className="border-b border-stone-300/60 pb-4">
          <span className="text-[9px] uppercase tracking-[0.3em] text-stone-500 font-semibold block mb-1">
            {currentCategory.subtitle}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
            {currentCategory.category}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentCategory.items.map((item) => (
            <div
              key={item.id}
              data-aos="fade-up"
              className="bg-[#EFECE6] border border-stone-300/60 flex flex-col justify-between p-6 space-y-4 hover:border-[#1C3A27]/40 transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="img-zoom-container border border-stone-300/60 h-48">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-stone-300/60 pb-2 mb-2">
                    <h3 className="font-serif text-xl text-[#1C3A27] font-medium">{item.name}</h3>
                    <div className="text-right">
                      <span className="text-xs font-semibold tracking-wider text-[#1C3A27] block">
                        {item.price}
                      </span>
                      {item.duration && (
                        <span className="text-[9px] uppercase tracking-widest text-stone-500 block">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-stone-600 font-light leading-relaxed mt-2">
                      {item.description}
                    </p>
                  )}

                  {item.features && item.features.length > 0 && (
                    <ul className="text-xs text-stone-600 space-y-1 pt-3 border-t border-stone-300/40 mt-3">
                      {item.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <span className="w-1 h-1 bg-[#1C3A27] rounded-full"></span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
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
      </section>

      {/* SECTION 4: SCROLLABLE BOOKING MODAL */}
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
                  <p>
                    Your booking request for the <strong>{selectedService.name}</strong> on {formData.date} is currently <strong>PENDING</strong>.
                  </p>
                  <p>
                    Automatic approvals are not issued. Our spa concierge will review our schedule and contact you shortly at {formData.phone} or via email to confirm your appointment details.
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
                  <p className="text-xs text-emerald-800 font-semibold">{selectedService.price}</p>
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

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jane@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kigali, Nyarugenge"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-[#EFECE6] border border-stone-300 p-2.5 outline-none focus:border-[#1C3A27]"
                    />
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
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="11:00 AM">11:00 AM</option>
                        <option value="01:00 PM">01:00 PM</option>
                        <option value="03:00 PM">03:00 PM</option>
                        <option value="05:00 PM">05:00 PM</option>
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

                  <div className="pt-2 flex items-center justify-end space-x-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-stone-500 uppercase tracking-widest text-[10px] hover:text-black"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-aside">
                      Submit Request
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: FOOTER CALLOUT */}
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