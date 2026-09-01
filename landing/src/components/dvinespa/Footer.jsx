import { Instagram, Facebook } from 'lucide-react';

export default function Footer({ partnerLogo }) {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer style={{ background: '#164A36' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <span
                className="font-display text-3xl block leading-none"
                style={{ color: '#F7F3EA', fontWeight: 400, letterSpacing: '-0.02em' }}
              >
                D'vine
              </span>
              <span
                className="text-xs tracking-[0.25em] uppercase"
                style={{ color: 'rgba(201,169,110,0.8)' }}
              >
                Spa
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(247,243,234,0.55)', lineHeight: 1.7 }}>
              Rwanda's sanctuary for holistic wellness. Relax. Reconnect. Rejuvenate.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/dvine_spa_rwanda"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ border: '1px solid rgba(201,169,110,0.3)' }}
              >
                <Instagram size={14} style={{ color: '#C9A96E' }} />
              </a>
              <a
                href="https://www.facebook.com/gdvinespaltd/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ border: '1px solid rgba(201,169,110,0.3)' }}
              >
                <Facebook size={14} style={{ color: '#C9A96E' }} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs tracking-[0.25em] uppercase mb-5 font-medium" style={{ color: '#C9A96E' }}>
              Navigate
            </p>
            <ul className="space-y-3">
              {[
                { label: 'Home', href: '#home' },
                { label: 'About Us', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Gallery', href: '#gallery' },
                { label: 'Contact', href: '#contact' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={(e) => { e.preventDefault(); scrollTo(href); }}
                    className="text-sm transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(247,243,234,0.6)' }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact quick-info */}
          <div>
            <p className="text-xs tracking-[0.25em] uppercase mb-5 font-medium" style={{ color: '#C9A96E' }}>
              Contact
            </p>
            <div className="space-y-3 text-sm" style={{ color: 'rgba(247,243,234,0.6)' }}>
              <p>Galaxy Hotel Kiyovu, KN 25 St</p>
              <p>Kigali, Rwanda</p>
              <a href="tel:+250782867790" className="block hover:opacity-70 transition-opacity">+250 782 867 790</a>
              <a href="mailto:dvinespa2@gmail.com" className="block hover:opacity-70 transition-opacity">dvinespa2@gmail.com</a>
              <p style={{ color: 'rgba(201,169,110,0.7)' }}>Open daily: 9am – 9pm</p>
            </div>
          </div>
        </div>

        {/* In partnership with PixelSpring */}
        {partnerLogo && (
          <div className="flex flex-col items-center gap-3 mb-10">
            <p className="text-xs tracking-[0.3em] uppercase" style={{ color: 'rgba(201,169,110,0.7)' }}>
              In Partnership with
            </p>
            <div style={{ background: '#FDFBF7', borderRadius: '2px', padding: '8px 14px' }}>
              <img src={partnerLogo} alt="PixelSpring" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderTop: '1px solid rgba(201,169,110,0.15)', color: 'rgba(247,243,234,0.3)' }}
        >
          <p>© 2025 D'vine Spa. All rights reserved.</p>
          <p>Galaxy Hotel Kiyovu · KN 25 St · Kigali, Rwanda</p>
        </div>
      </div>
    </footer>
  );
}