import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "aos/dist/aos.css";

const HERO_SLIDES = [
  {
    id: 1,
    subtitle: "Lumina Sanctuary",
    title: "The Art of Restorative Balance",
    description: "Discover our collection of bespoke treatments, designed to harmonize body and spirit through ancient thermal techniques and organic botanical science.",
    image: "/ISIMBI%20PICTURES%20pr_38.JPG",
  },
  {
    id: 2,
    subtitle: "Holistic Wellness",
    title: "Tranquil Escapes & Deep Renewal",
    description: "Immerse yourself in deeply restorative hot stone therapy and botanical oil infusions designed to dissolve modern tension and renew vital energy.",
    image: "/ISIMBI%20PICTURES%20pr_12.JPG",
  },
  {
    id: 3,
    subtitle: "Apothecary Science",
    title: "Pure Botanical Clarity",
    description: "Hand-blended organic elixirs and native orchid extracts crafted to resurface dermal clarity and elevate your inner tranquility.",
    image: "/ISIMBI%20PICTURES%20(90).jpg",
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <>
    <Header />
    <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0]">
      
      {/* SECTION 1: OVERLAY HERO SECTION WITH BACKGROUND SLIDER */}
      <section className="relative min-h-[85vh] sm:min-h-screen flex items-center overflow-hidden border-b border-stone-300/40">
        {/* Background Image Slides */}
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transitionProperty: "opacity, transform",
              transitionDuration: "1200ms"
            }}
          />
        ))}

        {/* Dark Vignette Overlay for High Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />

        {/* Content Container Overlaid on Top */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full text-white">
          <div className="max-w-2xl space-y-6" data-aos="fade-right">
            <div className="flex items-center space-x-3">
              <span className="h-[1px] w-8 bg-emerald-400"></span>
              <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-emerald-300">
                {HERO_SLIDES[currentSlide].subtitle}
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl text-white leading-[1.12] tracking-tight">
              {HERO_SLIDES[currentSlide].title}
            </h1>

            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light max-w-lg min-h-[60px]">
              {HERO_SLIDES[currentSlide].description}
            </p>

            <div className="pt-4 flex items-center space-x-6">
              <Link to="/booking" className="btn-aside-light">
                Reserve Experience
              </Link>
              <Link to="/services" className="text-xs uppercase tracking-widest text-white font-semibold hover-underline">
                View Treatment Menu
              </Link>
            </div>

            {/* Slider Navigation Dots & Arrows */}
            <div className="pt-8 flex items-center space-x-6">
              <div className="flex space-x-2">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1.5 transition-all duration-500 rounded-full ${
                      currentSlide === idx ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-3 text-xs font-semibold text-white">
                <button
                  onClick={handlePrevSlide}
                  className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                >
                  ‹
                </button>
                <span className="tracking-widest">{`0${currentSlide + 1} / 0${HERO_SLIDES.length}`}</span>
                <button
                  onClick={handleNextSlide}
                  className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: METRICS STRIP */}
      <section className="bg-[#F2EFE9] py-14 border-b border-stone-300/40">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div data-aos="fade-up" data-aos-delay="50" className="space-y-1">
            <p className="font-serif text-3xl text-[#1C3A27]">100%</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500 font-medium">Pure Organic Resins</p>
          </div>
          <div data-aos="fade-up" data-aos-delay="100" className="space-y-1">
            <p className="font-serif text-3xl text-[#1C3A27]">12</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500 font-medium">Private Suites</p>
          </div>
          <div data-aos="fade-up" data-aos-delay="150" className="space-y-1">
            <p className="font-serif text-3xl text-[#1C3A27]">Holistic</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500 font-medium">Thermal Hydropathy</p>
          </div>
          <div data-aos="fade-up" data-aos-delay="200" className="space-y-1">
            <p className="font-serif text-3xl text-[#1C3A27]">Bespoke</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500 font-medium">Tailored Therapies</p>
          </div>
        </div>
      </section>

      {/* NEW SECTION 3: THE THREE STEPS OF SANCTUARY JOURNEY */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-b border-stone-300/40">
        <div data-aos="fade-up" className="text-center space-y-3 mb-16">
          <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-stone-500">
            The Philosophy
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
            Your Path to Complete Restructure
          </h2>
          <div className="w-12 h-[1px] bg-[#1C3A27]/30 mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div data-aos="fade-up" data-aos-delay="100" className="bg-[#EFECE6] p-8 border border-stone-300/60 space-y-4">
            <span className="font-serif text-3xl text-[#1C3A27]/40">01</span>
            <h3 className="font-serif text-xl text-[#1C3A27]">Purification Soak</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Begin in our mineral-infused thermal pool to increase tissue elasticity and open pathways for deeper muscular relief.
            </p>
          </div>

          <div data-aos="fade-up" data-aos-delay="200" className="bg-[#EFECE6] p-8 border border-stone-300/60 space-y-4">
            <span className="font-serif text-3xl text-[#1C3A27]/40">02</span>
            <h3 className="font-serif text-xl text-[#1C3A27]">Targeted Massotherapy</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Custom herbal elixirs blended live at your suite side are applied using rhythmic compression and deep tissue techniques.
            </p>
          </div>

          <div data-aos="fade-up" data-aos-delay="300" className="bg-[#EFECE6] p-8 border border-stone-300/60 space-y-4">
            <span className="font-serif text-3xl text-[#1C3A27]/40">03</span>
            <h3 className="font-serif text-xl text-[#1C3A27]">Thermal Grounding</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Conclude on heated cedar loungers with custom tea infusions to stabilize blood pressure and sustain calm.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: TREATMENT 1 - DEEP CANOPY TISSUE (Image Overlay) */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="relative group overflow-hidden border border-stone-300/60" data-aos="fade-up">
          <img
            src="/ISIMBI%20PICTURES%20(74).jpg"
            alt="Deep Canopy Tissue Suite"
            className="w-full h-[500px] object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2619]/90 via-[#0A2619]/60 to-transparent p-8 sm:p-16 flex flex-col justify-center max-w-xl text-[#F8F6F0]">
            <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-emerald-300 block mb-2">
              Massage Therapy & Bodywork
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white mb-4">
              Deep Canopy Tissue
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light mb-6">
              A rigorous yet profoundly relaxing treatment utilizing targeted deep pressure and rare botanical resins to release chronic muscular tension. Designed to ground the spirit and restore physical mobility.
            </p>
            <div className="flex items-center space-x-6 border-t border-white/20 pt-6">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400">Duration & Price</p>
                <p className="text-xs font-semibold tracking-wider text-white mt-0.5">90 MIN — 45,000 RWF</p>
              </div>
              <Link to="/booking" className="btn-aside-light">
                Book Treatment
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: TREATMENT 2 - LUMINOUS FLORA FACIAL (Image Overlay Reversed) */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="relative group overflow-hidden border border-stone-300/60" data-aos="fade-up">
          <img
            src="/ISIMBI%20PICTURES%20(90).jpg"
            alt="Luminous Flora Facial"
            className="w-full h-[500px] object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0A2619]/90 via-[#0A2619]/60 to-transparent p-8 sm:p-16 flex flex-col justify-center ml-auto max-w-xl text-[#F8F6F0]">
            <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-emerald-300 block mb-2">
              Aesthetic Skincare
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white mb-4">
              Luminous Flora Facial
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-light mb-6">
              Harnessing the potent vitality of native orchids and mineral-rich volcanic clay, this bespoke facial resurfaces, hydrates, and illuminates the dermal layer, leaving skin renewed and visibly radiant.
            </p>
            <div className="flex items-center space-x-6 border-t border-white/20 pt-6">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400">Duration & Price</p>
                <p className="text-xs font-semibold tracking-wider text-white mt-0.5">60 MIN — 35,000 RWF</p>
              </div>
              <Link to="/booking" className="btn-aside-light">
                Book Treatment
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: TREATMENT 3 - THERMAL VINOTHERAPY (Side-by-Side Clean Layout) */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="aside-container gap-12 lg:gap-16">
          <div data-aos="fade-right" className="w-full md:w-1/2">
            <div className="img-zoom-container border border-stone-300/60">
              <img
                src="/ISIMBI%20PICTURES%20(76).jpg"
                alt="Thermal Vinotherapy Hydration"
                className="w-full h-[380px] sm:h-[480px] object-cover"
              />
            </div>
          </div>

          <div data-aos="fade-left" className="w-full md:w-1/2 space-y-5 bg-[#EFECE6] p-8 sm:p-12 border border-stone-300/60">
            <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-stone-500 block">
              Hydrotherapy & Elixirs
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1C3A27]">
              Thermal Vinotherapy Soak
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
              Infused with antioxidant-rich red wine extracts and wild cedar oils, this hydro-thermal soak stimulates lymphatic circulation and melts away deep mental exhaustion.
            </p>

            <div className="pt-6 flex items-center justify-between border-t border-stone-300/50">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Duration & Price</p>
                <p className="text-xs font-semibold tracking-wider text-[#1C3A27] mt-0.5">75 MIN — 40,000 RWF</p>
              </div>
              <Link to="/booking" className="btn-aside">
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 7: APOTHECARY INGREDIENTS GRID */}
      <section className="bg-[#EFECE6] py-24 border-y border-stone-300/40">
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" className="text-center space-y-3 mb-16">
            <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-stone-500">
              Organic Formulations
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
              Botanical Ingredients We Harness
            </h2>
            <div className="w-12 h-[1px] bg-[#1C3A27]/30 mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div data-aos="fade-up" data-aos-delay="100" className="bg-[#F8F6F0] p-6 border border-stone-300/60 text-center space-y-2">
              <h3 className="font-serif text-lg text-[#1C3A27]">Wild Cedar Oil</h3>
              <p className="text-[11px] text-stone-500 font-light">Calms central nervous system and eases muscle soreness.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="150" className="bg-[#F8F6F0] p-6 border border-stone-300/60 text-center space-y-2">
              <h3 className="font-serif text-lg text-[#1C3A27]">Native Orchid Extract</h3>
              <p className="text-[11px] text-stone-500 font-light">High in antioxidants to boost cellular skin regeneration.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="200" className="bg-[#F8F6F0] p-6 border border-stone-300/60 text-center space-y-2">
              <h3 className="font-serif text-lg text-[#1C3A27]">Volcanic Thermal Clay</h3>
              <p className="text-[11px] text-stone-500 font-light">Purifies pores and balances dermal moisture barriers.</p>
            </div>
            <div data-aos="fade-up" data-aos-delay="250" className="bg-[#F8F6F0] p-6 border border-stone-300/60 text-center space-y-2">
              <h3 className="font-serif text-lg text-[#1C3A27]">Cold-Pressed Resins</h3>
              <p className="text-[11px] text-stone-500 font-light">Repairs micro-tears in skin and releases aromatic tranquility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: DARK SIGNATURE RITUALS (Side-by-Side Cards) */}
      <section className="bg-[#0A2619] text-[#F8F6F0] py-28 my-12">
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" className="text-center space-y-3 mb-16">
            <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-emerald-300">
              Immersion Journeys
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-wide">
              Signature Rituals
            </h2>
            <div className="w-12 h-[1px] bg-emerald-500/40 mx-auto mt-4" />
          </div>

          <div className="aside-container gap-8">
            <div
              data-aos="fade-up"
              data-aos-delay="100"
              className="w-full md:w-1/2 group relative h-[420px] overflow-hidden cursor-pointer border border-white/10"
            >
              <img
                src="/ISIMBI%20PICTURES%20(115).jpg"
                alt="The Midnight Spring"
                className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-8 sm:p-10 flex flex-col justify-end">
                <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-300 mb-1">Full-Body Restructure</span>
                <h3 className="font-serif text-2xl sm:text-3xl text-white mb-2">
                  The Midnight Spring
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed font-light max-w-md mb-6 opacity-85">
                  A three-hour immersive journey combining herbal hydrotherapy, full body exfoliation, and a restorative warm oil massage.
                </p>
                <div>
                  <Link to="/booking" className="btn-aside-light">
                    Reserve Ritual
                  </Link>
                </div>
              </div>
            </div>

            <div
              data-aos="fade-up"
              data-aos-delay="200"
              className="w-full md:w-1/2 group relative h-[420px] overflow-hidden cursor-pointer border border-white/10"
            >
              <img
                src="/ISIMBI%20PICTURES%20(106).jpg"
                alt="Botanical Alchemy"
                className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-8 sm:p-10 flex flex-col justify-end">
                <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-300 mb-1">Apothecary & Reflexology</span>
                <h3 className="font-serif text-2xl sm:text-3xl text-white mb-2">
                  Botanical Alchemy
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed font-light max-w-md mb-6 opacity-85">
                  A customized apothecary experience focusing on targeted healing, organic masks, and holistic body balancing.
                </p>
                <div>
                  <Link to="/booking" className="btn-aside-light">
                    Reserve Ritual
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 9: SANCTUARY PHOTO ATMOSPHERE GALLERY */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div data-aos="fade-up" className="text-center space-y-3 mb-12">
          <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-stone-500">Visual Quietude</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">Inside Lumina Sanctuary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div data-aos="fade-up" className="img-zoom-container border border-stone-300/60 h-64">
            <img src="/ISIMBI%20PICTURES%20(32).jpg" alt="Sanctuary Suite" className="w-full h-full object-cover" />
          </div>
          <div data-aos="fade-up" data-aos-delay="100" className="img-zoom-container border border-stone-300/60 h-64">
            <img src="/ISIMBI%20PICTURES%20(117).jpg" alt="Therapy Oils" className="w-full h-full object-cover" />
          </div>
          <div data-aos="fade-up" data-aos-delay="200" className="img-zoom-container border border-stone-300/60 h-64">
            <img src="/ISIMBI%20PICTURES%20(120).jpg" alt="Restoration Room" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* SECTION 10: AMENITIES SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="aside-container reverse gap-12 lg:gap-16">
          <div data-aos="fade-left" className="w-full md:w-1/2">
            <div className="img-zoom-container border border-stone-300/60">
              <img
                src="/ISIMBI%20PICTURES%20(125).jpg"
                alt="Herbal Tea Lounge"
                className="w-full h-[380px] sm:h-[450px] object-cover"
              />
            </div>
          </div>

          <div data-aos="fade-right" className="w-full md:w-1/2 space-y-6">
            <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-stone-500 block">
              Beyond Treatments
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27] leading-tight">
              The Herbal Tea & Relaxation Lounge
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
              Every appointment includes unhurried access to our quiet reflection lounge. Sip on custom-blended botanical infusions, herbal tonics, and organic dried fruits designed to assist in post-treatment hydration.
            </p>
            <ul className="text-xs text-stone-600 space-y-2 pt-2">
              <li className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 bg-[#1C3A27] rounded-full"></span>
                <span>Complimentary organic tea pairing with every ritual</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 bg-[#1C3A27] rounded-full"></span>
                <span>Silent meditation zones and heated stone loungers</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 11: TESTIMONIALS */}
      <section className="bg-[#EFECE6] py-24 border-y border-stone-300/40">
        <div data-aos="fade-up" className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <span className="text-[9px] uppercase tracking-[0.3em] font-semibold text-stone-500">
            Sanctuary Impressions
          </span>
          <blockquote className="font-serif text-2xl sm:text-3xl text-[#1C3A27] italic leading-relaxed">
            "An oasis of quietude. The attention to detail, organic botanical formulas, and serene side-by-side suites make Lumina unmatched."
          </blockquote>
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1C3A27]">Elena Rostova</p>
            <p className="text-[9px] text-stone-500 tracking-wider">Verified Sanctuary Visitor</p>
          </div>
        </div>
      </section>

      {/* SECTION 12: GIFT CARD OVERLAY BANNER */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="relative overflow-hidden border border-stone-300/60" data-aos="fade-up">
          <img
            src="/ISIMBI%20PICTURES%20pr_12.JPG"
            alt="Gift Card Experience"
            className="w-full h-[320px] object-cover"
          />
          <div className="absolute inset-0 bg-[#1C3A27]/90 p-8 sm:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-[#F8F6F0]">
            <div className="space-y-3 max-w-xl">
              <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-300 font-medium">Bespoke Gifting</span>
              <h2 className="font-serif text-3xl sm:text-4xl">Gift the Experience of Renewal</h2>
              <p className="text-xs text-stone-300 font-light leading-relaxed">
                Share the serenity of Lumina Sanctuary with curated gift vouchers valid across all massotherapy, facial, and private hydro-suite packages.
              </p>
            </div>
            <div>
              <Link to="/booking" className="btn-aside-light">
                Purchase Voucher
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 13: BOTTOM RESERVATION CTA */}
      <section className="bg-[#F2EFE9] py-20 border-t border-stone-300/40 text-center">
        <div data-aos="fade-up" className="max-w-xl mx-auto px-6 space-y-6">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">Ready for Restoration?</h2>
          <p className="text-xs text-stone-600 font-light leading-relaxed">
            Reservations are required in advance to guarantee quiet privacy in our therapy suites.
          </p>
          <div>
            <Link to="/booking" className="btn-aside">
              Reserve Your Visit
            </Link>
          </div>
        </div>
      </section>

    </main>
    <Footer />
    </>
  );
}