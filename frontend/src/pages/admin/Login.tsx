import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Login(): React.ReactElement {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    // Simulate authentication check (replace with actual backend auth logic)
    setTimeout(() => {
      setIsLoading(false);
      if (email === "dvinespa2@gmail.com" || email.includes("admin")) {
        alert("Login successful! Redirecting to staff dashboard...");
        navigate("/");
      } else {
        setError("Invalid credentials or unauthorized staff account.");
      }
    }, 1000);
  };

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

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 text-red-800 p-3 text-xs rounded-none">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-5 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-1">
              Staff Email Address *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="dvinespa2@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F6F0] border border-stone-300 pl-10 pr-3.5 py-3.5 outline-none focus:border-[#1C3A27] text-[#1C3A27]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600">
                Password *
              </label>
              <a href="#forgot" className="text-[10px] text-stone-500 hover:text-[#1C3A27] transition-colors">
                Forgot password?
              </a>
            </div>

            {/* PASSWORD INPUT WITH ICON & SHOW/HIDE TOGGLE */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F6F0] border border-stone-300 pl-10 pr-12 py-3.5 outline-none focus:border-[#1C3A27] text-[#1C3A27]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-[#1C3A27] focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1C3A27] text-[#F8F6F0] py-3.5 uppercase tracking-[0.2em] font-semibold text-[10px] hover:bg-[#0A2619] transition-colors shadow-sm disabled:opacity-55 cursor-pointer"
            >
              {isLoading ? "Authenticating..." : "Sign In to Portal"}
            </button>
          </div>
        </form>

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