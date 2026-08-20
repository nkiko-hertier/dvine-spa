import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="bg-[#1C3A27] text-white pt-16 pb-12 border-t border-emerald-900/60 font-['Work_Sans',sans-serif]">
            <div className="max-w-7xl mx-auto px-6 sm:px-8">

                {/* Main Content Grid ("Busy" with useful navigation & details) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-emerald-800/60">

                    {/* Column 1: Brand & Philosophy */}
                    <div className="flex flex-col space-y-3 lg:col-span-1">
                        <Link to="/" className="inline-block">
                            <span className="font-serif text-2xl tracking-wider text-white">
                                D'vine Spa
                            </span>
                        </Link>
                        <p className="text-[11px] text-stone-300 leading-relaxed font-light">
                            Your premier midrange sanctuary in Kigali-Kiyovu, offering professional body care, restorative massages, and complete relaxation for body and soul.
                        </p>
                        <div className="pt-2 text-[10px] text-emerald-300 uppercase tracking-widest font-semibold">
                            ❖ Kigali, Rwanda
                        </div>
                    </div>

                    {/* Column 2: Quick Navigation */}
                    <div className="flex flex-col space-y-2.5">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-emerald-300 mb-1">
                            Sanctuary
                        </p>
                        <Link to="/services" className="text-[10px] uppercase tracking-[0.12em] text-stone-300 hover:text-white transition-colors">
                            Treatments & Packages
                        </Link>
                        <Link to="/about" className="text-[10px] uppercase tracking-[0.12em] text-stone-300 hover:text-white transition-colors">
                            Our Identity & Purpose
                        </Link>
                        <Link to="/booking" className="text-[10px] uppercase tracking-[0.12em] text-stone-300 hover:text-white transition-colors">
                            Reserve Experience
                        </Link>
                        <Link to="/contact" className="text-[10px] uppercase tracking-[0.12em] text-stone-300 hover:text-white transition-colors">
                            Contact Us
                        </Link>
                    </div>

                    {/* Column 3: Hours & Location */}
                    <div className="flex flex-col space-y-2.5">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-emerald-300 mb-1">
                            Hours & Location
                        </p>
                        <div className="text-[10px] text-stone-300 leading-relaxed font-light space-y-1">
                            <p><strong>Mon – Sun:</strong> 08:00 AM – 08:00 PM</p>
                            <p>Kigali - Kiyovu, Rwanda</p>
                            <p className="text-emerald-300/80 pt-1 text-[9px]">Heart of town sanctuary</p>
                        </div>
                    </div>

                    {/* Column 4: Direct Contact & Socials */}
                    <div className="flex flex-col space-y-2.5">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-emerald-300 mb-1">
                            Connect
                        </p>
                        <a href="tel:+250782867790" className="text-[10px] text-stone-300 hover:text-white transition-colors">
                            +250 782 867 790
                        </a>
                        <a href="mailto:dvinespa2@gmail.com" className="text-[10px] text-stone-300 hover:text-white transition-colors">
                            dvinespa2@gmail.com
                        </a>

                        <div className="flex items-center space-x-3 pt-2">
                            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-[9px] uppercase tracking-widest text-stone-300 hover:text-white transition-colors">
                                Instagram
                            </a>
                            <span className="text-emerald-600 text-[9px]">•</span>
                            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-[9px] uppercase tracking-widest text-stone-300 hover:text-white transition-colors">
                                Facebook
                            </a>
                        </div>
                    </div>

                    {/* Column 5: Staff & Admin Portal */}
                    <div className="flex flex-col space-y-2.5">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-emerald-300 mb-1">
                            Administration
                        </p>
                        <p className="text-[10px] text-stone-300 font-light">
                            Therapist and management portal access.
                        </p>
                        <div className="pt-1">
                            <Link 
                                to="/login" 
                                className="inline-block bg-[#F8F6F0] text-[#1C3A27] px-4 py-2 text-[9px] uppercase tracking-widest font-semibold hover:bg-white transition-colors shadow-sm"
                            >
                                Staff Login 
                            </Link>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar (Legal & Copyright) */}
                <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] text-stone-300 font-normal tracking-wider">
                    <p>© {new Date().getFullYear()} D'vine Spa Kigali. All Rights Reserved.</p>

                    <div className="flex items-center space-x-6">
                        <Link to="/about" className="hover:text-white transition-colors uppercase tracking-[0.1em]">
                            About Us
                        </Link>
                        <Link to="/contact" className="hover:text-white transition-colors uppercase tracking-[0.1em]">
                            Contact
                        </Link>
                    </div>
                </div>

            </div>
        </footer>
    );
}