import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";

export default function NotFound(): React.ReactElement {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  return (
    <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0] min-h-[80vh] flex items-center justify-center px-6 py-24">
      <div className="max-w-xl mx-auto text-center space-y-6" data-aos="fade-up">
        
        {/* Subtitle Badge */}
        <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-stone-500 block">
          404 Error — Page Not Found
        </span>

        {/* Serif Heading */}
        <h1 className="font-serif text-5xl sm:text-7xl tracking-tight text-[#1C3A27]">
          Sanctuary Not Found
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light max-w-md mx-auto">
          The page you are looking for might have been moved, renamed, or is temporarily unavailable in our Kigali sanctuary.
        </p>

        {/* Decorative Divider */}
        <div className="w-12 h-[1px] bg-stone-300 mx-auto my-4" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/"
            className="w-full sm:w-auto bg-[#1C3A27] text-[#F8F6F0] px-8 py-3.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm text-center"
          >
            Return to Homepage
          </Link>
          <Link
            to="/booking"
            className="w-full sm:w-auto bg-[#EFECE6] border border-stone-300 text-[#1C3A27] px-8 py-3.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-200 transition-colors text-center"
          >
            Book a Treatment
          </Link>
        </div>

      </div>
    </main>
  );
}