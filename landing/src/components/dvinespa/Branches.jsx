import { MapPin, Phone, Clock, Navigation } from 'lucide-react';
import { useEffect, useRef } from 'react';

const BRANCHES = [
  {
    name: 'Kiyovu Flagship',
    tag: 'Flagship Sanctuary',
    address: 'Galaxy Hotel Kiyovu, KN 25 St',
    city: 'Kigali, Rwanda',
    phone: ['+250 782 867 790', '+250 784 549 640'],
    hours: 'Open daily 9am – 9pm',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.5157942604837!2d30.0634591!3d-1.9466336999999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x2603a27df8864efa!2sD\'vine%20spa!5e0!3m2!1sen!2srw!4v1664420280398!5m2!1sen!2srw',
    directionsUrl: 'https://maps.google.com/?q=Galaxy+Hotel+Kiyovu+Kigali+Rwanda',
  },
  {
    name: 'Nyamata Branch',
    tag: 'Bugesera Location',
    address: 'In front of Palasta Rocky Hotel, V32R+874',
    city: 'Nyamata, Rwanda',
    phone: ['+250 783 076 026', '+250 793 492 448'],
    hours: 'Open daily 9am – 9pm',
    mapUrl: null,
    directionsUrl: 'https://maps.google.com/?q=Palasta+Rocky+Hotel+Nyamata+Rwanda',
  },
];

export default function Branches() {
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
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="branches" className="py-28 md:py-36" style={{ background: '#F4EFEB' }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="reveal">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: '#C5A386' }}>
              Locations
            </p>
            <h2
              className="font-display mb-6 leading-tight mx-auto"
              style={{ fontSize: 'clamp(2.4rem, 4vw, 3.8rem)', fontWeight: 400, color: '#1A1F16', letterSpacing: '-0.02em' }}
            >
              Visit Our
              <br />
              <em style={{ fontStyle: 'italic' }}>Sanctuaries</em>
            </h2>
            <div className="mx-auto mb-6" style={{ width: '48px', height: '1px', background: '#C5A386' }} />
            <p className="max-w-xl mx-auto" style={{ color: '#4A5D4E', fontSize: '1rem', lineHeight: 1.8 }}>
              Experience soothing relaxation at either of our convenient locations in Kigali and Bugesera.
            </p>
          </div>
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {BRANCHES.map((branch) => (
            <div
              key={branch.name}
              className="reveal flex flex-col justify-between p-8 md:p-10 transition-all duration-300 hover:shadow-xl"
              style={{ background: '#FFFFFF', border: '1px solid rgba(197,163,134,0.3)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs tracking-[0.2em] uppercase font-medium" style={{ color: '#C5A386' }}>
                    {branch.tag}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#4A5D4E' }}>
                    <Clock size={13} /> {branch.hours}
                  </span>
                </div>

                <h3 className="font-display text-2xl md:text-3xl mb-4" style={{ color: '#1A1F16', fontWeight: 500 }}>
                  {branch.name}
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="mt-1 flex-shrink-0" style={{ color: '#C5A386' }} />
                    <p className="text-sm" style={{ color: '#4A5D4E' }}>
                      {branch.address}, {branch.city}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone size={16} className="mt-1 flex-shrink-0" style={{ color: '#C5A386' }} />
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {branch.phone.map((p, idx) => (
                        <a
                          key={idx}
                          href={`tel:${p.replace(/\s+/g, '')}`}
                          className="text-sm transition-opacity hover:opacity-70 font-medium"
                          style={{ color: '#1A1F16' }}
                        >
                          {p}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {branch.mapUrl && (
                  <div className="relative w-full h-56 mb-6 overflow-hidden" style={{ border: '1px solid rgba(197,163,134,0.2)' }}>
                    <iframe
                      src={branch.mapUrl}
                      title={`Google Map for ${branch.name}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 flex flex-wrap items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(197,163,134,0.2)' }}>
                <a
                  href={branch.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase font-medium transition-opacity hover:opacity-75"
                  style={{ color: '#4A5D4E' }}
                >
                  <Navigation size={13} style={{ color: '#C5A386' }} /> Get Directions
                </a>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase font-medium transition-all hover:opacity-90"
                  style={{ background: '#1A1F16', color: '#FDFBF7' }}
                >
                  Book Here
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}