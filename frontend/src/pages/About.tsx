import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
interface ValueCard {
  title: string;
  description: string;
  icon: string;
}

const CORE_VALUES: ValueCard[] = [
  {
    title: "Midrange Accessibility",
    description: "We firmly believe that high-quality, professional body care should be accessible without an exorbitant price tag.",
    icon: "❖",
  },
  {
    title: "Serene Comfort",
    description: "Our environment is engineered to provide an immediate sanctuary of peace, relaxing both body and soul.",
    icon: "✦",
  },
  {
    title: "People-Powered Excellence",
    description: "Our staff is our core strength. Driven, compassionate therapists ensure every client leaves revitalized.",
    icon: "◈",
  },
  {
    title: "Authentic Hospitality",
    description: "Rooted in Kigali, we deliver genuine, personalized care tailored specifically to your physical wellness needs.",
    icon: "✧",
  },
];

export default function About(): React.ReactElement {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  return (
    <>
    <Header />
    <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0] min-h-screen">
      
      {/* SECTION 1: HERO HEADER */}
      <section className="relative h-[45vh] sm:h-[55vh] flex items-center justify-center overflow-hidden border-b border-stone-300/40">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/ISIMBI%20PICTURES%20(32).jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white space-y-3" data-aos="fade-up">
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-emerald-300 block">
            Our Identity & Purpose
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl tracking-tight text-white">
            About D'vine Spa
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light max-w-xl mx-auto">
            Providing premium midrange body care and holistic relaxation in the heart of Kigali.
          </p>
        </div>
      </section>

      {/* NEW SECTION: PARAGRAPH WITH IMAGE ASIDE */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4" data-aos="fade-right">
          <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block">
            About Us
          </span>
          <p className="text-xs sm:text-sm text-stone-700 font-light leading-relaxed">
            Team at D'vine spa, we are certain that it is possible to offer good quality services at a midrange cost. We want to be exemplary in providing best, and comfortable services in a serene environment that keeps our clients relaxed hence leading to enjoyment of the both body and the soul! Our vision is to be the midrange body caring facility of choice in Rwanda! “The power in people is stronger than people in power” - Wael Ghonim. The team at d'vine is the driving force. Our midrange massage & Couple Treatment package is aimed at providing clients with a priceless experience. We are located in heart of town Kigali-kiyovu. Come see why we're often called one of the best spa in kigali
          </p>
        </div>

        <div className="relative" data-aos="fade-left">
          <div className="border border-stone-300/80 p-2 bg-[#EFECE6] shadow-sm">
            <img
              src="/ISIMBI%20PICTURES%20(74).jpg"
              alt="D'vine Spa Ambiance Kigali"
              className="w-full h-80 sm:h-[400px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: MISSION & VISION CARDS */}
      <section className="max-w-6xl mx-auto px-6 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Mission Card */}
          <div 
            data-aos="fade-up" 
            data-aos-delay="100"
            className="bg-[#EFECE6] border border-stone-300/80 p-8 sm:p-10 space-y-4 shadow-sm"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block">
              Our Mission
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1C3A27]">
              Excellence at a Midrange Cost
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 font-light leading-relaxed">
              At D'vine Spa, we are certain that it is possible to offer exceptional, top-tier body care services at a midrange cost. Our mission is to be exemplary in providing comfortable, high-quality treatments in a serene environment that leaves our clients completely relaxed—leading to full enjoyment of both body and soul!
            </p>
          </div>

          {/* Vision Card */}
          <div 
            data-aos="fade-up" 
            data-aos-delay="200"
            className="bg-[#1C3A27] text-[#F8F6F0] p-8 sm:p-10 space-y-4 shadow-sm border border-[#1C3A27]"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-emerald-300 block">
              Our Vision
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-white">
              The Facility of Choice in Rwanda
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 font-light leading-relaxed">
              Our vision is to become the leading midrange body caring facility of choice across Rwanda. We strive to set the standard for accessible wellness, seamlessly blending professional techniques, comfortable surroundings, and value.
            </p>
          </div>

        </div>
      </section>

      {/* SECTION 3: CORE VALUES */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto" data-aos="fade-up">
          <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block">
            Guiding Principles
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
            Our Core Values
          </h2>
          <p className="text-xs text-stone-600 font-light">
            The foundation behind every therapy session, package, and client interaction at D'vine Spa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CORE_VALUES.map((val, idx) => (
            <div
              key={idx}
              data-aos="fade-up"
              data-aos-delay={idx * 100}
              className="bg-[#EFECE6] border border-stone-300/70 p-6 space-y-3 hover:border-[#1C3A27]/50 transition-all duration-300"
            >
              <div className="text-2xl text-[#1C3A27]">{val.icon}</div>
              <h3 className="font-serif text-lg text-[#1C3A27] font-medium">{val.title}</h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                {val.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: TEAM PHILOSOPHY & QUOTE */}
      <section className="bg-[#EFECE6] border-y border-stone-300/60 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8" data-aos="fade-up">
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-stone-500 block">
            The People Behind D'vine
          </span>
          
          <blockquote className="space-y-3">
            <p className="font-serif text-2xl sm:text-4xl text-[#1C3A27] italic max-w-2xl mx-auto leading-snug">
              “The power in people is stronger than people in power”
            </p>
            <cite className="block text-[11px] uppercase tracking-widest text-stone-500 font-semibold not-italic">
              — Wael Ghonim
            </cite>
          </blockquote>

          <p className="text-xs sm:text-sm text-stone-700 font-light leading-relaxed max-w-2xl mx-auto">
            The team at D'vine Spa is our true driving force. From our restorative midrange massages to our specialized Couple Treatment packages, our dedicated staff is committed to delivering a priceless experience for body and mind.
          </p>
        </div>
      </section>

      {/* SECTION 5: LOCATION & DESTINATION */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6" data-aos="fade-right">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-stone-500 block mb-1">
              Sanctuary in the City
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
              Located in Kigali - Kiyovu
            </h2>
          </div>
          
          <p className="text-xs sm:text-sm text-stone-700 font-light leading-relaxed">
            We are conveniently situated in the heart of town in <strong>Kigali-Kiyovu</strong>. Our location was chosen specifically to provide a quiet, tranquil escape from the bustling city center without requiring you to travel far.
          </p>

          <p className="text-xs sm:text-sm text-stone-700 font-light leading-relaxed">
            Whether you need a quick 30-minute stress relief treatment during your lunch break or an immersive full-day couple package on the weekend, come see why we are consistently recognized as one of the best spas in Kigali.
          </p>

          <div className="pt-2">
            <Link
              to="/services"
              className="btn-aside inline-block px-8 py-3 text-xs tracking-widest uppercase font-semibold"
            >
              Explore Treatments
            </Link>
          </div>
        </div>

        <div className="relative" data-aos="fade-left">
          <div className="border border-stone-300/80 p-2 bg-[#EFECE6]">
            <img
              src="/ISIMBI%20PICTURES%20(75).jpg"
              alt="D'vine Spa Ambiance Kigali"
              className="w-full h-80 sm:h-[400px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: FOOTER CALLOUT */}
      <section className="bg-[#0A2619] text-[#F8F6F0] py-16 text-center">
        <div data-aos="fade-up" className="max-w-3xl mx-auto px-6 space-y-4">
          <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-emerald-300">
            Visit D'vine Spa
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl tracking-wide">
            Ready for Total Rejuvenation?
          </h2>
          <p className="text-xs text-stone-300 font-light leading-relaxed max-w-lg mx-auto">
            Book your individual session or couple package today and experience top-quality body care in Kigali.
          </p>
        </div>
      </section>

    </main>
    <Footer />
    </>
  );
}