import { useState } from 'react';
import { Search, Loader2, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { dvineApi, statusLabel, formatDate } from '@/lib/dvineApi';

export default function BookingLookup() {
  const [form, setForm] = useState({ reference: '', phone_number: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setResult(null);
    setFieldErrors({});
    const fe = {};
    if (!form.reference.trim()) fe.reference = 'Required';
    if (form.phone_number.trim().length < 6) fe.phone_number = 'Required';
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }
    setLoading(true);
    try {
      const data = await dvineApi.lookupBookingRequest(form.reference, form.phone_number);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not find that booking.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(253,251,247,0.06)',
    border: '1px solid rgba(253,251,247,0.12)',
    color: '#FDFBF7',
    borderRadius: 0,
  };
  const labelStyle = { color: 'rgba(253,251,247,0.5)' };

  const statusTone = (s) => {
    if (s === 'confirmed' || s === 'completed') return { color: '#A8B9A2', icon: CheckCircle2 };
    if (s === 'cancelled' || s === 'no_show') return { color: '#E0A87E', icon: XCircle };
    return { color: '#C5A386', icon: CalendarClock };
  };

  return (
    <div>
      <p className="text-sm mb-5" style={{ color: 'rgba(253,251,247,0.6)' }}>
        Have a request already? Look it up with your reference and the phone number you used.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reference" className="block text-xs tracking-[0.15em] uppercase mb-2" style={labelStyle}>
            Booking Reference
          </label>
          <input
            id="reference"
            name="reference"
            type="text"
            value={form.reference}
            onChange={handleChange}
            placeholder="DV-2026-000123"
            className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
            style={{ ...inputStyle, borderColor: fieldErrors.reference ? '#C5A386' : 'rgba(253,251,247,0.12)' }}
            onFocus={(e) => (e.target.style.borderColor = '#C5A386')}
            onBlur={(e) => (e.target.style.borderColor = fieldErrors.reference ? '#C5A386' : 'rgba(253,251,247,0.12)')}
          />
          {fieldErrors.reference && (
            <p className="mt-1.5 text-xs" style={{ color: '#E0A87E' }}>{fieldErrors.reference}</p>
          )}
        </div>

        <div>
          <label htmlFor="lookup_phone" className="block text-xs tracking-[0.15em] uppercase mb-2" style={labelStyle}>
            Phone Number
          </label>
          <input
            id="lookup_phone"
            name="phone_number"
            type="tel"
            value={form.phone_number}
            onChange={handleChange}
            placeholder="+250 ..."
            className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
            style={{ ...inputStyle, borderColor: fieldErrors.phone_number ? '#C5A386' : 'rgba(253,251,247,0.12)' }}
            onFocus={(e) => (e.target.style.borderColor = '#C5A386')}
            onBlur={(e) => (e.target.style.borderColor = fieldErrors.phone_number ? '#C5A386' : 'rgba(253,251,247,0.12)')}
          />
          {fieldErrors.phone_number && (
            <p className="mt-1.5 text-xs" style={{ color: '#E0A87E' }}>{fieldErrors.phone_number}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 disabled:opacity-60 focus:outline-none"
          style={{ background: '#C5A386', color: '#FDFBF7' }}
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Looking up...
            </>
          ) : (
            <>
              <Search size={13} /> Look Up Booking
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-5 p-4 text-sm text-center" style={{ background: 'rgba(224,168,126,0.08)', border: '1px solid rgba(224,168,126,0.3)', color: '#E0A87E' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 p-5" style={{ background: 'rgba(253,251,247,0.05)', border: '1px solid rgba(197,163,134,0.3)' }}>
          <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(253,251,247,0.08)' }}>
            {(() => {
              const tone = statusTone(result.status);
              const Icon = tone.icon;
              return (
                <>
                  <Icon size={18} style={{ color: tone.color }} />
                  <span className="font-display text-lg" style={{ color: '#FDFBF7', fontWeight: 500 }}>
                    {statusLabel(result.status)}
                  </span>
                </>
              );
            })()}
          </div>
          <Row label="Reference" value={result.request_reference} />
          <Row label="Treatment" value={result.treatment_name} />
          {result.confirmed_date ? (
            <>
              <Row label="Confirmed date" value={formatDate(result.confirmed_date)} />
              <Row label="Confirmed time" value={result.confirmed_time} />
            </>
          ) : (
            <p className="text-sm mt-3" style={{ color: 'rgba(253,251,247,0.55)' }}>
              Not yet confirmed. Our team will contact you to finalize your appointment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="text-xs tracking-[0.12em] uppercase" style={{ color: 'rgba(253,251,247,0.45)' }}>
        {label}
      </span>
      <span className="text-sm text-right" style={{ color: '#FDFBF7' }}>
        {value}
      </span>
    </div>
  );
}