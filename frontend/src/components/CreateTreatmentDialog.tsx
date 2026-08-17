import { useState } from 'react';
import { X } from 'lucide-react';
import { getGetAdminTreatmentsQueryKey, useCreateAdminTreatments } from '@/api';
import type { Category } from '@/api';
import { queryClient } from '@/lib/query-client';

export function CreateTreatmentDialog({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const create = useCreateAdminTreatments();
  const [form, setForm] = useState({ name: '', duration_minutes: '60', price: '', category_id: '', description: '' });
  return (
    <div className="modal-layer">
      <div className="modal-card wide" role="dialog">
        <div className="modal-heading">
          <div>
            <span className="eyebrow text-primary">Catalog</span>
            <h2 className="display">New treatment</h2>
          </div>
          <button data-testid="button-close-create-treatment" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label className="field-label full">
            Name
            <input data-testid="input-treatment-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The D’Vine reset" />
          </label>
          <label className="field-label">
            Duration (minutes)
            <input data-testid="input-treatment-duration" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
          </label>
          <label className="field-label">
            Price
            <input data-testid="input-treatment-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="120" />
          </label>
          <label className="field-label full">
            Category
            <select data-testid="select-treatment-category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label full">
            Description
            <textarea data-testid="input-treatment-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short description for the team." />
          </label>
        </div>
        <div className="modal-actions">
          <button data-testid="button-cancel-create-treatment" className="button button-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            data-testid="button-save-treatment"
            className="button button-primary"
            disabled={!form.name || !form.price || create.isPending}
            onClick={() =>
              create.mutate(
                { data: { name: form.name, duration_minutes: Number(form.duration_minutes), price: Number(form.price), category_id: form.category_id || undefined, description: form.description } },
                { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTreatmentsQueryKey() }); onClose(); } },
              )
            }
          >
            Create treatment
          </button>
        </div>
      </div>
    </div>
  );
}
