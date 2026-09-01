import { useEffect, useRef, useState } from 'react';
import { Image } from '@/components/ui/image';
import video1 from '@/medias/Landing/12453909-uhd_3840_2160_30fps.mp4';
import video2 from '@/medias/Landing/3998339-uhd_4096_2160_25fps.mp4';
import video3 from '@/medias/Landing/6629721-uhd_4096_2160_25fps.mp4';

const HERO_VIDEOS = [video1, video2, video3];

const PHRASES = [
  'Breathe out your busy day.',
  'You are safe here.',
  'Let go of the weight you carry.',
  'Your body can finally rest.',
];

const DURATION = 10000; // each media + phrase lasts 10s
const FADE = 2000;     // pure opacity crossfade — no flash

export default function Hero({ heroImgs = [] }) {
  const textRef = useRef(null);
  const videoRefs = useRef([]);
  const [index, setIndex] = useState(0);

  const media = [
    { type: 'image', src: heroImgs[0] },
    ...HERO_VIDEOS.map((src) => ({ type: 'video', src })),
  ];

  // Text entrance
  useEffect(() => {
    const t = setTimeout(() => {
      textRef.current?.classList.add('opacity-100', 'translate-y-0');
      textRef.current?.classList.remove('opacity-0', 'translate-y-8');
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Advance every 2s through image + videos
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % media.length), DURATION);
    return () => clearInterval(t);
  }, [media.length]);

  // Play the active video from the start, pause the rest
  useEffect(() => {
    media.forEach((m, i) => {
      if (m.type !== 'video') return;
      const v = videoRefs.current[i];
      if (!v) return;
      if (i === index) {
        try { v.currentTime = 0; } catch {}
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [index]);

  const scrollToServices = () => {
    document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden">
      {/* Stacked media layers — crossfade by opacity only, black-backed so no white flash */}
      <div className="absolute inset-0 overflow-hidden" style={{ background: '#000' }}>
        {media.map((m, i) =>
          m.type === 'image' ? (
            <div
              key={i}
              className="absolute inset-0 transition-opacity ease-in-out"
              style={{ opacity: i === index ? 1 : 0, transitionDuration: `${FADE}ms` }}
            >
              <div
                className="absolute inset-0"
                style={{ animation: i === index ? 'kenBurns 20s ease-in-out infinite' : 'none' }}
              >
                {m.src && (
                  <Image src={m.src} alt="D'Vine Spa relaxation room and massage treatments in Kigali, Rwanda" className="w-full h-full" fittingType="fill" focalPointX={0.5} focalPointY={0.4} />
                )}
              </div>
            </div>
          ) : (
            <video
              key={i}
              ref={(el) => { videoRefs.current[i] = el; }}
              src={m.src}
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out"
              style={{ opacity: i === index ? 1 : 0, transitionDuration: `${FADE}ms` }}
            />
          )
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(26,31,22,0.45) 0%, rgba(26,31,22,0.2) 50%, rgba(26,31,22,0.65) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div
        ref={textRef}
        className="relative z-10 text-center px-6 transition-all duration-1000 ease-out opacity-0 translate-y-8"
        style={{ maxWidth: '800px' }}
      >
        <p className="text-xs tracking-[0.35em] uppercase mb-6 font-light" style={{ color: 'rgba(197,163,134,0.9)' }}>
          Galaxy Hotel Kiyovu · Kigali, Rwanda
        </p>
        <h1
          className="font-display text-white leading-none mb-6"
          style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.0 }}
        >
          D'vine:
          <br />
          <em style={{ fontStyle: 'italic', fontWeight: 300 }}>The Art of Being.</em>
        </h1>
        {/* Rotating phrase — replaces the previous one every 2s with a soft fade */}
        <p
          key={index}
          className="font-light mb-10 mx-auto animate-fade-phrase"
          style={{ color: 'rgba(253,251,247,0.85)', fontSize: '1.25rem', lineHeight: 1.65, maxWidth: '520px', fontWeight: 300 }}
        >
          {PHRASES[index % PHRASES.length]}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#services"
            onClick={(e) => { e.preventDefault(); scrollToServices(); }}
            className="px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 hover:opacity-90 focus:outline-none"
            style={{ background: '#C5A386', color: '#FDFBF7' }}
          >
            Explore Services
          </a>
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 focus:outline-none"
            style={{ border: '1px solid rgba(253,251,247,0.5)', color: 'rgba(253,251,247,0.9)' }}
          >
            Book a Treatment
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer"
        onClick={scrollToServices}
      >
        <div className="scroll-indicator" style={{ color: 'rgba(197,163,134,0.8)' }}>
          <svg width="18" height="28" viewBox="0 0 18 28" fill="none">
            <rect x="1" y="1" width="16" height="26" rx="8" stroke="currentColor" strokeWidth="1" />
            <circle cx="9" cy="8" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes kenBurns {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.15) translate(-1%, -1%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        @keyframes fadePhrase {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-phrase { animation: fadePhrase 1s ease-out; }
      `}</style>
    </section>
  );
}