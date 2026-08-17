import { useState } from 'react';
import { X } from 'lucide-react';
import { getGetAdminCategoriesQueryKey, useCreateAdminCategories } from '@/api';
import { queryClient } from '@/lib/query-client';

export function CreateCategoryDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateAdminCategories();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  return (
    <div className="modal-layer">
      <div className="modal-card" role="dialog">
        <div className="modal-heading">
          <div>
            <span className="eyebrow text-primary">Catalog</span>
            <h2 className="display">New category</h2>
          </div>
          <button data-testid="button-close-create-category" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="field-label">
          Name
          <input data-testid="input-category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Body rituals" />
        </label>
        <label className="field-label">
          Description
          <textarea data-testid="input-category-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What belongs in this collection?" />
        </label>
        <div className="modal-actions">
          <button data-testid="button-cancel-create-category" className="button button-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            data-testid="button-save-category"
            className="button button-primary"
            disabled={!name || create.isPending}
            onClick={() =>
              create.mutate(
                { data: { name, description } },
                { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminCategoriesQueryKey() }); onClose(); } },
              )
            }
          >
            Create category
          </button>
        </div>
      </div>
    </div>
  );
}
