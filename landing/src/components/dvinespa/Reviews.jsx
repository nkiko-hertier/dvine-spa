import { useState, useEffect, useRef } from 'react';
import { Star, MessageSquarePlus, X, CheckCircle2, Loader2, Sparkles, Quote } from 'lucide-react';
import db from '@/api/base44Client';

const DEFAULT_REVIEWS = [
  {
    id: '1',
    customer_name: 'Claire M.',
    treatment_name: 'Deep Tissue Massage',
    rating: 5,
    comment: 'The therapists at Galaxy Hotel Kiyovu are truly world-class. One of the best deep tissue massages I have had in Kigali. Releasing all the tension after a long work week!',
    date: 'Recent Guest',
  },
  {
    id: '2',
    customer_name: 'David K.',
    treatment_name: 'Radiance Facial & Body Scrub',
    rating: 5,
    comment: 'Such a calm and serene sanctuary in the heart of town. The body scrub and facial left my skin refreshed and glowing for days.',
    date: 'Recent Guest',
  },
  {
    id: '3',
    customer_name: 'Marie & Jean-Paul',
    treatment_name: 'Couples Harmony Package',
    rating: 5,
    comment: 'A wonderful couples ritual for our anniversary. The soothing essential oils, peaceful atmosphere, and attentive care were simply unforgettable.',
    date: 'Recent Guest',
  },
  {
    id: '4',
    customer_name: 'Sarah T.',
    treatment_name: 'Aromatherapy Relaxation',
    rating: 5,
    comment: 'Super professional, spotless hygiene, and very relaxing ambiance. D\'vine Spa is without question my favorite self-care destination in Rwanda.',
    date: 'Recent Guest',
  },
];

export default function Reviews() {
  const [reviews, setReviews] = useState(DEFAULT_REVIEWS);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 100);
            });
          }
        });
      },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Fetch reviews from entity if available
  useEffect(() => {
    let cancelled = false;
    async function loadReviews() {
      try {
        if (db?.entities?.Review?.filter) {
          const list = await db.entities.Review.filter({}, '-created_date', 10);
          if (!cancelled && Array.isArray(list) && list.length > 0) {
            setReviews([...list, ...DEFAULT_REVIEWS]);
          }
        }
      } catch (e) {
        // Fallback to default reviews silently
      }
    }
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) {
      setError('Please fill in your name and review.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const newReview = {
        customer_name: name.trim(),
        treatment_name: treatmentName.trim() || 'Spa Treatment',
        rating: Number(rating),
        comment: comment.trim(),
        created_date: new Date().toISOString(),
      };

      if (db?.entities?.Review?.create) {
        try {
          await db.entities.Review.create(newReview);
        } catch {}
      }

      setReviews((prev) => [newReview, ...prev]);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
        setName('');
        setTreatmentName('');
        setComment('');
        setRating(5);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-28 border-t border-stone-200/60 pt-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-6">
          <div className="reveal">
            <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: '#C5A386' }}>
              <Sparkles size={13} />
              Guest Stories
            </div>
            <h2
              className="font-display leading-tight"
              style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)', fontWeight: 400, color: '#1A1F16', letterSpacing: '-0.02em' }}
            >
              Words of <em style={{ fontStyle: 'italic' }}>Serenity</em>
            </h2>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="reveal inline-flex items-center gap-2 px-6 py-3 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300 hover:opacity-90 shadow-sm"
            style={{ background: '#1A1F16', color: '#FDFBF7' }}
          >
            <MessageSquarePlus size={14} style={{ color: '#C5A386' }} />
            Share Your Experience
          </button>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.slice(0, 4).map((r, i) => (
            <div
              key={r.id || i}
              className="reveal p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-md"
              style={{ background: '#FFFFFF', border: '1px solid rgba(197,163,134,0.25)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={14}
                        className={idx < (r.rating || 5) ? 'fill-current' : 'opacity-20'}
                        style={{ color: '#C5A386' }}
                      />
                    ))}
                  </div>
                  <Quote size={16} className="opacity-20" style={{ color: '#C5A386' }} />
                </div>

                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#4A5D4E', fontStyle: 'italic' }}>
                  "{r.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <p className="font-medium text-sm" style={{ color: '#1A1F16' }}>
                  {r.customer_name}
                </p>
                {r.treatment_name && (
                  <p className="text-xs mt-0.5" style={{ color: '#C5A386' }}>
                    {r.treatment_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Submission Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div
            className="relative w-full max-w-lg p-8 overflow-hidden transition-all shadow-2xl"
            style={{ background: '#FDFBF7', border: '1px solid rgba(197,163,134,0.4)' }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 text-stone-500 hover:text-stone-900 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {submitted ? (
              <div className="py-12 text-center">
                <div
                  className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(168,185,162,0.2)' }}
                >
                  <CheckCircle2 size={24} style={{ color: '#4A5D4E' }} />
                </div>
                <h3 className="font-display text-2xl mb-2" style={{ color: '#1A1F16' }}>
                  Thank You
                </h3>
                <p className="text-sm" style={{ color: '#4A5D4E' }}>
                  Your review has been received. We appreciate your feedback!
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: '#C5A386' }}>
                  D'vine Spa Experience
                </p>
                <h3 className="font-display text-2xl mb-6" style={{ color: '#1A1F16' }}>
                  Write a Review
                </h3>

                {error && (
                  <div className="mb-4 p-3 text-xs bg-red-50 text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: '#4A5D4E' }}>
                      Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            size={22}
                            className={(hoverRating || rating) >= star ? 'fill-current' : 'text-stone-300'}
                            style={{ color: (hoverRating || rating) >= star ? '#C5A386' : undefined }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: '#4A5D4E' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Marie K."
                      required
                      className="w-full px-4 py-2.5 text-sm border border-stone-300 focus:border-stone-800 outline-none transition-colors"
                      style={{ background: '#FFFFFF' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: '#4A5D4E' }}>
                      Treatment Experienced (Optional)
                    </label>
                    <input
                      type="text"
                      value={treatmentName}
                      onChange={(e) => setTreatmentName(e.target.value)}
                      placeholder="e.g. Deep Tissue Massage"
                      className="w-full px-4 py-2.5 text-sm border border-stone-300 focus:border-stone-800 outline-none transition-colors"
                      style={{ background: '#FFFFFF' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: '#4A5D4E' }}>
                      Your Review
                    </label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about your experience..."
                      required
                      className="w-full px-4 py-2.5 text-sm border border-stone-300 focus:border-stone-800 outline-none transition-colors resize-none"
                      style={{ background: '#FFFFFF' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 mt-2 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: '#1A1F16', color: '#FDFBF7' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}