import { useState, useEffect } from 'react';
import { Send, Loader2, CalendarCheck, Info } from 'lucide-react';
import { dvineApi, formatPrice, formatDuration, statusLabel, SOURCE_LABELS } from '@/lib/dvineApi';

const SOURCES = Object.keys(SOURCE_LABELS);

const EMPTY = {
  full_name: '',
  phone_number: '',
  whatsapp_number: '',
  email: '',
  treatment_id: '',
  preferred_date: '',
  preferred_time: '',
  source: '',
  notes: '',
};

export default function BookingForm({ selectedTreatment }) {
  const [form, setForm] = useState(EMPTY);
  const [groups, setGroups] = useState(null); // [{category, treatments:[...]}]
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  // Load all treatments for the dropdown, grouped by category.
  useEffect(() => {
    let cancelled = false;
    dvineApi
      .getTreatments({ limit: 100 })
      .then((items) => {
        if (cancelled) return;
        const map = new Map();
        (Array.isArray(items) ? items : []).forEach((t) => {
          const key = (t.category && t.category.id) || 'uncategorized';
          const label = (t.category && t.category.name) || 'Other treatments';
          if (!map.has(key)) map.set(key, { category: label, treatments: [] });
          map.get(key).treatments.push(t);
        });
        setGroups(Array.from(map.values()));
      })
      .catch((e) => !cancelled && setLoadError(e.message))
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-fill treatment when a card "Reserve" is chosen elsewhere.
  useEffect(() => {
    if (selectedTreatment && selectedTreatment.id) {
      setForm((f) => ({ ...f, treatment_id: selectedTreatment.id }));
      setConfirmation(null);
    }
  }, [selectedTreatment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const data = await dvineApi.createBookingRequest(form);
      setConfirmation(data);
      setForm(EMPTY);
    } catch (err) {
      // Map API field-level details (array of {field, issue}) to inline errors.
      if (Array.isArray(err.details)) {
        const fe = {};
        err.details.forEach((d) => {
          if (d && d.field) fe[d.field] = d.issue || 'Invalid';
        });
        setFieldErrors(fe);
      }
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const inputStyle = {
    background: 'rgba(253,251,247,0.06)',
    border: '1px solid rgba(253,251,247,0.12)',
    color: '#FDFBF7',
    borderRadius: 0,
  };
  const labelStyle = { color: 'rgba(253,251,247,0.5)' };
  const field = (name) => (
    <div>
      <label htmlFor={name} className="block text-xs tracking-[0.15em] uppercase mb-2" style={labelStyle}>
        {fieldLabel(name)}
      </label>
      <input
        id={name}
        name={name}
        type={inputType(name)}
        value={form[name]}
        onChange={handleChange}
        min={name === 'preferred_date' ? today : undefined}
        placeholder={placeholder(name)}
        required={required(name)}
        className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
        style={{
          ...inputStyle,
          borderColor: fieldErrors[name] ? '#C5A386' : 'rgba(253,251,247,0.12)',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#C5A386')}
        onBlur={(e) => (e.target.style.borderColor = fieldErrors[name] ? '#C5A386' : 'rgba(253,251,247,0.12)')}
      />
      {fieldErrors[name] && (
        <p className="mt-1.5 text-xs" style={{ color: '#E0A87E' }}>
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  if (confirmation) {
    return (
      <div className="py-6 text-center">
        <div
          className="mx-auto mb-6 w-14 h-14 flex items-center justify-center"
          style={{ background: 'rgba(168,185,162,0.12)', border: '1px solid rgba(168,185,162,0.4)' }}
        >
          <CalendarCheck size={24} style={{ color: '#A8B9A2' }} />
        </div>
        <h3 className="font-display mb-2" style={{ fontSize: '1.8rem', color: '#FDFBF7', fontWeight: 400 }}>
          Request received
        </h3>
        <p className="text-sm mb-6" style={{ color: 'rgba(253,251,247,0.6)' }}>
          This is a request, not a confirmed appointment. Our team will contact you to confirm your booking.
        </p>
        <div className="text-left mx-auto" style={{ maxWidth: '420px' }}>
          <div
            className="p-5"
            style={{ background: 'rgba(253,251,247,0.05)', border: '1px solid rgba(197,163,134,0.3)' }}
          >
            <Row label="Reference" value={confirmation.request_reference} strong />
            <Row label="Status" value={statusLabel(confirmation.status)} />
            <Row
              label="Treatment"
              value={`${confirmation.treatment.name} · ${formatPrice(confirmation.treatment.price)}`}
            />
            <Row
              label="Preferred"
              value={`${formatDuration(confirmation.treatment.duration_minutes)} · ${confirmation.preferred_time}`}
            />
            <Row
              label="Date"
              value={confirmation.preferred_date ? new Date(confirmation.preferred_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) : ''}
            />
          </div>
        </div>
        <p className="text-xs mt-5" style={{ color: 'rgba(253,251,247,0.4)' }}>
          Save your reference to look up this request later on this page.
        </p>
        <button
          onClick={() => setConfirmation(null)}
          className="mt-5 px-6 py-3 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300"
          style={{ border: '1px solid rgba(253,251,247,0.3)', color: 'rgba(253,251,247,0.9)' }}
        >
          Make another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {loadError && (
        <p className="text-sm mb-2" style={{ color: '#E0A87E' }}>
          Could not load treatments. Please refresh the page.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('full_name')}
        {field('phone_number')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('whatsapp_number')}
        {field('email')}
      </div>

      {/* Treatment select */}
      <div>
        <label htmlFor="treatment_id" className="block text-xs tracking-[0.15em] uppercase mb-2" style={labelStyle}>
          Treatment
        </label>
        <select
          id="treatment_id"
          name="treatment_id"
          value={form.treatment_id}
          onChange={handleChange}
          required
          disabled={!groups}
          className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
          style={{
            ...inputStyle,
            color: form.treatment_id ? '#FDFBF7' : 'rgba(253,251,247,0.4)',
            borderColor: fieldErrors.treatment_id ? '#C5A386' : 'rgba(253,251,247,0.12)',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#C5A386')}
          onBlur={(e) => (e.target.style.borderColor = fieldErrors.treatment_id ? '#C5A386' : 'rgba(253,251,247,0.12)')}
        >
          <option value="" disabled>
            {groups ? 'Select a treatment...' : 'Loading treatments...'}
          </option>
          {groups &&
            groups.map((g) => (
              <optgroup label={g.category} key={g.category} style={{ color: '#1A1F16' }}>
                {g.treatments.map((t) => (
                  <option key={t.id} value={t.id} style={{ color: '#1A1F16' }}>
                    {t.name} · {formatPrice(t.price)} · {formatDuration(t.duration_minutes)}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        {fieldErrors.treatment_id && (
          <p className="mt-1.5 text-xs" style={{ color: '#E0A87E' }}>
            {fieldErrors.treatment_id}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('preferred_date')}
        {field('preferred_time')}
      </div>

      {/* Source (how did you hear) */}
      <div>
        <label htmlFor="source" className="block text-xs tracking-[0.15em] uppercase mb-2" style={labelStyle}>
          How did you hear about us? <span style={{ color: 'rgba(253,251,247,0.3)' }}>(optional)</span>
        </label>
        <select
          id="source"
          name="source"
          value={form.source}
          onChange={handleChange}
          className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
          style={{ ...inputStyle, color: form.source ? '#FDFBF7' : 'rgba(253,251,247,0.4)' }}
          onFocus={(e) => (e.target.style.borderColor = '#C5A386')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(253,251,247,0.12)')}
        >
          <option value="" disabled style={{ color: '#1A1F16' }}>
            Select...
          </option>
          {SOURCES.map((s) => (
            <option key={s} value={s} style={{ color: '#1A1F16' }}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-xs tracking-[0.15em] uppercase mb-2" style={labelStyle}>
          Notes <span style={{ color: 'rgba(253,251,247,0.3)' }}>(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={form.notes}
          onChange={handleChange}
          placeholder="Anything we should know? Pressure preference, allergies, etc."
          className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200 resize-none"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#C5A386')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(253,251,247,0.12)')}
        />
      </div>

      {formError && (
        <p className="text-sm text-center" style={{ color: '#E0A87E' }}>
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-4 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-300 disabled:opacity-60 focus:outline-none"
        style={{ background: '#C5A386', color: '#FDFBF7' }}
      >
        {submitting ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Send size={13} /> Request Booking
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'rgba(253,251,247,0.4)' }}>
        <Info size={11} /> By submitting, you agree to be contacted about your booking request.
      </p>
    </form>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'rgba(253,251,247,0.08)' }}>
      <span className="text-xs tracking-[0.12em] uppercase" style={{ color: 'rgba(253,251,247,0.45)' }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: strong ? '#C5A386' : '#FDFBF7', fontWeight: strong ? 500 : 400 }}>
        {value}
      </span>
    </div>
  );
}

function fieldLabel(name) {
  return (
    {
      full_name: 'Full Name',
      phone_number: 'Phone Number',
      whatsapp_number: 'WhatsApp Number',
      email: 'Email Address',
      preferred_date: 'Preferred Date',
      preferred_time: 'Preferred Time',
    }[name] || name
  );
}
function inputType(name) {
  return (
    {
      phone_number: 'tel',
      whatsapp_number: 'tel',
      email: 'email',
      preferred_date: 'date',
      preferred_time: 'time',
    }[name] || 'text'
  );
}
function placeholder(name) {
  return (
    {
      full_name: 'Your name',
      phone_number: '+250 ...',
      whatsapp_number: '+250 ... (optional)',
      email: 'your@email.com (optional)',
      preferred_time: '14:30',
    }[name] || ''
  );
}
function required(name) {
  return ['full_name', 'phone_number', 'preferred_date', 'preferred_time'].includes(name);
}