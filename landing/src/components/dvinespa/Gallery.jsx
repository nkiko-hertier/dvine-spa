import { useEffect, useRef, useState } from 'react';
import { Image } from '@/components/ui/image';
import { Instagram, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Gallery({ galleryImgs = [] }) {
  const ref = useRef(null);
  const [lightbox, setLightbox] = useState(null); // index

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.reveal, .img-reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 80);
            });
          }
        });
      },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((l) => (l + 1) % galleryImgs.length);
      if (e.key === 'ArrowLeft') setLightbox((l) => (l - 1 + galleryImgs.length) % galleryImgs.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, galleryImgs.length]);

  // Assign aspect ratios in a pattern for visual interest
  const aspects = ['1/1', '3/4', '1/1', '4/3', '1/1', '3/4', '4/3', '1/1', '3/4', '1/1', '4/3', '1/1'];

  return (
    <section id="gallery" className="py-28 md:py-36" style={{ background: '#FDFBF7' }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
          <div className="reveal">
            <p className="text-xs tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: '#C5A386' }}>
              The Sanctuary
            </p>
            <h2
              className="font-display leading-tight"
              style={{ fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', fontWeight: 400, color: '#1A1F16', letterSpacing: '-0.02em' }}
            >
              A Glimpse Inside
            </h2>
          </div>
          <a
            href="https://www.instagram.com/dvine_spa_rwanda"
            target="_blank"
            rel="noopener noreferrer"
            className="reveal flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: '#4A5D4E' }}
          >
            <Instagram size={16} style={{ color: '#C5A386' }} />
            <span className="text-xs tracking-[0.15em] uppercase">@dvine_spa_rwanda</span>
          </a>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {galleryImgs.map((img, i) => (
            <div
              key={i}
              className="reveal break-inside-avoid overflow-hidden cursor-pointer group"
              style={{ marginBottom: '12px' }}
              onClick={() => setLightbox(i)}
            >
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: aspects[i % aspects.length] }}
              >
                <Image
                  src={img}
                  alt={`D'Vine Spa Kigali treatment room and spa gallery photo ${i + 1}`}
                  className="img-reveal w-full h-full transition-transform duration-700 group-hover:scale-105"
                  fittingType="fill"
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-center justify-center"
                  style={{ background: 'rgba(26,31,22,0.4)' }}
                >
                  <span className="text-white text-xs tracking-[0.2em] uppercase">View</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="reveal text-center mt-12">
          <a
            href="https://www.instagram.com/dvine_spa_rwanda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300 hover:opacity-80"
            style={{ border: '1px solid rgba(197,163,134,0.5)', color: '#4A5D4E' }}
          >
            <Instagram size={13} style={{ color: '#C5A386' }} />
            Follow Us on Instagram
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(26,31,22,0.95)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-5 right-5 z-10 p-2 text-white opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white opacity-70 hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + galleryImgs.length) % galleryImgs.length); }}
            aria-label="Previous"
          >
            <ChevronLeft size={32} />
          </button>
          <div
            className="relative max-w-4xl max-h-screen w-full px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImgs[lightbox]}
              alt={`D'Vine Spa Kigali treatment room and spa gallery photo ${lightbox + 1}`}
              className="w-full h-full object-contain"
              style={{ maxHeight: '85vh' }}
            />
            <p className="text-center text-xs tracking-[0.2em] uppercase mt-4 opacity-40" style={{ color: '#FDFBF7' }}>
              {lightbox + 1} / {galleryImgs.length}
            </p>
          </div>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white opacity-70 hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % galleryImgs.length); }}
            aria-label="Next"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </section>
  );
}