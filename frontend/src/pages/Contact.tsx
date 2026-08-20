import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
export default function Contact(): React.ReactElement {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
  });

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "General Inquiry",
      message: "",
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
            backgroundImage: `url('https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white space-y-3" data-aos="fade-up">
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-emerald-300 block">
            Get In Touch
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl tracking-tight text-white">
            Contact D'vine Spa
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light max-w-xl mx-auto">
            We are here to assist with your bookings, customized packages, and any inquiries about our treatments in Kigali.
          </p>
        </div>
      </section>

      {/* SECTION 2: CONTACT INFORMATION & FORM */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT COLUMN: CONTACT DETAILS */}
        <div className="lg:col-span-5 space-y-8" data-aos="fade-right">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block mb-1">
              Reach Out Directly
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
              Visit or Call Us
            </h2>
          </div>

          <div className="space-y-6 text-xs text-stone-700 font-light leading-relaxed">
            
            {/* Location */}
            <div className="bg-[#EFECE6] border border-stone-300/70 p-5 space-y-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#1C3A27] block">
                ❖ Physical Address
              </span>
              <p className="text-stone-800 font-normal">
                D'vine Spa, Kiyovu, Kigali, Rwanda
              </p>
              <p className="text-stone-500 text-[11px]">
                Located in the heart of town in Kigali-Kiyovu.
              </p>
            </div>

            {/* Hours */}
            <div className="bg-[#EFECE6] border border-stone-300/70 p-5 space-y-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#1C3A27] block">
                ✦ Opening Hours
              </span>
              <div className="flex justify-between text-stone-800 pt-1">
                <span>Monday – Sunday:</span>
                <span className="font-medium">08:00 AM – 08:00 PM</span>
              </div>
            </div>

            {/* Direct Contact */}
            <div className="bg-[#EFECE6] border border-stone-300/70 p-5 space-y-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#1C3A27] block">
                ◈ Phone & Email
              </span>
              <p className="text-stone-800">
                <strong>Phone / WhatsApp:</strong>{" "}
                <a href="tel:+250782867790" className="hover:underline">
                  +250 782 867 790
                </a>
              </p>
              <p className="text-stone-800">
                <strong>Email:</strong>{" "}
                <a href="mailto:dvinespa2@gmail.com" className="hover:underline">
                  dvinespa2@gmail.com
                </a>
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: CONTACT FORM */}
        <div className="lg:col-span-7 bg-[#EFECE6] border border-stone-300/80 p-6 sm:p-10" data-aos="fade-left">
          
          {isSubmitted ? (
            <div className="py-12 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-[#1C3A27] text-[#F8F6F0] rounded-full flex items-center justify-center mx-auto text-3xl font-serif">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-3xl text-[#1C3A27]">Message Sent</h3>
                <p className="text-xs sm:text-sm text-stone-600 font-light">
                  Thank you, <strong>{formData.name}</strong>. We have received your inquiry.
                </p>
              </div>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                Our team will review your message and reach out to you shortly via email or WhatsApp.
              </p>
              <div className="pt-4">
                <button onClick={handleReset} className="btn-aside px-8 py-2.5">
                  Send Another Message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div className="border-b border-stone-300/60 pb-3">
                <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block">
                  Send A Message
                </span>
                <h3 className="font-serif text-2xl text-[#1C3A27]">
                  How Can We Help You?
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
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
                    placeholder="e.g. jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +250 782 867 790"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                    Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Treatment Reservation">Treatment Reservation</option>
                    <option value="Couple Package Query">Couple Package Query</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your message or inquiry details here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#F8F6F0] border border-stone-300 p-3 outline-none focus:border-[#1C3A27]"
                />
              </div>

              <div className="pt-2 text-right">
                <button type="submit" className="btn-aside w-full sm:w-auto px-8 py-3">
                  Submit Inquiry
                </button>
              </div>
            </form>
          )}

        </div>
      </section>

      {/* SECTION 3: EMBEDDED MAP */}
      <section className="max-w-6xl mx-auto px-6 pb-16 sm:pb-24 space-y-6" data-aos="fade-up">
        <div className="border-b border-stone-300/60 pb-3">
          <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block">
            Location Map
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#1C3A27]">
            Find Us in Kigali-Kiyovu
          </h2>
        </div>

        <div className="border border-stone-300/80 p-2 bg-[#EFECE6] shadow-sm">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.5175457585233!2d30.063072200000004!3d-1.9458930999999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca5da91a8f17f%3A0x2603a27df8864efa!2sD'vine%20Spa!5e0!3m2!1sen!2srw!4v1786957959353!5m2!1sen!2srw"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="D'vine Spa Location Map"
            className="w-full h-[350px] sm:h-[450px]"
          />
        </div>
      </section>

      {/* SECTION 4: FOOTER CALLOUT */}
      <section className="bg-[#0A2619] text-[#F8F6F0] py-16 text-center">
        <div data-aos="fade-up" className="max-w-3xl mx-auto px-6 space-y-4">
          <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-emerald-300">
            D'vine Spa Kigali
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl tracking-wide">
            We Look Forward to Welcoming You
          </h2>
          <p className="text-xs text-stone-300 font-light leading-relaxed max-w-lg mx-auto">
            Experience serene relaxation and top-quality midrange treatments at our Kigali-Kiyovu facility.
          </p>
        </div>
      </section>

    </main>
    <Footer />
    </>
    
  );
}