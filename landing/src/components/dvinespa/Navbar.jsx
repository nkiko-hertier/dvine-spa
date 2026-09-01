import { useState, useEffect } from 'react';
import { Menu, X, Flower2, Leaf, HeartPulse, Images, Mail } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '#home', icon: Flower2 },
  { label: 'About', href: '#about', icon: Leaf },
  { label: 'Services', href: '#services', icon: HeartPulse },
  { label: 'Gallery', href: '#gallery', icon: Images },
  { label: 'Contact', href: '#contact', icon: Mail },
];

export default function Navbar({ logoImg, logoLight, menuPdf }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass-nav shadow-sm py-3' : 'py-6 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); scrollTo('#home'); }}
            className="flex items-center"
          >
            {logoImg ? (
              <div className="relative h-12 w-auto" style={{ minWidth: '48px' }}>
                {/* Light logo (pre-scroll) */}
                {logoLight && (
                  <img
                    src={logoLight}
                    alt="D'Vine Spa logo"
                    className="absolute inset-0 h-12 w-auto object-contain transition-all duration-500"
                    style={{ opacity: scrolled ? 0 : 1, transform: scrolled ? 'scale(0.85)' : 'scale(1)' }}
                  />
                )}
                {/* Default logo (post-scroll) */}
                <img
                  src={logoImg}
                  alt="D'Vine Spa logo"
                  className="absolute inset-0 h-12 w-auto object-contain transition-all duration-500"
                  style={{ opacity: scrolled ? 1 : (logoLight ? 0 : 1), transform: scrolled ? 'scale(1)' : 'scale(1.15)' }}
                />
              </div>
            ) : (
              <span className="font-display text-2xl" style={{ color: scrolled ? '#1A1F16' : '#FDFBF7', fontWeight: 500 }}>D'vine Spa</span>
            )}
          </a>

          {/* Desktop Links */}
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
                    className="group inline-flex items-center gap-1.5 text-sm tracking-[0.12em] uppercase font-medium transition-all duration-300 hover:opacity-70"
                    style={{ color: scrolled ? '#1A1F16' : 'rgba(253,251,247,0.9)' }}
                  >
                    {Icon && (
                      <Icon
                        size={14}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                        style={{ color: '#C5A386' }}
                      />
                    )}
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* CTA + Menu PDF */}
          <div className="hidden md:flex items-center gap-3">
            {menuPdf && (
              <a
                href={menuPdf}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300 focus:outline-none"
                style={{ border: `1px solid ${scrolled ? 'rgba(197,163,134,0.6)' : 'rgba(253,251,247,0.4)'}`, color: scrolled ? '#4A5D4E' : 'rgba(253,251,247,0.85)' }}
              >
                Menu
              </a>
            )}
            <a
              href="#contact"
              onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }}
              className="px-6 py-2.5 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300 focus:outline-none"
              style={{ background: '#C5A386', color: '#FDFBF7' }}
            >
              Book Now
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen
              ? <X size={22} style={{ color: scrolled ? '#1A1F16' : '#FDFBF7' }} />
              : <Menu size={22} style={{ color: scrolled ? '#1A1F16' : '#FDFBF7' }} />
            }
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(26,31,22,0.97)' }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className="font-display text-4xl text-white/90 hover:text-white transition-colors"
              style={{ fontWeight: 300 }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }}
            className="mt-4 px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium"
            style={{ background: '#C5A386', color: '#FDFBF7' }}
          >
            Book Now
          </a>
        </div>
      </div>
    </>
  );
}