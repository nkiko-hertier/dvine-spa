import { useState } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { useCreateBookingRequests, useGetTreatments } from '@/api';

export function NewRequestDialog({ onClose }: { onClose: () => void }) {
  const treatments = useGetTreatments({ limit: '100', sort: 'display_order' });
  const create = useCreateBookingRequests();
  const [form, setForm] = useState({ full_name: '', phone_number: '', treatment_id: '', preferred_date: '', preferred_time: '', channel: 'website' });
  const [done, setDone] = useState(false);
  const submit = () => create.mutate({ data: { ...form, source: form.channel as 'website', channel: form.channel as 'website' } }, { onSuccess: () => setDone(true) });
  return (
    <div className="modal-layer">
      <div className="modal-card wide" role="dialog" aria-modal="true">
        {done ? (
          <>
            <div className="modal-icon success">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="display">Request added to the queue</h2>
            <p>The front desk can now follow up from the Requests view.</p>
            <button data-testid="button-close-new-request-success" className="button button-primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className="modal-heading">
              <div>
                <span className="eyebrow text-primary">Front desk shortcut</span>
                <h2 className="display">Add a booking request</h2>
              </div>
              <button data-testid="button-close-new-request" className="icon-button" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="form-grid">
              <label className="field-label">
                Customer name
                <input data-testid="input-new-customer-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
              </label>
              <label className="field-label">
                Phone
                <input data-testid="input-new-customer-phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+1 555 000 0000" />
              </label>
              <label className="field-label full">
                Treatment
                <select data-testid="select-new-treatment" value={form.treatment_id} onChange={(e) => setForm({ ...form, treatment_id: e.target.value })}>
                  <option value="">Choose a treatment</option>
                  {treatments.data?.data?.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Preferred date
                <input data-testid="input-new-date" type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
              </label>
              <label className="field-label">
                Preferred time
                <input data-testid="input-new-time" type="time" value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button data-testid="button-cancel-new-request" className="button button-outline" onClick={onClose}>
                Cancel
              </button>
              <button
                data-testid="button-save-new-request"
                className="button button-primary"
                disabled={!form.full_name || !form.phone_number || !form.treatment_id || !form.preferred_date || !form.preferred_time || create.isPending}
                onClick={submit}
              >
                <Plus size={15} /> {create.isPending ? 'Adding…' : 'Add request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
