import { useEffect, useRef } from 'react';
import { Image } from '@/components/ui/image';

const VALUES = [
  'Professionalism',
  'Cleanliness & Hygiene',
  'Client Comfort',
  'Quality Service',
  'Trust & Consistency',
];

export default function About({ aboutImg, teamImg }) {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.reveal, .img-reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 120);
            });
          }
        });
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="py-28 md:py-36" style={{ background: '#FDFBF7' }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Images stacked */}
          <div className="reveal relative order-2 lg:order-1">
            <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={aboutImg} alt="D'Vine Spa treatment room inside Galaxy Hotel Kiyovu, Kigali" className="img-reveal w-full h-full" fittingType="fill" />
            </div>
            {teamImg && (
              <div
                className="absolute overflow-hidden"
                style={{
                  width: '52%',
                  aspectRatio: '4/3',
                  bottom: '-28px',
                  right: '-20px',
                  border: '4px solid #FDFBF7',
                  boxShadow: '0 8px 32px rgba(26,31,22,0.18)',
                }}
              >
                <Image src={teamImg} alt="D'Vine Spa therapists and wellness team in Kigali, Rwanda" className="img-reveal w-full h-full" fittingType="fill" />
              </div>
            )}
            {/* Decorative border offset */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-12px',
                left: '-12px',
                right: '12px',
                bottom: '12px',
                border: '1px solid rgba(197,163,134,0.35)',
                zIndex: -1,
              }}
            />
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <div className="reveal">
              <p
                className="text-xs tracking-[0.3em] uppercase mb-4 font-medium"
                style={{ color: '#C5A386' }}
              >
                Our Story
              </p>
              <h2
                className="font-display mb-6 leading-tight"
                style={{
                  fontSize: 'clamp(2.4rem, 4vw, 3.8rem)',
                  fontWeight: 400,
                  color: '#1A1F16',
                  letterSpacing: '-0.02em',
                }}
              >
                Welcome to
                <br />
                D'vine Spa
              </h2>
              <div
                className="mb-1"
                style={{ width: '48px', height: '1px', background: '#C5A386' }}
              />
            </div>

            <div className="reveal mt-8">
              <p className="mb-5" style={{ color: '#4A5D4E', fontSize: '1rem', lineHeight: 1.8 }}>
                At D'vine Spa, we believe that self-care is not a luxury. It is a necessity. We provide a calm, clean, and professional environment where your body and mind can fully relax.
              </p>
              <p style={{ color: '#4A5D4E', fontSize: '1rem', lineHeight: 1.8 }}>
                Our treatments are designed to improve your skin, release stress, and help you feel refreshed, confident, and renewed. Located inside Galaxy Hotel Kiyovu, we are Kigali's premier sanctuary for holistic well-being.
              </p>
            </div>

            {/* Mission / Vision */}
            <div className="reveal mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6" style={{ background: 'rgba(74,93,78,0.06)', borderLeft: '2px solid #C5A386' }}>
                <h4 className="font-display text-lg mb-2" style={{ color: '#1A1F16', fontWeight: 500 }}>Our Mission</h4>
                <p style={{ color: '#4A5D4E', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  To deliver high-quality spa treatments that promote relaxation, beauty, and overall well-being through professional and personalized care.
                </p>
              </div>
              <div className="p-6" style={{ background: 'rgba(74,93,78,0.06)', borderLeft: '2px solid #C5A386' }}>
                <h4 className="font-display text-lg mb-2" style={{ color: '#1A1F16', fontWeight: 500 }}>Our Vision</h4>
                <p style={{ color: '#4A5D4E', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  To become a leading spa brand in Rwanda, known for excellence, consistency, and client satisfaction.
                </p>
              </div>
            </div>

            {/* Values */}
            <div className="reveal mt-8">
              <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ color: '#C5A386', fontWeight: 500 }}>
                Our Values
              </p>
              <div className="flex flex-wrap gap-2">
                {VALUES.map((v) => (
                  <span
                    key={v}
                    className="px-3 py-1.5 text-xs tracking-wide"
                    style={{
                      border: '1px solid rgba(197,163,134,0.5)',
                      color: '#4A5D4E',
                      background: 'transparent',
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}