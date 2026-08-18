import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { NavLinkRenderProps } from "react-router-dom";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const navLinkClass = ({ isActive }: NavLinkRenderProps) =>
    `nav-link ${isActive ? "active" : ""}`;

  return (
    <header className="header-container bg-[#F8F6F0] border-b border-stone-200/50 text-[#1C3A27] relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        
        {/* Logo & Brand Name */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3">
          <img 
            src="/logo2.jpg.jpeg" 
            alt="d'Vine SPA Logo" 
            className="h-8 w-auto object-contain" 
          />
          <span className="font-serif text-xl sm:text-2xl tracking-wide text-[#1C3A27]">
            d'Vine SPA
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold tracking-widest uppercase">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/services" className={navLinkClass}>
            Services
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>

        {/* Desktop Booking Button */}
        <div className="hidden md:block">
          <Link to="/booking" className="btn-primary">
            Book Now
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 text-[#1C3A27] focus:outline-none"
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="mobile-menu-drawer md:hidden bg-[#F8F6F0] border-b border-stone-200 px-6 py-6 space-y-4 shadow-lg">
          <nav className="flex flex-col space-y-4 text-xs font-semibold tracking-widest uppercase">
            <NavLink to="/" end onClick={closeMenu} className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/services" onClick={closeMenu} className={navLinkClass}>
              Services
            </NavLink>
            <NavLink to="/about" onClick={closeMenu} className={navLinkClass}>
              About
            </NavLink>
            <NavLink to="/contact" onClick={closeMenu} className={navLinkClass}>
              Contact
            </NavLink>
          </nav>
          <div className="pt-2">
            <Link to="/booking" onClick={closeMenu} className="btn-primary block text-center w-full">
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
