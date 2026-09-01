import { useState, useEffect, useRef } from 'react';
import { X, Clock, ChevronRight, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { dvineApi, formatPrice, formatDuration } from '@/lib/dvineApi';
import Reviews from '@/components/dvinespa/Reviews';

export default function Services({ imgs = [], onSelectTreatment }) {
  const [categories, setCategories] = useState(null);
  const [catError, setCatError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [treatments, setTreatments] = useState(null);
  const [treatLoading, setTreatLoading] = useState(false);
  const [treatError, setTreatError] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const ref = useRef(null);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 90);
            });
          }
        });
      },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Load categories
  useEffect(() => {
    dvineApi
      .getCategories()
      .then((data) => {
        const list = (Array.isArray(data) ? data : []).filter((c) => c.is_active !== false);
        setCategories(list);
        if (list.length) setActiveTab(list[0].id);
      })
      .catch((e) => setCatError(e.message));
  }, []);

  // Load treatments for active category
  useEffect(() => {
    if (!activeTab) return;
    let cancelled = false;
    setTreatLoading(true);
    setTreatError(null);
    setTreatments(null);
    dvineApi
      .getCategoryTreatments(activeTab)
      .then((data) => {
        if (cancelled) return;
        setTreatments(Array.isArray(data) ? data : []);
      })
      .catch((e) => !cancelled && setTreatError(e.message))
      .finally(() => !cancelled && setTreatLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleReserve = (t) => {
    setDrawer(null);
    if (onSelectTreatment) onSelectTreatment(t);
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const featured = (categories || []).slice(0, 3);

  return (
    <section id="services" className="py-28 md:py-36" style={{ background: '#FDFBF7' }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="reveal">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: '#C5A386' }}>
              Our Treatments
            </p>
            <h2
              className="font-display mb-6 leading-tight mx-auto"
              style={{ fontSize: 'clamp(2.4rem, 4vw, 3.8rem)', fontWeight: 400, color: '#1A1F16', letterSpacing: '-0.02em' }}
            >
              A Curated Menu of
              <br />
              <em style={{ fontStyle: 'italic' }}>Restorative Rituals</em>
            </h2>
            <div className="mx-auto mb-6" style={{ width: '48px', height: '1px', background: '#C5A386' }} />
            <p className="max-w-xl mx-auto" style={{ color: '#4A5D4E', fontSize: '1rem', lineHeight: 1.8 }}>
              Every treatment at D'vine Spa is designed to restore balance, release tension, and leave you feeling renewed.
            </p>
          </div>
        </div>

        {/* Featured category cards (brand imagery) */}
        {featured.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {featured.map((cat, i) => (
              <div
                key={cat.id}
                className="reveal service-card relative cursor-pointer"
                style={{ aspectRatio: '4/5', background: '#1A1F16' }}
                onClick={() => setActiveTab(cat.id)}
              >
                {imgs[i] && (
                  <Image src={imgs[i]} alt={cat.name} className="w-full h-full" fittingType="fill" focalPointX={0.5} focalPointY={0.4} />
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(26,31,22,0.85) 0%, rgba(26,31,22,0.2) 60%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-xs tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(253,251,247,0.6)' }}>
                    {cat.treatment_count != null ? `${cat.treatment_count} treatment${cat.treatment_count === 1 ? '' : 's'}` : ''}
                  </p>
                  <h3 className="font-display mb-1" style={{ fontSize: '1.6rem', fontWeight: 400, color: '#FDFBF7' }}>
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-sm line-clamp-2" style={{ color: 'rgba(253,251,247,0.6)' }}>
                      {cat.description}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-3 text-xs tracking-[0.15em] uppercase" style={{ color: '#C5A386' }}>
                    Explore <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category tabs */}
        {categories && categories.length > 1 && (
          <div className="reveal flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => {
              const active = cat.id === activeTab;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300"
                  style={{
                    background: active ? '#1A1F16' : 'transparent',
                    color: active ? '#FDFBF7' : '#4A5D4E',
                    border: `1px solid ${active ? '#1A1F16' : 'rgba(197,163,134,0.4)'}`,
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Treatments grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catError && (
            <div className="col-span-full flex items-center justify-center gap-2 py-16 text-sm" style={{ color: '#8B6F50' }}>
              <AlertCircle size={16} /> Could not load treatments. Please try again later.
            </div>
          )}
          {!catError && treatLoading && (
            <div className="col-span-full flex items-center justify-center gap-2 py-16 text-sm" style={{ color: '#4A5D4E' }}>
              <Loader2 size={16} className="animate-spin" /> Loading treatments...
            </div>
          )}
          {!catError && !treatLoading && treatError && (
            <div className="col-span-full flex items-center justify-center gap-2 py-16 text-sm" style={{ color: '#8B6F50' }}>
              <AlertCircle size={16} /> {treatError}
            </div>
          )}
          {!catError && !treatLoading && !treatError && treatments && treatments.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm" style={{ color: 'rgba(74,93,78,0.6)' }}>
              No treatments available in this category yet.
            </div>
          )}
          {!catError && !treatLoading && treatments &&
            treatments.map((t) => (
              <div
                key={t.id}
                className="reveal p-7 cursor-pointer transition-all duration-300 hover:shadow-lg group"
                style={{ background: '#FFFFFF', border: '1px solid rgba(197,163,134,0.25)' }}
                onClick={() => setDrawer(t)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase" style={{ color: '#C5A386' }}>
                    <Sparkles size={12} />
                    {t.category && t.category.name ? t.category.name : 'Treatment'}
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(74,93,78,0.55)' }}>
                    <Clock size={11} /> {formatDuration(t.duration_minutes)}
                  </div>
                </div>
                <h3 className="font-display mb-2" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#1A1F16' }}>
                  {t.name}
                </h3>
                {t.description && (
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: '#4A5D4E', lineHeight: 1.7 }}>
                    {t.description}
                  </p>
                )}
                {t.benefits && t.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {t.benefits.slice(0, 3).map((b, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs"
                        style={{ background: 'rgba(74,93,78,0.07)', color: '#4A5D4E' }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(197,163,134,0.2)' }}>
                  <span className="font-display" style={{ fontSize: '1.25rem', color: '#1A1F16', fontWeight: 500 }}>
                    {formatPrice(t.price)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs tracking-[0.15em] uppercase transition-colors" style={{ color: '#4A5D4E' }}>
                    Details <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* CTA */}
        <div className="reveal text-center mt-16">
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-block px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 hover:opacity-90"
            style={{ background: '#1A1F16', color: '#FDFBF7' }}
          >
            Request a Booking
          </a>
        </div>
      </div>

      <Reviews />

      {/* Treatment detail drawer */}
      {drawer && (
        <TreatmentDrawer treatment={drawer} onClose={() => setDrawer(null)} onReserve={handleReserve} />
      )}
    </section>
  );
}

function TreatmentDrawer({ treatment, onClose, onReserve }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(26,31,22,0.55)' }} onClick={onClose} />
      <div
        className="relative h-full w-full max-w-md overflow-y-auto transition-transform"
        style={{ background: '#FDFBF7', animation: 'slideIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center transition-colors"
          style={{ background: 'rgba(253,251,247,0.9)', color: '#1A1F16' }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 pt-16">
          <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: '#C5A386' }}>
            {treatment.category && treatment.category.name ? treatment.category.name : 'Treatment'}
          </p>
          <h3 className="font-display mb-3" style={{ fontSize: '2rem', fontWeight: 400, color: '#1A1F16' }}>
            {treatment.name}
          </h3>
          <div className="flex items-center gap-4 mb-6">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: '#4A5D4E' }}>
              <Clock size={14} /> {formatDuration(treatment.duration_minutes)}
            </span>
            <span className="font-display" style={{ fontSize: '1.5rem', color: '#1A1F16', fontWeight: 500 }}>
              {formatPrice(treatment.price)}
            </span>
          </div>

          {treatment.description && (
            <p className="mb-7" style={{ color: '#4A5D4E', fontSize: '1rem', lineHeight: 1.8 }}>
              {treatment.description}
            </p>
          )}

          {treatment.benefits && treatment.benefits.length > 0 && (
            <div className="mb-7">
              <h4 className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: '#1A1F16' }}>
                Benefits
              </h4>
              <ul className="space-y-2">
                {treatment.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#4A5D4E' }}>
                    <CheckCircle2 size={14} className="mt-1 flex-shrink-0" style={{ color: '#4A5D4E' }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {treatment.recommended_for && treatment.recommended_for.length > 0 && (
            <div className="mb-8">
              <h4 className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: '#1A1F16' }}>
                Recommended For
              </h4>
              <div className="flex flex-wrap gap-2">
                {treatment.recommended_for.map((r, i) => (
                  <span key={i} className="px-3 py-1.5 text-xs" style={{ border: '1px solid rgba(197,163,134,0.5)', color: '#4A5D4E' }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onReserve(treatment)}
            className="w-full py-4 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 hover:opacity-90"
            style={{ background: '#1A1F16', color: '#FDFBF7' }}
          >
            Request This Treatment
          </button>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}