import { useState } from 'react';
import Navbar from '@/components/dvinespa/Navbar';
import Hero from '@/components/dvinespa/Hero';
import About from '@/components/dvinespa/About';
import Services from '@/components/dvinespa/Services';
import Gallery from '@/components/dvinespa/Gallery';
import Branches from '@/components/dvinespa/Branches';
import Contact from '@/components/dvinespa/Contact';
import Footer from '@/components/dvinespa/Footer';

// Real D'vine Spa images (local files in public/images/)
const HERO_IMGS = [
  '/images/spa-interior.jpg',
];
const ABOUT_IMG = '/images/treatment-room.jpg';
const SERVICE_IMGS = [
  '/images/massage-therapy.jpg',
  '/images/facial-treatment.jpg',
  '/images/waxing-treatment.jpg',
];
const GALLERY_IMGS = [
  '/images/spa-interior.jpg',
  '/images/massage-therapy.jpg',
  '/images/foot-massage.jpg',
  '/images/leg-massage.jpg',
  '/images/body-wrap.jpg',
  '/images/facial-care.jpg',
  '/images/facial-steaming.jpg',
  '/images/steam-treatment.jpg',
  '/images/steam-room.jpg',
  '/images/steam-session.jpg',
  '/images/therapist-prep.jpg',
  '/images/treatment-room.jpg',
  '/images/facial-treatment.jpg',
  '/images/waxing-treatment.jpg',
];
const LOGO_IMG = 'https://media.db.com/images/public/6a832f0b0eaa984ed78a2373/693318f96_logo2-removebg-preview.png';
const LOGO_LIGHT = 'https://media.db.com/images/public/6a832f0b0eaa984ed78a2373/9c6e1a847_image-removebg-preview.png';
const MENU_PDF = 'https://media.db.com/files/public/6a832f0b0eaa984ed78a2373/df0298da9_menu.pdf';
const PARTNER_LOGO = 'https://media.db.com/images/public/6a832f0b0eaa984ed78a2373/fde499fad_nologo.png';

export default function Home() {
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Navbar logoImg={LOGO_IMG} logoLight={LOGO_LIGHT} menuPdf={MENU_PDF} />
      <Hero heroImgs={HERO_IMGS} />

      {/* Marquee strip */}
      <div
        className="overflow-hidden py-4"
        style={{ background: '#C5A386' }}
      >
        <div
          className="flex gap-12 items-center whitespace-nowrap"
          style={{ animation: 'marquee 20s linear infinite' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="flex items-center gap-6 text-xs tracking-[0.3em] uppercase" style={{ color: '#FDFBF7', fontWeight: 500 }}>
              <span>Massage</span>
              <span style={{ opacity: 0.5 }}>✦</span>
              <span>Facials</span>
              <span style={{ opacity: 0.5 }}>✦</span>
              <span>Body Treatments</span>
              <span style={{ opacity: 0.5 }}>✦</span>
              <span>Waxing</span>
              <span style={{ opacity: 0.5 }}>✦</span>
              <span>Nail Care</span>
              <span style={{ opacity: 0.5 }}>✦</span>
              <span>Spa Packages</span>
              <span style={{ opacity: 0.5 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <About aboutImg={ABOUT_IMG} teamImg="/images/therapist-prep.jpg" />
      <Services imgs={SERVICE_IMGS} onSelectTreatment={setSelectedTreatment} />
      <Gallery galleryImgs={GALLERY_IMGS} />
      <Branches />
      <Contact partnerLogo={PARTNER_LOGO} selectedTreatment={selectedTreatment} />
      <Footer partnerLogo={PARTNER_LOGO} />

      {/* Floating PDF Menu button */}
      {MENU_PDF && (
        <a
          href={MENU_PDF}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium shadow-lg transition-all hover:scale-105"
          style={{ background: '#4A5D4E', color: '#FDFBF7', borderRadius: '2px' }}
          title="View Full Menu PDF"
        >
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
            <path d="M2 0h7l5 5v11H2V0z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M9 0v5h5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <line x1="4" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="4" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          Menu
        </a>
      )}
    </div>
  );
}