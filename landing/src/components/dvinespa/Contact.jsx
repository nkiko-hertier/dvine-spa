import { useState, useRef, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import BookingForm from '@/components/dvinespa/BookingForm';
import BookingLookup from '@/components/dvinespa/BookingLookup';

export default function Contact({ partnerLogo, selectedTreatment }) {
  const [tab, setTab] = useState('book');
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 120);
            });
          }
        });
      },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="contact" className="py-28 md:py-36" style={{ background: '#1A1F16' }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left: Info */}
          <div>
            <div className="reveal">
              <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: '#C5A386' }}>
                Get in Touch
              </p>
              <h2
                className="font-display leading-tight mb-6"
                style={{ fontSize: 'clamp(2.4rem, 4vw, 3.8rem)', fontWeight: 400, color: '#FDFBF7', letterSpacing: '-0.02em' }}
              >
                Begin Your
                <br />
                <em style={{ fontStyle: 'italic' }}>Journey</em>
              </h2>
              <div style={{ width: '48px', height: '1px', background: '#C5A386', marginBottom: '32px' }} />
            </div>

            <div className="space-y-8">
              {[
                { icon: Phone, label: 'Call Us', lines: ['+250 782 867 790', '+250 784 549 640'], href: 'tel:+250782867790' },
                { icon: Mail, label: 'Email', lines: ['dvinespa2@gmail.com'], href: 'mailto:dvinespa2@gmail.com' },
                { icon: MapPin, label: 'Location', lines: ['Galaxy Hotel Kiyovu', 'KN 25 St, Kigali, Rwanda'], href: null },
                { icon: Clock, label: 'Hours', lines: ['Open daily: 9am - 9pm', 'Mobile spa available'], href: null },
              ].map(({ icon: Icon, label, lines, href }) => (
                <div key={label} className="reveal flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
                    style={{ border: '1px solid rgba(197,163,134,0.3)', background: 'rgba(197,163,134,0.08)' }}
                  >
                    <Icon size={16} style={{ color: '#C5A386' }} />
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.15em] uppercase mb-1" style={{ color: 'rgba(253,251,247,0.4)', fontWeight: 500 }}>
                      {label}
                    </p>
                    {lines.map((line, i) =>
                      href && i === 0 ? (
                        <a key={i} href={href} className="block text-sm hover:opacity-70 transition-opacity" style={{ color: '#FDFBF7' }}>
                          {line}
                        </a>
                      ) : (
                        <p key={i} className="text-sm" style={{ color: i === 0 ? '#FDFBF7' : 'rgba(253,251,247,0.55)' }}>
                          {line}
                        </p>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Social */}
            <div className="reveal mt-10">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: 'rgba(253,251,247,0.4)' }}>
                Follow Us
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'Instagram', href: 'https://www.instagram.com/dvine_spa_rwanda', handle: '@dvine_spa_rwanda' },
                  { label: 'TikTok', href: '#', handle: '@dvine.spa3' },
                  { label: 'Facebook', href: 'https://www.facebook.com/gdvinespaltd/', handle: 'Dvine Spa' },
                ].map(({ label, href, handle }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs tracking-wide hover:opacity-70 transition-opacity"
                    style={{ color: '#C5A386' }}
                  >
                    {handle}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Book / Look up */}
          <div className="reveal">
            {/* Tabs */}
            <div className="flex mb-8" style={{ borderBottom: '1px solid rgba(253,251,247,0.12)' }}>
              {[
                { id: 'book', label: 'Book a Treatment' },
                { id: 'lookup', label: 'Look up a Booking' },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium transition-colors"
                    style={{
                      color: active ? '#C5A386' : 'rgba(253,251,247,0.45)',
                      borderBottom: active ? '2px solid #C5A386' : '2px solid transparent',
                      marginBottom: '-1px',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === 'book' ? (
              <BookingForm selectedTreatment={selectedTreatment} />
            ) : (
              <BookingLookup />
            )}

            {/* WhatsApp quick CTA */}
            <a
              href="https://wa.me/250782867790?text=Hello%20D'vine%20Spa%2C%20I'd%20like%20to%20book%20a%20treatment"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300 hover:opacity-90"
              style={{ background: 'rgba(73,230,112,0.15)', border: '1px solid rgba(73,230,112,0.3)', color: '#A8B9A2' }}
            >
              <svg width="14" height="14" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="19.4" cy="19.4" r="19.4" fill="#49E670" />
                <path
                  d="M13 10C12.7 10.7 11.6 11.4 10.7 11.6 10.2 11.7 9.4 11.8 6.8 10.8 3.5 9.4 1.4 6.3 1.3 6.1 1.1 5.9 0 4.4 0 2.9 0 1.5 0.8 0.7 1.1 0.4 1.4 0.1 1.8 0 2.2 0 2.4 0 2.5 0 2.7 0 2.9 0 3.2 0 3.4 0.5 3.6 1.2 4.3 2.7 4.3 2.8 4.5 2.9 4.5 3.2 4.3 3.3 4.2 3.6 4.2 3.6 3.9 3.9 3.8 4.1 3.5 4.4 3.4 4.5 3.5 4.8 3.5 5.1 3.8 5.3 4.7 6.4 5.2 6.7 5.2 6.7 5.2 6.7 5.2 6.7 5.5 6.9 5.8 6.9 6.1 7.3 6.4 7.3 6.5 7.6 6.5 7.8 6.6 7.9 6.6 8.4 6.6 8.4 6.6 8.9 7.3 9.2 7.5 9.5 7.8 9.5 8.1 9.8 8.4 12.3 8.4 13 10.1Z"
                  transform="translate(12.9 12.9)"
                  fill="#FAFAFA"
                />
              </svg>
              Book via WhatsApp
            </a>
          </div>
        </div>

        {/* Partnership */}
        {partnerLogo && (
          <div className="reveal mt-16 flex flex-col items-center gap-3">
            <p className="text-xs tracking-[0.3em] uppercase" style={{ color: 'rgba(253,251,247,0.45)' }}>
              In Partnership with
            </p>
            <div style={{ background: '#FDFBF7', borderRadius: '2px', padding: '8px 14px' }}>
              <img src={partnerLogo} alt="PixelSpring" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}