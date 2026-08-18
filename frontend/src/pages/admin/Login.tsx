import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/clerk-react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Login(): React.ReactElement {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  // Already authenticated: bounce straight to the dashboard (or wherever
  // ProtectedRoute sent them from).
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate, location.state]);

  return (
    <main className="bg-[#F8F6F0] text-[#1C3A27] font-['Work_Sans',sans-serif] selection:bg-[#1C3A27] selection:text-[#F8F6F0] min-h-[85vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-[#EFECE6] border border-stone-300/80 p-8 sm:p-10 shadow-sm" data-aos="fade-up">

        {/* HEADER */}
        <div className="text-center space-y-2 mb-8 border-b border-stone-300/60 pb-6">
          <div className="w-12 h-12 bg-[#1C3A27] text-[#F8F6F0] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold text-stone-500 block">
            Staff & Management Portal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1C3A27]">
            D'vine Spa Login
          </h1>
          <p className="text-xs text-stone-600 font-light max-w-xs mx-auto">
            Access internal scheduling, client bookings, and administrative settings.
          </p>
        </div>

        {/* CLERK SIGN IN */}
        <div className="flex justify-center">
          <SignIn
            routing="hash"
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/login"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-none bg-transparent p-0 w-full",
                header: "hidden",
                footer: "hidden",
                socialButtonsBlockButton:
                  "border border-stone-300 text-[#1C3A27] hover:bg-stone-200/50 text-xs",
                dividerLine: "bg-stone-300",
                dividerText: "text-stone-500 text-[10px] uppercase tracking-wider",
                formFieldLabel: "text-[10px] uppercase tracking-wider font-semibold text-stone-600",
                formFieldInput:
                  "bg-[#F8F6F0] border border-stone-300 focus:border-[#1C3A27] text-[#1C3A27] text-xs",
                formButtonPrimary:
                  "bg-[#1C3A27] hover:bg-[#0A2619] text-[#F8F6F0] text-[10px] uppercase tracking-[0.2em] font-semibold shadow-sm",
                footerActionLink: "text-[#1C3A27] hover:underline",
                identityPreviewText: "text-xs text-[#1C3A27]",
                formResendCodeLink: "text-[#1C3A27]",
              },
              variables: {
                colorPrimary: "#1C3A27",
              },
            }}
          />
        </div>

        {/* FOOTER LINK BACK */}
        <div className="mt-8 pt-6 border-t border-stone-300/60 text-center text-stone-500 text-[11px]">
          <Link to="/" className="inline-flex items-center space-x-1.5 text-[#1C3A27] font-medium hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to D'vine Spa Homepage</span>
          </Link>
        </div>

      </div>
    </main>
  );
}
